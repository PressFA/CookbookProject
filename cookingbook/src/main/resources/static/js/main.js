const API_BASE = 'http://localhost:8080/api/v1';
const pageSize = 10;
let currentPage = 0;
let isSearching = false;

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
const cardTemplate = document.getElementById('recipe-card-template');

function getToken() {
    return localStorage.getItem('jwtToken');
}

function isLoggedIn() {
    return !!getToken();
}

function removeToken() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
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
    const currentApi = `${API_BASE}${endpoint}`;
    const currentJwtToken = getToken();
    const headers = {
        'Content-Type': 'application/json'
    };

    if (currentJwtToken) {
        headers['Authorization'] = `Bearer ${currentJwtToken}`;
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(currentApi, options);

        if (response.status === 204) {
            return null;
        }

        if (response.status === 201) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return { status: 'created' };
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            if (!response.ok) {
                throw new Error(`Ошибка ${response.status}`);
            }
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Ошибка ${response.status}`);
        }

        return data;

    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function loadCategories() {
    const cats = await apiRequest('/category');
    if (!cats) return;

    const select = document.getElementById('category-select');
    select.innerHTML = '<option value="">Все категории</option>';

    cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.categoryName;
        opt.textContent = cat.categoryName;
        select.appendChild(opt);
    });
}

async function fetchRecipes(page = 0) {
    if (loadingPlaceholder) loadingPlaceholder.style.display = 'block';
    loadMoreBtn.style.display = 'none';

    const recipeName = searchInput.value.trim();
    const category = categorySelect.value;
    const sort = sortSelect.value;

    if ((recipeName || category) && !isLoggedIn()) {
        alert('Поиск и фильтрация доступны только зарегистрированным пользователям.\nПожалуйста, войдите в аккаунт!');
        if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
        return { content: [], totalElements: 0 };
    }

    let data;
    try {
        if (recipeName || category) {
            isSearching = true;
            const searchBody = {
                recipeName: recipeName || undefined,
                category1: category || undefined,
                category2: undefined
            };
            data = await apiRequest(`/recipe/search?page=${page}&size=${pageSize}&sort=${sort}`, 'POST', searchBody);
        } else {
            isSearching = false;
            data = await apiRequest(`/recipe?page=${page}&size=${pageSize}&sort=${sort}`);
        }

        return data;
    } finally {
        if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
    }
}

function renderRecipes(recipes, append = false) {
    if (!recipes) recipes = [];

    if (!append) recipesContainer.innerHTML = '';

    if (recipes.length === 0) {
        if (!append) recipesContainer.innerHTML = '<div class="info-message">Рецепты не найдены</div>';
        return;
    }

    recipes.forEach(r => {
        const clone = document.importNode(cardTemplate.content, true);
        const card = clone.querySelector('.recipe-card');

        card.dataset.recipeId = r.recipeId;
        clone.querySelector('img').src = r.image;
        clone.querySelector('img').alt = r.recipeName;
        clone.querySelector('h3').textContent = r.recipeName;
        clone.querySelector('.recipe-card__time').textContent = `${r.time} мин`;

        recipesContainer.appendChild(clone);
    });

    if (recipes.length === pageSize) {
        loadMoreBtn.style.display = 'inline-block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

applyFiltersBtn.addEventListener('click', async () => {
    currentPage = 0;
    const data = await fetchRecipes(currentPage);
    renderRecipes(data.content, false);
});

loadMoreBtn.addEventListener('click', async () => {
    currentPage++;
    const data = await fetchRecipes(currentPage);
    renderRecipes(data.content, true);
});

recipesContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.recipe-card');
    if (card) {
        const id = card.dataset.recipeId;
        window.location.hash = `recipe/${id}`;
    }
});

loginBtnHeader.addEventListener('click', () => window.location.hash = 'login');
registerBtnHeader.addEventListener('click', () => window.location.hash = 'register');
profileBtn.addEventListener('click', () => {
    if (!isLoggedIn()) {
        alert('Войдите в аккаунт');
        window.location.hash = 'login';
    } else {
        window.location.hash = 'profile';
    }
});

logoutBtn.addEventListener('click', () => {
    removeToken();
    updateHeaderAuthUI();
    searchInput.value = '';
    categorySelect.value = '';
    currentPage = 0;
    fetchRecipes(0).then(data => renderRecipes(data.content, false));
});

async function init() {
    updateHeaderAuthUI();
    await loadCategories();

    const data = await fetchRecipes(0);
    renderRecipes(data.content, false);
}

document.addEventListener('DOMContentLoaded', init);

function showView(hash) {
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('register-view').style.display = 'none';

    if (hash === '#login') {
        document.getElementById('login-view').style.display = 'block';
    } else if (hash === '#register') {
        document.getElementById('register-view').style.display = 'block';
    } else {
        document.getElementById('main-view').style.display = 'block';
        if (!hash || hash === '#home') {
            init();
        }
    }
}

window.addEventListener('hashchange', () => {
    const hash = window.location.hash;

    document.getElementById('main-view').style.display = 'none';
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('register-view').style.display = 'none';
    document.getElementById('profile-view').style.display = 'none';
    document.getElementById('recipe-view').style.display = 'none';

    if (hash === '#profile') {
        if (!isLoggedIn()) {
            window.location.hash = 'login';
        } else {
            document.getElementById('profile-view').style.display = 'block';
            loadProfileData();
        }
    } else if (hash.startsWith('#recipe/')) {
        const recipeId = hash.split('/')[1];
        loadRecipeDetail(recipeId);
    } else if (hash === '#login') {
        document.getElementById('login-view').style.display = 'block';
    } else if (hash === '#register') {
        document.getElementById('register-view').style.display = 'block';
    } else {
        document.getElementById('main-view').style.display = 'block';
    }
});

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const errorMsg = document.getElementById('login-error');
        errorMsg.textContent = '';

        try {
            const res = await fetch(`${API_BASE}/auth/sign-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Ошибка входа');
            }

            const data = await res.json();
            localStorage.setItem('jwtToken', data.jwtToken);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userId', data.userId);

            updateHeaderAuthUI();
            window.location.hash = '#home';
        } catch (err) {
            errorMsg.textContent = err.message;
        }
    });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        const errorMsg = document.getElementById('reg-error');
        errorMsg.textContent = '';

        try {
            const res = await fetch(`${API_BASE}/auth/registration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username: email, password })
            });

            if (!res.ok) {
                const err = await res.json();
                if (typeof err === 'object' && !err.message) {
                    const firstError = Object.values(err)[0];
                    throw new Error(firstError);
                }
                throw new Error(err.message || 'Ошибка регистрации');
            }

            alert('Регистрация успешна! Теперь войдите в аккаунт.');
            window.location.hash = '#login';
        } catch (err) {
            errorMsg.textContent = err.message;
        }
    });
}

showView(window.location.hash);

const profileView = document.getElementById('profile-view');
const profileListContainer = document.getElementById('profile-list-container');
const radioButtons = document.querySelectorAll('input[name="profile-list"]');

async function loadProfileData() {
    try {
        const userInfo = await apiRequest('/user/me');
        if (userInfo) {
            document.getElementById('profile-user-name').textContent = userInfo.name;
            document.getElementById('profile-user-role').textContent = 'Роль: ' + userInfo.role;
            document.getElementById('profile-recipes-count').textContent = userInfo.recipesSize;
            document.getElementById('profile-favorites-count').textContent = userInfo.favoritesSize;
        }
    } catch (err) {
        console.error('Ошибка загрузки инфо пользователя:', err);
        document.getElementById('profile-user-name').textContent = 'Пользователь';
        document.getElementById('profile-user-role').textContent = 'Роль: USER';
        document.getElementById('profile-recipes-count').textContent = '0';
        document.getElementById('profile-favorites-count').textContent = '0';
    }

    const activeRadio = document.querySelector('input[name="profile-list"]:checked');
    const type = activeRadio.value;

    profileListContainer.innerHTML = '<div class="spinner"></div>';

    try {
        let url = '';
        if (type === 'my') {
            url = '/recipe/user-recipes/me';
        } else {
            url = '/recipe/favorite-recipes/me';
        }

        const recipes = await apiRequest(url);

        if (!recipes || recipes.length === 0) {
            profileListContainer.innerHTML = '<div class="info-message">Список пуст</div>';
            return;
        }

        renderProfileList(recipes, type);

    } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
        profileListContainer.innerHTML = '<div class="info-message">Ошибка загрузки данных</div>';
    }
}

function renderProfileList(recipes, type) {
    profileListContainer.innerHTML = '';

    recipes.forEach(recipe => {
        const item = document.createElement('div');
        item.className = 'profile-item';

        const cats = recipe.categories ? recipe.categories.join(', ') : '';

        // Кнопки действий (показываем только в "Мои рецепты")
        let actionsHTML = '';
        if (type === 'my') {
            actionsHTML = `
        <div class="recipe-actions">
          <button class="btn btn-sm btn-outline" onclick="openEditRecipe(${recipe.recipeId})">Изменить</button>
          <button class="btn btn-sm btn-danger" onclick="deleteRecipe(${recipe.recipeId})">Удалить</button>
        </div>
      `;
        }

        item.innerHTML = `
      <div class="profile-item-info">
        <span class="recipe-name">${recipe.recipeName}</span>
        <span class="recipe-meta">⏱ ${recipe.time} мин | 🏷 ${cats}</span>
      </div>
      ${actionsHTML}
    `;

        profileListContainer.appendChild(item);
    });
}

radioButtons.forEach(radio => {
    radio.addEventListener('change', () => {
        loadProfileData();
    });
});

document.getElementById('add-recipe-btn').addEventListener('click', () => {
    window.location.hash = 'create-recipe';
});

window.openEditRecipe = (id) => {
    window.location.hash = `edit-recipe/${id}`;
};

window.deleteRecipe = async (id) => {
    if (!confirm('Точно удалить рецепт?')) return;

    try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/recipe/user-delete/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert('Рецепт удален');
            loadProfileData();
        } else {
            alert('Ошибка при удалении');
        }
    } catch (err) {
        console.error(err);
    }
};

const recipeView = document.getElementById('recipe-view');
const recipeDetailContent = document.getElementById('recipe-detail-content');

async function loadRecipeDetail(recipeId) {
    recipeDetailContent.innerHTML = '<div class="spinner"></div>';
    recipeView.style.display = 'block';

    try {
        const recipe = await apiRequest(`/recipe/${recipeId}`);
        if (!recipe) {
            recipeDetailContent.innerHTML = '<div class="info-message">Рецепт не найден</div>';
            return;
        }

        renderRecipeDetail(recipe);

    } catch (err) {
        console.error('Ошибка загрузки рецепта:', err);
        recipeDetailContent.innerHTML = '<div class="info-message">Ошибка загрузки рецепта</div>';
    }
}

function renderRecipeDetail(recipe) {
    const isFavorite = isLoggedIn() ? checkIfFavorite(recipe.recipeId) : false;

    const categoriesHTML = recipe.categories
        ? recipe.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')
        : '';

    recipeDetailContent.innerHTML = `
    <img src="${recipe.image}" alt="${recipe.recipeName}" class="recipe-detail-image">
    
    <div class="recipe-detail-header">
      <h1>${recipe.recipeName}</h1>
    </div>
    
    <div class="recipe-meta-info">
      <div class="meta-item">
        <span></span>
        <span>${recipe.time} мин</span>
      </div>
      <div class="meta-item">
        <span></span>
        <span>Создан: ${new Date(recipe.createdAt).toLocaleDateString('ru-RU')}</span>
      </div>
      ${recipe.updatedAt ? `
      <div class="meta-item">
        <span></span>
        <span>Обновлён: ${new Date(recipe.updatedAt).toLocaleDateString('ru-RU')}</span>
      </div>
      ` : ''}
    </div>
    
    <p class="recipe-author">Автор: ${recipe.name}</p>
    
    <div class="recipe-categories">
      ${categoriesHTML}
    </div>
    
    <div class="nutrition-info">
      <h3>Пищевая ценность</h3>
      <div class="nutrition-grid">
        <div class="nutrition-item">
          <div class="nutrition-value">${recipe.calories}</div>
          <div class="nutrition-label">ккал</div>
        </div>
        <div class="nutrition-item">
          <div class="nutrition-value">${recipe.proteins}г</div>
          <div class="nutrition-label">белки</div>
        </div>
        <div class="nutrition-item">
          <div class="nutrition-value">${recipe.fats}г</div>
          <div class="nutrition-label">жиры</div>
        </div>
        <div class="nutrition-item">
          <div class="nutrition-value">${recipe.carbs}г</div>
          <div class="nutrition-label">углеводы</div>
        </div>
      </div>
    </div>
    
    <div class="recipe-description">
      ${recipe.description}
    </div>
    
    ${isLoggedIn() ? `
    <div class="favorite-checkbox">
      <input type="checkbox" id="favorite-checkbox" ${isFavorite ? 'checked' : ''}>
      <label for="favorite-checkbox">Добавить в избранное</label>
    </div>
    ` : '<p style="color: #888; margin-top: 20px;">Чтобы добавить в избранное, войдите в аккаунт</p>'}
  `;

    if (isLoggedIn()) {
        const checkbox = document.getElementById('favorite-checkbox');
        checkbox.addEventListener('change', async (e) => {
            const isAdding = e.target.checked;

            try {
                const response = await apiRequest('/favorite', 'POST', {
                    recipeId: recipe.recipeId,
                    isFavorite: isAdding
                });

                if (response === null) {
                    alert('Рецепт удалён из избранного');
                } else {
                    alert('Рецепт добавлен в избранное!');
                }
            } catch (err) {
                console.error('Ошибка изменения избранного:', err);
                alert('Ошибка при изменении избранного: ' + err.message);
                checkbox.checked = !checkbox.checked;
            }
        });
    }
}

function checkIfFavorite(recipeId) {
    return false;
}
    } catch (err) {
        console.error(err);
    }
};




// ==================== ДЕТАЛЬНАЯ СТРАНИЦА РЕЦЕПТА ====================
const recipeView = document.getElementById('recipe-view');
const recipeDetailContent = document.getElementById('recipe-detail-content');

async function loadRecipeDetail(recipeId) {
    recipeDetailContent.innerHTML = '<div class="spinner"></div>';
    recipeView.style.display = 'block';

    try {
        const recipe = await apiRequest(`/recipe/${recipeId}`);
        if (!recipe) {
            recipeDetailContent.innerHTML = '<div class="info-message">Рецепт не найден</div>';
            return;
        }

        renderRecipeDetail(recipe);

    } catch (err) {
        console.error('Ошибка загрузки рецепта:', err);
        recipeDetailContent.innerHTML = '<div class="info-message">Ошибка загрузки рецепта</div>';
    }
}

function renderRecipeDetail(recipe) {
    // Проверяем, в избранном ли рецепт (только для авторизованных)
    const isFavorite = isLoggedIn() ? checkIfFavorite(recipe.recipeId) : false;

    const categoriesHTML = recipe.categories
        ? recipe.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')
        : '';

    recipeDetailContent.innerHTML = `
    <img src="${recipe.image}" alt="${recipe.recipeName}" class="recipe-detail-image">
    
    <div class="recipe-detail-header">
      <h1>${recipe.recipeName}</h1>
    </div>
    
    <div class="recipe-meta-info">
      <div class="meta-item">
        <span>⏱</span>
        <span>${recipe.time} мин</span>
      </div>
      <div class="meta-item">
        <span>📅</span>
        <span>Создан: ${new Date(recipe.createdAt).toLocaleDateString('ru-RU')}</span>
      </div>
      ${recipe.updatedAt ? `
      <div class="meta-item">
        <span>✏</span>
        <span>Обновлён: ${new Date(recipe.updatedAt).toLocaleDateString('ru-RU')}</span>
      </div>
      ` : ''}
    </div>
    
    <p class="recipe-author">👨‍🍳 Автор: ${recipe.name}</p>
    
    <div class="recipe-categories">
      ${categoriesHTML}
    </div>
    
    <div class="nutrition-info">
      <h3>📊 Пищевая ценность</h3>
      <div class="nutrition-grid">
        <div class="nutrition-item">
          <div class="nutrition-value">${recipe.calories}</div>
          <div class="nutrition-label">ккал</div>
        </div>
        <div class="nutrition-item">
          <div class="nutrition-value">${recipe.proteins}г</div>
          <div class="nutrition-label">белки</div>
        </div>
        <div class="nutrition-item">
          <div class="nutrition-value">${recipe.fats}г</div>
          <div class="nutrition-label">жиры</div>
        </div>
        <div class="nutrition-item">
          <div class="nutrition-value">${recipe.carbs}г</div>
          <div class="nutrition-label">углеводы</div>
        </div>
      </div>
    </div>
    
    <div class="recipe-description">
      ${recipe.description}
    </div>
    
    ${isLoggedIn() ? `
    <div class="favorite-checkbox">
      <input type="checkbox" id="favorite-checkbox" ${isFavorite ? 'checked' : ''}>
      <label for="favorite-checkbox">⭐ Добавить в избранное</label>
    </div>
    ` : '<p style="color: #888; margin-top: 20px;">🔒 Чтобы добавить в избранное, войдите в аккаунт</p>'}
  `;

    // Добавляем обработчик чекбокса избранного
    // Добавляем обработчик чекбокса избранного
    // Добавляем обработчик чекбокса избранного
    if (isLoggedIn()) {
        const checkbox = document.getElementById('favorite-checkbox');
        checkbox.addEventListener('change', async (e) => {
            const isAdding = e.target.checked;

            try {
                const response = await apiRequest('/favorite', 'POST', {
                    recipeId: recipe.recipeId,
                    isFavorite: isAdding
                });

                // response будет null при 204 (удаление) или объект при 201 (добавление)
                if (response === null) {
                    // Удалено из избранного
                    alert('Рецепт удалён из избранного');
                } else {
                    // Добавлено в избранное
                    alert('Рецепт добавлен в избранное!');
                }
            } catch (err) {
                console.error('Ошибка изменения избранного:', err);
                alert('Ошибка при изменении избранного: ' + err.message);
                // Возвращаем прежнее состояние чекбокса
                checkbox.checked = !checkbox.checked;
            }
        });
    }
}

// Временное хранение избранных (пока нет API для проверки статуса)
function checkIfFavorite(recipeId) {
    // Пока заглушка - в будущем можно хранить в localStorage или проверять через API
    return false;
}