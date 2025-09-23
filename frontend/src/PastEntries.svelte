<script>
  import { getCurrentDynamicColors } from './dynamicColors/dynamicColorConfig.js';
  import { createEventDispatcher } from 'svelte';
  import { authStore } from './authStore.js';
  
  // Props
  export let entries = [];
  export let onNewEntry = () => {};
  export let onLogout = () => {};

  // State for popup
  let selectedEntry = null;
  let showPopup = false;
  let deleting = false;
  let deleteError = null;
  const dispatch = createEventDispatcher();
  
  // Get current background top color for popup
  $: popupBackgroundColor = getCurrentDynamicColors().background.top;

  // Grouped entries by month
  $: groupedEntries = groupEntriesByMonth(entries);

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
   * Parse entry content to extract main content and image URL
   * @param {string} content - Entry content
   * @returns {Object} - Object with mainContent and imageUrl
   */
  function parseEntry(content) {
    const parts = content.split('\n\n---\n');
    if (parts.length < 2) {
      return { mainContent: content, imageUrl: null };
    }

    const mainContent = parts[0];
    const metadata = parts[1];
    
    const urlMatch = metadata.match(/Image URL: (.*)/);
    const imageUrl = urlMatch ? urlMatch[1] : null;
    
    return { mainContent, imageUrl };
  }

  function formatTimestamp(id) {
    const timestamp = parseInt(id.split('.txt')[0], 10);
    return isNaN(timestamp) ? 'Invalid date' : new Date(timestamp).toLocaleString();
  }

  function groupEntriesByMonth(entries) {
    const groups = {};
    
    entries.forEach(entry => {
      const timestamp = parseInt(entry.id.split('.txt')[0], 10);
      const date = new Date(timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthName,
          entries: []
        };
      }
      
      groups[monthKey].entries.push(entry);
    });
    
    // Sort months by date (newest first)
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(monthKey => groups[monthKey]);
  }

  function openEntry(entry) {
    selectedEntry = entry;
    showPopup = true;
  }

  function closePopup() {
    showPopup = false;
    selectedEntry = null;
    deleteError = null;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && showPopup) {
      closePopup();
    }
  }

  async function deleteSelectedEntry() {
    if (!selectedEntry) return;
    deleteError = null;
    deleting = true;
    try {
      const res = await fetch('/api/entries/delete', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: selectedEntry.id })
      });
      if (res.ok || res.status === 204) {
        // Success
      } else if (handleAuthError(res)) {
        return;
      } else {
        const text = await res.text();
        throw new Error(text || 'Failed to delete');
      }
      dispatch('deleted', { id: selectedEntry.id });
      closePopup();
    } catch (err) {
      console.error('Delete failed', err);
      deleteError = err.message || 'Delete failed';
    } finally {
      deleting = false;
    }
  }
</script>

