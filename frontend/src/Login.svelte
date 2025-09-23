<script>
  import { authStore } from './authStore.js';
  
  let password = '';
  let errorMessage = '';
  let isLoading = false;
  
  // Subscribe to login state for better UX
  let isLoggingIn = false;
  authStore.subscribe(state => {
    isLoggingIn = state.isLoggingIn;
  });

  /**
   * Handle login form submission
   * @param {Event} event - Form submit event
   */
  async function handleLogin(event) {
    event.preventDefault();
    
    if (!password) {
      errorMessage = 'Password is required';
      return;
    }
    
    isLoading = true;
    errorMessage = '';
    
    try {
      await authStore.login(password);
      // Only clear password on successful login
      password = '';
    } catch (error) {
      console.log('Login error:', error);
      errorMessage = error.message || 'Invalid password. Please try again.';
      // Don't clear password on error so user can try again
    } finally {
      isLoading = false;
    }
  }
</script>

<main class="login-container">
  <div class="login-card">
    <h1>Journal Access</h1>
    
    <form on:submit={handleLogin}>
      <div class="input-group">
        <input
          type="password"
          bind:value={password}
          placeholder="Enter password"
          disabled={isLoading || isLoggingIn}
          class="password-input"
        />
      </div>
      
      {#if errorMessage}
        <div class="error-message">{errorMessage}</div>
      {/if}
      
      <button type="submit" disabled={isLoading || isLoggingIn} class="login-button">
        {isLoading || isLoggingIn ? 'Authenticating...' : 'Access Journal'}
      </button>
    </form>
  </div>
</main>

<style>
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .login-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 3rem;
    width: 100%;
    max-width: 400px;
    text-align: center;
  }

  h1 {
    font-weight: 300;
    font-size: 2.5em;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 2rem 0;
  }

  .input-group {
    margin-bottom: 1.5rem;
  }

  .password-input {
    width: 100%;
    padding: 1rem;
    font-size: 1.1em;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 10px;
    color: white;
    text-align: center;
    box-sizing: border-box;
  }

  .password-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .password-input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px rgba(230, 200, 255, 0.3);
  }

  .password-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .login-button {
    width: 100%;
    padding: 1rem;
    font-size: 1.1em;
    background: var(--accent-color);
    color: #1a1a2e;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .login-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(230, 200, 255, 0.4);
  }

  .login-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .error-message {
    color: #ff6b6b;
    font-size: 0.9em;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: rgba(255, 107, 107, 0.1);
    border-radius: 5px;
    border: 1px solid rgba(255, 107, 107, 0.3);
  }
</style>
