const fs = require('fs');
const path = require('path');
const axios = require('axios');
const OpenAI = require('openai');
const { getStorage } = require('./storage');

const storage = getStorage();

// Helper function to make LLM calls
async function callLLM(prompt) {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'google/gemini-2.5-flash-lite-preview-06-17',
        messages: [{ role: 'user', content: prompt }],
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.choices[0].message.content;
}

// Handle image prompt idea generation
async function handle_generate_image_prompt_idea(entryContent) {
    try {
        // Load the image prompt template
        const promptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'image-prompt.txt'), 'utf-8');
        const prompt = promptTemplate.replace('{entry}', entryContent);
        
        const imageIdea = await callLLM(prompt);
        
        return imageIdea;
    } catch (error) {
        console.error('Error in handle_generate_image_prompt_idea:', error);
        throw error;
    }
}

// Handle image generation
async function handle_generate_image(prompt) {
    try {
        const service = process.env.IMAGE_GENERATION_SERVICE;
        
        if (!service) {
            throw new Error('IMAGE_GENERATION_SERVICE environment variable is required. Available options: OPENAI, RECRAFT');
        }
        
        if (service === 'OPENAI') {
            return await handle_openai_image_generation(prompt);
        } else if (service === 'RECRAFT') {
            return await handle_recraft_image_generation(prompt);
        } else {
            throw new Error(`Invalid image generation service: ${service}. Available options: OPENAI, RECRAFT`);
        }
    } catch (error) {
        console.error("Error with Image Generation:", error);
        throw error;
    }
}

// Handle OpenAI image generation
async function handle_openai_image_generation(prompt) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
    });

    const id = `${Date.now()}`;
    const imageData = Buffer.from(response.data[0].b64_json, 'base64');
    const saved = await storage.saveImage({ id, buffer: imageData, contentType: 'image/png', extension: 'png' });
    const imageUrl = await storage.getImageUrl(saved.id);
    return { imageUrl };
}

// Handle Recraft image generation
async function handle_recraft_image_generation(prompt) {
    const recraftApiKey = process.env.RECRAFT_API_KEY;
    if (!recraftApiKey) {
        throw new Error('RECRAFT_API_KEY not configured');
    }

    const response = await axios.post(
        'https://external.api.recraft.ai/v1/images/generations',
        {
            prompt: prompt,
            style: 'digital_illustration',
            substyle: 'neon_calm',
            model: 'recraftv3',
        },
        {
            headers: {
                'Authorization': `Bearer ${recraftApiKey}`,
                'Content-Type': 'application/json',
            },
        }
    );

    const imageUrlRemote = response.data.data[0].url;
    const id = `${Date.now()}`;
    const imageResponse = await axios.get(imageUrlRemote, { responseType: 'arraybuffer' });
    const saved = await storage.saveImage({ id, buffer: imageResponse.data, contentType: 'image/png', extension: 'png' });
    const imageUrl = await storage.getImageUrl(saved.id);
    return { imageUrl };
}

module.exports = {
    handle_generate_image_prompt_idea,
    handle_generate_image
};