<main class="gallery-view">
  <button class="icon-button top-right" on:click={onNewEntry} title="New Entry" aria-label="Create new entry">
    <span class="material-icons">history_edu</span>
  </button>
  <button class="icon-button top-right logout-button" on:click={onLogout} title="Logout" aria-label="Logout">
    <span class="material-icons">logout</span>
  </button>
  <header>
    <h1>Past Entries</h1>
  </header>

  <div class="gallery-container">
    {#each groupedEntries as group}
      <div class="month-section">
        <div class="month-label">{group.monthName}</div>
        <div class="gallery">
          {#each group.entries as entry}
            {@const { mainContent, imageUrl } = parseEntry(entry.content)}
            <div class="gallery-tile" on:click={() => openEntry(entry)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && openEntry(entry)}>
              {#if imageUrl}
                <img src={imageUrl} alt="Journal entry illustration" />
                <div class="tile-overlay">
                  <div class="entry-date">{formatTimestamp(entry.id)}</div>
                </div>
              {:else}
                <div class="fallback-tile">
                  <div class="fallback-date">{formatTimestamp(entry.id)}</div>
                  <div class="fallback-excerpt">{mainContent.slice(0, 120)}{mainContent.length > 120 ? '…' : ''}</div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- Popup Modal -->
  {#if showPopup && selectedEntry}
    {@const { mainContent, imageUrl } = parseEntry(selectedEntry.content)}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="popup-overlay" on:click={closePopup} on:keydown={handleKeydown} role="button" tabindex="0" aria-label="Close popup">
      <div class="popup-content" style="--popup-bg-color: {popupBackgroundColor}" on:click|stopPropagation>
        <button class="close-button" on:click={closePopup} aria-label="Close entry">×</button>
        <button class="delete-button" on:click={deleteSelectedEntry} aria-label="Delete entry" disabled={deleting} title="Delete entry">
          <span class="material-icons">delete</span>
        </button>
        <div class="popup-header">
          <h3>Journal Entry</h3>
          <div class="popup-date">{formatTimestamp(selectedEntry.id)}</div>
        </div>
        <div class="popup-body">
          {#if deleteError}
            <div class="delete-error">{deleteError}</div>
          {/if}
          <p>{mainContent}</p>
          {#if imageUrl}
            <div class="popup-image">
              <img src={imageUrl} alt="Journal entry illustration" />
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  .gallery-view {
    max-width: 1200px;
    margin: 40px auto;
    padding: 0 20px;
  }

  .top-right {
    position: absolute;
    top: 30px;
    right: 40px;
    z-index: 10;
  }

  header {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 30px;
    color: #e0e0e0;
  }

  h1 {
    font-weight: 300;
    font-size: 3.5em;
    color: white;
    margin: 0;
    text-align: center;
  }

  .icon-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    color: rgba(224, 224, 224, 0.7);
  }

  .icon-button .material-icons {
    font-size: 32px;
    color: white;
    transition: all 0.2s ease-in-out;
  }
  
  .icon-button:hover .material-icons {
    transform: scale(1.1);
    color: var(--accent-color);
    filter: drop-shadow(0 0 8px rgba(230, 200, 255, 0.5));
  }

  .gallery-container {
    padding: 20px 0;
  }

  .month-section {
    display: flex;
    align-items: flex-start;
    margin-bottom: 80px;
    gap: 20px;
  }

  .month-label {
    font-size: 1.4em;
    font-weight: 400;
    color: white;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    white-space: nowrap;
    padding: 10px 0;
    flex-shrink: 0;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    flex: 1;
  }

  .gallery-tile {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 2px solid transparent;
  }

  .gallery-tile:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(255, 255, 255, 0.104);
  }

  .gallery-tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .gallery-tile:hover img {
    transform: scale(1.05);
  }

  .fallback-tile {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 14px;
    background: linear-gradient(135deg, rgba(30,30,60,0.8), rgba(20,20,40,0.9));
    color: #e0e0e0;
    text-align: center;
  }

  .fallback-date {
    color: var(--accent-color);
    font-size: 1em;
    margin-bottom: 8px;
  }

  .fallback-excerpt {
    font-size: 0.95em;
    line-height: 1.4;
    opacity: 0.9;
    white-space: pre-wrap;
  }

  .tile-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    padding: 10px 8px 8px;
    color: white;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .gallery-tile:hover .tile-overlay {
    opacity: 1;
  }

  .entry-date {
    font-size: 1em;
    color: var(--accent-color);
    margin: 0;
  }

  /* Popup Modal Styles */
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    backdrop-filter: blur(5px);
    cursor: pointer;
  }

  .popup-content {
    max-width: 900px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), var(--popup-bg-color, #1a1a2e);
  }

  .popup-content > * {
    position: relative;
    z-index: 2;
  }

  .close-button {
    position: absolute;
    top: 15px;
    right: 15px;
    background: none;
    border: none;
    color: #e0e0e0;
    font-size: 24px;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #c1a2ff;
  }

  .delete-button {
    position: absolute;
    top: 15px;
    left: 15px;
    background: none;
    border: none;
    color: #e0e0e0;
    font-size: 20px;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .delete-button:hover:not([disabled]) {
    background: rgba(255, 255, 255, 0.1);
    color: #ff8a80;
  }

  .delete-button[disabled] {
    opacity: 0.6;
    cursor: default;
  }

  .popup-header {
    padding: 30px 30px 20px;
  }

  .popup-header h3 {
    margin: 0 0 10px 0;
    font-size: 2em;
    color: #e0e0e0;
  }

  .popup-date {
    font-size: 1.2em;
    color: var(--accent-color);
    margin: 0;
  }

  .popup-body {
    padding: 30px;
  }

  .popup-body p {
    margin: 0 0 20px 0;
    white-space: pre-wrap;
    line-height: 1.8;
    font-size: 1.6em;
    color: #e0e0e0;
    text-align: left;
  }

  .delete-error {
    color: #ff8a80;
    margin: 0 0 12px 0;
    padding: 10px;
    background: rgba(255, 138, 128, 0.1);
    border: 1px solid #ff8a80;
    border-radius: 6px;
    font-size: 1em;
  }

  .popup-image {
    margin-top: 20px;
    text-align: center;
  }

  .popup-image img {
    max-width: 100%;
    border: 1px solid #2a2a45;
  }

  /* Focus styles for accessibility */
  .gallery-tile:focus {
    outline: 2px solid #c1a2ff;
    outline-offset: 2px;
  }

  .close-button:focus {
    outline: 2px solid #c1a2ff;
    outline-offset: 2px;
  }

  .logout-button {
    right: 90px;
  }
</style>