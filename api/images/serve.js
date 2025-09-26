const { getStorage } = require('../lib/storage');
const fs = require('fs');
const path = require('path');

/**
 * Serve images from local file storage
 * This endpoint only works when BLOB_OR_LOCAL is set to "local"
 * Usage: /api/images/serve?filename=example.png
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Only serve images for local storage mode
    const modeEnv = process.env.BLOB_OR_LOCAL;
    if (!modeEnv || modeEnv.toLowerCase() !== 'local') {
        return res.status(404).json({ error: 'Image serving only available in local storage mode' });
    }

    try {
        const { filename } = req.query;
        if (!filename) {
            return res.status(400).json({ error: 'Filename parameter is required' });
        }

        // Get the data directory from environment
        const dataDirEnv = process.env.DATA_DIR;
        if (!dataDirEnv) {
            return res.status(500).json({ error: 'DATA_DIR environment variable not set' });
        }

        // Construct the full path to the image
        const dataDir = path.resolve(process.cwd(), dataDirEnv);
        const imagesDir = path.join(dataDir, 'images');
        const imagePath = path.join(imagesDir, filename);

        // Security check: ensure the requested file is within the images directory
        const normalizedImagePath = path.normalize(imagePath);
        const normalizedImagesDir = path.normalize(imagesDir);
        if (!normalizedImagePath.startsWith(normalizedImagesDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check if file exists
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Determine content type based on file extension
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        switch (ext) {
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
            case '.webp':
                contentType = 'image/webp';
                break;
        }

        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

        // Stream the file
        const fileStream = fs.createReadStream(imagePath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('Error streaming image:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error serving image' });
            }
        });

    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
