// UI Utilities
function showMessage(message, type = 'info') {
  const messageEl = document.querySelector('.message');
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = `message show ${type}`;
  setTimeout(() => {
    messageEl.classList.remove('show');
  }, 5000);
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;
  let stars = '';

  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars += '★';
    } else if (i === full && hasHalf) {
      stars += '◆';
    } else {
      stars += '☆';
    }
  }

  return stars;
}

// Auth state management
function isAuthenticated() {
  return !!localStorage.getItem('accessToken');
}

function updateNavigation() {
  const navMenu = document.getElementById('navMenu');
  const navActions = document.getElementById('navActions');
  const logoutBtn = document.getElementById('logoutBtn');

  if (isAuthenticated()) {
    if (navMenu) navMenu.style.display = 'none';
    if (navActions) navActions.style.display = 'flex';

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await api.logout();
        window.location.href = '/';
      });
    }
  } else {
    if (navMenu) navMenu.style.display = 'flex';
    if (navActions) navActions.style.display = 'none';
  }
}

// Home Page - Load plans
async function loadHomePlans() {
  const plansGrid = document.getElementById('plansGrid');
  if (!plansGrid) return;

  try {
    plansGrid.innerHTML = '<div class="loading">Loading study plans...</div>';
    const plans = await api.getPlans();

    if (plans.length === 0) {
      plansGrid.innerHTML = '<div class="empty-state"><h3>No plans found</h3><p>Be the first to create a study plan!</p></div>';
      return;
    }

    plansGrid.innerHTML = plans.map(createPlanCard).join('');
  } catch (error) {
    plansGrid.innerHTML = '<div class="empty-state"><h3>Error loading plans</h3><p>Please try again later.</p></div>';
    console.error('Error loading plans:', error);
  }
}

function createPlanCard(plan) {
  return `
    <div class="plan-card">
      <div class="plan-card-header">
        <h3>${plan.title}</h3>
        <span class="plan-card-category">${plan.category}</span>
      </div>
      <div class="plan-card-body">
        <p class="plan-description">${plan.description}</p>
        <div class="plan-stats">
          <div class="stat">
            <div class="stat-value">${plan.durationDays}</div>
            <div class="stat-label">Days</div>
          </div>
          <div class="stat">
            <div class="stat-value">${plan.followerCount || 0}</div>
            <div class="stat-label">Followers</div>
          </div>
          <div class="stat">
            <div class="rating-display">
              <span class="star">${renderStars(plan.averageRating)}</span>
            </div>
            <div class="stat-label">${(plan.averageRating || 0).toFixed(1)}</div>
          </div>
        </div>
        <div class="plan-actions">
          <button class="btn btn-primary" onclick="viewPlan(${plan.id})">View Plan</button>
          <button class="btn btn-secondary" onclick="favoritePlan(${plan.id})">Follow</button>
        </div>
      </div>
    </div>
  `;
}

function viewPlan(planId) {
  window.location.href = `/pages/plan-detail.html?id=${planId}`;
}

async function favoritePlan(planId) {
  if (!isAuthenticated()) {
    window.location.href = '/pages/login.html';
    return;
  }

  try {
    await api.followPlan(planId);
    showMessage('Plan added to favorites!', 'success');
    loadHomePlans();
  } catch (error) {
    showMessage('Error adding to favorites: ' + error.message, 'error');
  }
}

// Search and filter
function setupHomeSearch() {
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');

  if (!searchBtn) return;

  async function searchPlans() {
    const filters = {
      search: searchInput?.value || '',
      category: categoryFilter?.value || '',
      sortBy: sortFilter?.value || '',
    };

    try {
      const plansGrid = document.getElementById('plansGrid');
      plansGrid.innerHTML = '<div class="loading">Searching...</div>';
      const plans = await api.getPlans(filters);

      if (plans.length === 0) {
        plansGrid.innerHTML = '<div class="empty-state"><h3>No plans found</h3><p>Try different search criteria.</p></div>';
      } else {
        plansGrid.innerHTML = plans.map(createPlanCard).join('');
      }
    } catch (error) {
      showMessage('Search error: ' + error.message, 'error');
    }
  }

  searchBtn.addEventListener('click', searchPlans);
  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchPlans();
  });
}

// Login Page
function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      await api.login(email, password);
      showMessage('Login successful!', 'success');
      setTimeout(() => {
        window.location.href = '/pages/dashboard.html';
      }, 1000);
    } catch (error) {
      const message = error.message === 'Invalid credentials'
        ? 'Account not found or wrong password. If you do not have an account, please register first.'
        : `Login failed: ${error.message}`;
      showMessage(message, 'error');
    }
  });
}

