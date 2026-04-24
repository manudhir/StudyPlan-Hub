// Use production API on Netlify, local during development
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `${window.location.protocol}//${window.location.hostname}:5174/api`
  : 'https://studyplan-hub.onrender.com/api';

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
    };
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: this.getHeaders(),
    });

    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      return this.request(endpoint, options);
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data.data;
  }

  async refreshAccessToken() {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/pages/login.html';
      return;
    }

    const data = await response.json();
    this.accessToken = data.data.accessToken;
    this.refreshToken = data.data.refreshToken;
    localStorage.setItem('accessToken', this.accessToken);
    localStorage.setItem('refreshToken', this.refreshToken);
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
        console.error('Logout error:', error);
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.accessToken = null;
    this.refreshToken = null;
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
}

const api = new ApiClient();
