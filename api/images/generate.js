const { verifyToken } = require('../lib/authMiddleware');
const { handle_generate_image } = require('../lib/imageHandlers');

/**
 * Generate image endpoint
 * @param {Object} req - Request object containing body.prompt
 * @param {Object} res - Response object
 * @returns {Object} - Generated image result
 */
module.exports = async function handler(req, res) {
    // Verify authentication token
    if (!verifyToken(req, res)) {
        return; // verifyToken handles the error response
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).send('Prompt is required');
    }
    
    const service = process.env.IMAGE_GENERATION_SERVICE;
    if (!service) {
        return res.status(500).send('IMAGE_GENERATION_SERVICE environment variable is required. Available options: OPENAI, RECRAFT');
    }
    if (service === 'OPENAI' && !process.env.OPENAI_API_KEY) {
        return res.status(500).send('OpenAI API key not configured.');
    }
    if (service === 'RECRAFT' && !process.env.RECRAFT_API_KEY) {
        return res.status(500).send('Recraft API key not configured.');
    }

    try {
        const result = await handle_generate_image(prompt);
        res.json(result);
    } catch (error) {
        console.error("Error generating image:", error);
        res.status(500).send('Error generating image');
    }
}
