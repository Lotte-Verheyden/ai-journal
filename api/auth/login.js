const { generateToken } = require('../lib/authMiddleware');

/**
 * Login endpoint - verify password and return JWT token
 * @param {Object} req - Request object containing body.password
 * @param {Object} res - Response object
 * @returns {Object} - JWT token if successful, error if failed
 */
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }
    
    if (password !== process.env.AUTH_PASSWORD) {
        return res.status(401).json({ error: 'Invalid password' });
    }
    
    const token = generateToken({ authenticated: true });
    res.json({ token });
}
