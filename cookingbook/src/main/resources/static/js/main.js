const API_BASE = 'http://localhost:8080/api/v1';

const guestHeader = document.getElementById('guest-header');
const userHeader = document.getElementById('user-header');
const usernameDisplay = document.getElementById('username-display');
const loginBtnHeader = document.getElementById('login-btn-header');
const registerBtnHeader = document.getElementById('register-btn-header');
const profileBtn = document.getElementById('profile-btn');
const logoutBtn = document.getElementById('logout-btn');
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const sortSelect = document.getElementById('sort-select');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const recipesContainer = document.getElementById('recipes-container');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadingPlaceholder = document.getElementById('loading-placeholder');

let currentPage = 0;
const pageSize = 10;
let currentFilters = { name: '', category: '', sort: 'recipeName,asc' };
let isLoading = false;

function getToken() { return localStorage.getItem('jwtToken'); }
function isLoggedIn() { return !!getToken(); }
function removeToken() {
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRole');
}

function updateHeaderAuthUI() {
  if (isLoggedIn()) {
    guestHeader.style.display = 'none';
    userHeader.style.display = 'flex';
    usernameDisplay.textContent = localStorage.getItem('userName') || 'Пользователь';
  } else {
    guestHeader.style.display = 'flex';
    userHeader.style.display = 'none';
  }
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  
  if (response.status === 204) return null;
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Ошибка сервера' }));
    throw new Error(err.message || `HTTP ${response.status}`);
  }
  return response.status >= 200 && response.status < 300 ? await response.json() : null;
}

async function loadCategories() {
  try {
    const cats = await apiRequest('/category');
    const select = document.getElementById('category-select');
    select.innerHTML = '<option value="">Все категории</option>';
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.categoryName;
      opt.textContent = cat.categoryName;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Не удалось загрузить категории:', err);
  }
}

async function fetchRecipes(page = 0) {
  const { name, category, sort } = currentFilters;
  const isSearching = name.trim() !== '' || category !== '';

  if (isSearching && !isLoggedIn()) {
    alert('Поиск и фильтрация доступны только авторизованным пользователям.');
    return { content: [], totalPages: 1, totalElements: 0 };
  }

  let data;
  try {
    if (isSearching) {
      const body = { recipeName: name.trim() || undefined, category1: category || undefined, category2: undefined };
      data = await apiRequest(`/recipe/search?page=${page}&size=${pageSize}&sort=${sort}`, 'POST', body);
    } else {
      data = await apiRequest(`/recipe?page=${page}&size=${pageSize}&sort=${sort}`);
    }
    return data;
  } catch (err) {
    console.error('Ошибка загрузки рецептов:', err);
    alert(err.message);
    return { content: [], totalPages: 1, totalElements: 0 };
  }
}

function renderRecipes(recipes, append = false) {
  if (!append) recipesContainer.innerHTML = '';
  
  if (!recipes || recipes.length === 0) {
    if (!append) recipesContainer.innerHTML = '<div class="info-message">Рецепты не найдены</div>';
    return;
  }

  const template = document.getElementById('recipe-card-template');
  recipes.forEach(r => {
    const clone = document.importNode(template.content, true);
    const card = clone.querySelector('.recipe-card');
    card.dataset.recipeId = r.recipeId;
    clone.querySelector('img').src = r.image || 'https://via.placeholder.com/300x200?text=Нет+фото';
    clone.querySelector('img').alt = r.recipeName;
    clone.querySelector('h3').textContent = r.recipeName;
    clone.querySelector('.recipe-card__time').textContent = `${r.time} мин`;
    recipesContainer.appendChild(clone);
  });
}

applyFiltersBtn.addEventListener('click', async () => {
  if (isLoading) return;
  isLoading = true;
  applyFiltersBtn.disabled = true;
  applyFiltersBtn.textContent = 'Поиск...';

  currentFilters.name = searchInput.value;
  currentFilters.category = categorySelect.value;
  currentFilters.sort = sortSelect.value;

  currentPage = 0;
  const data = await fetchRecipes(currentPage);
  renderRecipes(data.content, false);
  
  const hasMore = (currentPage + 1) * pageSize < data.totalElements;
  loadMoreBtn.style.display = hasMore ? 'block' : 'none';

  isLoading = false;
  applyFiltersBtn.disabled = false;
  applyFiltersBtn.textContent = 'Применить';
});

