// Use production API on Netlify, local during development
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `${window.location.protocol}//${window.location.hostname}:5174/api`
  : 'https://studyplan-hub.onrender.com/api';

function notifyUser(message, type = 'error') {
  if (window.Toast && typeof window.Toast[type] === 'function') {
    window.Toast[type](message);
    return;
  }

  const messageEl = document.querySelector('.message');
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.className = `message show ${type}`;
  }
}

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
    };
  }

  subscribeToRefresh(callback) {
    this.refreshSubscribers.push(callback);
  }

  notifyRefreshSubscribers(error = null) {
    this.refreshSubscribers.forEach(callback => callback(error));
    this.refreshSubscribers = [];
  }

  async parseResponse(response) {
    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      const parseError = new Error('Server returned an invalid response');
      parseError.status = response.status;
      throw parseError;
    }
  }

  handleError(error, context = 'Request failed', options = {}) {
    const message = error?.message || 'Something went wrong. Please try again.';
    console.error(`${context}:`, error);

    if (!options.silent) {
      notifyUser(message, 'error');
    }

    return {
      message,
      status: error?.status || 0,
      data: error?.data || null,
    };
  }

  async safeRequest(endpoint, options = {}, fallback = null) {
    try {
      return await this.request(endpoint, options);
    } catch (error) {
      this.handleError(error);
      return fallback;
    }
  }

  async request(endpoint, options = {}, retries = 2) {
    let lastError = null;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
          ...this.getHeaders(),
          ...(options.headers || {}),
        };

        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
          if (this.refreshToken && !this.isRefreshing) {
            this.isRefreshing = true;
            try {
              await this.refreshAccessToken();
              this.notifyRefreshSubscribers();
              this.isRefreshing = false;
              // Retry original request once after token refresh
              return this.request(endpoint, options, 0);
            } catch (error) {
              this.isRefreshing = false;
              this.clearSession();
              const sessionError = new Error('Session expired. Please login again.');
              sessionError.status = 401;
              sessionError.retryable = false;
              this.notifyRefreshSubscribers(sessionError);
              throw sessionError;
            }
          } else if (this.isRefreshing) {
            // Wait for ongoing refresh and retry
            return new Promise((resolve, reject) => {
              this.subscribeToRefresh((refreshError) => {
                if (refreshError) {
                  reject(refreshError);
                  return;
                }
                this.request(endpoint, options, 0).then(resolve).catch(reject);
              });
            });
          } else {
            // No refresh token available
            this.clearSession();
            const sessionError = new Error('Session expired. Please login again.');
            sessionError.status = 401;
            sessionError.retryable = false;
            throw sessionError;
          }
        }

        // Handle 5xx errors with retry (exponential backoff)
        if (response.status >= 500 && attempt < retries + 1) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        const data = await this.parseResponse(response);

        if (!response.ok) {
          const errorMessage = data?.message || data?.error || 'Request failed';
          const error = new Error(errorMessage);
          error.status = response.status;
          error.data = data;
          error.retryable = response.status >= 500;
          throw error;
        }

        return data && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
      } catch (error) {
        lastError = error;
        // Last attempt failed
        const canRetry = error?.retryable !== false && attempt < retries + 1;
        if (!canRetry) {
          throw error;
        }

        const delay = Math.pow(2, attempt - 1) * 500;
        await new Promise(r => setTimeout(r, delay));
      }
    }

    throw lastError || new Error('Request failed');
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.accessToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;
      localStorage.setItem('accessToken', this.accessToken);
      localStorage.setItem('refreshToken', this.refreshToken);
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearSession();
      throw error;
    }
  }

  clearSession() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Auth endpoints
  async register(name, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    return data;
  }

  async logout() {
    if (this.refreshToken) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      } catch (error) {
        // Silently fail - still clear local storage
        console.error('Logout error:', error);
      }
    }

    this.clearSession();
  }

  // User endpoints
  async getUserProfile() {
    return this.request('/users/me', { method: 'GET' });
  }

  // Plans endpoints
  async getPlans(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.minRating) params.append('minRating', filters.minRating);
    if (filters.maxDuration) params.append('maxDuration', filters.maxDuration);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    return this.request(`/plans?${params.toString()}`, { method: 'GET' });
  }

  async getPopularPlans() {
    return this.request('/plans/popular', { method: 'GET' });
  }

  async getPlanById(planId) {
    return this.request(`/plans/${planId}`, { method: 'GET' });
  }

  async createPlan(planData) {
    return this.request('/plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  async updatePlan(planId, planData) {
    return this.request(`/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
  }

  async deletePlan(planId) {
    return this.request(`/plans/${planId}`, { method: 'DELETE' });
  }

  // Follow endpoints
  async followPlan(planId) {
    return this.request(`/follow/${planId}`, { method: 'POST' });
  }

  async unfollowPlan(planId) {
    return this.request(`/follow/${planId}`, { method: 'DELETE' });
  }

  // Progress endpoints
  async getPlanProgress(planId) {
    return this.request(`/progress/${planId}`, { method: 'GET' });
  }

  async updateProgress(planId, completedTaskIds) {
    return this.request(`/progress/${planId}`, {
      method: 'POST',
      body: JSON.stringify({ completedTaskIds }),
    });
  }

  // Rating endpoints
  async ratePlan(planId, rating) {
    return this.request(`/rating/${planId}`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
  }

  async suggestPlan({ subject, duration, level }) {
    return this.request('/ai/suggest-plan', {
      method: 'POST',
      body: JSON.stringify({
        subject,
        duration: Number(duration),
        level,
      }),
    });
  }
}

const api = new ApiClient();
