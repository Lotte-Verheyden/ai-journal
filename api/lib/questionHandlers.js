const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Wildcard categories enums
const WILDCARD_CATEGORIES = {
    SENSES_EMBODIMENT: 'SENSES_EMBODIMENT',
    PEOPLE_RELATIONSHIPS: 'PEOPLE_RELATIONSHIPS',
    ENVIRONMENT_PLACES: 'ENVIRONMENT_PLACES',
    MICROMOMENTS_JOYS: 'MICROMOMENTS_JOYS',
    LEARNING_GROWTH: 'LEARNING_GROWTH',
    GRATITUDE_HIGHLIGHTS: 'GRATITUDE_HIGHLIGHTS',
    IMAGINATION_METAPHOR: 'IMAGINATION_METAPHOR'
};

// Get all wildcard category values as an array
const getAllWildcardCategories = () => Object.values(WILDCARD_CATEGORIES);

// Helper function to make LLM calls
async function callLLM(prompt) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not configured. Set it in .env.local at the repo root.');
    }
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

// Handle question 1 with two-step LLM approach
async function handle_question_1(entryContent) {
    try {
        // Step 1: Categorize the question type
        const categorizationPromptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'question-1-categorization.txt'), 'utf-8');
        const categorizationPrompt = categorizationPromptTemplate.replace('{entry}', entryContent);
        
        const category = await callLLM(categorizationPrompt);
        
        // Step 2: Load the category-specific guidelines
        const categoryGuidelines = fs.readFileSync(path.join(__dirname, 'prompts', `question-1-category-description-${category}.txt`), 'utf-8');
        
        // Step 3: Generate the question based on category
        const generationPromptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'question-1-question-prompt.txt'), 'utf-8');
        const generationPrompt = generationPromptTemplate
            .replace('{category}', category)
            .replace('{entry}', entryContent)
            .replace('{category_guidelines}', categoryGuidelines);
        
        const question = await callLLM(generationPrompt);
        
        return question;
    } catch (error) {
        console.error('Error in handle_question_1:', error);
        throw error;
    }
}

// Handle question 2 with wildcard category focus
async function handle_question_2(entryContent, wildcardCategory) {
    try {
        // Load the wildcard category-specific description
        const categoryDescription = fs.readFileSync(path.join(__dirname, 'prompts', `wildcard-category-description-${wildcardCategory}.txt`), 'utf-8');
        
        // Load the question-2 prompt template
        const promptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'question-2-prompt.txt'), 'utf-8');
        const prompt = promptTemplate
            .replace('{wildcard_category}', wildcardCategory)
            .replace('{entry}', entryContent)
            .replace('{wildcard_category_description}', categoryDescription);
        
        const question = await callLLM(prompt);
        
        return question;
    } catch (error) {
        console.error('Error in handle_question_2:', error);
        throw error;
    }
}

// Handle question 3 with wildcard category focus
async function handle_question_3(entryContent, wildcardCategory) {
    try {
        // Load the wildcard category-specific description
        const categoryDescription = fs.readFileSync(path.join(__dirname, 'prompts', `wildcard-category-description-${wildcardCategory}.txt`), 'utf-8');
        
        // Load the question-3 prompt template
        const promptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'question-3-prompt.txt'), 'utf-8');
        const prompt = promptTemplate
            .replace('{wildcard_category}', wildcardCategory)
            .replace('{entry}', entryContent)
            .replace('{wildcard_category_description}', categoryDescription);
        
        const question = await callLLM(prompt);
        
        return question;
    } catch (error) {
        console.error('Error in handle_question_3:', error);
        throw error;
    }
}

// Handle bridge to image generation
async function handle_bridge_to_image(conversationContent) {
    try {
        // Load the bridge-to-image prompt template
        const promptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'bridge-to-image-prompt.txt'), 'utf-8');
        const prompt = promptTemplate.replace('{conversation}', conversationContent);
        
        const bridgeMessage = await callLLM(prompt);
        
        return bridgeMessage;
    } catch (error) {
        console.error('Error in handle_bridge_to_image:', error);
        throw error;
    }
}

// Handle random 2 wildcard categories selection
function handle_random_2() {
    try {
        const allCategories = getAllWildcardCategories();
        
        // Shuffle array and take first 2 items
        const shuffled = [...allCategories].sort(() => 0.5 - Math.random());
        const selectedItems = shuffled.slice(0, 2);
        
        return selectedItems;
    } catch (error) {
        console.error('Error in handle_random_2:', error);
        throw error;
    }
}

module.exports = {
    handle_question_1,
    handle_question_2,
    handle_question_3,
    handle_bridge_to_image,
    handle_random_2,
    WILDCARD_CATEGORIES,
    getAllWildcardCategories
};
