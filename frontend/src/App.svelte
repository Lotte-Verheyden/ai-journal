<script>
  import { onMount, onDestroy } from 'svelte';
  import NewEntry from './NewEntry.svelte';
  import PastEntries from './PastEntries.svelte';
  import Login from './Login.svelte';
  import { dynamicColorManager } from './dynamicColors/dynamicColorManager.js';
  import { authStore } from './authStore.js';

  let entries = [];
  let page = 'new';
  let showThankYouMessage = false;

  // Auth state - will be updated by store subscription
  let isAuthenticated = false;
  let isAuthLoading = true;
  let unsubscribe;

  onMount(async () => {
    // Subscribe to auth store changes
    unsubscribe = authStore.subscribe(state => {
      isAuthenticated = state.isAuthenticated;
      isAuthLoading = state.isLoading;
      
      // Fetch entries when becoming authenticated
      if (state.isAuthenticated && entries.length === 0) {
        fetchEntries();
      }
    });
    
    // Initialize auth store first
    authStore.init();
    
    // Initialize background manager
    dynamicColorManager.init();
    
    // Log current background info for debugging
    console.log('Current background:', dynamicColorManager.getCurrentDynamicColorInfo());
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  /**
   * Fetch entries when authenticated
   * @returns {Promise<void>}
   */
  async function fetchEntries() {
    const token = authStore.getToken();
    if (!isAuthenticated || !token) return;
    
    try {
      const entriesRes = await fetch('/api/entries/entries', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (entriesRes.ok) {
        entries = await entriesRes.json();
      } else if (entriesRes.status === 401) {
        authStore.handleAuthError();
      }
    } catch (error) {
      console.error('Could not fetch past entries.', error);
    }
  }

  /**
   * Handle logout
   * @returns {Promise<void>}
   */
  async function handleLogout() {
    await authStore.logout();
    entries = [];
    page = 'new';
    showThankYouMessage = false;
  }


  function handleEntrySaved(newEntry) {
    entries = [newEntry, ...entries];
    showThankYouMessage = true;
    // Reset the thank you message after a short delay
    setTimeout(() => {
      showThankYouMessage = false;
    }, 3000);
  }

  function handleEntryDeleted(event) {
    const { id } = event.detail || {};
    if (!id) return;
    entries = entries.filter(e => e.id !== id);
  }

  function showNewEntryPage() {
    page = 'new';
  }

  function showPastEntriesPage() {
    page = 'past';
  }

  let currentDate = new Date().toLocaleString();
</script>

{#if isAuthLoading}
  <main class="centered-view">
    <h1>Loading...</h1>
  </main>
{:else if !isAuthenticated}
  <Login />
{:else if page === 'new'}
  <button class="icon-button top-right" on:click={showPastEntriesPage} title="Past Entries" aria-label="View past entries">
     <span class="material-icons">layers</span>
  </button>
  <button class="icon-button top-right logout-button" on:click={handleLogout} title="Logout" aria-label="Logout">
     <span class="material-icons">logout</span>
  </button>
  <div class="entry-date top-left">{currentDate}</div>
  
  {#if showThankYouMessage}
    <main class="centered-view">
      <h1>Thank you for sharing your thoughts</h1>
    </main>
  {:else}
    <NewEntry onEntrySaved={handleEntrySaved} />
  {/if}
{:else if page === 'past'}
  <PastEntries {entries} onNewEntry={showNewEntryPage} onLogout={handleLogout} on:deleted={handleEntryDeleted} />
{/if}

<style>

  .centered-view {
    max-width: 1000px;
    margin: 2rem auto 0 auto;
    padding: 2rem 2rem 2rem 4rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-height: calc(100vh - 4rem);
  }

  h1 {
    font-weight: 300;
    font-size: 3.5em;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 60px 0;
    text-align: center;
    flex-shrink: 0;
    width: 100%;
  }

  .icon-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    color: rgba(224, 224, 224, 0.7);
  }

  .icon-button .material-icons {
    font-size: 24px;
    color: white;
    transition: all 0.2s ease-in-out;
  }
  
  .icon-button:hover .material-icons {
    transform: scale(1.1);
    color: var(--accent-color);
    filter: drop-shadow(0 0 8px rgba(230, 200, 255, 0.5));
  }

  .top-right {
    position: absolute;
    top: 30px;
    right: 40px;
    z-index: 10;
  }

  .logout-button {
    right: 90px;
  }

  .top-left {
    position: absolute;
    top: 30px;
    left: 40px;
    z-index: 10;
  }

  .entry-date {
    font-size: 1.1em;
    color: var(--accent-color);
    margin-bottom: 12px;
  }
</style>
