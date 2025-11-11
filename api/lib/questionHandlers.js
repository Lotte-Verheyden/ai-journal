const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Langfuse } = require('langfuse');

// Validate required Langfuse environment variables
if (!process.env.LANGFUSE_SECRET_KEY) {
    throw new Error('LANGFUSE_SECRET_KEY is not configured. Langfuse tracing is required. Please set it in your .env file.');
}
if (!process.env.LANGFUSE_PUBLIC_KEY) {
    throw new Error('LANGFUSE_PUBLIC_KEY is not configured. Langfuse tracing is required. Please set it in your .env file.');
}

// Initialize Langfuse client
const langfuse = new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
});

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
async function callLLM(prompt, trace, generationName = 'llm-call') {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not configured. Set it in .env.local at the repo root.');
    }

    if (!process.env.QUESTION_MODEL) {
        throw new Error('QUESTION_MODEL is not configured. Please specify the AI model to use in your .env file. You can find available models at: https://openrouter.ai/models');
    }

    const model = process.env.QUESTION_MODEL;
    const messages = [{ role: 'user', content: prompt }];

    // Create generation span with trace
    const generation = trace.generation({
        name: generationName,
        model: model,
        input: messages,
        metadata: { provider: 'openrouter' }
    });

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: model,
            messages: messages,
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0].message.content;

        // Update generation with response
        generation.end({
            output: content,
            usage: response.data.usage || {}
        });

        return content;
    } catch (error) {
        generation.end({
            level: 'ERROR',
            statusMessage: error.message
        });
        throw error;
    }
}

/**
 * Handle question 1 with two-step LLM approach
 * @param {string} entryContent - The user's journal entry content
 * @param {string} journalEntrySession - Unique session ID to group all traces from one journal entry in Langfuse
 * @returns {Promise<string>} Generated question
 */
async function handle_question_1(entryContent, journalEntrySession) {
    const trace = langfuse.trace({
        name: 'question-1',
        sessionId: journalEntrySession,
        input: entryContent,
        metadata: { 
            questionType: 'follow-up-question-1'
        }
    });

    try {
        // Step 1: Categorize the question type
        const categorizationPromptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'question-1-categorization.txt'), 'utf-8');
        const categorizationPrompt = categorizationPromptTemplate.replace('{entry}', entryContent);
        
        const category = await callLLM(categorizationPrompt, trace, 'categorization');
        
        // Step 2: Load the category-specific guidelines
        const categoryGuidelines = fs.readFileSync(path.join(__dirname, 'prompts', `question-1-category-description-${category}.txt`), 'utf-8');
        
        // Step 3: Generate the question based on category
        const generationPromptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'question-1-question-prompt.txt'), 'utf-8');
        const generationPrompt = generationPromptTemplate
            .replace('{category}', category)
            .replace('{entry}', entryContent)
            .replace('{category_guidelines}', categoryGuidelines);
        
        const question = await callLLM(generationPrompt, trace, 'question-generation');
        
        trace.update({ output: question, metadata: { category } });
        
        return question;
    } catch (error) {
        console.error('Error in handle_question_1:', error);
        trace.update({ level: 'ERROR', statusMessage: error.message });
        throw error;
    } finally {
        await langfuse.flushAsync();
    }
}

/**
 * Handle question 2 with wildcard category focus
 * @param {string} entryContent - The user's journal entry content
 * @param {string} wildcardCategory - The wildcard category for this question
 * @param {string} journalEntrySession - Unique session ID to group all traces from one journal entry in Langfuse
 * @returns {Promise<string>} Generated question
 */
async function handle_question_2(entryContent, wildcardCategory, journalEntrySession) {
    const trace = langfuse.trace({
        name: 'question-2',
        sessionId: journalEntrySession,
        input: entryContent,
        metadata: { 
            wildcardCategory,
            questionType: 'follow-up-question-2'
        }
    });

    try {
        // Load the wildcard category-specific description
        const categoryDescription = fs.readFileSync(path.join(__dirname, 'prompts', `wildcard-category-description-${wildcardCategory}.txt`), 'utf-8');
        
        // Load the question-2 prompt template
        const promptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'question-2-prompt.txt'), 'utf-8');
        const prompt = promptTemplate
            .replace('{wildcard_category}', wildcardCategory)
            .replace('{entry}', entryContent)
            .replace('{wildcard_category_description}', categoryDescription);
        
        const question = await callLLM(prompt, trace, 'question-2-generation');
        
        trace.update({ output: question });
        
        return question;
    } catch (error) {
        console.error('Error in handle_question_2:', error);
        trace.update({ level: 'ERROR', statusMessage: error.message });
        throw error;
    } finally {
        await langfuse.flushAsync();
    }
}

/**
 * Handle question 3 with wildcard category focus
 * @param {string} entryContent - The user's journal entry content
 * @param {string} wildcardCategory - The wildcard category for this question
 * @param {string} journalEntrySession - Unique session ID to group all traces from one journal entry in Langfuse
 * @returns {Promise<string>} Generated question
 */
async function handle_question_3(entryContent, wildcardCategory, journalEntrySession) {
    const trace = langfuse.trace({
        name: 'question-3',
        sessionId: journalEntrySession,
        input: entryContent,
        metadata: { 
            wildcardCategory,
            questionType: 'follow-up-question-3'
        }
    });

    try {
        // Load the wildcard category-specific description
        const categoryDescription = fs.readFileSync(path.join(__dirname, 'prompts', `wildcard-category-description-${wildcardCategory}.txt`), 'utf-8');
        
        // Load the question-3 prompt template
        const promptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'question-3-prompt.txt'), 'utf-8');
        const prompt = promptTemplate
            .replace('{wildcard_category}', wildcardCategory)
            .replace('{entry}', entryContent)
            .replace('{wildcard_category_description}', categoryDescription);
        
        const question = await callLLM(prompt, trace, 'question-3-generation');
        
        trace.update({ output: question });
        
        return question;
    } catch (error) {
        console.error('Error in handle_question_3:', error);
        trace.update({ level: 'ERROR', statusMessage: error.message });
        throw error;
    } finally {
        await langfuse.flushAsync();
    }
}

/**
 * Handle bridge to image generation
 * @param {string} conversationContent - The complete conversation/journal entry content
 * @param {string} journalEntrySession - Unique session ID to group all traces from one journal entry in Langfuse
 * @returns {Promise<string>} Generated bridge message
 */
async function handle_bridge_to_image(conversationContent, journalEntrySession) {
    const trace = langfuse.trace({
        name: 'bridge-to-image',
        sessionId: journalEntrySession,
        input: conversationContent,
        metadata: { 
            questionType: 'bridge-to-image'
        }
    });

    try {
        // Load the bridge-to-image prompt template
        const promptTemplate = fs.readFileSync(path.join(__dirname, 'prompts', 'bridge-to-image-prompt.txt'), 'utf-8');
        const prompt = promptTemplate.replace('{conversation}', conversationContent);
        
        const bridgeMessage = await callLLM(prompt, trace, 'bridge-message-generation');
        
        trace.update({ output: bridgeMessage });
        
        return bridgeMessage;
    } catch (error) {
        console.error('Error in handle_bridge_to_image:', error);
        trace.update({ level: 'ERROR', statusMessage: error.message });
        throw error;
    } finally {
        await langfuse.flushAsync();
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
