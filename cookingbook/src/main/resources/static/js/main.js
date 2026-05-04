// main.js

let currentUserRole = localStorage.getItem('userRole') || null;

// ==================== ВМЕСТО ALERT тосты ====================

function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Автоматическое скрытие
    const timeout = setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 300);
    }, duration);

    // Возможность закрыть по клику
    toast.addEventListener('click', () => {
        clearTimeout(timeout);
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 300);
    });
}




const API_BASE = 'http://localhost:8080/api/v1';
const pageSize = 10;
let currentPage = 0;
let isSearching = false;

// ==================== DOM ЭЛЕМЕНТЫ ====================
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

// ==================== ЗАГРУЗКА ИЗОБРАЖЕНИЯ ====================
const imageFileInput = document.getElementById('form-image-file');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const imageBase64Input = document.getElementById('form-image-base64');





// ==== РАБОТА С ИНГРЕДИЕНТАМИ ====
function createIngredientRow(data = { name: '', quantity: '', unit: 'GRAM' }) {
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
    <input type="text" name="ing-name" placeholder="Название" maxlength="24" value="${escapeHtml(data.name)}" required>
    <input type="number" name="ing-quantity" min="1" value="${data.quantity}" placeholder="Кол-во" required>
    <select name="ing-unit">
      <option value="GRAM" ${data.unit === 'GRAM' ? 'selected' : ''}>г</option>
      <option value="MILLILITER" ${data.unit === 'MILLILITER' ? 'selected' : ''}>мл</option>
      <option value="PIECE" ${data.unit === 'PIECE' ? 'selected' : ''}>шт</option>
    </select>
    <button type="button" class="remove-ingredient-btn" title="Удалить">✕</button>
  `;

    // Обработчик удаления
    row.querySelector('.remove-ingredient-btn').addEventListener('click', () => {
        row.remove();
    });

    return row;
}

function getIngredientsFromForm() {
    const rows = document.querySelectorAll('#ingredients-container .ingredient-row');
    const ingredients = [];
    rows.forEach(row => {
        const name = row.querySelector('input[name="ing-name"]').value.trim();
        const quantity = parseInt(row.querySelector('input[name="ing-quantity"]').value);
        const unit = row.querySelector('select[name="ing-unit"]').value;
        if (name && quantity > 0) {
            ingredients.push({ name, quantity, measureUnit: unit });
        }
    });
    return ingredients;
}

function clearIngredientsContainer() {
    document.getElementById('ingredients-container').innerHTML = '';
}

function fillIngredients(ingredientsList) {
    clearIngredientsContainer();
    const container = document.getElementById('ingredients-container');
    if (ingredientsList && ingredientsList.length > 0) {
        ingredientsList.forEach(ing => {
            container.appendChild(createIngredientRow({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.measureUnit
            }));
        });
    } else {
        // Добавляем одну пустую строку для начала
        container.appendChild(createIngredientRow());
    }
}

function getUnitLabel(unit) {
    return unit === 'GRAM' ? 'г' : unit === 'MILLILITER' ? 'мл' : 'шт';
}








async function loadMainPage() {
    currentPage = 0;
    const data = await fetchRecipes(0);
    renderRecipes(data.content, false);
}

// ==================== РАБОТА С ТОКЕНОМ ====================
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
    localStorage.removeItem('localFavorites');
}

async function syncLocalFavoritesFromServer() {
    if (!isLoggedIn()) return;
    try {
        const favRecipes = await apiRequest('/recipe/favorite-recipes/me');
        const favIds = favRecipes.map(r => r.recipeId);
        saveLocalFavorites(favIds);
    } catch (err) {
        console.warn('Не удалось синхронизировать избранное');
    }
}

// ==================== ОБНОВЛЕНИЕ ШАПКИ ====================
function updateHeaderAuthUI() {
    if (isLoggedIn()) {
        guestHeader.style.display = 'none';
        userHeader.style.display = 'flex';
        usernameDisplay.textContent = localStorage.getItem('userName') || 'Пользователь';
        const adminBtn = document.getElementById('admin-panel-btn');
        if (adminBtn) {
            adminBtn.style.display = currentUserRole === 'ADMIN' ? 'inline-block' : 'none';
        }

        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.style.display = currentUserRole === 'ADMIN' ? 'none' : 'inline-block';
        }
    } else {
        guestHeader.style.display = 'flex';
        userHeader.style.display = 'none';
    }
}

document.getElementById('admin-panel-btn').addEventListener('click', () => {
    window.location.hash = 'admin';
});

document.getElementById('help-btn-header').addEventListener('click', () => {
    window.location.hash = 'help';
});

const helpBtnUser = document.getElementById('help-btn-user');
if (helpBtnUser) {
    helpBtnUser.addEventListener('click', () => {
        window.location.hash = 'help';
    });
}
// function updateHeaderAuthUI() {
//     if (isLoggedIn()) {
//         guestHeader.style.display = 'none';
//         userHeader.style.display = 'flex';
//         usernameDisplay.textContent = localStorage.getItem('userName') || 'Пользователь';
//     } else {
//         guestHeader.style.display = 'flex';
//         userHeader.style.display = 'none';
//     }
// }

// ==================== API ЗАПРОСЫ ====================
// ==================== API ЗАПРОСЫ ====================
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

// ==================== ЗАГРУЗКА КАТЕГОРИЙ ====================
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

// ==================== ЗАГРУЗКА РЕЦЕПТОВ ====================
async function fetchRecipes(page = 0) {
    if (loadingPlaceholder) loadingPlaceholder.style.display = 'block';
    loadMoreBtn.style.display = 'none';

    const recipeName = searchInput.value.trim();
    const category = categorySelect.value;
    const sort = sortSelect.value;


    if ((recipeName || category) && !isLoggedIn()) {
        // alert('Поиск и фильтрация доступны только зарегистрированным пользователям.\nПожалуйста, войдите в аккаунт!');
        showToast('Поиск и фильтрация доступны только зарегистрированным пользователям.\nПожалуйста, войдите в аккаунт!', 'warning');
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

// ==================== ОТРИСОВКА ====================
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

        const isFav = getLocalFavorites().includes(r.recipeId);
        if (isFav) {
            const wrapper = clone.querySelector('.recipe-card__image-wrapper');
            const badge = document.createElement('span');
            badge.className = 'favorite-badge';
            badge.textContent = '⭐';
            badge.title = 'В избранном';
            wrapper.appendChild(badge);
        }

        recipesContainer.appendChild(clone);
    });

    if (recipes.length === pageSize) {
        loadMoreBtn.style.display = 'inline-block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

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
        // alert('Войдите в аккаунт');
        showToast('Войдите в аккаунт', 'info')

        window.location.hash = 'login';
    } else {
        window.location.hash = 'profile';
    }
});

logoutBtn.addEventListener('click', () => {
    removeToken();
    updateHeaderAuthUI();
    // релоад пароля и списков
    searchInput.value = '';
    categorySelect.value = '';
    currentPage = 0;
    currentUserRole = null;
    fetchRecipes(0).then(data => renderRecipes(data.content, false));
});

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
async function init() {
    updateHeaderAuthUI();
    syncLocalFavoritesFromServer();
    await loadCategories();

    const data = await fetchRecipes(0);
    renderRecipes(data.content, false);
}

// document.addEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', () => {
    init();

    const helpTabs = document.querySelectorAll('input[name="help-tab"]');
    helpTabs.forEach(tab => {
        tab.addEventListener('change', (e) => {
            renderHelpContent(e.target.value);
        });
    });

    if (window.location.hash === '#help') {
        const defaultTab = document.querySelector('input[name="help-tab"][value="about"]');
        if (defaultTab) {
            defaultTab.checked = true;
            renderHelpContent('about');
        }
    }

    document.getElementById('add-ingredient-btn').addEventListener('click', () => {
        document.getElementById('ingredients-container').appendChild(createIngredientRow());
    });

});

// ==================== СВАП ЭКРАНОВ ====================
function showView(hash) {
    // Скрываем все экраны
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
    /**/
    document.getElementById('admin-view').style.display = 'none';
    /**/
    document.getElementById('recipe-view').style.display = 'none';
    document.getElementById('recipe-form-view').style.display = 'none';
    document.getElementById('help-view').style.display = 'none';

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
    } else if (hash === '#create-recipe') {
        if (!isLoggedIn()) {
            window.location.hash = 'login';
        } else if (currentUserRole === 'ADMIN') {
            window.location.hash = 'home';
            showToast('Администратор не может создавать рецепты', 'warning');
        } else {
            document.getElementById('recipe-form-view').style.display = 'block';
            openCreateRecipeForm();
        }
    } else if (hash.startsWith('#edit-recipe/')) {
        if (!isLoggedIn()) {
            window.location.hash = 'login';
        } else if (currentUserRole === 'ADMIN') {
            window.location.hash = 'home';
            showToast('Администратор не может редактировать рецепты', 'warning');
        } else {
            const recipeId = hash.split('/')[1];
            document.getElementById('recipe-form-view').style.display = 'block';
            openEditRecipeForm(recipeId);
        }
    } else if (hash === '#admin') {
        if (!isLoggedIn() || currentUserRole !== 'ADMIN') {
            window.location.hash = 'home';
        } else {
            document.getElementById('admin-view').style.display = 'block';
            loadAdminPanel();
        }
    } else if (hash === '#login') {
        document.getElementById('login-view').style.display = 'block';
        document.getElementById('login-form').reset();
        document.getElementById('login-error').textContent = '';
    } else if (hash === '#register') {
        document.getElementById('register-view').style.display = 'block';
        document.getElementById('register-form').reset();
        document.getElementById('reg-error').textContent = '';
    } else if (hash === '#help') {
        document.getElementById('help-view').style.display = 'block';
        // сбрасываем на первую вкладку
        const aboutRadio = document.querySelector('input[name="help-tab"][value="about"]');
        if (aboutRadio) {
            aboutRadio.checked = true;
            renderHelpContent('about');
        }
    } else {
        document.getElementById('main-view').style.display = 'block';
        if (!hash || hash === '#home') {
            loadMainPage();
        }
    }
});

// ==================== ЛОГИКА ВХОДА ====================
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
            localStorage.setItem('userRole', data.role);
            currentUserRole = data.role;

            updateHeaderAuthUI();
            window.location.hash = '#home';
        } catch (err) {
            errorMsg.textContent = err.message;
        }
    });
}

// ==================== РЕГИСТРАЦИЯ ====================
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

            // alert('Регистрация успешна! Теперь войдите в аккаунт.');
            showToast('Регистрация успешна! Теперь войдите в аккаунт.', 'success')
            window.location.hash = '#login';
        } catch (err) {
            errorMsg.textContent = err.message;
        }
    });
}

showView(window.location.hash);


// ==================== ПРОФИЛЬ ====================
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

    if (currentUserRole === 'ADMIN') {
        document.querySelector('.profile-tabs').style.display = 'none';
        document.getElementById('add-recipe-btn').style.display = 'none';
        document.getElementById('profile-list-container').innerHTML =
            '<div class="info-message">| Администратор |</div>';
        return;
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

// ========================= АДМИН ========================= // |
// ========================= АДМИН ========================= // v
// ========================= АДМИН ========================= //
async function loadAdminPanel() {
    const container = document.getElementById('admin-users-container');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const users = await apiRequest('/user/reports');
        renderUsersTable(users);
    } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
        container.innerHTML = '<div class="info-message">Ошибка загрузки списка пользователей</div>';
    }
}

function renderUsersTable(users) {
    const container = document.getElementById('admin-users-container');
    if (!users || users.length === 0) {
        container.innerHTML = '<div class="info-message">Нет зарегистрированных пользователей</div>';
        return;
    }

    const html = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Имя</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.userId}</td>
                        <td>${escapeHtml(user.name)}</td>
                        <td>${escapeHtml(user.username)}</td>
                        <td><span class="user-role-badge ${user.role.toLowerCase()}">${user.role}</span></td>
                        <td><span class="user-status-badge ${user.status.toLowerCase()}">${user.status}</span></td>
                        <td>
                            <div class="admin-actions">
                                ${user.role !== 'ADMIN' ? `
                                    ${user.role === 'USER' ?
                `<button class="btn btn-xs btn-primary" onclick="changeUserRole(${user.userId}, true)">Сделать модератором</button>` :
                `<button class="btn btn-xs btn-outline" onclick="changeUserRole(${user.userId}, false)">Убрать модератора</button>`
            }
                                    ${user.status === 'ACTIVE' ?
                `<button class="btn btn-xs btn-warning" onclick="changeUserStatus(${user.userId}, true)">Заблокировать</button>` :
                `<button class="btn btn-xs btn-success" onclick="changeUserStatus(${user.userId}, false)">Разблокировать</button>`
            }
                                ` : `<span style="color:#888;">—</span>`}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}



function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function changeUserRole(userId, makeModerator) {
    try {
        await apiRequest('/user/change-role', 'PATCH', { userId, change: makeModerator });
        showToast(makeModerator ? 'Пользователь стал модератором' : 'Роль модератора снята', 'success');
        loadAdminPanel();
    } catch (err) {
        showToast('Ошибка изменения роли: ' + err.message, 'error');
    }
}

async function changeUserStatus(userId, block) {
    try {
        await apiRequest('/user/change-status', 'PATCH', { userId, change: block });
        showToast(block ? 'Пользователь заблокирован' : 'Пользователь разблокирован', 'success');
        loadAdminPanel();
    } catch (err) {
        showToast('Ошибка изменения статуса: ' + err.message, 'error');
    }
}

window.changeUserRole = changeUserRole;
window.changeUserStatus = changeUserStatus;
// ========================= АДМИН ========================= // X
// ========================= АДМИН ========================= // |
// ========================= АДМИН ========================= //


// ==================== save галочек ====================

function getLocalFavorites() {
    const favs = localStorage.getItem('localFavorites');
    return favs ? JSON.parse(favs) : [];
}

function saveLocalFavorites(favs) {
    localStorage.setItem('localFavorites', JSON.stringify(favs));
}

function addToLocalFavorites(recipeId) {
    const favs = getLocalFavorites();
    if (!favs.includes(recipeId)) {
        favs.push(recipeId);
        saveLocalFavorites(favs);
    }
}

function removeFromLocalFavorites(recipeId) {
    let favs = getLocalFavorites();
    favs = favs.filter(id => id != recipeId);
    saveLocalFavorites(favs);
}

function isRecipeInLocalFavorites(recipeId) {
    return getLocalFavorites().includes(recipeId);
}



// function renderProfileList(recipes, type) {
//     profileListContainer.innerHTML = ''; // Очистка

//     recipes.forEach(recipe => {
//         const item = document.createElement('div');
//         item.className = 'profile-item';

//         const cats = recipe.categories ? recipe.categories.join(', ') : '';

//         let actionsHTML = '';
//         if (type === 'my') {
//             actionsHTML = `
//         <div class="recipe-actions">
//           <button class="btn btn-sm btn-outline" onclick="openEditRecipeForm(${recipe.recipeId})">Изменить</button>
//           <button class="btn btn-sm btn-danger" onclick="deleteRecipe(${recipe.recipeId})">Удалить</button>
//         </div>
//       `;
//         }

//         item.innerHTML = `
//       <div class="profile-item-info">
//         <span class="recipe-name">${recipe.recipeName}</span>
//         <span class="recipe-meta">⏱ ${recipe.time} мин | 🏷 ${cats}</span>
//       </div>
//       ${actionsHTML}
//     `;

//         profileListContainer.appendChild(item);
//     });
// }

// function renderProfileList(recipes, type) {
//     profileListContainer.innerHTML = ''; // Очистка

//     if (!recipes || recipes.length === 0) {
//         profileListContainer.innerHTML = '<div class="info-message">Список пуст</div>';
//         return;
//     }

//     recipes.forEach(recipe => {
//         const item = document.createElement('div');
//         item.className = 'profile-item';

//         const cats = recipe.categories ? recipe.categories.join(', ') : '';

//         let actionsHTML = '';

//         if (type === 'my') {
//             actionsHTML = `
//                 <div class="recipe-actions">
//                     <button class="btn btn-sm btn-outline" onclick="openEditRecipeForm(${recipe.recipeId})">Изменить</button>
//                     <button class="btn btn-sm btn-danger" onclick="deleteRecipe(${recipe.recipeId})">Удалить</button>
//                 </div>
//             `;
//         }

//         if (type === 'fav') {
//             actionsHTML = `
//                 <div class="recipe-actions">
//                     <button class="btn btn-sm btn-danger" onclick="removeFromFavorites(${recipe.recipeId})">Убрать</button>
//                 </div>
//             `;
//         }

//         item.innerHTML = `
//             <div class="profile-item-info">
//                 <span class="recipe-name">${recipe.recipeName}</span>
//                 <span class="recipe-meta">⏱ ${recipe.time} мин | 🏷 ${cats}</span>
//             </div>
//             ${actionsHTML}
//         `;
//         profileListContainer.appendChild(item);
//     });
// }

function renderProfileList(recipes, type) {
    profileListContainer.innerHTML = '';

    if (!recipes || recipes.length === 0) {
        profileListContainer.innerHTML = '<div class="info-message">Список пуст</div>';
        return;
    }

    recipes.forEach(recipe => {
        const item = document.createElement('div');
        item.className = 'profile-item';

        const cats = recipe.categories ? recipe.categories.join(', ') : '';

        let actionsHTML = `
            <div class="recipe-actions">
                <button class="btn btn-sm btn-outline" onclick="window.location.hash='recipe/${recipe.recipeId}'">Просмотр</button>
        `;

        if (type === 'my') {
            actionsHTML += `
                <button class="btn btn-sm btn-outline" onclick="openEditRecipeForm(${recipe.recipeId})">Изменить</button>
                <button class="btn btn-sm btn-danger" onclick="deleteRecipe(${recipe.recipeId})">Удалить</button>
            `;
        } else if (type === 'fav') {
            actionsHTML += `
                <button class="btn btn-sm btn-danger" onclick="removeFromFavorites(${recipe.recipeId})">Убрать</button>
            `;
        }

        actionsHTML += `</div>`;

        item.innerHTML = `
            <div class="profile-item-info">
                <span class="recipe-name">${recipe.recipeName}</span>
                <span class="recipe-meta">${recipe.time} мин  ${cats}</span>
            </div>
            ${actionsHTML}
        `;
        profileListContainer.appendChild(item);
    });
}


/*
======================== СПАРВКА ========================
======================== СПАРВКА ======================== |
======================== СПАРВКА ======================== V
*/
function renderHelpContent(tab) {
    const container = document.getElementById('help-content');
    if (tab === 'about') {
        container.innerHTML = `
      <h3>Добро пожаловать в Cookbook!</h3>
      <p><strong>Cookbook</strong> — это платформа для обмена и удобного управления кулинарными рецептами. Здесь вы можете просматривать рецепты, добавлять собственные, сохранять понравившиеся в избранное, искать по названию и категориям.</p>
      <p>Для полного доступа к функциям необходимо зарегистрироваться. Подробные инструкции смотрите во вкладке «Руководство».</p>
    `;
    } else if (tab === 'guide') {
        container.innerHTML = `
      <h3>Руководство для конечного пользователя</h3>
      
      <h4>1. Регистрация и вход в систему</h4>
      <p><strong>1.1 Как зарегистрироваться</strong></p>
      <p>Для использования всех функций Cookbook (добавление, редактирование, избранное) необходимо создать учётную запись.</p>
      <p><strong>Пошаговая инструкция:</strong></p>
      <ol>
        <li>Откройте главную страницу приложения <strong>Cookbook</strong>.</li>
        <li>Нажмите кнопку <strong>«Регистрация»</strong> (расположена в правом верхнем углу).</li>
        <li>Заполните форму регистрации:
          <ul>
            <li><strong>Имя</strong> (уникальное имя, которое будет отображаться в профиле).</li>
            <li><strong>Электронная почта</strong> (для входа и уведомлений).</li>
            <li><strong>Пароль</strong> (придумайте надёжный пароль).</li>
          </ul>
        </li>
        <li>Нажмите кнопку <strong>«Зарегистрироваться»</strong>.</li>
        <li>При успешной регистрации вы будете перенаправлены на страницу входа.</li>
      </ol>

      <p><strong>1.2 Как войти в систему</strong></p>
      <p><strong>Пошаговая инструкция:</strong></p>
      <ol>
        <li>На главной странице нажмите кнопку <strong>«Вход»</strong>.</li>
        <li>В открывшейся форме введите:
          <ul>
            <li><strong>Email</strong>.</li>
            <li><strong>Пароль</strong>.</li>
          </ul>
        </li>
        <li>Нажмите кнопку <strong>«Войти»</strong>.</li>
        <li>После успешной авторизации в правом верхнем углу появится ваше имя. Теперь вам доступны:
          <ul>
            <li>Личный кабинет.</li>
            <li>Добавление новых рецептов.</li>
            <li>Редактирование и удаление своих рецептов.</li>
            <li>Добавление рецептов в избранное.</li>
          </ul>
        </li>
      </ol>

      <h4>2. Управление контентом (рецептами)</h4>
      
      <p><strong>2.1 Как создать новый рецепт</strong></p>
      <ol>
        <li>Войдите в свой <strong>личный кабинет</strong>.</li>
        <li>Нажмите кнопку <strong>«Добавить рецепт»</strong>.</li>
        <li>Заполните форму создания рецепта.</li>
        <li>Убедитесь, что все данные введены корректно.</li>
        <li>Нажмите кнопку <strong>«Сохранить»</strong>.</li>
        <li>После успешного сохранения вы будете перенаправлены обратно в личный кабинет, и новый рецепт сразу появится в списке <strong>«Мои рецепты»</strong>.</li>
      </ol>

      <p><strong>2.2 Как отредактировать рецепт</strong></p>
      <p><em>Доступно только для ваших собственных рецептов (раздел «Мои рецепты»).</em></p>
      <ol>
        <li>Перейдите в <strong>личный кабинет</strong> → <strong>«Мои рецепты»</strong>.</li>
        <li>Найдите рецепт, который хотите изменить.</li>
        <li>Нажмите кнопку <strong>«Изменить»</strong> рядом с этим рецептом.</li>
        <li>Откроется форма редактирования, <strong>уже заполненная</strong> текущими данными рецепта.</li>
        <li>Внесите необходимые изменения.</li>
        <li>Нажмите кнопку <strong>«Сохранить изменения»</strong>.</li>
        <li>Система обновит данные в базе, и в списке «Мои рецепты» отобразится актуальная версия.</li>
      </ol>

      <p><strong>2.3 Как удалить рецепт</strong></p>
      <p><em>Доступно только для ваших собственных рецептов. Удаление — безвозвратно!</em></p>
      <ol>
        <li>Перейдите в <strong>личный кабинет</strong> → <strong>«Мои рецепты»</strong>.</li>
        <li>Найдите рецепт, который хотите удалить.</li>
        <li>Нажмите кнопку <strong>«Удалить»</strong> рядом с рецептом.</li>
        <li>Система запросит подтверждение.</li>
        <li>Подтвердите удаление.</li>
        <li>Рецепт будет безвозвратно удалён из базы данных, а список «Мои рецепты» обновится мгновенно.</li>
      </ol>
    `;
    } else if (tab === 'roles') {
        container.innerHTML = `
      <h3>Роли пользователей и их возможности</h3>
      <p>В приложении <strong>Cookbook</strong> предусмотрено <strong>три роли</strong> пользователей: <strong>Пользователь</strong>, <strong>Модератор</strong>, <strong>Администратор</strong>. Каждая роль имеет свой набор прав, видимые разделы интерфейса и доступные действия.</p>
      
      <h4>1. Пользователь (User)</h4>
      <p><strong>Описание</strong><br>Обычный зарегистрированный пользователь. Может управлять собственными рецептами, добавлять чужие рецепты в избранное, искать и фильтровать контент. Не имеет доступа к модерации или управлению системой.</p>
      
      <h4>2. Модератор (Moderator)</h4>
      <p><strong>Описание</strong><br>Пользователь с расширенными правами. Обладает всеми возможностями обычного пользователя, а также может удалять <strong>любые</strong> рецепты (в том числе чужие) при нарушении правил. Не может редактировать чужие рецепты и блокировать пользователей.</p>
      
      <h4>3. Администратор (Admin)</h4>
      <p><strong>Описание</strong><br>Высшая привилегия в системе, дающая право управления аккаунтами и назначения прав доступа через роли.</p>
    `;
    } else if (tab === 'rules') {
        container.innerHTML = `
      <h3>Правила публикации контента для авторов рецептов</h3>
      
      <h4>1. Общие положения</h4>
      <p>Все пользователи, создающие и публикующие рецепты в приложении <strong>Cookbook</strong>, обязаны соблюдать настоящие правила. Модераторы и администраторы имеют право удалять любой контент, нарушающий установленные нормы, без предварительного уведомления автора.</p>
      
      <h4>2. Запрещённый контент</h4>
      <p><strong>2.1 Оскорбления и некорректное поведение</strong><br>Запрещается размещать рецепты, описания, названия или изображения, содержащие:</p>
      <ul>
        <li>Оскорбления в адрес других пользователей, групп лиц, национальностей, религий.</li>
        <li>Нецензурную лексику (мат) в любом виде (включая завуалированную).</li>
        <li>Угрозы, травлю, дискриминацию, клевету.</li>
        <li>Издевательства над пользователями или их рецептами.</li>
      </ul>
      
      <p><strong>2.2 Спам и недобросовестная реклама</strong><br>Запрещается:</p>
      <ul>
        <li>Публиковать одинаковые или почти одинаковые рецепты многократно (дубликаты).</li>
        <li>Размещать ссылки на сторонние сайты, особенно коммерческие, без явного отношения к рецепту.</li>
        <li>Использовать поле «Название», «Ингредиенты» или «Описание» для продвижения товаров, услуг, каналов, групп.</li>
        <li>Добавлять бессмысленный набор слов, ключевые слова без содержания (для накрутки поиска).</li>
      </ul>
      
      <p><strong>2.3 Нелегальная и опасная информация</strong><br>Запрещается размещать рецепты, пропагандирующие или содержащие:</p>
      <ul>
        <li>Приготовление блюд из запрещённых, ядовитых, психоактивных веществ (включая наркотики).</li>
        <li>Способы причинения вреда здоровью или жизни людей.</li>
        <li>Информацию, нарушающую законодательство страны проживания пользователя или сервера.</li>
        <li>Изображения сцен насилия, жестокости, незаконных действий.</li>
      </ul>
      
      <h4>3. Последствия нарушений</h4>
      <p>В зависимости от тяжести и количества нарушений к пользователю применяются разные виды блокировок — от временных до постоянных.</p>
    `;
    }
}
/*
======================== СПАРВКА ======================== X
======================== СПАРВКА ======================== |
======================== СПАРВКА ========================
*/

window.removeFromFavorites = async (recipeId) => {
    if (!confirm('Убрать рецепт из избранного?')) return;

    try {
        await apiRequest('/favorite', 'POST', {
            recipeId: recipeId,
            isFavorite: false
        });

        removeFromLocalFavorites(recipeId);

        loadProfileData();
    } catch (err) {
        console.error('Ошибка удаления из избранного:', err);
        // alert('Не удалось удалить из избранного');
        showToast('Не удалось удалить из избранного', 'error')
    }
};

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
            // alert('Рецепт удален');
            showToast('Рецепт удален', "success")
            loadProfileData(); // Обновляем список
        } else {
            // alert('Ошибка при удалении');
            showToast('Ошибка при удалении', 'error')
        }
    } catch (err) {
        console.error(err);
    }
};




