const jwt = require('jsonwebtoken');

// JWT secret from environment variable - required
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Verify JWT token from Authorization header (for serverless functions)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} - True if authenticated, false if not (and response sent)
 */
function verifyToken(req, res) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return false;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Add user info to request object
        return true;
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
        return false;
    }
}

/**
 * Generate JWT token for authenticated user
 * @param {Object} payload - Data to include in token
 * @returns {string} - JWT token string
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

module.exports = {
    verifyToken,
    generateToken
};
