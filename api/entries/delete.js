const { verifyToken } = require('../lib/authMiddleware');
const { getStorage } = require('../lib/storage');

/**
 * Delete entry endpoint - removes an entry and associated image
 * @param {Object} req - Request object containing body.id
 * @param {Object} res - Response object
 * @returns {void} - 204 status on success
 */
module.exports = async function handler(req, res) {
    // Verify authentication token
    if (!verifyToken(req, res)) {
        return; // verifyToken handles the error response
    }

    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const storage = getStorage();
    
    try {
        const { id } = req.body || {};
        if (!id) {
            return res.status(400).send('id is required in request body');
        }
        await storage.deleteEntry(id);
        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting entry and image:', error);
        return res.status(500).send('Error deleting entry and image');
    }
}