loadMoreBtn.addEventListener('click', async () => {
  if (isLoading) return;
  isLoading = true;
  loadMoreBtn.textContent = 'Загрузка...';
  loadMoreBtn.disabled = true;

  currentPage++;
  const data = await fetchRecipes(currentPage);
  renderRecipes(data.content, true);

  const hasMore = (currentPage + 1) * pageSize < data.totalElements;
  loadMoreBtn.style.display = hasMore ? 'block' : 'none';

  isLoading = false;
  loadMoreBtn.textContent = 'Загрузить ещё';
  loadMoreBtn.disabled = false;
});

recipesContainer.addEventListener('click', (e) => {
  const card = e.target.closest('.recipe-card');
  if (card) {
    window.location.hash = `recipe/${card.dataset.recipeId}`;
  }
});

loginBtnHeader.addEventListener('click', () => window.location.hash = 'login');
registerBtnHeader.addEventListener('click', () => window.location.hash = 'register');
profileBtn.addEventListener('click', () => window.location.hash = 'profile');

logoutBtn.addEventListener('click', () => {
  removeToken();
  updateHeaderAuthUI();
  currentPage = 0;
  currentFilters = { name: '', category: '', sort: 'recipeName,asc' };
  searchInput.value = ''; categorySelect.value = ''; sortSelect.value = 'recipeName,asc';
  fetchRecipes(0).then(data => renderRecipes(data.content, false));
});

async function initMainPage() {
  if (loadingPlaceholder) loadingPlaceholder.style.display = 'block';
  updateHeaderAuthUI();
  await loadCategories();
  
  const data = await fetchRecipes(0);
  if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
  renderRecipes(data.content, false);
  
  const hasMore = pageSize < data.totalElements;
  loadMoreBtn.style.display = hasMore ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', initMainPage);

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  if (hash === '' || hash === 'home') initMainPage();
  if (hash === 'login') alert('Здесь будет форма входа. Напиши, когда будешь готов, и я дам код.');
  if (hash === 'register') alert('Здесь будет форма регистрации.');
  if (hash === 'profile') alert('Здесь будет личный кабинет.');
  if (hash.startsWith('recipe/')) alert(`Откроется страница рецепта #${hash.split('/')[1]}`);
});
  } catch (err) {
    console.error('Не удалось загрузить категории:', err);
  }
}

// ==================== ПОЛУЧЕНИЕ РЕЦЕПТОВ ====================
async function fetchRecipes(page = 0) {
  const { name, category, sort } = currentFilters;
  const isSearching = name.trim() !== '' || category !== '';

  // Поиск по API требует авторизации (см. doci.txt п.4.3)
  if (isSearching && !isLoggedIn()) {
    alert('🔍 Поиск и фильтрация доступны только авторизованным пользователям.');
    return { content: [], totalPages: 1, totalElements: 0 };
  }

  let data;
  try {
    if (isSearching) {
      // POST /recipe/search
      const body = { recipeName: name.trim() || undefined, category1: category || undefined, category2: undefined };
      data = await apiRequest(`/recipe/search?page=${page}&size=${pageSize}&sort=${sort}`, 'POST', body);
    } else {
      // GET /recipe (публичный, с пагинацией)
      data = await apiRequest(`/recipe?page=${page}&size=${pageSize}&sort=${sort}`);
    }
    return data; // { content: [...], totalPages: N, totalElements: M }
  } catch (err) {
    console.error('Ошибка загрузки рецептов:', err);
    alert(err.message);
    return { content: [], totalPages: 1, totalElements: 0 };
  }
}

