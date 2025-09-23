const { verifyToken } = require('../lib/authMiddleware');
const { handle_random_2 } = require('../lib/questionHandlers');

/**
 * Wildcard categories endpoint - returns 2 random wildcard categories
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} - Array of 2 random wildcard items
 */
module.exports = async function handler(req, res) {
    // Verify authentication token
    if (!verifyToken(req, res)) {
        return; // verifyToken handles the error response
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const selectedItems = handle_random_2();
        res.json({ items: selectedItems });
    } catch (error) {
        console.error('Error getting random wildcard categories:', error);
        res.status(500).send('Error getting random wildcard categories');
    }
}