// ==================== ПОДРОБНОЕ ОПИСАНИЕ РЕЦЕПТА ====================
const recipeView = document.getElementById('recipe-view');
const recipeDetailContent = document.getElementById('recipe-detail-content');

// async function loadRecipeDetail(recipeId) {
//     recipeDetailContent.innerHTML = '<div class="spinner"></div>';
//     recipeView.style.display = 'block';

//     try {
//         const recipe = await apiRequest(`/recipe/${recipeId}`);
//         if (!recipe) {
//             recipeDetailContent.innerHTML = '<div class="info-message">Рецепт не найден</div>';
//             return;
//         }

//         renderRecipeDetail(recipe);

//     } catch (err) {
//         console.error('Ошибка загрузки рецепта:', err);
//         recipeDetailContent.innerHTML = '<div class="info-message">Ошибка загрузки рецепта</div>';
//     }
// }
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

/*
УДАЛЕНИЕ РЕЦЕПТА МОДЕРАТОРОМ
*/

async function deleteModeratorRecipe(recipeId) {
    if (!confirm('Вы уверены, что хотите удалить этот рецепт? Это действие нельзя отменить.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/recipe/moder-delete/${recipeId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (response.ok) {
            showToast('Рецепт успешно удалён', 'success');
            window.location.hash = 'home';
        } else {
            const err = await response.json();
            throw new Error(err.message || 'Ошибка удаления');
        }
    } catch (error) {
        console.error('Ошибка при удалении рецепта модератором:', error);
        showToast('Не удалось удалить рецепт: ' + error.message, 'error');
    }
}

