<script>
  import { onMount, tick } from 'svelte';
  import { dynamicColorManager } from './dynamicColors/dynamicColorManager.js';
  import { authStore } from './authStore.js';

  // Step enum
  const STEPS = {
    WAITING_FOR_ENTRY: 'initial_entry',
    QUESTION_1: 'llm_question',
    QUESTION_2: 'static_question_0',
    QUESTION_3: 'static_question_1',
    IMAGE_IDEA: 'image_idea',
    FINISHED: 'finished'
  };

  // Props
  export let onEntrySaved = (entry) => {};

  // Conversational state
  let conversation = []; // { type: 'question' | 'answer', content: '...' }
  let currentInput = '';
  let currentStep = STEPS.WAITING_FOR_ENTRY;
  let isLoading = false;
  let savedEntryContent = '';
  let imageIdea = '';
  let generatedImageUrl = null;
  let errorMessage = null;
  let bridgeMessage = '';

  // Data
  let randomItems = [];
  
  // For focusing elements
  let activeTextarea;

  /**
   * Get auth headers for API requests
   * @returns {Object} Headers object with Authorization
   */
  function getAuthHeaders() {
    const token = authStore.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Handle authentication errors
   * @param {Response} response - Fetch response object
   * @returns {boolean} True if auth error was handled
   */
  function handleAuthError(response) {
    if (response.status === 401) {
      authStore.handleAuthError();
      return true;
    }
    return false;
  }

  /**
   * Generic API call helper that handles common patterns
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options (method, headers, body, etc.)
   * @param {string} errorContext - Context for error messages
   * @returns {Promise<any>} Returns data directly on success, throws on failure
   */
  async function apiCall(url, options = {}, errorContext = 'API call') {
    try {
      const res = await fetch(url, options);
      
      if (res.ok) {
        return await res.json();
      } else if (handleAuthError(res)) {
        throw new Error('Authentication error');
      } else {
        const errorText = await res.text();
        throw new Error(`${errorContext}: ${errorText}`);
      }
    } catch (error) {
      // Set error message and re-throw
      errorMessage = error.message;
      throw error;
    }
  }

  onMount(async () => {
    // Fetch random wildcard question categories
    try {
      const data = await apiCall('/api/questions/wildcards-random-2', {
        headers: getAuthHeaders()
      }, 'Failed to fetch random wildcard question categories');
      
      randomItems = data.items;
      console.log('Random wildcard question categories fetched:', randomItems);
    } catch (error) {
      return; // errorMessage already set by apiCall, this just stops the flow
    }
    
    await tick();
    activeTextarea?.focus();
  });

  async function handleNextStep() {
    if (currentInput.trim() === '') return;
    errorMessage = null;

    // Add current user input to conversation
    conversation = [...conversation, { type: 'answer', content: currentInput }];
    currentInput = '';
    isLoading = true;
    await tick();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    if (currentStep === STEPS.WAITING_FOR_ENTRY) {
      currentStep = STEPS.QUESTION_1;
      const initialEntry = conversation[0].content;
      
      try {
        const data = await apiCall('/api/questions/question-1', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ content: initialEntry }),
        }, 'Error getting question');

        conversation = [...conversation, { type: 'question', content: data.question }];
      } catch (error) {
        return; // errorMessage already set by apiCall, this just stops the flow
      }

    } else if (currentStep === STEPS.QUESTION_1) {
      currentStep = STEPS.QUESTION_2;
      const currentContent = formatConversationForSave();
      
      try {
        const data = await apiCall('/api/questions/question-2', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            content: currentContent,
            randomItem: randomItems[0]
          }),
        }, 'Error getting question');

        conversation = [...conversation, { type: 'question', content: data.question }];
      } catch (error) {
        return; // errorMessage already set by apiCall, this just stops the flow
      }
    
    } else if (currentStep === STEPS.QUESTION_2) {
      currentStep = STEPS.QUESTION_3;
      const currentContent = formatConversationForSave();
      
      try {
        const data = await apiCall('/api/questions/question-3', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            content: currentContent,
            randomItem: randomItems[1]
          }),
        }, 'Error getting question');

        conversation = [...conversation, { type: 'question', content: data.question }];
      } catch (error) {
        return; // errorMessage already set by apiCall, this just stops the flow
      }

    } else if (currentStep === STEPS.QUESTION_3) {
      currentStep = STEPS.IMAGE_IDEA;
      isLoading = true;
      
      // Get bridge message first
      const currentContent = formatConversationForSave();
      try {
        const data = await apiCall('/api/questions/bridge-to-image', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ content: currentContent }),
        }, 'Error getting bridge message');

        bridgeMessage = data.bridgeMessage;
        // Add bridge message to conversation
        conversation = [...conversation, { type: 'question', content: bridgeMessage }];
      } catch (error) {
        return; // errorMessage already set by apiCall, this just stops the flow
      }
      
      // Now format the complete conversation including the bridge message
      savedEntryContent = formatConversationForSave();
      await generateImageIdea(savedEntryContent);
      
      // Don't add the image idea to conversation yet - user will edit it first
      
      isLoading = false;

    }
    
    isLoading = false;
    await tick();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    activeTextarea?.focus();
  }

  async function handleKeydown(event) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      await handleNextStep();
    }
  }

  function formatConversationForSave() {
    let text = '';
    // The first answer is the initial entry
    text += conversation[0].content;

    for (let i = 1; i < conversation.length; i += 2) {
      const question = conversation[i].content;
      const answer = conversation[i + 1] ? conversation[i + 1].content : '';
      text += `\n\n> ${question}\n\n${answer}`;
    }
    return text;
  }

  async function generateImageIdea(entryContent) {
    try {
      const data = await apiCall('/api/images/generate-prompt-idea', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: entryContent }),
      }, 'Failed to get a response from the server');

      imageIdea = data.imageIdea;
    } catch (error) {
      console.error('Error generating image idea:', error);
      errorMessage = 'I had some trouble generating an image idea. You can still save your entry below.';
      imageIdea = '';
    }
  }

  async function generateImage() {
    isLoading = true;
    errorMessage = null;
    
    // Add the final image idea to conversation
    conversation = [...conversation, { type: 'answer', content: imageIdea }];
    
    try {
      const data = await apiCall('/api/images/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt: imageIdea }),
      }, 'Failed to generate image');

      generatedImageUrl = data.imageUrl;
      // Move to FINISHED step after successful image generation
      currentStep = STEPS.FINISHED;
      // Refresh background to ensure it's still applied
      dynamicColorManager.forceUpdate();
    } catch (error) {
      console.error('Error in generateImage:', error);
      errorMessage = `I had some trouble creating the image: ${error.message}`;
    }
    
    isLoading = false;
  }

  async function handleSubmit() {
    const contentToSave = formatConversationForSave();
    
    try {
      const newEntry = await apiCall('/api/entries/entries', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          content: contentToSave,
          imagePrompt: imageIdea,
          imageUrl: generatedImageUrl
        }),
      }, 'Error saving entry');
      
      let fullContentForState = contentToSave;
      if (imageIdea && generatedImageUrl) {
          fullContentForState += `\n\n---\nImage Prompt: ${imageIdea}\nImage URL: ${generatedImageUrl}`;
      }
      
      // Call the parent callback with the new entry
      onEntrySaved({ id: newEntry.id, content: fullContentForState });
      
      // Reset state
      conversation = [];
      savedEntryContent = '';
      imageIdea = '';
      generatedImageUrl = null;
      errorMessage = null;
      bridgeMessage = '';
      currentStep = STEPS.WAITING_FOR_ENTRY;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      // errorMessage already set by apiCall
    }
  }

  let currentDate = new Date().toLocaleString();
