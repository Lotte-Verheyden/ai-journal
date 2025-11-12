#!/usr/bin/env node

/**
 * Initialize Langfuse Prompts
 * 
 * This script uploads all journal prompts to Langfuse for centralized prompt management.
 * All prompts use Langfuse's variable syntax with double curly brackets: {{variable_name}}
 * 
 * Run this once during initial setup: node api/scripts/init-langfuse-prompts.js
 * 
 * See LANGFUSE_VARIABLES.md for detailed documentation on how variables work.
 */

const { Langfuse } = require('langfuse');
const fs = require('fs');
const path = require('path');

// Load .env from project root (works from any directory)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Validate environment variables
if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    console.error('❌ Error: LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY must be set in your .env file');
    process.exit(1);
}

const langfuse = new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
});

const promptsDir = path.join(__dirname, '../lib/prompts');

// Define all prompts with their metadata
// Using folder structure with slashes (/) to organize prompts in Langfuse
const prompts = [
    // Bridge and Image prompts
    {
        name: 'bridge-to-image/message',
        file: 'bridge-to-image-prompt.txt',
        description: 'Creates a warm transition message from journaling to image generation',
        tags: ['bridge', 'image']
    },
    {
        name: 'image/prompt-idea',
        file: 'image-prompt.txt',
        description: 'Generates a poetic, metaphorical image prompt based on the journal entry',
        tags: ['image', 'prompt-generation']
    },
    
    // Question 1: Follow-up question with categorization
    {
        name: 'question-1/categorization',
        file: 'question-1-categorization.txt',
        description: 'Analyzes journal entry and categorizes it into REFRAMER, CHALLENGER, META REFLECTOR, or DEEPENER',
        tags: ['question-1', 'categorization']
    },
    {
        name: 'question-1/question-generation',
        file: 'question-1-question-prompt.txt',
        description: 'Generates the actual follow-up question based on the category',
        tags: ['question-1', 'generation']
    },
    {
        name: 'question-1/category-CHALLENGER',
        file: 'question-1-category-description-CHALLENGER.txt',
        description: 'Guidelines for CHALLENGER category questions',
        tags: ['question-1', 'category', 'challenger']
    },
    {
        name: 'question-1/category-DEEPENER',
        file: 'question-1-category-description-DEEPENER.txt',
        description: 'Guidelines for DEEPENER category questions',
        tags: ['question-1', 'category', 'deepener']
    },
    {
        name: 'question-1/category-META-REFLECTOR',
        file: 'question-1-category-description-META REFLECTOR.txt',
        description: 'Guidelines for META REFLECTOR category questions',
        tags: ['question-1', 'category', 'meta-reflector']
    },
    {
        name: 'question-1/category-REFRAMER',
        file: 'question-1-category-description-REFRAMER.txt',
        description: 'Guidelines for REFRAMER category questions',
        tags: ['question-1', 'category', 'reframer']
    },
    
    // Question 2: Wildcard category
    {
        name: 'question-2/main',
        file: 'question-2-prompt.txt',
        description: 'Generates question 2 with wildcard category focus',
        tags: ['question-2', 'wildcard']
    },
    {
        name: 'question-2/wildcard-ENVIRONMENT-PLACES',
        file: 'wildcard-category-description-ENVIRONMENT_PLACES.txt',
        description: 'Wildcard category: Environment & Places',
        tags: ['question-2', 'wildcard', 'environment']
    },
    {
        name: 'question-2/wildcard-GRATITUDE-HIGHLIGHTS',
        file: 'wildcard-category-description-GRATITUDE_HIGHLIGHTS.txt',
        description: 'Wildcard category: Gratitude & Highlights',
        tags: ['question-2', 'wildcard', 'gratitude']
    },
    {
        name: 'question-2/wildcard-IMAGINATION-METAPHOR',
        file: 'wildcard-category-description-IMAGINATION_METAPHOR.txt',
        description: 'Wildcard category: Imagination & Metaphor',
        tags: ['question-2', 'wildcard', 'imagination']
    },
    {
        name: 'question-2/wildcard-LEARNING-GROWTH',
        file: 'wildcard-category-description-LEARNING_GROWTH.txt',
        description: 'Wildcard category: Learning & Growth',
        tags: ['question-2', 'wildcard', 'learning']
    },
    {
        name: 'question-2/wildcard-MICROMOMENTS-JOYS',
        file: 'wildcard-category-description-MICROMOMENTS_JOYS.txt',
        description: 'Wildcard category: Micromoments & Joys',
        tags: ['question-2', 'wildcard', 'micromoments']
    },
    {
        name: 'question-2/wildcard-PEOPLE-RELATIONSHIPS',
        file: 'wildcard-category-description-PEOPLE_RELATIONSHIPS.txt',
        description: 'Wildcard category: People & Relationships',
        tags: ['question-2', 'wildcard', 'relationships']
    },
    {
        name: 'question-2/wildcard-SENSES-EMBODIMENT',
        file: 'wildcard-category-description-SENSES_EMBODIMENT.txt',
        description: 'Wildcard category: Senses & Embodiment',
        tags: ['question-2', 'wildcard', 'senses']
    },
    
    // Question 3: Wildcard category
    {
        name: 'question-3/main',
        file: 'question-3-prompt.txt',
        description: 'Generates question 3 with wildcard category focus',
        tags: ['question-3', 'wildcard']
    },
    {
        name: 'question-3/wildcard-ENVIRONMENT-PLACES',
        file: 'wildcard-category-description-ENVIRONMENT_PLACES.txt',
        description: 'Wildcard category: Environment & Places',
        tags: ['question-3', 'wildcard', 'environment']
    },
    {
        name: 'question-3/wildcard-GRATITUDE-HIGHLIGHTS',
        file: 'wildcard-category-description-GRATITUDE_HIGHLIGHTS.txt',
        description: 'Wildcard category: Gratitude & Highlights',
        tags: ['question-3', 'wildcard', 'gratitude']
    },
    {
        name: 'question-3/wildcard-IMAGINATION-METAPHOR',
        file: 'wildcard-category-description-IMAGINATION_METAPHOR.txt',
        description: 'Wildcard category: Imagination & Metaphor',
        tags: ['question-3', 'wildcard', 'imagination']
    },
    {
        name: 'question-3/wildcard-LEARNING-GROWTH',
        file: 'wildcard-category-description-LEARNING_GROWTH.txt',
        description: 'Wildcard category: Learning & Growth',
        tags: ['question-3', 'wildcard', 'learning']
    },
    {
        name: 'question-3/wildcard-MICROMOMENTS-JOYS',
        file: 'wildcard-category-description-MICROMOMENTS_JOYS.txt',
        description: 'Wildcard category: Micromoments & Joys',
        tags: ['question-3', 'wildcard', 'micromoments']
    },
    {
        name: 'question-3/wildcard-PEOPLE-RELATIONSHIPS',
        file: 'wildcard-category-description-PEOPLE_RELATIONSHIPS.txt',
        description: 'Wildcard category: People & Relationships',
        tags: ['question-3', 'wildcard', 'relationships']
    },
    {
        name: 'question-3/wildcard-SENSES-EMBODIMENT',
        file: 'wildcard-category-description-SENSES_EMBODIMENT.txt',
        description: 'Wildcard category: Senses & Embodiment',
        tags: ['question-3', 'wildcard', 'senses']
    },
    
    // Legacy
    {
        name: 'legacy/buddhist-monk',
        file: 'prompt.txt',
        description: 'Legacy prompt (not currently used)',
        tags: ['legacy']
    }
];