function renderRecipeDetail(recipe) {
    const isFavorite = isRecipeInLocalFavorites(recipe.recipeId);

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
            <div class="nutrition-interactive">
                <div class="nutrition-diagram">
                    <div class="pie-chart" id="nutrition-pie"></div>
                    <div class="nutrition-legend">
                        <div class="legend-item"><span class="legend-color" style="background:#e74c3c;"></span> Белки <span id="legend-proteins">${recipe.proteins}г</span></div>
                        <div class="legend-item"><span class="legend-color" style="background:#f1c40f;"></span> Жиры <span id="legend-fats">${recipe.fats}г</span></div>
                        <div class="legend-item"><span class="legend-color" style="background:#2ecc71;"></span> Углеводы <span id="legend-carbs">${recipe.carbs}г</span></div>
                    </div>
                </div>
                <div class="nutrition-gram-control">
                    <label for="gram-input">Граммовка:</label>
                    <div class="gram-input-group">
                        <button onclick="changeGrams(-10)">−10</button>
                        <input type="number" id="gram-input" value="100" min="1" step="1" onchange="updateNutrition()">
                        <button onclick="changeGrams(10)">+10</button>
                    </div>
                    <div class="nutrition-summary" id="nutrition-summary">
                        <strong>${recipe.calories} ккал</strong> | Белки: ${recipe.proteins}г, Жиры: ${recipe.fats}г, Углеводы: ${recipe.carbs}г
                    </div>
                </div>
            </div>
        </div>
        <script>
            window._currentRecipe = window._currentRecipe || {};
            window._currentRecipe.originalNutrition = {
                calories: ${recipe.calories},
                proteins: ${recipe.proteins},
                fats: ${recipe.fats},
                carbs: ${recipe.carbs}
            };
            updatePieChart(${recipe.proteins}, ${recipe.fats}, ${recipe.carbs});
        </script>
        
        <div class="recipe-description">
            ${recipe.description}
        </div>
        
        ${(() => {
            if (recipe.ingredients && recipe.ingredients.length > 0) {
                // Сохраним исходные ингредиенты (на 1 порцию) в глобальную переменную для пересчёта
                window._currentRecipe = window._currentRecipe || {};
                window._currentRecipe.originalIngredients = recipe.ingredients.map(ing => ({
                    ...ing, quantity: Number(ing.quantity)
                }));
                // Начальное отображение
                const initialPortions = 1;
                const scaled = window._currentRecipe.originalIngredients.map(ing => ({
                    ...ing,
                    quantity: ing.quantity * initialPortions
                }));
                const itemsHtml = scaled.map(ing =>
                    `<div class="ingredient-detail-item">
                        <span class="ing-name">${escapeHtml(ing.name)}</span>
                        <span class="ing-amount">${ing.quantity % 1 === 0 ? ing.quantity : ing.quantity.toFixed(1)} ${getUnitLabel(ing.measureUnit)}</span>
                    </div>`
                ).join('');
                return `
                    <div class="recipe-ingredients">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h3 style="margin: 0;">Ингредиенты</h3>
                            <div class="portions-control">
                                <button class="portions-btn" onclick="changePortions(-1)">−</button>
                                <input type="number" id="portions-input" value="1" min="1" step="1" 
                                       onchange="updateIngredientsForPortions()" style="width: 60px; text-align: center;">
                                <button class="portions-btn" onclick="changePortions(1)">+</button>
                                <span>порций</span>
                            </div>
                        </div>
                        <div class="ingredients-list">${itemsHtml}</div>
                    </div>
                `;
            }
            return '';
        })()}
        
        ${!isLoggedIn() ?
            '<p style="color: #888; margin-top: 20px;">Чтобы добавить в избранное, войдите в аккаунт</p>' :
            currentUserRole === 'ADMIN' ?
                '<p style="color: #888; margin-top: 20px;">Администратор не добавляет в избранное</p>' :
                `<div class="favorite-checkbox">
        <input type="checkbox" id="favorite-checkbox" ${isFavorite ? 'checked' : ''}>
        <label for="favorite-checkbox">Добавить в избранное</label>
    </div>`
        }
    `;

    if (isLoggedIn() && currentUserRole !== 'ADMIN') {
        const checkbox = document.getElementById('favorite-checkbox');
        console.log('-> current checkbox:', checkbox, 'currentUserRole:', currentUserRole);
        if (checkbox) {
            checkbox.addEventListener('change', async (e) => {
                console.log('[DEBUG] change event fired');
                const isAdding = e.target.checked;
                console.log(' Чекбокс изменён. isAdding:', isAdding, 'recipeId:', recipe.recipeId);

                try {
                    const response = await apiRequest('/favorite', 'POST', {
                        recipeId: recipe.recipeId,
                        isFavorite: isAdding
                    });

                    // console.log('Ответ от сервера:', response);

                    if (isAdding) {
                        // console.log('Вызываем addToLocalFavorites для recipeId:', recipe.recipeId);
                        addToLocalFavorites(recipe.recipeId);
                        // console.log('Текущий localFavorites:', getLocalFavorites());
                        // alert('Рецепт добавлен в избранное!');
                        showToast('Рецепт добавлен в избранное!', 'success')
                    } else {
                        // console.log('Вызываем removeFromLocalFavorites для recipeId:', recipe.recipeId);
                        removeFromLocalFavorites(recipe.recipeId);
                        // console.log('Текущий localFavorites:', getLocalFavorites());
                        // alert('Рецепт удалён из избранного');
                        showToast('Рецепт удалён из избранного', 'success')
                    }
                } catch (err) {
                    console.error('Ошибка изменения избранного:', err);
                    // alert('Ошибка при изменении избранного');
                    showToast('Ошибка при изменении избранного', 'error')
                    checkbox.checked = !checkbox.checked;
                }
            });
        }

    }

    const userRole = localStorage.getItem('userRole');
    // const canDelete = userRole === 'MODERATOR' || userRole === 'ADMIN';
    const canDelete = userRole === 'MODERATOR';

    // if (canDelete) {
    //     recipeDetailContent.innerHTML += `
    //     <div style="margin-top: 30px; text-align: right;">
    //         <button class="btn btn-danger" id="delete-recipe-btn" style="background: #d32f2f; color: white; border: none;">
    //             Удалить рецепт
    //         </button>
    //     </div>
    // `;
    // }
    if (canDelete) {
        recipeDetailContent.insertAdjacentHTML('beforeend', `
        <div style="margin-top: 30px; text-align: right;">
            <button class="btn btn-danger" id="delete-recipe-btn" style="background: #d32f2f; color: white; border: none;">
                Удалить рецепт
            </button>
        </div>
    `);
    }

    if (canDelete) {
        document.getElementById('delete-recipe-btn').addEventListener('click', () => {
            deleteModeratorRecipe(recipe.recipeId);
        });
    }

}

