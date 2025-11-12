const axios = require('axios');
const OpenAI = require('openai');
const { Langfuse } = require('langfuse');
const { getStorage } = require('./storage');

const storage = getStorage();

// Initialize Langfuse client
const langfuse = new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
});

// Helper function to get prompt from Langfuse
async function getPrompt(promptName) {
    try {
        const prompt = await langfuse.getPrompt(promptName);
        return prompt; // Return the full prompt object which has .compile() method
    } catch (error) {
        console.error(`Error fetching prompt "${promptName}" from Langfuse:`, error);
        throw new Error(`Failed to fetch prompt "${promptName}". Make sure you've run the prompt initialization script: node api/scripts/init-langfuse-prompts.js`);
    }
}

// Helper function to make LLM calls
async function callLLM(prompt, variables) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not configured. Set it in your .env file.');
    }

    if (!process.env.IMAGE_IDEA_MODEL) {
        throw new Error('IMAGE_IDEA_MODEL is not configured. Please specify the AI model to use for image prompt generation in your .env file. You can find available models at: https://openrouter.ai/models');
    }

    // Compile the prompt with variables
    const promptText = prompt.compile(variables);

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: process.env.IMAGE_IDEA_MODEL,
        messages: [{ role: 'user', content: promptText }],
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
        // Load the image prompt template from Langfuse and call LLM
        const promptTemplate = await getPrompt('image/prompt-idea');
        const imageIdea = await callLLM(promptTemplate, { entry: entryContent });
        
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
    if (!process.env.OPENAI_IMAGE_MODEL) {
        throw new Error('OPENAI_IMAGE_MODEL is not configured. Please specify the OpenAI image model to use in your .env file (e.g., dall-e-3).');
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.images.generate({
        model: process.env.OPENAI_IMAGE_MODEL,
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

    if (!process.env.RECRAFT_IMAGE_MODEL) {
        throw new Error('RECRAFT_IMAGE_MODEL is not configured. Please specify the Recraft image model to use in your .env file (e.g., recraftv3).');
    }

    const response = await axios.post(
        'https://external.api.recraft.ai/v1/images/generations',
        {
            prompt: prompt,
            style: 'digital_illustration',
            substyle: 'neon_calm',
            model: process.env.RECRAFT_IMAGE_MODEL,
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
