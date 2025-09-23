/**
 * Logout endpoint - client-side token removal (JWT is stateless)
 * @param {Object} req - Request object
 * @param {Object} res - Response object  
 * @returns {Object} - Success message
 */
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.json({ message: 'Logged out successfully' });
}