// ====================== ДОБАВЛЕНИЕ/РЕДАКТИРОВАНИЕ ====================== //

// ==================== ФОРМА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ РЕЦЕПТА ====================
const recipeFormView = document.getElementById('recipe-form-view');
const recipeForm = document.getElementById('recipe-form');
const formTitle = document.getElementById('form-title');
let editingRecipeId = null;


async function loadCategoriesForForm() {
    const categoriesContainer = document.getElementById('form-categories');
    const errorElement = document.getElementById('error-categories');
    categoriesContainer.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div>';

    try {
        const categories = await apiRequest('/category');
        categoriesContainer.innerHTML = '';

        categories.forEach(cat => {
            const label = document.createElement('label');
            label.className = 'category-checkbox';
            label.innerHTML = `
        <input type="checkbox" name="category" value="${cat.id}">
        <span>${cat.categoryName}</span>
      `;

            const checkbox = label.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', validateCategoriesSelection);

            categoriesContainer.appendChild(label);
        });

        if (errorElement) errorElement.style.display = 'none';

    } catch (err) {
        console.error('Ошибка загрузки категорий:', err);
        categoriesContainer.innerHTML = '<span style="color: #d32f2f">Не удалось загрузить категории</span>';
    }

    // document.getElementById('add-ingredient-btn').addEventListener('click', () => {
    //     document.getElementById('ingredients-container').appendChild(createIngredientRow());
    // });
}