// Register Page
function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    try {
      await api.register(name, email, password);
      showMessage('Registration successful! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = '/pages/login.html';
      }, 1500);
    } catch (error) {
      showMessage('Registration failed: ' + error.message, 'error');
    }
  });
}

// Dashboard Page
async function setupDashboard() {
  if (!isAuthenticated()) {
    window.location.href = '/pages/login.html';
    return;
  }

  try {
    const profile = await api.getUserProfile();
    const profileContainer = document.getElementById('profileInfo');

    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="profile-info">
          <div class="profile-row">
            <span class="profile-row-label">Name</span>
            <span class="profile-row-value">${profile.name}</span>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Email</span>
            <span class="profile-row-value">${profile.email}</span>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Member Since</span>
            <span class="profile-row-value">${formatDateTime(profile.createdAt)}</span>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Created Plans</span>
            <span class="profile-row-value">${profile.createdPlans?.length || 0}</span>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Following</span>
            <span class="profile-row-value">${profile.followedPlans?.length || 0}</span>
          </div>
        </div>
      `;
    }

    const createdContainer = document.getElementById('createdPlans');
    if (createdContainer) {
      if (profile.createdPlans?.length > 0) {
        createdContainer.innerHTML = profile.createdPlans.map(createPlanCard).join('');
      } else {
        createdContainer.innerHTML = '<div class="empty-state"><p>You haven\'t created any plans yet. <a href="/pages/create-plan.html">Create one now!</a></p></div>';
      }
    }

    const followedContainer = document.getElementById('followedPlans');
    if (followedContainer) {
      if (profile.followedPlans?.length > 0) {
        followedContainer.innerHTML = profile.followedPlans.map(createPlanCard).join('');
      } else {
        followedContainer.innerHTML = '<div class="empty-state"><p>You\'re not following any plans yet.</p></div>';
      }
    }
  } catch (error) {
    showMessage('Error loading dashboard: ' + error.message, 'error');
  }
}

// Create Plan Form
function setupCreatePlanForm() {
  const form = document.getElementById('createPlanForm');
  if (!form) return;

  if (!isAuthenticated()) {
    window.location.href = '/pages/login.html';
    return;
  }

  let taskCount = 1;
  const addTaskBtn = document.getElementById('addTaskBtn');
  const tasksContainer = document.getElementById('tasksContainer');

  addTaskBtn?.addEventListener('click', () => {
    taskCount++;
    const taskDiv = document.createElement('div');
    taskDiv.className = 'form-group task-input-group';
    taskDiv.innerHTML = `
      <label>Day ${taskCount} Task</label>
      <input type="text" name="taskTitle" placeholder="Task title" required />
      <textarea name="taskDescription" placeholder="Task description" required></textarea>
      <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove()">Remove</button>
    `;
    tasksContainer?.appendChild(taskDiv);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const tasks = [];
    const titleInputs = form.querySelectorAll('[name="taskTitle"]');
    const descriptionInputs = form.querySelectorAll('[name="taskDescription"]');

    titleInputs.forEach((input, index) => {
      tasks.push({
        day: index + 1,
        title: input.value,
        description: descriptionInputs[index].value,
      });
    });

    const planData = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      durationDays: parseInt(formData.get('durationDays')),
      tasks,
    };

    try {
      const result = await api.createPlan(planData);
      showMessage('Plan created successfully!', 'success');
      setTimeout(() => {
        window.location.href = `/pages/plan-detail.html?id=${result.id}`;
      }, 1000);
    } catch (error) {
      showMessage('Error creating plan: ' + error.message, 'error');
    }
  });
}

// Plan Detail Page
async function setupPlanDetail() {
  if (!document.getElementById('planDetail')) return;

  const params = new URLSearchParams(window.location.search);
  const planId = params.get('id');

  if (!planId) {
    showMessage('Plan not found', 'error');
    return;
  }

  try {
    const plan = await api.getPlanById(planId);
    const container = document.getElementById('planDetail');

    container.innerHTML = `
      <div class="plan-detail-header">
        <h1>${plan.title}</h1>
        <span class="plan-category">${plan.category}</span>
        <p>${plan.description}</p>
        <div class="plan-meta">
          <span>📅 ${plan.durationDays} days</span>
          <span>👥 ${plan.followerCount} followers</span>
          <span>⭐ ${renderStars(plan.averageRating)} (${(plan.averageRating || 0).toFixed(1)})</span>
        </div>
      </div>

      <div class="plan-section">
        <h2>Daily Tasks</h2>
        <div class="task-list">
          ${plan.tasks.map((task) => `
            <div class="task-item">
              <input type="checkbox" data-task-id="${task.id}" />
              <div class="task-content">
                <h4>Day ${task.day}: ${task.title}</h4>
                <p class="task-description">${task.description}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="plan-section">
        <h2>Progress</h2>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <p id="progressText">0% complete</p>
        ${isAuthenticated() ? `<button class="btn btn-primary" id="saveProgressBtn">Save Progress</button>` : '<p>Login to track progress</p>'}
      </div>

      <div class="plan-section">
        <h2>Rating</h2>
        ${isAuthenticated() ? `
          <div class="rating-group">
            ${[1, 2, 3, 4, 5].map((i) => `
              <span class="star-input" data-rating="${i}" onclick="selectRating(${i})">★</span>
            `).join('')}
          </div>
          <button class="btn btn-primary" id="submitRatingBtn">Submit Rating</button>
        ` : '<p>Login to rate this plan</p>'}
      </div>

      <div class="plan-actions">
        ${isAuthenticated() ? `<button class="btn btn-primary" id="followBtn">Follow Plan</button>` : ''}
        <button class="btn btn-secondary" onclick="window.history.back()">Back</button>
      </div>
    `;

    if (isAuthenticated()) {
      setupPlanInteractions(planId);
    }
  } catch (error) {
    showMessage('Error loading plan: ' + error.message, 'error');
  }
}

async function setupPlanInteractions(planId) {
  // Follow button
  const followBtn = document.getElementById('followBtn');
  if (followBtn) {
    followBtn.addEventListener('click', async () => {
      try {
        await api.followPlan(planId);
        followBtn.textContent = 'Unfollow Plan';
        showMessage('Added to favorites!', 'success');
      } catch (error) {
        showMessage('Error: ' + error.message, 'error');
      }
    });
  }

  // Progress tracking
  const saveProgressBtn = document.getElementById('saveProgressBtn');
  if (saveProgressBtn) {
    const checkboxes = document.querySelectorAll('[data-task-id]');

    try {
      const progress = await api.getPlanProgress(planId);
      checkboxes.forEach((checkbox) => {
        if (progress.completedTaskIds.includes(parseInt(checkbox.dataset.taskId))) {
          checkbox.checked = true;
        }
      });
      updateProgressDisplay(checkboxes.length, progress.completedTaskIds.length);
    } catch (error) {
      console.error('Error loading progress:', error);
    }

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        updateProgressDisplay(checkboxes.length, Array.from(checkboxes).filter((c) => c.checked).length);
      });
    });

    saveProgressBtn.addEventListener('click', async () => {
      const completedTaskIds = Array.from(document.querySelectorAll('[data-task-id]:checked')).map((c) => parseInt(c.dataset.taskId));

      try {
        await api.updateProgress(planId, completedTaskIds);
        showMessage('Progress saved!', 'success');
      } catch (error) {
        showMessage('Error saving progress: ' + error.message, 'error');
      }
    });
  }

  // Rating
  const submitRatingBtn = document.getElementById('submitRatingBtn');
  if (submitRatingBtn) {
    submitRatingBtn.addEventListener('click', async () => {
      const selectedRating = document.querySelector('.star-input.active');
      if (!selectedRating) {
        showMessage('Please select a rating', 'error');
        return;
      }

      const rating = parseInt(selectedRating.dataset.rating);

      try {
        await api.ratePlan(planId, rating);
        showMessage('Rating submitted!', 'success');
      } catch (error) {
        showMessage('Error submitting rating: ' + error.message, 'error');
      }
    });
  }
}

function updateProgressDisplay(total, completed) {
  const percentage = Math.round((completed / total) * 100);
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.getElementById('progressText');

  if (progressFill) progressFill.style.width = `${percentage}%`;
  if (progressText) progressText.textContent = `${percentage}% complete`;
}

function selectRating(rating) {
  document.querySelectorAll('.star-input').forEach((star, index) => {
    if (index < rating) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  updateNavigation();

  const page = document.body.getAttribute('data-page');

  if (page === 'home') {
    loadHomePlans();
    setupHomeSearch();
  } else if (page === 'login') {
    setupLoginForm();
  } else if (page === 'register') {
    setupRegisterForm();
  } else if (page === 'dashboard') {
    setupDashboard();
  } else if (page === 'create-plan') {
    setupCreatePlanForm();
  } else if (page === 'plan-detail') {
    setupPlanDetail();
  }
});
