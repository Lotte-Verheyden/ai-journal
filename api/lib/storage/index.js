const { LocalFileStorage } = require('./LocalFileStorage');
const { BlobStorage } = require('./BlobStorage');

function getStorage() {
    const modeEnv = process.env.BLOB_OR_LOCAL;
    if (!modeEnv) {
        throw new Error('BLOB_OR_LOCAL env var must be set to "local" or "blob".');
    }
    const mode = modeEnv.toLowerCase();
    if (mode === 'local') {
        return new LocalFileStorage();
    }
    if (mode === 'blob') {
        return new BlobStorage();
    }
    throw new Error(`Unknown storage provider: ${mode}. Expected "local" or "blob".`);
}

module.exports = { getStorage };