function validateCategoriesSelection() {
    const selectedCategories = document.querySelectorAll('input[name="category"]:checked');
    const errorElement = document.getElementById('error-categories');
    const selectedCount = selectedCategories.length;

    if (selectedCount > 2) {
        if (errorElement) {
            errorElement.textContent = 'Выберите 1 или 2 категории';
            errorElement.style.display = 'block';
        }
    } else if (selectedCount === 0) {
        if (errorElement) {
            errorElement.textContent = 'Выберите хотя бы одну категорию';
            errorElement.style.display = 'block';
        }
    } else {
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
}

function openCreateRecipeForm() {
    editingRecipeId = null;
    formTitle.textContent = 'Добавить новый рецепт';
    recipeForm.reset();
    clearImagePreview();
    document.getElementById('form-general-error').textContent = '';

    const imageFileInput = document.getElementById('form-image-file');
    if (imageFileInput) {
        imageFileInput.parentElement.style.display = 'block';
    }

    loadCategoriesForForm();
    fillIngredients([]); // очистит и добавит одну пустую строку
    window.location.hash = 'create-recipe';
}

async function openEditRecipeForm(recipeId) {
    console.log('Открываем редактирование рецепта ID:', recipeId);
    editingRecipeId = recipeId;
    formTitle.textContent = 'Редактировать рецепт';

    try {
        const recipe = await apiRequest(`/recipe/${recipeId}`);
        console.log('Получен рецепт:', recipe);

        document.getElementById('form-recipe-name').value = recipe.recipeName;
        document.getElementById('form-time').value = recipe.time;
        document.getElementById('form-calories').value = recipe.calories;
        document.getElementById('form-proteins').value = recipe.proteins;
        document.getElementById('form-fats').value = recipe.fats;
        document.getElementById('form-carbs').value = recipe.carbs;
        document.getElementById('form-description').value = recipe.description;

        const imageFileInput = document.getElementById('form-image-file');
        if (imageFileInput) {
            imageFileInput.parentElement.style.display = 'none';
        }

        if (recipe.image) {
            imagePreview.src = recipe.image;
            imagePreviewContainer.style.display = 'block';
            imageBase64Input.value = recipe.image;
        }

        await loadCategoriesForForm();

        // Заполняем ингредиенты
        fillIngredients(recipe.ingredients || []);

        const recipeCategoryNames = recipe.categories || [];
        const allCheckboxes = document.querySelectorAll('#form-categories input[type="checkbox"]');

        allCheckboxes.forEach(checkbox => {
            const categoryId = parseInt(checkbox.value);
            const categoryNameElement = checkbox.nextElementSibling;
            if (categoryNameElement && recipeCategoryNames.includes(categoryNameElement.textContent.trim())) {
                checkbox.checked = true;
                console.log('Отмечена категория:', categoryNameElement.textContent.trim());
            }
        });

        // window.location.hash = 'create-recipe';
        window.location.hash = `edit-recipe/${recipeId}`;
        // document.getElementById('recipe-form-view').style.display = 'block';

    } catch (err) {
        console.error('Ошибка загрузки рецепта:', err);
        // alert('Не удалось загрузить рецепт для редактирования: ' + err.message);
        showToast('Не удалось загрузить рецепт для редактирования: ' + err.message, 'error')
    }
}

recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

    const selectedCategories = Array.from(
        document.querySelectorAll('input[name="category"]:checked')
    ).map(cb => parseInt(cb.value));

    if (selectedCategories.length < 1 || selectedCategories.length > 2) {
        document.getElementById('error-categories').textContent =
            'Выберите 1 или 2 категории';
        document.getElementById('error-categories').style.display = 'block';
        return;
    }

    const imageData = imageBase64Input ? imageBase64Input.value : '';

    // if (!imageData) {
    //     alert('Пожалуйста, выберите изображение');
    //     return;
    // }
    if (!editingRecipeId && !imageData) {
        // alert('Пожалуйста, выберите изображение');
        showToast('Пожалуйста, выберите изображение', 'warning')
        return;
    }

    const recipeData = {
        recipeName: document.getElementById('form-recipe-name').value.trim(),
        time: parseInt(document.getElementById('form-time').value),
        calories: parseInt(document.getElementById('form-calories').value),
        proteins: parseInt(document.getElementById('form-proteins').value),
        fats: parseInt(document.getElementById('form-fats').value),
        carbs: parseInt(document.getElementById('form-carbs').value),
        description: document.getElementById('form-description').value.trim(),
        categories: selectedCategories,
        ingredients: getIngredientsFromForm()
    };

    // const recipeData = {
    //     recipeName: document.getElementById('form-recipe-name').value.trim(),
    //     time: parseInt(document.getElementById('form-time').value),
    //     calories: parseInt(document.getElementById('form-calories').value),
    //     proteins: parseInt(document.getElementById('form-proteins').value),
    //     fats: parseInt(document.getElementById('form-fats').value),
    //     carbs: parseInt(document.getElementById('form-carbs').value),
    //     //image: imageData,
    //     description: document.getElementById('form-description').value.trim(),
    //     categories: selectedCategories
    // };

    if (imageData) {
        recipeData.image = imageData;
    }

    if (editingRecipeId) {
        recipeData.recipeId = editingRecipeId;
    }

    try {
        const submitBtn = document.getElementById('form-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Сохранение...';

        if (editingRecipeId) {
            await apiRequest('/recipe', 'PUT', recipeData);
            // alert('Рецепт успешно обновлён!');
            showToast('Рецепт успешно обновлён!', 'success')
        } else {
            await apiRequest('/recipe', 'POST', recipeData);
            // alert('Рецепт успешно создан!');
            showToast('Рецепт успешно создан!', 'success')
        }

        window.location.hash = 'profile';

    } catch (err) {
        console.error('Ошибка сохранения рецепта:', err);
        document.getElementById('form-general-error').textContent =
            err.message || 'Не удалось сохранить рецепт';
    } finally {
        const submitBtn = document.getElementById('form-submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Сохранить рецепт';
    }
});

document.getElementById('add-recipe-btn').addEventListener('click', openCreateRecipeForm);

window.openEditRecipe = openEditRecipeForm;

// ====================== ДОБАВЛЕНИЕ/РЕДАКТИРОВАНИЕ ====================== //

// function renderRecipeDetail(recipe) {
//     const isFavorite = isLoggedIn() ? checkIfFavorite(recipe.recipeId) : false;

//     const categoriesHTML = recipe.categories
//         ? recipe.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')
//         : '';

//     recipeDetailContent.innerHTML = `
//     <img src="${recipe.image}" alt="${recipe.recipeName}" class="recipe-detail-image">

//     <div class="recipe-detail-header">
//       <h1>${recipe.recipeName}</h1>
//     </div>

//     <div class="recipe-meta-info">
//       <div class="meta-item">
//         <span></span>
//         <span>${recipe.time} мин</span>
//       </div>
//       <div class="meta-item">
//         <span></span>
//         <span>Создан: ${new Date(recipe.createdAt).toLocaleDateString('ru-RU')}</span>
//       </div>
//       ${recipe.updatedAt ? `
//       <div class="meta-item">
//         <span></span>
//         <span>Обновлён: ${new Date(recipe.updatedAt).toLocaleDateString('ru-RU')}</span>
//       </div>
//       ` : ''}
//     </div>

//     <p class="recipe-author"> Автор: ${recipe.name}</p>

//     <div class="recipe-categories">
//       ${categoriesHTML}
//     </div>

//     <div class="nutrition-info">
//       <h3>Пищевая ценность</h3>
//       <div class="nutrition-grid">
//         <div class="nutrition-item">
//           <div class="nutrition-value">${recipe.calories}</div>
//           <div class="nutrition-label">ккал</div>
//         </div>
//         <div class="nutrition-item">
//           <div class="nutrition-value">${recipe.proteins}г</div>
//           <div class="nutrition-label">белки</div>
//         </div>
//         <div class="nutrition-item">
//           <div class="nutrition-value">${recipe.fats}г</div>
//           <div class="nutrition-label">жиры</div>
//         </div>
//         <div class="nutrition-item">
//           <div class="nutrition-value">${recipe.carbs}г</div>
//           <div class="nutrition-label">углеводы</div>
//         </div>
//       </div>
//     </div>

//     <div class="recipe-description">
//       ${recipe.description}
//     </div>

//     ${isLoggedIn() ? `
//     <div class="favorite-checkbox">
//       <input type="checkbox" id="favorite-checkbox" ${isFavorite ? 'checked' : ''}>
//       <label for="favorite-checkbox">Добавить в избранное</label>
//     </div>
//     ` : '<p style="color: #888; margin-top: 20px;">Чтобы добавить в избранное, войдите в аккаунт</p>'}
//   `;

//     if (isLoggedIn()) {
//         const checkbox = document.getElementById('favorite-checkbox');
//         checkbox.addEventListener('change', async (e) => {
//             const isAdding = e.target.checked;

//             try {
//                 const response = await apiRequest('/favorite', 'POST', {
//                     recipeId: recipe.recipeId,
//                     isFavorite: isAdding
//                 });

//                 // response будет null при 204 (удаление) или объект при 201 (добавление)
//                 if (response === null) {
//                     alert('Рецепт удалён из избранного');
//                 } else {
//                     alert('Рецепт добавлен в избранное!');
//                 }
//             } catch (err) {
//                 console.error('Ошибка изменения избранного:', err);
//                 alert('Ошибка при изменении избранного: ' + err.message);
//                 checkbox.checked = !checkbox.checked;
//             }
//         });
//     }
// }

// function checkIfFavorite(recipeId) {
//     return false;
// }





if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            // alert('Пожалуйста, выберите изображение (JPG, PNG, GIF)');
            showToast('Пожалуйста, выберите изображение (JPG, PNG, GIF)', 'info')
            imageFileInput.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            // alert('Размер изображения не должен превышать 5MB');
            showToast('Размер изображения не должен превышать 5MB', 'info')
            imageFileInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64String = event.target.result;
            imageBase64Input.value = base64String;

            imagePreview.src = base64String;
            imagePreviewContainer.style.display = 'block';
        };
        reader.onerror = () => {
            // alert('Ошибка при чтении файла');
            showToast('Ошибка при чтении файла', 'error')
            imageFileInput.value = '';
        };
        reader.readAsDataURL(file);
    });
}

