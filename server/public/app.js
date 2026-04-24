const API_BASE = '/api';

const storage = {
  get(key) {
    return window.localStorage.getItem(key);
  },
  set(key, value) {
    window.localStorage.setItem(key, value);
  },
  remove(key) {
    window.localStorage.removeItem(key);
  },
};

const getAuthHeaders = () => {
  const token = storage.get('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const refreshAccessToken = async () => {
  const refreshToken = storage.get('refreshToken');
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    storage.remove('accessToken');
    storage.remove('refreshToken');
    return null;
  }

  const result = await response.json();
  if (result.data) {
    storage.set('accessToken', result.data.accessToken);
    storage.set('refreshToken', result.data.refreshToken);
    return result.data.accessToken;
  }

  return null;
};

const authFetch = async (path, options = {}) => {
  const headers = { ...options.headers, ...getAuthHeaders() };
  const init = { ...options, headers };
  if (init.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
    init.body = JSON.stringify(init.body);
    init.headers = { 'Content-Type': 'application/json', ...init.headers };
  }

  let response = await fetch(path, init);
  if (response.status === 401) {
    const token = await refreshAccessToken();
    if (token) {
      init.headers = { ...init.headers, Authorization: `Bearer ${token}` };
      response = await fetch(path, init);
    }
  }

  return response;
};

const handleApiResponse = async (response) => {
  const payload = await response.json().catch(() => ({ message: response.statusText }));
  if (!response.ok) {
    throw payload;
  }
  return payload.data;
};

const routeTo = (path) => {
  window.location.href = path;
};

const showMessage = (selector, message) => {
  const container = document.querySelector(selector);
  if (container) {
    container.textContent = message;
  }
};

const createPlanCard = (plan) => {
  const wrapper = document.createElement('article');
  wrapper.className = 'plan-card';
  wrapper.innerHTML = `
    <h3>${plan.title}</h3>
    <p>${plan.description}</p>
    <p><strong>Subject:</strong> ${plan.subject}</p>
    <p><strong>Duration:</strong> ${plan.durationDays} days</p>
    <p><strong>Rating:</strong> ${plan.averageRating.toFixed(1)} ★</p>
    <p><strong>Followers:</strong> ${plan.followerCount}</p>
    <button class="button" data-plan-id="${plan.id}">View plan</button>
  `;
  wrapper.querySelector('button')?.addEventListener('click', () => {
    routeTo(`plan.html?id=${plan.id}`);
  });
  return wrapper;
};

const loadHomePage = async () => {
  const list = document.getElementById('planList');
  if (!list) return;

  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const searchButton = document.getElementById('searchButton');

  const fetchPlans = async () => {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (sortSelect.value) params.set('sortBy', sortSelect.value);

    const response = await fetch(`${API_BASE}/plans?${params.toString()}`);
    const plans = await handleApiResponse(response);
    list.innerHTML = '';
    if (!plans.length) {
      list.innerHTML = '<p>No plans found.</p>';
      return;
    }

    plans.forEach((plan) => list.appendChild(createPlanCard(plan)));
  };

  searchButton?.addEventListener('click', fetchPlans);
  await fetchPlans();
};

const initAuthForms = () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(loginForm).entries());
      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await handleApiResponse(response);
        storage.set('accessToken', result.accessToken);
        storage.set('refreshToken', result.refreshToken);
        routeTo('dashboard.html');
      } catch (error) {
        showMessage('#loginMessage', error.message || 'Login failed');
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(registerForm).entries());
      try {
        const response = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        await handleApiResponse(response);
        showMessage('#registerMessage', 'Account created. Redirecting to login...');
        setTimeout(() => routeTo('login.html'), 1200);
      } catch (error) {
        showMessage('#registerMessage', error.message || 'Registration failed');
      }
    });
  }
};

