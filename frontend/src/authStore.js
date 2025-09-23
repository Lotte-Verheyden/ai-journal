import { writable } from 'svelte/store';

// Constants
const TOKEN_KEY = 'journal_auth_token';
const API_BASE_URL = '/api';

// Auth state interface
/**
 * @typedef {Object} AuthState
 * @property {boolean} isAuthenticated - Whether user is logged in
 * @property {string|null} token - JWT token string
 * @property {boolean} isLoading - Whether auth initialization is in progress
 * @property {boolean} isLoggingIn - Whether login attempt is in progress
 */

/**
 * @typedef {Object} AuthStore
 * @property {Function} subscribe - Svelte store subscribe function
 * @property {Function} init - Initialize auth store
 * @property {Function} login - Login with password
 * @property {Function} logout - Logout user
 * @property {Function} getToken - Get current token
 * @property {Function} handleAuthError - Handle auth errors
 */

/**
 * Create auth store with initial state
 * @returns {AuthStore} Auth store with methods
 */
function createAuthStore() {
    const initialState = {
        isAuthenticated: false,
        token: null,
        isLoading: true,
        isLoggingIn: false
    };

    const { subscribe, set, update } = writable(initialState);

    return {
        subscribe,
        
        /**
         * Initialize auth store by checking for existing token
         * @returns {void}
         */
        init() {
            const savedToken = localStorage.getItem(TOKEN_KEY);
            
            if (savedToken) {
                // TODO: Validate token expiry here
                update(state => ({
                    ...state,
                    isAuthenticated: true,
                    token: savedToken,
                    isLoading: false
                }));
            } else {
                update(state => ({
                    ...state,
                    isLoading: false
                }));
            }
        },

        /**
         * Login with password
         * @param {string} password - User password
         * @returns {Promise<void>} - Resolves on successful login
         * @throws {Error} - Throws error on login failure
         */
        async login(password) {
            if (!password) {
                throw new Error('Password is required');
            }

            update(state => ({ ...state, isLoggingIn: true }));

            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ password })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Login failed');
                }

                const { token } = await response.json();
                
                if (!token) {
                    throw new Error('No token received from server');
                }

                // Store token and update state
                localStorage.setItem(TOKEN_KEY, token);
                
                update(state => ({
                    ...state,
                    isAuthenticated: true,
                    token: token,
                    isLoggingIn: false
                }));

            } catch (error) {
                // Don't change auth state on login failure, just stop login loading
                update(state => ({
                    ...state,
                    isLoggingIn: false
                }));
                throw error;
            }
        },

        /**
         * Logout user and clear stored token
         * @returns {Promise<void>} - Resolves after logout
         */
        async logout() {
            try {
                // Call logout endpoint (optional since JWT is stateless)
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                // Logout endpoint failure should not prevent local logout
                console.warn('Logout endpoint failed:', error);
            }

            // Clear local storage and state
            localStorage.removeItem(TOKEN_KEY);
            
            set({
                isAuthenticated: false,
                token: null,
                isLoading: false,
                isLoggingIn: false
            });
        },

        /**
         * Get current auth token for API requests
         * @returns {string|null} - Current JWT token or null
         */
        getToken() {
            let currentState = {
                isAuthenticated: false,
                token: null,
                isLoading: true,
                isLoggingIn: false
            };
            authStore.subscribe(state => {
                currentState = state;
            })();
            return currentState.token;
        },

        /**
         * Handle authentication error (e.g., expired token)
         * @returns {void}
         */
        handleAuthError() {
            localStorage.removeItem(TOKEN_KEY);
            
            set({
                isAuthenticated: false,
                token: null,
                isLoading: false,
                isLoggingIn: false
            });
        }
    };
}

// Export singleton auth store
export const authStore = createAuthStore();

// Helper function to get current store value
function get(store) {
    let value;
    store.subscribe(val => value = val)();
    return value;
}