function clearImagePreview() {
    if (imageFileInput) imageFileInput.value = '';
    if (imageBase64Input) imageBase64Input.value = '';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    if (imagePreview) imagePreview.src = '';

}



// async function openEditRecipeForm(recipeId) {
//     editingRecipeId = recipeId;
//     formTitle.textContent = 'Редактировать рецепт';

//     try {
//         const recipe = await apiRequest(`/recipe/${recipeId}`);

//         document.getElementById('form-recipe-name').value = recipe.recipeName;
//         document.getElementById('form-time').value = recipe.time;
//         document.getElementById('form-calories').value = recipe.calories;
//         document.getElementById('form-proteins').value = recipe.proteins;
//         document.getElementById('form-fats').value = recipe.fats;
//         document.getElementById('form-carbs').value = recipe.carbs;
//         document.getElementById('form-description').value = recipe.description;

//         if (recipe.image) {
//             imagePreview.src = recipe.image;
//             imagePreviewContainer.style.display = 'block';
//             imageBase64Input.value = recipe.image;
//         }

//         await loadCategoriesForForm();

//         

//     } catch (err) {
//         console.error('Ошибка загрузки рецепта:', err);
//         alert('Не удалось загрузить рецепт для редактирования');
//     }
// }





// Функции для пересчёта порций и ингредиентов
window.changePortions = function (delta) {
    const input = document.getElementById('portions-input');
    if (!input) return;
    let current = parseInt(input.value) || 1;
    current += delta;
    if (current < 1) current = 1;
    input.value = current;
    updateIngredientsForPortions();
};