</script>

<main class="centered-view">
  <h1>Welcome back, Lotte</h1>
  
  {#if currentStep === STEPS.FINISHED}
    <div class="conversation-container">
      {#each conversation as item, i}
        {#if item.type === 'answer'}
          <div class="submitted-content">
            <p>{item.content}</p>
          </div>
        {:else if item.type === 'question'}
          <div class="llm-question fade-in">
            <p>{item.content}</p>
          </div>
        {/if}
      {/each}
    </div>
    
    {#if generatedImageUrl}
      <div class="generated-image-container fade-in">
        <img src={generatedImageUrl} alt="Generated illustration for your journal entry" />
      </div>
    {/if}
    {#if errorMessage}
      <div class="error-message">{errorMessage}</div>
      <button on:click={handleSubmit} class="submit-button">Save Anyway</button>
    {:else}
      <button on:click={handleSubmit} class="submit-button">Save Journal</button>
    {/if}
  {:else if currentStep === STEPS.IMAGE_IDEA}
    <div class="conversation-container image-idea-step">
      {#each conversation as item, i}
        {#if item.type === 'answer'}
          <div class="submitted-content">
            <p>{item.content}</p>
          </div>
        {:else if item.type === 'question'}
          <div class="llm-question fade-in">
            <p>{item.content}</p>
          </div>
        {/if}
      {/each}
    </div>

    {#if errorMessage}
      <div class="error-message">{errorMessage}</div>
      <button on:click={() => { errorMessage = null; currentStep = STEPS.WAITING_FOR_ENTRY; conversation = []; }} class="submit-button">Start Over</button>
    {:else if isLoading}
      <div class="loading-indicator">Thinking...</div>
    {:else if imageIdea}
      <div class="image-idea-actions">
        <textarea bind:value={imageIdea} class="image-idea-textarea" placeholder="Edit your image prompt..."></textarea>
        <button on:click={generateImage} class="submit-button">Generate Image</button>
      </div>
    {/if}
  {:else}
    <div class="conversation-container">
      {#each conversation as item, i}
        {#if item.type === 'answer'}
          <div class="submitted-content">
            <p>{item.content}</p>
          </div>
        {:else if item.type === 'question'}
          <div class="llm-question fade-in">
            <p>{item.content}</p>
          </div>
        {/if}
      {/each}
    </div>

    {#if currentStep !== STEPS.FINISHED}
      {#if errorMessage}
        <div class="error-message">{errorMessage}</div>
        <button on:click={() => { errorMessage = null; currentStep = STEPS.WAITING_FOR_ENTRY; conversation = []; }} class="submit-button">Start Over</button>
      {:else if isLoading}
        <div class="loading-indicator">Thinking...</div>
      {:else}
        <form on:submit|preventDefault={handleNextStep} class="entry-form">
          <textarea bind:this={activeTextarea} bind:value={currentInput} on:keydown={handleKeydown} placeholder={conversation.length === 0 ? 'Start typing to tell me about your day..' : 'Your answer..'}></textarea>
        </form>
      {/if}
    {/if}
  {/if}
</main>

<style>
  .centered-view {
    max-width: 1000px;
    margin: 10rem auto 0 auto;
    padding: 2rem 2rem 2rem 4rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-height: calc(100vh - 8rem);
  }

  h1 {
    font-weight: 300;
    font-size: 3.5em;
    color: white;
    margin: 0 0 60px 0;
    text-align: center;
    flex-shrink: 0;
    width: 100%;
  }

  textarea {
    font-family: 'Caveat', cursive;
    width: 100%;
    background: transparent;
    border: none;
    color: #e0e0e0;
    font-size: 1.8em;
    text-align: left;
    resize: none;
    flex-grow: 1;
    min-height: calc(100vh - 300px);
    overflow-y: auto;
  }
  
  textarea::placeholder {
    color: rgba(224, 224, 224, 0.5);
  }

  textarea:focus {
    outline: none;
  }

  .entry-form {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 900px;
    margin: 0;
    padding: 0;
    flex-grow: 1;
    min-height: calc(100vh - 200px);
  }

  .submit-button {
    background-color: var(--accent-color);
    color: var(--background-color-top);
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-family: 'Caveat', cursive;
    font-size: 1em;
    margin-top: 20px;
    transition: background-color 0.2s;
  }
  .submit-button:hover {
    background-color: var(--accent-color);
  }

  .submitted-content {
    padding: 1rem;
    margin-bottom: 1.5rem;
    white-space: pre-wrap;
    word-wrap: break-word;
    max-height: 400px;
    overflow-y: auto;
    font-family: 'Caveat', cursive;
    font-size: 1.8em;
    color: #e0e0e0;
    text-align: left;
  }

  .llm-question {
    font-style: italic;
    color: var(--accent-color);
    text-align: left;
    margin-bottom: 1rem;
    width: 100%;
    font-size: 1.8em;
  }

  .loading-indicator {
    margin-top: 20px;
    font-style: italic;
    color: var(--accent-color);
    font-size: 1.8em;
  }

  .fade-in {
    animation: fadeIn 1s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .conversation-container {
    width: 100%;
    max-width: 100%;
    margin-top: 2rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  
  .conversation-container:not(.image-idea-step) {
    flex-grow: 1;
  }

  .image-idea-textarea {
    font-family: 'Caveat', cursive;
    width: 100%;
    height: 60px;
    background: transparent;
    border: none;
    color: #e0e0e0;
    font-size: 1.8em;
    text-align: left;
    resize: none;
    overflow-y: auto;
  }
  
  .image-idea-actions {
    width: 100%;
    margin: 0 auto;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  .error-message {
    color: #ff8a80; /* A soft red for errors */
    margin-top: 20px;
    padding: 15px;
    background: rgba(255, 138, 128, 0.1);
    border: 1px solid #ff8a80;
    border-radius: 8px;
    text-align: center;
  }
  .generated-image-container {
    margin-top: 1rem;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .generated-image-container img {
    max-width: 100%;
    border-radius: 8px;
    margin-top: 1rem;
  }
</style>