// ==================== ОТРИСОВКА КАРТОЧЕК (DOM) ====================
function renderRecipes(recipes, append = false) {
  if (!append) recipesContainer.innerHTML = '';
  
  if (!recipes || recipes.length === 0) {
    if (!append) recipesContainer.innerHTML = '<div class="info-message">Рецепты не найдены</div>';
    return;
  }

  const template = document.getElementById('recipe-card-template');
  recipes.forEach(r => {
    const clone = document.importNode(template.content, true);
    const card = clone.querySelector('.recipe-card');
    card.dataset.recipeId = r.recipeId;
    clone.querySelector('img').src = r.image || 'https://via.placeholder.com/300x200?text=Нет+фото';
    clone.querySelector('img').alt = r.recipeName;
    clone.querySelector('h3').textContent = r.recipeName;
    clone.querySelector('.recipe-card__time').textContent = `${r.time} мин`;
    recipesContainer.appendChild(clone);
  });
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
applyFiltersBtn.addEventListener('click', async () => {
  if (isLoading) return;
  isLoading = true;
  applyFiltersBtn.disabled = true;
  applyFiltersBtn.textContent = 'Поиск...';

  currentFilters.name = searchInput.value;
  currentFilters.category = categorySelect.value;
  currentFilters.sort = sortSelect.value;

  currentPage = 0;
  const data = await fetchRecipes(currentPage);
  renderRecipes(data.content, false);
  
  // Показываем "Загрузить ещё", если есть ещё данные
  const hasMore = (currentPage + 1) * pageSize < data.totalElements;
  loadMoreBtn.style.display = hasMore ? 'block' : 'none';

  isLoading = false;
  applyFiltersBtn.disabled = false;
  applyFiltersBtn.textContent = 'Применить';
});

loadMoreBtn.addEventListener('click', async () => {
  if (isLoading) return;
  isLoading = true;
  loadMoreBtn.textContent = 'Загрузка...';
  loadMoreBtn.disabled = true;

  currentPage++;
  const data = await fetchRecipes(currentPage);
  renderRecipes(data.content, true); // true = добавить к существующим

  const hasMore = (currentPage + 1) * pageSize < data.totalElements;
  loadMoreBtn.style.display = hasMore ? 'block' : 'none';

  isLoading = false;
  loadMoreBtn.textContent = 'Загрузить ещё';
  loadMoreBtn.disabled = false;
});

// Клик по карточке -> переход на страницу рецепта (пока через hash)
recipesContainer.addEventListener('click', (e) => {
  const card = e.target.closest('.recipe-card');
  if (card) {
    window.location.hash = `recipe/${card.dataset.recipeId}`;
  }
});

loginBtnHeader.addEventListener('click', () => window.location.hash = 'login');
registerBtnHeader.addEventListener('click', () => window.location.hash = 'register');
profileBtn.addEventListener('click', () => window.location.hash = 'profile');

logoutBtn.addEventListener('click', () => {
  removeToken();
  updateHeaderAuthUI();
  currentPage = 0;
  currentFilters = { name: '', category: '', sort: 'recipeName,asc' };
  searchInput.value = ''; categorySelect.value = ''; sortSelect.value = 'recipeName,asc';
  fetchRecipes(0).then(data => renderRecipes(data.content, false));
});

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
async function initMainPage() {
  if (loadingPlaceholder) loadingPlaceholder.style.display = 'block';
  updateHeaderAuthUI();
  await loadCategories();
  
  const data = await fetchRecipes(0);
  if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
  renderRecipes(data.content, false);
  
  const hasMore = pageSize < data.totalElements;
  loadMoreBtn.style.display = hasMore ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', initMainPage);

// Простой роутер (пока только заглушки для хэшей)
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  if (hash === '' || hash === 'home') initMainPage();
  if (hash === 'login') alert('Здесь будет форма входа. Напиши, когда будешь готов, и я дам код.');
  if (hash === 'register') alert('Здесь будет форма регистрации.');
  if (hash === 'profile') alert('Здесь будет личный кабинет.');
  if (hash.startsWith('recipe/')) alert(`Откроется страница рецепта #${hash.split('/')[1]}`);
});