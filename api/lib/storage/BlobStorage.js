// Blob-backed storage using @vercel/blob
// Requires env: BLOB_READ_WRITE_TOKEN and BLOB_PREFIX (e.g., prod/ or dev/)

class BlobStorage {
    constructor(options = {}) {
        this.token = options.token || process.env.BLOB_READ_WRITE_TOKEN;
        this.prefix = options.prefix || process.env.BLOB_PREFIX;
        if (!this.token) {
            throw new Error('BLOB_READ_WRITE_TOKEN env var must be set for BlobStorage.');
        }
        if (!this.prefix) {
            throw new Error('BLOB_PREFIX env var must be set for BlobStorage.');
        }
        this.prefix = this.prefix.endsWith('/') ? this.prefix : `${this.prefix}/`;
    }

    async importClient() {
        if (!this.client) {
            const mod = await import('@vercel/blob');
            this.client = { put: mod.put, list: mod.list, del: mod.del };
        }
        return this.client;
    }

    buildKey(kind, filename) {
        return `${this.prefix}${kind}/${filename}`;
    }

    // Entries
    async saveEntry({ id, content, createdAt }) {
        const { put } = await this.importClient();
        const filename = id.endsWith('.txt') ? id : `${id}.txt`;
        const key = this.buildKey('entries', filename);
        await put(key, content, {
            access: 'public',
            token: this.token,
            contentType: 'text/plain; charset=utf-8'
        });
        return { id: filename };
    }

    async getEntry(id) {
        const { list } = await this.importClient();
        const filename = id.endsWith('.txt') ? id : `${id}.txt`;
        const key = this.buildKey('entries', filename);
        const { blobs } = await list({ prefix: key, token: this.token });
        if (!blobs || blobs.length === 0) {
            throw new Error(`Entry not found: ${filename}`);
        }
        const url = blobs[0].url;
        const resp = await fetch(url);
        const content = await resp.text();
        return { content, contentType: 'text/plain; charset=utf-8' };
    }

    async listEntries({ limit, prefix } = {}) {
        const { list } = await this.importClient();
        const listPrefix = this.buildKey('entries', prefix ? prefix : '');
        const { blobs } = await list({ prefix: listPrefix, token: this.token });
        const mapped = (blobs || []).map(b => {
            const parts = b.pathname.split('/');
            const filename = parts[parts.length - 1];
            return { id: filename, url: b.url };
        });
        mapped.sort((a, b) => {
            const aNum = parseInt(a.id.replace('.txt', ''), 10);
            const bNum = parseInt(b.id.replace('.txt', ''), 10);
            return (isNaN(bNum) ? 0 : bNum) - (isNaN(aNum) ? 0 : aNum);
        });
        const selected = typeof limit === 'number' ? mapped.slice(0, limit) : mapped;
        // Load content bodies to match LocalFileStorage return shape
        const results = [];
        for (const item of selected) {
            const resp = await fetch(item.url);
            const content = await resp.text();
            results.push({ id: item.id, content });
        }
        return results;
    }

    // Images
    async saveImage({ id, buffer, contentType, extension }) {
        const { put } = await this.importClient();
        const ext = (extension || 'png').replace(/^\./, '');
        const filename = `${id}.${ext}`;
        const key = this.buildKey('images', filename);
        await put(key, buffer, {
            access: 'public',
            token: this.token,
            contentType: contentType || 'application/octet-stream'
        });
        return { id: filename };
    }

    async getImageUrl(id) {
        const { list } = await this.importClient();
        const filename = id.includes('.') ? id : `${id}.png`;
        const key = this.buildKey('images', filename);
        const { blobs } = await list({ prefix: key, token: this.token });
        if (!blobs || blobs.length === 0) {
            throw new Error(`Image not found: ${filename}`);
        }
        return blobs[0].url;
    }

    async listImages({ limit, prefix } = {}) {
        const { list } = await this.importClient();
        const listPrefix = this.buildKey('images', prefix ? prefix : '');
        const { blobs } = await list({ prefix: listPrefix, token: this.token });
        const mapped = (blobs || []).map(b => {
            const parts = b.pathname.split('/');
            const filename = parts[parts.length - 1];
            return { id: filename, url: b.url };
        });
        mapped.sort((a, b) => {
            const aNum = parseInt(a.id.split('.')[0], 10);
            const bNum = parseInt(b.id.split('.')[0], 10);
            return (isNaN(bNum) ? 0 : bNum) - (isNaN(aNum) ? 0 : aNum);
        });
        const selected = typeof limit === 'number' ? mapped.slice(0, limit) : mapped;
        return selected;
    }

    async deleteEntry(id) {
        const { list, del } = await this.importClient();
        // Find entry blob
        const filename = id.endsWith('.txt') ? id : `${id}.txt`;
        const entryKeyPrefix = this.buildKey('entries', filename);
        let entryUrl;
        let imageUrl;
        try {
            const { blobs } = await list({ prefix: entryKeyPrefix, token: this.token });
            if (blobs && blobs.length > 0) {
                entryUrl = blobs[0].url;
                // Fetch content to parse image URL metadata
                try {
                    const resp = await fetch(entryUrl);
                    const content = await resp.text();
                    const parts = content.split('\n\n---\n');
                    if (parts.length >= 2) {
                        const metadata = parts[1];
                        const match = metadata.match(/Image URL:\s*(.*)/);
                        if (match) {
                            imageUrl = (match[1] || '').trim();
                        }
                    }
                } catch (_e) {
                    // If we can't read, continue with delete of the entry blob anyway
                }
            }
        } catch (_e) {
            // Listing failed; continue best-effort
        }

        // Delete entry blob if present
        if (entryUrl) {
            try {
                await del(entryUrl, { token: this.token });
            } catch (_e) {
                // Best-effort; ignore
            }
        }

        // Delete associated image blob if we can resolve it
        if (imageUrl) {
            try {
                if (/^https?:\/\//i.test(imageUrl)) {
                    await del(imageUrl, { token: this.token });
                } else {
                    // Try to interpret as local-style path like /images/<filename>
                    const idx = imageUrl.indexOf('/images/');
                    if (idx !== -1) {
                        const imageFilename = imageUrl.substring(idx + '/images/'.length);
                        const imagePrefix = this.buildKey('images', imageFilename);
                        const { blobs: imageBlobs } = await list({ prefix: imagePrefix, token: this.token });
                        if (imageBlobs && imageBlobs.length > 0) {
                            await del(imageBlobs[0].url, { token: this.token });
                        }
                    }
                }
            } catch (_e) {
                // Ignore errors to keep operation idempotent
            }
        }
    }
}

module.exports = { BlobStorage };


