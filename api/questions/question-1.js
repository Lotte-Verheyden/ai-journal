const { verifyToken } = require('../lib/authMiddleware');
const { handle_question_1 } = require('../lib/questionHandlers');

/**
 * Question 1 endpoint - AI-generated question based on entry
 * @param {Object} req - Request object containing body.content and body.journalEntrySession
 * @param {Object} req.body.content - The journal entry content
 * @param {Object} req.body.journalEntrySession - Unique session ID to group all traces from one journal entry (for Langfuse)
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

    const { content, journalEntrySession } = req.body;
    if (!content) {
        return res.status(400).send('Content is required');
    }
    if (process.env.USE_LANGFUSE === 'false' && !journalEntrySession) {
        return res.status(400).send('Journal entry session is required');
    }

    try {
        const question = await handle_question_1(content, journalEntrySession);
        res.json({ question });
    } catch (error) {
        console.error('Error with OpenRouter API for question-1:', error);
        res.status(500).send('Error generating question-1');
    }
}
