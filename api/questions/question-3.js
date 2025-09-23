const { verifyToken } = require('../lib/authMiddleware');
const { handle_question_3 } = require('../lib/questionHandlers');

/**
 * Question 3 endpoint - AI-generated question with wildcard category focus
 * @param {Object} req - Request object containing body.content and body.randomItem
 * @param {Object} res - Response object
 * @returns {Object} - Generated question
 */
module.exports = async function handler(req, res) {
    // Verify authentication token
    if (!verifyToken(req, res)) {
        return; // verifyToken handles the error response
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { content, randomItem } = req.body;
    if (!content) {
        return res.status(400).send('Content is required');
    }
    if (!randomItem) {
        return res.status(400).send('Random item is required');
    }

    try {
        const question = await handle_question_3(content, randomItem);
        res.json({ question });
    } catch (error) {
        console.error('Error generating question-3:', error);
        res.status(500).send('Error generating question-3');
    }
}