async function initializePrompts() {
    console.log('🚀 Starting Langfuse prompt initialization...\n');
    
    let successCount = 0;
    let errorCount = 0;

    for (const promptConfig of prompts) {
        try {
            const filePath = path.join(promptsDir, promptConfig.file);
            const content = fs.readFileSync(filePath, 'utf-8');

            console.log(`📝 Creating prompt: ${promptConfig.name}`);
            
            await langfuse.createPrompt({
                name: promptConfig.name,
                prompt: content,
                labels: ['production'],  // Set production label so prompts are immediately available
                tags: promptConfig.tags,  // Use tags field for categorization
                config: {
                    description: promptConfig.description
                }
            });

            console.log(`✅ Successfully created: ${promptConfig.name}\n`);
            successCount++;
        } catch (error) {
            console.error(`❌ Error creating ${promptConfig.name}:`, error.message, '\n');
            errorCount++;
        }
    }

    // Flush to ensure all data is sent
    await langfuse.flushAsync();

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Initialization complete!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${errorCount}`);
    console.log('='.repeat(60));
    console.log('\n💡 Next steps:');
    console.log('   1. Visit your Langfuse dashboard to verify the prompts');
    console.log('   2. You can now edit prompts directly in Langfuse');
    console.log('   3. Changes will be reflected in your journal automatically\n');

    if (errorCount > 0) {
        process.exit(1);
    }
}

// Run the initialization
initializePrompts().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

