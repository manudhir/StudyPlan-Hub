// UI Utilities
function showMessage(message, type = 'info') {
  if (window.Toast && typeof window.Toast[type] === 'function') {
    window.Toast[type](message);
  }

  const messageEl = document.querySelector('.message');
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = `message show ${type}`;
  setTimeout(() => {
    messageEl.classList.remove('show');
  }, 5000);
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

function safeText(value, fallback = '') {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeInteger(value, fallback = 0) {
  return Math.trunc(safeNumber(value, fallback));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePlan(plan) {
  const source = plan && typeof plan === 'object' ? plan : {};

  return {
    id: safeInteger(source.id),
    title: safeText(source.title, 'Untitled plan'),
    description: safeText(source.description, 'No description available.'),
    category: safeText(source.category || source.subject, 'Other'),
    durationDays: safeInteger(source.durationDays ?? source.duration_days, 0),
    averageRating: safeNumber(source.averageRating ?? source.average_rating, 0),
    followerCount: safeInteger(source.followerCount ?? source.follower_count, 0),
    tasks: safeArray(source.tasks).map(normalizeTask),
  };
}

function normalizeTask(task, index = 0) {
  const source = task && typeof task === 'object' ? task : {};

  return {
    id: safeInteger(source.id, index + 1),
    day: safeInteger(source.day ?? source.day_number, index + 1),
    title: safeText(source.title, `Task ${index + 1}`),
    description: safeText(source.description, 'Complete the task for this day.'),
  };
}

function setContent(container, html) {
  if (!container) return;
  container.classList.remove('loading');
  container.innerHTML = html;
}

function setLoading(container, message = 'Loading...') {
  if (!container) return;
  container.classList.add('loading');
  container.innerHTML = `<div class="loading">${escapeHtml(message)}</div>`;
}

function setErrorState(container, title = 'Error loading content', message = 'Please try again later.') {
  setContent(
    container,
    `<div class="empty-state"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p></div>`,
  );
}

function renderSafely(container, renderer, fallbackTitle = 'Unable to render content') {
  try {
    setContent(container, renderer());
  } catch (error) {
    console.error(fallbackTitle, error);
    setErrorState(container, fallbackTitle, 'The data could not be displayed safely.');
  }
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function renderStars(rating) {
  const normalizedRating = Math.max(0, Math.min(5, safeNumber(rating, 0)));
  const full = Math.floor(normalizedRating);
  const hasHalf = normalizedRating % 1 !== 0;
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
    setLoading(plansGrid, 'Loading study plans...');
    const plans = safeArray(await api.getPlans());

    if (plans.length === 0) {
      setContent(
        plansGrid,
        '<div class="empty-state"><h3>No plans found</h3><p>Be the first to create a study plan!</p></div>',
      );
      return;
    }

    renderSafely(plansGrid, () => plans.map(createPlanCard).join(''), 'Error rendering plans');
  } catch (error) {
    setErrorState(plansGrid, 'Error loading plans', error.message || 'Please try again later.');
    console.error('Error loading plans:', error);
  }
}

function createPlanCard(plan) {
  const safePlan = normalizePlan(plan);
  const ratingLabel = safePlan.averageRating.toFixed(1);
  const actionButtons = safePlan.id
    ? `
        <button class="btn btn-primary" onclick="viewPlan(${safePlan.id})">View Plan</button>
        <button class="btn btn-secondary" onclick="favoritePlan(${safePlan.id})">Follow</button>
      `
    : '<span class="empty-state">Plan unavailable</span>';

  return `
    <div class="plan-card">
      <div class="plan-card-header">
        <h3>${escapeHtml(safePlan.title)}</h3>
        <span class="plan-card-category">${escapeHtml(safePlan.category)}</span>
      </div>
      <div class="plan-card-body">
        <p class="plan-description">${escapeHtml(safePlan.description)}</p>
        <div class="plan-stats">
          <div class="stat">
            <div class="stat-value">${safePlan.durationDays}</div>
            <div class="stat-label">Days</div>
          </div>
          <div class="stat">
            <div class="stat-value">${safePlan.followerCount}</div>
            <div class="stat-label">Followers</div>
          </div>
          <div class="stat">
            <div class="rating-display">
              <span class="star">${renderStars(safePlan.averageRating)}</span>
            </div>
            <div class="stat-label">${ratingLabel}</div>
          </div>
        </div>
        <div class="plan-actions">${actionButtons}</div>
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
      setLoading(plansGrid, 'Searching...');
      const plans = safeArray(await api.getPlans(filters));

      if (plans.length === 0) {
        setContent(
          plansGrid,
          '<div class="empty-state"><h3>No plans found</h3><p>Try different search criteria.</p></div>',
        );
      } else {
        renderSafely(plansGrid, () => plans.map(createPlanCard).join(''), 'Error rendering search results');
      }
    } catch (error) {
      setErrorState(
        document.getElementById('plansGrid'),
        'Error loading plans',
        error.message || 'Search failed.',
      );
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

  const profileContainer = document.getElementById('profileInfo');
  const createdContainer = document.getElementById('createdPlans');
  const followedContainer = document.getElementById('followedPlans');

  setLoading(profileContainer, 'Loading profile...');
  setLoading(createdContainer, 'Loading your plans...');
  setLoading(followedContainer, 'Loading followed plans...');

  try {
    const profile = await api.getUserProfile() || {};
    const createdPlans = safeArray(profile.createdPlans);
    const followedPlans = safeArray(profile.followedPlans);

    if (profileContainer) {
      renderSafely(profileContainer, () => `
        <div class="profile-info">
          <div class="profile-row">
            <span class="profile-row-label">Name</span>
            <span class="profile-row-value">${escapeHtml(safeText(profile.name, 'Unknown'))}</span>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Email</span>
            <span class="profile-row-value">${escapeHtml(safeText(profile.email, 'Unknown'))}</span>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Member Since</span>
            <span class="profile-row-value">${formatDateTime(profile.createdAt)}</span>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Created Plans</span>
            <span class="profile-row-value">${createdPlans.length}</span>
          </div>
          <div class="profile-row">
            <span class="profile-row-label">Following</span>
            <span class="profile-row-value">${followedPlans.length}</span>
          </div>
        </div>
      `, 'Error rendering profile');
    }

    if (createdContainer) {
      if (createdPlans.length > 0) {
        renderSafely(
          createdContainer,
          () => createdPlans.map(createPlanCard).join(''),
          'Error rendering created plans',
        );
      } else {
        setContent(
          createdContainer,
          '<div class="empty-state"><p>You haven\'t created any plans yet. <a href="/pages/create-plan.html">Create one now!</a></p></div>',
        );
      }
    }

    if (followedContainer) {
      if (followedPlans.length > 0) {
        renderSafely(
          followedContainer,
          () => followedPlans.map(createPlanCard).join(''),
          'Error rendering followed plans',
        );
      } else {
        setContent(
          followedContainer,
          '<div class="empty-state"><p>You\'re not following any plans yet.</p></div>',
        );
      }
    }
  } catch (error) {
    setErrorState(profileContainer, 'Error loading profile', error.message || 'Please try again.');
    setErrorState(createdContainer, 'Error loading plans', 'Your created plans could not be loaded.');
    setErrorState(followedContainer, 'Error loading followed plans', 'Followed plans could not be loaded.');
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

  let taskCount = 0;
  const addTaskBtn = document.getElementById('addTaskBtn');
  const tasksContainer = document.getElementById('tasksContainer');

  const reindexTaskInputs = () => {
    const groups = tasksContainer?.querySelectorAll('.task-input-group') || [];
    groups.forEach((group, index) => {
      const label = group.querySelector('label');
      if (label) {
        label.textContent = `Day ${index + 1} Task`;
      }
    });
    taskCount = groups.length;
  };

  const addTaskInput = (task = {}) => {
    taskCount++;
    const taskDiv = document.createElement('div');
    taskDiv.className = 'form-group task-input-group';
    taskDiv.innerHTML = `
      <label>Day ${safeInteger(task.day, taskCount)} Task</label>
      <input type="text" name="taskTitle" placeholder="Task title" value="${escapeHtml(task.title || '')}" required />
      <textarea name="taskDescription" placeholder="Task description" required>${escapeHtml(task.description || '')}</textarea>
      <button type="button" class="btn btn-danger btn-small remove-task-btn">Remove</button>
    `;
    tasksContainer?.appendChild(taskDiv);

    taskDiv.querySelector('.remove-task-btn')?.addEventListener('click', () => {
      if ((tasksContainer?.querySelectorAll('.task-input-group').length || 0) <= 1) {
        showMessage('A plan needs at least one task.', 'warning');
        return;
      }

      taskDiv.remove();
      reindexTaskInputs();
    });

    reindexTaskInputs();
  };

  const setTaskRows = (tasks) => {
    if (!tasksContainer) return;
    tasksContainer.innerHTML = '';
    taskCount = 0;
    const rows = safeArray(tasks);
    (rows.length ? rows : [{}]).forEach(addTaskInput);
  };

  setTaskRows([{}]);
  addTaskBtn?.addEventListener('click', () => addTaskInput());
  setupAiPlanGenerator({ form, setTaskRows });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const taskGroups = form.querySelectorAll('.task-input-group');
    const tasks = Array.from(taskGroups).map((group, index) => {
      const titleInput = group.querySelector('[name="taskTitle"]');
      const descriptionInput = group.querySelector('[name="taskDescription"]');

      return {
        day: index + 1,
        title: titleInput?.value || '',
        description: descriptionInput?.value || '',
      };
    }).filter((task) => task.title.trim() && task.description.trim());

    const planData = {
      title: safeText(formData.get('title')),
      description: safeText(formData.get('description')),
      category: safeText(formData.get('category')),
      durationDays: safeInteger(formData.get('durationDays'), tasks.length || 1),
      tasks,
    };

    if (!planData.durationDays || tasks.length === 0) {
      showMessage('Please add a valid duration and at least one task.', 'error');
      return;
    }

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

function setupAiPlanGenerator({ form, setTaskRows }) {
  const aiButton = document.getElementById('aiPlanGeneratorBtn');
  if (!aiButton) return;

  aiButton.addEventListener('click', () => {
    openAiPlanModal({ form, setTaskRows });
  });
}

function openAiPlanModal({ form, setTaskRows }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay ai-plan-overlay show';
  overlay.innerHTML = `
    <div class="modal ai-plan-modal" role="dialog" aria-modal="true" aria-labelledby="aiPlanTitle">
      <div class="modal-header">
        <h2 id="aiPlanTitle">AI Plan Generator</h2>
      </div>
      <form id="aiPlanForm" class="ai-modal-form">
        <div class="modal-body">
          <div class="form-group">
            <label for="aiSubject">Subject</label>
            <input id="aiSubject" name="subject" type="text" placeholder="JavaScript, Biology, Algebra..." required />
          </div>
          <div class="form-group">
            <label for="aiDuration">Duration</label>
            <input id="aiDuration" name="duration" type="number" min="1" max="365" value="7" required />
          </div>
          <div class="form-group">
            <label for="aiLevel">Level</label>
            <select id="aiLevel" name="level" required>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <p class="ai-modal-status" id="aiModalStatus"></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="aiCancelBtn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="aiSubmitBtn">Generate Plan</button>
        </div>
      </form>
    </div>
  `;

  const closeModal = () => {
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  document.body.appendChild(overlay);

  const aiForm = overlay.querySelector('#aiPlanForm');
  const cancelBtn = overlay.querySelector('#aiCancelBtn');
  const submitBtn = overlay.querySelector('#aiSubmitBtn');
  const status = overlay.querySelector('#aiModalStatus');
  const subjectInput = overlay.querySelector('#aiSubject');

  const existingTitle = form.querySelector('[name="title"]')?.value;
  if (existingTitle && subjectInput) {
    subjectInput.value = existingTitle;
  }

  cancelBtn?.addEventListener('click', closeModal);

  aiForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(aiForm);
    const payload = {
      subject: safeText(formData.get('subject')),
      duration: safeInteger(formData.get('duration'), 7),
      level: safeText(formData.get('level'), 'beginner'),
    };

    if (!payload.subject || !payload.duration) {
      if (status) status.textContent = 'Enter a subject and valid duration.';
      return;
    }

    try {
      if (submitBtn) submitBtn.disabled = true;
      if (status) status.textContent = 'Generating your plan...';
      const suggestion = await api.suggestPlan(payload);
      applySuggestedPlanToForm(form, suggestion, setTaskRows);
      showMessage('AI plan generated and added to the form.', 'success');
      closeModal();
    } catch (error) {
      if (status) status.textContent = error.message || 'Could not generate a plan.';
      showMessage('AI plan generation failed: ' + (error.message || 'Please try again.'), 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  subjectInput?.focus();
}

function applySuggestedPlanToForm(form, suggestion, setTaskRows) {
  const plan = suggestion && typeof suggestion === 'object' ? suggestion : {};
  const titleInput = form.querySelector('[name="title"]');
  const descriptionInput = form.querySelector('[name="description"]');
  const categoryInput = form.querySelector('[name="category"]');
  const durationInput = form.querySelector('[name="durationDays"]');

  if (titleInput) titleInput.value = safeText(plan.title, 'Generated Study Plan');
  if (descriptionInput) descriptionInput.value = safeText(plan.description, 'Generated daily study plan.');
  if (durationInput) durationInput.value = safeInteger(plan.durationDays || plan.duration, 1);

  if (categoryInput) {
    const category = safeText(plan.category, 'Other');
    const hasCategory = Array.from(categoryInput.options).some((option) => option.value === category);
    categoryInput.value = hasCategory ? category : 'Other';
  }

  const tasks = safeArray(plan.tasks).map((task, index) => normalizeTask(task, index));
  setTaskRows(tasks);
}

// Plan Detail Page
async function setupPlanDetail() {
  const container = document.getElementById('planDetail');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const planId = params.get('id');

  if (!planId) {
    setErrorState(container, 'Plan not found', 'Missing plan ID.');
    showMessage('Plan not found', 'error');
    return;
  }

  try {
    setLoading(container, 'Loading plan details...');
    const plan = normalizePlan(await api.getPlanById(planId));
    const tasks = safeArray(plan.tasks);

    renderSafely(container, () => `
      <div class="plan-detail-header">
        <h1>${escapeHtml(plan.title)}</h1>
        <span class="plan-category">${escapeHtml(plan.category)}</span>
        <p>${escapeHtml(plan.description)}</p>
        <div class="plan-meta">
          <span>📅 ${plan.durationDays} days</span>
          <span>👥 ${plan.followerCount} followers</span>
          <span>⭐ ${renderStars(plan.averageRating)} (${plan.averageRating.toFixed(1)})</span>
        </div>
      </div>

      <div class="plan-section">
        <h2>Daily Tasks</h2>
        <div class="task-list">
          ${tasks.length ? tasks.map((task) => `
            <div class="task-item">
              <input type="checkbox" data-task-id="${task.id}" />
              <div class="task-content">
                <h4>Day ${task.day}: ${escapeHtml(task.title)}</h4>
                <p class="task-description">${escapeHtml(task.description)}</p>
              </div>
            </div>
          `).join('') : '<div class="empty-state"><p>No tasks have been added to this plan.</p></div>'}
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
    `, 'Error rendering plan details');

    if (isAuthenticated()) {
      setupPlanInteractions(planId);
    }
  } catch (error) {
    setErrorState(container, 'Error loading plan', error.message || 'Please try again later.');
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
      const completedTaskIds = safeArray(progress?.completedTaskIds).map((id) => safeInteger(id));
      checkboxes.forEach((checkbox) => {
        if (completedTaskIds.includes(safeInteger(checkbox.dataset.taskId))) {
          checkbox.checked = true;
        }
      });
      updateProgressDisplay(checkboxes.length, completedTaskIds.length);
    } catch (error) {
      console.error('Error loading progress:', error);
    }

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        updateProgressDisplay(checkboxes.length, Array.from(checkboxes).filter((c) => c.checked).length);
      });
    });

    saveProgressBtn.addEventListener('click', async () => {
      const completedTaskIds = Array.from(document.querySelectorAll('[data-task-id]:checked'))
        .map((c) => safeInteger(c.dataset.taskId))
        .filter(Boolean);

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

      const rating = safeInteger(selectedRating.dataset.rating);

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
  const safeTotal = safeInteger(total);
  const safeCompleted = safeInteger(completed);
  const percentage = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;
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

function handleGlobalError(error) {
  const message = error?.message || String(error || 'Unexpected application error');
  console.error('Global application error:', error);
  showMessage(message, 'error');
}

window.addEventListener('error', (event) => {
  handleGlobalError(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  handleGlobalError(event.reason);
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  try {
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
  } catch (error) {
    handleGlobalError(error);
  }
});