const initDashboard = async () => {
  const profileInfo = document.getElementById('profileInfo');
  const createdPlans = document.getElementById('createdPlans');
  const followedPlans = document.getElementById('followedPlans');
  const logoutButton = document.getElementById('logoutButton');
  if (!profileInfo || !createdPlans || !followedPlans) return;

  logoutButton?.addEventListener('click', () => {
    storage.remove('accessToken');
    storage.remove('refreshToken');
    routeTo('login.html');
  });

  try {
    const response = await authFetch(`${API_BASE}/users/me`, { method: 'GET' });
    const user = await handleApiResponse(response);

    profileInfo.innerHTML = `
      <p><strong>${user.name}</strong></p>
      <p>${user.email}</p>
      <p>Created plans: ${user.createdPlans.length}</p>
      <p>Followed plans: ${user.followedPlans.length}</p>
    `;

    createdPlans.innerHTML = user.createdPlans.length
      ? user.createdPlans.map((plan) => createPlanCard(plan).outerHTML).join('')
      : '<p>No created plans yet.</p>';
    followedPlans.innerHTML = user.followedPlans.length
      ? user.followedPlans.map((plan) => createPlanCard(plan).outerHTML).join('')
      : '<p>No followed plans yet.</p>';
  } catch (error) {
    showMessage('#dashboardMessage', error.message || 'Please log in.');
    setTimeout(() => routeTo('login.html'), 1200);
  }
};

const buildTaskHtml = (task) => `
  <article class="task-card">
    <h3>Day ${task.day}</h3>
    <p><strong>${task.title}</strong></p>
    <p>${task.description}</p>
  </article>
`;

const initPlanPage = async () => {
  const planTitle = document.getElementById('planTitle');
  if (!planTitle) return;
  const planDescription = document.getElementById('planDescription');
  const planSubject = document.getElementById('planSubject');
  const planDuration = document.getElementById('planDuration');
  const planRating = document.getElementById('planRating');
  const planFollowers = document.getElementById('planFollowers');
  const followButton = document.getElementById('followButton');
  const taskList = document.getElementById('taskList');
  const progressTasks = document.getElementById('progressTasks');
  const progressForm = document.getElementById('progressForm');
  const rateButton = document.getElementById('rateButton');
  const ratingSelect = document.getElementById('ratingSelect');
  const planMessage = document.getElementById('planMessage');

  const params = new URLSearchParams(window.location.search);
  const planId = params.get('id');
  if (!planId) {
    showMessage('#planMessage', 'Missing plan ID.');
    return;
  }

  try {
    const data = await handleApiResponse(await fetch(`${API_BASE}/plans/${planId}`));
    planTitle.textContent = data.title;
    planDescription.textContent = data.description;
    planSubject.textContent = `Subject: ${data.subject}`;
    planDuration.textContent = `Duration: ${data.durationDays} days`;
    planRating.textContent = `Rating: ${data.averageRating.toFixed(1)} ★`;
    planFollowers.textContent = `Followers: ${data.followerCount}`;

    taskList.innerHTML = data.tasks.map(buildTaskHtml).join('');
    progressTasks.innerHTML = data.tasks
      .map(
        (task) => `
        <label>
          <input type="checkbox" name="task" value="${task.id}" />
          Day ${task.day}: ${task.title}
        </label>
      `,
      )
      .join('');

    const initializeUserInteractions = async () => {
      const profileResponse = await authFetch(`${API_BASE}/users/me`, { method: 'GET' });
      if (!profileResponse.ok) return;

      const progress = await handleApiResponse(
        await authFetch(`${API_BASE}/plans/${planId}/progress`, { method: 'GET' }),
      );
      progress.completedTaskIds.forEach((taskId) => {
        const checkbox = progressTasks.querySelector(`input[value="${taskId}"]`);
        if (checkbox) checkbox.checked = true;
      });
    };


    progressForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const selected = Array.from(progressTasks.querySelectorAll('input[name="task"]:checked')).map(
        (input) => Number(input.value),
      );
      try {
        await handleApiResponse(
          await authFetch(`${API_BASE}/plans/${planId}/progress`, {
            method: 'POST',
            body: { completedTaskIds: selected },
          }),
        );
        showMessage('#planMessage', 'Progress saved successfully.');
      } catch (error) {
        showMessage('#planMessage', error.message || 'Progress update failed.');
      }
    });

    followButton?.addEventListener('click', async () => {
      const action = followButton.textContent.includes('Unfollow') ? 'DELETE' : 'POST';
      try {
        await handleApiResponse(
          await authFetch(`${API_BASE}/plans/${planId}/follow`, { method: action }),
        );
        followButton.textContent = action === 'POST' ? 'Unfollow plan' : 'Follow plan';
      } catch (error) {
        showMessage('#planMessage', error.message || 'Follow action failed. Please login.');
      }
    });

    rateButton?.addEventListener('click', async () => {
      try {
        const value = Number(ratingSelect.value);
        const result = await handleApiResponse(
          await authFetch(`${API_BASE}/plans/${planId}/rating`, {
            method: 'POST',
            body: { rating: value },
          }),
        );
        planRating.textContent = `Rating: ${result.averageRating.toFixed(1)} ★`;
        showMessage('#planMessage', 'Rating saved.');
      } catch (error) {
        showMessage('#planMessage', error.message || 'Rating failed.');
      }
    });

    if (storage.get('accessToken')) {
      followButton.textContent = 'Follow plan';
      await initializeUserInteractions();
    } else {
      followButton.textContent = 'Login to follow';
      followButton.disabled = true;
      progressForm?.querySelectorAll('input, button').forEach((control) => {
        (control as HTMLInputElement | HTMLButtonElement).disabled = true;
      });
      rateButton?.setAttribute('disabled', 'true');
    }
  } catch (error) {
    showMessage('#planMessage', error.message || 'Could not load plan');
  }
};

