const { verifyToken } = require('../lib/authMiddleware');
const { handle_bridge_to_image } = require('../lib/questionHandlers');

/**
 * Bridge to image endpoint - generates transition message to image creation
 * @param {Object} req - Request object containing body.content and body.journalEntrySession
 * @param {Object} req.body.content - The complete conversation/journal entry content
 * @param {Object} req.body.journalEntrySession - Unique session ID to group all traces from one journal entry (for Langfuse)
 * @param {Object} res - Response object
 * @returns {Object} - Generated bridge message
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
    if (!journalEntrySession) {
        return res.status(400).send('Journal entry session is required for Langfuse tracing');
    }

    try {
        const bridgeMessage = await handle_bridge_to_image(content, journalEntrySession);
        res.json({ bridgeMessage });
    } catch (error) {
        console.error('Error generating bridge message:', error);
        res.status(500).send('Error generating bridge message');
    }
}
