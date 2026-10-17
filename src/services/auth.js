/**
 * TRADEMAX Authentication Service
 * Communicates with the institutional backend API and PostgreSQL database
 */

const API_BASE = '/api/auth';

export const authService = {
  /**
   * Register a new user with full profile & trading experience
   */
  async register({ name, mobile, email, reference, password, trading_experience }) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        name,
        mobile,
        email,
        reference,
        password,
        trading_experience,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      if (res.status === 502 || res.status === 503) {
        throw new Error('Backend server is temporarily unreachable (502). Please ensure the backend server is running on port 5001.');
      }
      throw new Error(data.error || 'Registration failed. Please try again.');
    }

    if (data.token) {
      localStorage.setItem('tm_token', data.token);
    }
    if (data.user) {
      localStorage.setItem('tm_student_session', JSON.stringify(data.user));
    }

    return data;
  },

  /**
   * Login with email (or mobile) and password
   */
  async login({ email, password }) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      if (res.status === 502 || res.status === 503) {
        throw new Error('Backend server is temporarily unreachable (502). Please ensure the backend server is running on port 5001.');
      }
      throw new Error(data.error || 'Invalid credentials. Please try again.');
    }

    if (data.token) {
      localStorage.setItem('tm_token', data.token);
    }
    if (data.user) {
      localStorage.setItem('tm_student_session', JSON.stringify(data.user));
    }

    return data;
  },

  /**
   * Fetch current session profile from PostgreSQL
   */
  async getMe() {
    const token = localStorage.getItem('tm_token');
    // If no token in localStorage and no token in cookies, visitor is unauthenticated
    if (!token && typeof document !== 'undefined' && !document.cookie.includes('token=')) {
      return null;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE}/me`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        localStorage.removeItem('tm_token');
        localStorage.removeItem('tm_student_session');
        return null;
      }

      const data = await res.json().catch(() => ({}));
      if (data.success && data.user) {
        localStorage.setItem('tm_student_session', JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Logout user and clear tokens
   */
  async logout() {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_student_session');
  },

  /**
   * Get cached user session from localStorage
   */
  getCachedUser() {
    try {
      const stored = localStorage.getItem('tm_student_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Update cached user session in localStorage
   */
  setCachedUser(user) {
    if (user && typeof window !== 'undefined') {
      try {
        localStorage.setItem('tm_student_session', JSON.stringify(user));
      } catch {
        // Ignore storage errors
      }
    }
  },

  /**
   * Check whether user has already completed the one-time welcome experience.
   * Backed by persistent database column and device cache.
   */
  hasSeenWelcome(user) {
    if (!user) return true;
    if (user.has_seen_welcome === true) return true;
    if (typeof window !== 'undefined' && localStorage.getItem(`tm_welcome_seen_${user.id}`) === 'true') {
      return true;
    }
    return false;
  },

  /**
   * Persistently mark welcome as completed in PostgreSQL and local storage.
   */
  async markWelcomeSeen(user) {
    if (!user) return;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`tm_welcome_seen_${user.id}`, 'true');
      }

      const token = localStorage.getItem('tm_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch(`${API_BASE}/mark-welcome-seen`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      const cached = this.getCachedUser();
      if (cached && (cached.id === user.id || cached.email === user.email)) {
        cached.has_seen_welcome = true;
        localStorage.setItem('tm_student_session', JSON.stringify(cached));
      }
    } catch (err) {
      console.warn('Could not persist welcome seen status to backend:', err);
    }
  },
};
