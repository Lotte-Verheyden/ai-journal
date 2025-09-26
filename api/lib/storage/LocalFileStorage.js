const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

class LocalFileStorage {
    constructor(options = {}) {
        const dataDirEnv = process.env.DATA_DIR;
        if (!dataDirEnv && !options.dataDir) {
            throw new Error('DATA_DIR env var must be set for LocalFileStorage.');
        }
        this.dataDir = options.dataDir || path.resolve(process.cwd(), dataDirEnv);
        this.entriesDir = path.join(this.dataDir, 'entries');
        this.imagesDir = path.join(this.dataDir, 'images');
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.entriesDir)) {
            fs.mkdirSync(this.entriesDir, { recursive: true });
        }
        if (!fs.existsSync(this.imagesDir)) {
            fs.mkdirSync(this.imagesDir, { recursive: true });
        }
    }

    async saveEntry({ id, content, createdAt }) {
        const filename = id.endsWith('.txt') ? id : `${id}.txt`;
        const targetPath = path.join(this.entriesDir, filename);
        const tmpPath = `${targetPath}.tmp`;
        await fsp.writeFile(tmpPath, content, 'utf8');
        await fsp.rename(tmpPath, targetPath);
        return { id: filename };
    }

    async getEntry(id) {
        const filename = id.endsWith('.txt') ? id : `${id}.txt`;
        const targetPath = path.join(this.entriesDir, filename);
        const content = await fsp.readFile(targetPath, 'utf8');
        return { content, contentType: 'text/plain; charset=utf-8' };
    }

    async listEntries({ limit, prefix } = {}) {
        const files = await fsp.readdir(this.entriesDir);
        const txtFiles = files.filter((f) => f.endsWith('.txt') && (!prefix || f.startsWith(prefix)));
        txtFiles.sort((a, b) => {
            const aNum = parseInt(a.replace('.txt', ''), 10);
            const bNum = parseInt(b.replace('.txt', ''), 10);
            return (isNaN(bNum) ? 0 : bNum) - (isNaN(aNum) ? 0 : aNum);
        });
        const selected = typeof limit === 'number' ? txtFiles.slice(0, limit) : txtFiles;
        const entries = [];
        for (const file of selected) {
            const content = await fsp.readFile(path.join(this.entriesDir, file), 'utf8');
            entries.push({ id: file, content });
        }
        return entries;
    }

    async saveImage({ id, buffer, contentType, extension }) {
        const ext = (extension || this.extensionFromContentType(contentType) || 'png').replace(/^\./, '');
        const filename = `${id}.${ext}`;
        const targetPath = path.join(this.imagesDir, filename);
        const tmpPath = `${targetPath}.tmp`;
        await fsp.writeFile(tmpPath, buffer);
        await fsp.rename(tmpPath, targetPath);
        return { id: filename };
    }

    async getImageUrl(id) {
        if (id.includes('.')) {
            return `/api/images/serve?filename=${encodeURIComponent(id)}`;
        }
        const files = await fsp.readdir(this.imagesDir);
        const match = files.find((f) => f.startsWith(`${id}.`));
        if (match) {
            return `/api/images/serve?filename=${encodeURIComponent(match)}`;
        }
        return `/api/images/serve?filename=${encodeURIComponent(id)}.png`;
    }

    async listImages({ limit, prefix } = {}) {
        const files = await fsp.readdir(this.imagesDir);
        const imageFiles = files.filter((f) => (!prefix || f.startsWith(prefix)));
        imageFiles.sort((a, b) => {
            const aNum = parseInt(a.split('.')[0], 10);
            const bNum = parseInt(b.split('.')[0], 10);
            return (isNaN(bNum) ? 0 : bNum) - (isNaN(aNum) ? 0 : aNum);
        });
        const selected = typeof limit === 'number' ? imageFiles.slice(0, limit) : imageFiles;
        return selected.map((filename) => ({ id: filename, url: `/images/${filename}` }));
    }

    extensionFromContentType(contentType) {
        if (!contentType) return undefined;
        if (contentType === 'image/png') return 'png';
        if (contentType === 'image/jpeg') return 'jpg';
        if (contentType === 'image/webp') return 'webp';
        if (contentType === 'image/gif') return 'gif';
        return undefined;
    }

    async deleteEntry(id) {
        const filename = id.endsWith('.txt') ? id : `${id}.txt`;
        const entryPath = path.join(this.entriesDir, filename);

        // Try to read entry to locate associated image URL
        let imageUrl;
        try {
            const content = await fsp.readFile(entryPath, 'utf8');
            const parts = content.split('\n\n---\n');
            if (parts.length >= 2) {
                const metadata = parts[1];
                const match = metadata.match(/Image URL:\s*(.*)/);
                if (match) {
                    imageUrl = (match[1] || '').trim();
                }
            }
        } catch (err) {
            // If the entry file doesn't exist, continue; deletion should be idempotent
            if (err && err.code !== 'ENOENT') {
                // Non-ENOENT read errors shouldn't block deletion; proceed
            }
        }

        // Delete the entry file (ignore if missing)
        try {
            await fsp.unlink(entryPath);
        } catch (err) {
            if (err && err.code !== 'ENOENT') {
                throw err;
            }
        }

        // Delete the associated image file if present
        if (imageUrl) {
            let imageFilename;
            try {
                // Support new format: /api/images/serve?filename=example.png
                if (imageUrl.includes('/api/images/serve?filename=')) {
                    const urlObj = new URL(imageUrl, 'http://localhost');
                    imageFilename = urlObj.searchParams.get('filename');
                } else {
                    // Support legacy format: /images/example.png (for backward compatibility)
                    const parsed = new URL(imageUrl, 'http://localhost');
                    const pathname = parsed.pathname || '';
                    const idx = pathname.indexOf('/images/');
                    if (idx !== -1) {
                        imageFilename = pathname.substring(idx + '/images/'.length);
                    }
                }
            } catch (_e) {
                // Fallback: try to extract filename from legacy format
                const idx = imageUrl.indexOf('/images/');
                if (idx !== -1) {
                    imageFilename = imageUrl.substring(idx + '/images/'.length);
                }
            }

            if (imageFilename) {
                const imagePath = path.join(this.imagesDir, imageFilename);
                try {
                    await fsp.unlink(imagePath);
                } catch (err) {
                    if (err && err.code !== 'ENOENT') {
                        // Ignore other errors to keep operation effectively idempotent
                    }
                }
            }
        }
    }
}

module.exports = { LocalFileStorage };


