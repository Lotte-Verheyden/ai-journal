const { verifyToken } = require('../lib/authMiddleware');
const { getStorage } = require('../lib/storage');

/**
 * Entries endpoint - handles GET (list entries) and POST (create entry)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} - Entries list or created entry ID
 */
module.exports = async function handler(req, res) {
    // Verify authentication token
    if (!verifyToken(req, res)) {
        return; // verifyToken handles the error response
    }

    const storage = getStorage();

    if (req.method === 'GET') {
        try {
            const entries = await storage.listEntries();
            res.json(entries);
        } catch (error) {
            console.error('Error reading entries:', error);
            res.status(500).send('Error reading entries');
        }
    } else if (req.method === 'POST') {
        const { content, imagePrompt, imageUrl } = req.body;
        if (!content) {
            return res.status(400).send('Content is required');
        }

        let finalContent = content;
        if (imagePrompt && imageUrl) {
            finalContent += `\n\n---\nImage Prompt: ${imagePrompt}\nImage URL: ${imageUrl}`;
        }

        const numericId = Date.now().toString();
        try {
            const result = await storage.saveEntry({ 
                id: numericId, 
                content: finalContent, 
                createdAt: new Date().toISOString() 
            });
            res.status(201).send({ id: result.id });
        } catch (error) {
            console.error('Error saving entry:', error);
            res.status(500).send('Error saving entry');
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
