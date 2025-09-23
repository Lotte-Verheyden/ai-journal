const { verifyToken } = require('../lib/authMiddleware');
const { handle_question_1 } = require('../lib/questionHandlers');

/**
 * Question 1 endpoint - AI-generated question based on entry
 * @param {Object} req - Request object containing body.content
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

    const { content } = req.body;
    if (!content) {
        return res.status(400).send('Content is required');
    }

    try {
        const question = await handle_question_1(content);
        res.json({ question });
    } catch (error) {
        console.error('Error with OpenRouter API for question-1:', error);
        res.status(500).send('Error generating question-1');
    }
}
