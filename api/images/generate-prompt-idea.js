const { verifyToken } = require('../lib/authMiddleware');
const { handle_generate_image_prompt_idea } = require('../lib/imageHandlers');

/**
 * Generate image prompt idea endpoint
 * @param {Object} req - Request object containing body.content
 * @param {Object} res - Response object
 * @returns {Object} - Generated image idea
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
        const imageIdea = await handle_generate_image_prompt_idea(content);
        res.json({ imageIdea });
    } catch (error) {
        console.error('Error generating image prompt idea:', error);
        res.status(500).send('Error generating image prompt idea');
    }
}
