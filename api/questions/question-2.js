const { verifyToken } = require('../lib/authMiddleware');
const { handle_question_2 } = require('../lib/questionHandlers');

/**
 * Question 2 endpoint - AI-generated question with wildcard category focus
 * @param {Object} req - Request object containing body.content, body.randomItem, and body.journalEntrySession
 * @param {Object} req.body.content - The journal entry content
 * @param {Object} req.body.randomItem - The wildcard category for this question
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

    const { content, randomItem, journalEntrySession } = req.body;
    if (!content) {
        return res.status(400).send('Content is required');
    }
    if (!randomItem) {
        return res.status(400).send('Random item is required');
    }
    if (!journalEntrySession) {
        return res.status(400).send('Journal entry session is required');
    }

    try {
        const question = await handle_question_2(content, randomItem, journalEntrySession);
        res.json({ question });
    } catch (error) {
        console.error('Error generating question-2:', error);
        res.status(500).send('Error generating question-2');
    }
}