const initCreateEditPage = async () => {
  const planForm = document.getElementById('planForm');
  const addTaskButton = document.getElementById('addTaskButton');
  const tasksContainer = document.getElementById('tasksContainer');
  const formTitle = document.getElementById('formTitle');
  const planFormMessage = document.getElementById('planFormMessage');
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('id');
  if (!planForm || !tasksContainer) return;


  const addTaskRow = (task = { day: 1, title: '', description: '' }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'task-item';
    wrapper.innerHTML = `
      <label>Day<input type="number" name="taskDay" min="1" value="${task.day}" required /></label>
      <label>Title<input type="text" name="taskTitle" value="${task.title}" required /></label>
      <label>Description<input type="text" name="taskDescription" value="${task.description}" required /></label>
      <button type="button" class="button button-secondary remove-task">Remove</button>
    `;
    wrapper.querySelector('.remove-task')?.addEventListener('click', () => wrapper.remove());
    tasksContainer?.appendChild(wrapper);
  };

  addTaskButton?.addEventListener('click', () => addTaskRow());

  if (planId) {
    formTitle.textContent = 'Edit Study Plan';
    try {
      const data = await handleApiResponse(await fetch(`${API_BASE}/plans/${planId}`));
      const fields = planForm.querySelectorAll('input[name], textarea[name]');
      fields.forEach((field) => {
        const name = field.getAttribute('name');
        if (name && data[name] !== undefined) {
          if (field.tagName === 'TEXTAREA') {
            field.textContent = data[name];
          } else {
            (field as HTMLInputElement).value = data[name];
          }
        }
      });
      tasksContainer.innerHTML = '<h2>Daily Tasks</h2>';
      data.tasks.forEach(addTaskRow);
    } catch (error) {
      showMessage('#planFormMessage', error.message || 'Unable to load plan for editing');
    }
  }

  planForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!storage.get('accessToken')) {
      routeTo('login.html');
      return;
    }

    const form = new FormData(planForm);
    const payload = {
      title: form.get('title'),
      description: form.get('description'),
      subject: form.get('subject'),
      durationDays: Number(form.get('durationDays')),
      tasks: []
    };

    const taskRows = tasksContainer?.querySelectorAll('.task-item') || [];
    taskRows.forEach((row) => {
      const day = (row.querySelector('[name="taskDay"]') as HTMLInputElement).value;
      const title = (row.querySelector('[name="taskTitle"]') as HTMLInputElement).value;
      const description = (row.querySelector('[name="taskDescription"]') as HTMLInputElement).value;
      if (day && title && description) {
        payload.tasks.push({ day: Number(day), title, description });
      }
    });

    try {
      const method = planId ? 'PUT' : 'POST';
      const url = planId ? `${API_BASE}/plans/${planId}` : `${API_BASE}/plans`;
      const result = await handleApiResponse(
        await authFetch(url, {
          method,
          body: payload,
        }),
      );

      showMessage('#planFormMessage', 'Plan saved successfully.');
      setTimeout(() => routeTo(`plan.html?id=${result.id}`), 1200);
    } catch (error) {
      showMessage('#planFormMessage', error.message || 'Failed to save plan');
    }
  });
};

const initPage = () => {
  loadHomePage();
  initAuthForms();
  initDashboard();
  initPlanPage();
  initCreateEditPage();
};

document.addEventListener('DOMContentLoaded', initPage);