window.updateIngredientsForPortions = function () {
    const input = document.getElementById('portions-input');
    if (!input) return;
    let portions = parseInt(input.value) || 1;
    if (portions < 1) portions = 1;
    input.value = portions;

    const original = window._currentRecipe && window._currentRecipe.originalIngredients;
    if (!original) return;

    const container = document.querySelector('.recipe-ingredients .ingredients-list');
    if (!container) return;

    container.innerHTML = original.map(ing => {
        const quantity = ing.quantity * portions;
        return `<div class="ingredient-detail-item">
            <span class="ing-name">${escapeHtml(ing.name)}</span>
            <span class="ing-amount">${quantity % 1 === 0 ? quantity : quantity.toFixed(1)} ${getUnitLabel(ing.measureUnit)}</span>
        </div>`;
    }).join('');
};

// Функции для граммовки и диаграммы
window.changeGrams = function (delta) {
    const input = document.getElementById('gram-input');
    if (!input) return;
    let current = parseInt(input.value) || 100;
    current += delta;
    if (current < 1) current = 1;
    input.value = current;
    updateNutrition();
};

window.updateNutrition = function () {
    const input = document.getElementById('gram-input');
    if (!input) return;
    let grams = parseInt(input.value) || 100;
    if (grams < 1) grams = 1;
    input.value = grams;

    const orig = window._currentRecipe && window._currentRecipe.originalNutrition;
    if (!orig) return;

    const factor = grams / 100;
    const proteins = orig.proteins * factor;
    const fats = orig.fats * factor;
    const carbs = orig.carbs * factor;
    const calories = orig.calories * factor;

    // Обновляем легенду
    const legendProteins = document.getElementById('legend-proteins');
    const legendFats = document.getElementById('legend-fats');
    const legendCarbs = document.getElementById('legend-carbs');
    if (legendProteins) legendProteins.textContent = (proteins % 1 === 0 ? proteins : proteins.toFixed(1)) + 'г';
    if (legendFats) legendFats.textContent = (fats % 1 === 0 ? fats : fats.toFixed(1)) + 'г';
    if (legendCarbs) legendCarbs.textContent = (carbs % 1 === 0 ? carbs : carbs.toFixed(1)) + 'г';

    // Обновляем сводку
    const summary = document.getElementById('nutrition-summary');
    if (summary) {
        const cal = Math.round(calories);
        const p = proteins % 1 === 0 ? proteins : proteins.toFixed(1);
        const f = fats % 1 === 0 ? fats : fats.toFixed(1);
        const c = carbs % 1 === 0 ? carbs : carbs.toFixed(1);
        summary.innerHTML = `<strong>${cal} ккал</strong> | Белки: ${p}г, Жиры: ${f}г, Углеводы: ${c}г`;
    }

    // Обновляем круговую диаграмму
    updatePieChart(proteins, fats, carbs);
};

window.updatePieChart = function (proteins, fats, carbs) {
    const pie = document.getElementById('nutrition-pie');
    if (!pie) return;
    const total = proteins + fats + carbs;
    if (total === 0) {
        pie.style.background = `conic-gradient(#ccc 0% 100%)`;
        return;
    }
    const pPercent = (proteins / total) * 100;
    const fPercent = (fats / total) * 100;
    const cPercent = (carbs / total) * 100;
    pie.style.background = `conic-gradient(
        #e74c3c 0% ${pPercent}%,
        #f1c40f ${pPercent}% ${pPercent + fPercent}%,
        #2ecc71 ${pPercent + fPercent}% 100%
    )`;
};







window.openEditRecipeForm = openEditRecipeForm;
window.openEditRecipe = openEditRecipeForm;



