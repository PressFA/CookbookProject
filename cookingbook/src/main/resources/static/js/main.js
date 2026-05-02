// ========================================
// Файл: main.js
// ========================================
const API_BASE = 'http://localhost:8080/api/v1';
const pageSize = 10;
let currentPage = 0;
let isSearching = false; // Флаг: сейчас идет обычный список или поиск

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

// ==================== ОБНОВЛЕНИЕ ШАПКИ ====================
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

        // 204 No Content — успешный ответ без тела
        if (response.status === 204) {
            return null;
        }

        // 201 Created — тоже успешный ответ, но может не иметь тела
        if (response.status === 201) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return { status: 'created' };
        }

        // Проверяем, есть ли контент в ответе
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
        // Не показываем alert для каждой ошибки, а выбрасываем исключение
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
        opt.value = cat.categoryName; // Бэкенд в поиске ждет название строкой
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

    // ПРОВЕРКА: Поиск доступен только авторизованным
    if ((recipeName || category) && !isLoggedIn()) {
        alert('🔍 Поиск и фильтрация доступны только зарегистрированным пользователям.\nПожалуйста, войдите в аккаунт!');
        if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
        return { content: [], totalElements: 0 };
    }

    let data;
    try {
        if (recipeName || category) {
            // ИСПОЛЬЗУЕМ ПОИСК (Требует Auth)
            isSearching = true;
            const searchBody = {
                recipeName: recipeName || undefined,
                category1: category || undefined,
                category2: undefined
            };
            data = await apiRequest(`/recipe/search?page=${page}&size=${pageSize}&sort=${sort}`, 'POST', searchBody);
        } else {
            // ИСПОЛЬЗУЕМ ПУБЛИЧНЫЙ СПИСОК
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

        recipesContainer.appendChild(clone);
    });

    // Логика кнопки "Загрузить ещё"
    // Предполагаем, что если вернулось pageSize элементов, значит есть еще
    if (recipes.length === pageSize) {
        loadMoreBtn.style.display = 'inline-block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

// Кнопка "Применить" (Поиск/Фильтр)
applyFiltersBtn.addEventListener('click', async () => {
    currentPage = 0; // Сброс на первую страницу
    const data = await fetchRecipes(currentPage);
    renderRecipes(data.content, false);
});

// Кнопка "Загрузить ещё"
loadMoreBtn.addEventListener('click', async () => {
    currentPage++;
    const data = await fetchRecipes(currentPage);
    renderRecipes(data.content, true); // true = добавить вниз
});

// Клик по карточке -> переход на страницу рецепта (заглушка для будущего)
recipesContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.recipe-card');
    if (card) {
        const id = card.dataset.recipeId;
        // Пока просто алерт, позже сделаем отдельную страницу
        window.location.hash = `recipe/${id}`;
    }
});

// Кнопки шапки
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
    // Сброс полей и перезагрузка списка
    searchInput.value = '';
    categorySelect.value = '';
    currentPage = 0;
    fetchRecipes(0).then(data => renderRecipes(data.content, false));
});

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
async function init() {
    updateHeaderAuthUI();
    await loadCategories();

    const data = await fetchRecipes(0);
    renderRecipes(data.content, false);
}

document.addEventListener('DOMContentLoaded', init);

// ==================== РОУТИНГ (Переключение экранов) ====================
function showView(hash) {
    // Скрываем все экраны
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('register-view').style.display = 'none';

    // Показываем нужный
    if (hash === '#login') {
        document.getElementById('login-view').style.display = 'block';
    } else if (hash === '#register') {
        document.getElementById('register-view').style.display = 'block';
    } else {
        // По умолчанию главная
        document.getElementById('main-view').style.display = 'block';
        if (!hash || hash === '#home') {
            init(); // Перезагружаем главную при возврате
        }
    }
}


window.addEventListener('hashchange', () => {
    const hash = window.location.hash;

    // Скрываем все экраны
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('register-view').style.display = 'none';
    document.getElementById('profile-view').style.display = 'none';
    document.getElementById('recipe-view').style.display = 'none';
    document.getElementById('recipe-form-view').style.display = 'none';

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
        } else {
            document.getElementById('recipe-form-view').style.display = 'block';
            // Форма уже должна быть очищена и готова
        }
    } else if (hash.startsWith('#edit-recipe/')) {
        if (!isLoggedIn()) {
            window.location.hash = 'login';
        } else {
            const recipeId = hash.split('/')[1];
            document.getElementById('recipe-form-view').style.display = 'block';
            openEditRecipeForm(recipeId);
        }
    } else if (hash === '#login') {
        document.getElementById('login-view').style.display = 'block';
    } else if (hash === '#register') {
        document.getElementById('register-view').style.display = 'block';
    } else {
        // Главная страница
        document.getElementById('main-view').style.display = 'block';
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
            // Сохраняем данные
            localStorage.setItem('jwtToken', data.jwtToken);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userId', data.userId);

            updateHeaderAuthUI();
            window.location.hash = '#home'; // Перенаправляем на главную
        } catch (err) {
            errorMsg.textContent = err.message;
        }
    });
}

// ==================== ЛОГИКА РЕГИСТРАЦИИ ====================
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
                // Бэкенд возвращает объект с ошибками валидации, например: { "username": "..." }
                if (typeof err === 'object' && !err.message) {
                    const firstError = Object.values(err)[0];
                    throw new Error(firstError);
                }
                throw new Error(err.message || 'Ошибка регистрации');
            }

            alert('✅ Регистрация успешна! Теперь войдите в аккаунт.');
            window.location.hash = '#login';
        } catch (err) {
            errorMsg.textContent = err.message;
        }
    });
}

// Запускаем роутинг при первой загрузке
showView(window.location.hash);


// ==================== ЛОГИКА ПРОФИЛЯ ====================
const profileView = document.getElementById('profile-view');
const profileListContainer = document.getElementById('profile-list-container');
const radioButtons = document.querySelectorAll('input[name="profile-list"]');

// Функция загрузки данных в профиль
async function loadProfileData() {
    // Сначала загружаем информацию о пользователе
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
        // Не прерываем выполнение, просто показываем дефолтные значения
        document.getElementById('profile-user-name').textContent = 'Пользователь';
        document.getElementById('profile-user-role').textContent = 'Роль: USER';
        document.getElementById('profile-recipes-count').textContent = '0';
        document.getElementById('profile-favorites-count').textContent = '0';
    }

    // Затем загружаем список рецептов
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

// Функция отрисовки списка
// function renderProfileList(recipes, type) {
//     profileListContainer.innerHTML = ''; // Очистка

//     recipes.forEach(recipe => {
//         const item = document.createElement('div');
//         item.className = 'profile-item';

//         // Формируем строку категорий: "Завтрак, Суп"
//         const cats = recipe.categories ? recipe.categories.join(', ') : '';

//         // Кнопки действий (показываем только в "Мои рецепты")
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

function renderProfileList(recipes, type) {
    profileListContainer.innerHTML = ''; // Очистка
    
    if (!recipes || recipes.length === 0) {
        profileListContainer.innerHTML = '<div class="info-message">Список пуст</div>';
        return;
    }

    recipes.forEach(recipe => {
        const item = document.createElement('div');
        item.className = 'profile-item';
        
        // Формируем строку категорий
        const cats = recipe.categories ? recipe.categories.join(', ') : '';
        
        let actionsHTML = '';
        
        // Кнопки действий для "Мои рецепты"
        if (type === 'my') {
            actionsHTML = `
                <div class="recipe-actions">
                    <button class="btn btn-sm btn-outline" onclick="openEditRecipeForm(${recipe.recipeId})">Изменить</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRecipe(${recipe.recipeId})">Удалить</button>
                </div>
            `;
        }
        
        // Кнопка удаления для "Избранное"
        if (type === 'fav') {
            actionsHTML = `
                <div class="recipe-actions">
                    <button class="btn btn-sm btn-danger" onclick="removeFromFavorites(${recipe.recipeId})">Убрать</button>
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

// Новая функция для удаления из избранного прямо из профиля
window.removeFromFavorites = async (recipeId) => {
    if (!confirm('Убрать рецепт из избранного?')) return;
    
    try {
        // Отправляем запрос с isFavorite: false
        await apiRequest('/favorite', 'POST', {
            recipeId: recipeId,
            isFavorite: false
        });
        
        // Обновляем локальный список
        removeFromLocalFavorites(recipeId);
        
        // Перезагружаем список в профиле
        loadProfileData();
    } catch (err) {
        console.error('Ошибка удаления из избранного:', err);
        alert('Не удалось удалить из избранного');
    }
};

// Обработчики переключения вкладок
radioButtons.forEach(radio => {
    radio.addEventListener('change', () => {
        loadProfileData();
    });
});

// Обработчик кнопки "Добавить рецепт"
document.getElementById('add-recipe-btn').addEventListener('click', () => {
    window.location.hash = 'create-recipe';
});

// Заглушки для будущих функций (чтобы не было ошибок в консоли)
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
            loadProfileData(); // Обновляем список
        } else {
            alert('Ошибка при удалении');
        }
    } catch (err) {
        console.error(err);
    }
};




// ==================== ДЕТАЛЬНАЯ СТРАНИЦА РЕЦЕПТА ====================
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

function renderRecipeDetail(recipe) {
    // Проверяем, в избранном ли рецепт (сначала смотрим локальное хранилище)
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

    // Обработчик чекбокса
    if (isLoggedIn()) {
        const checkbox = document.getElementById('favorite-checkbox');
        checkbox.addEventListener('change', async (e) => {
            const isAdding = e.target.checked;
            try {
                // Отправляем запрос на бэкенд
                const response = await apiRequest('/favorite', 'POST', {
                    recipeId: recipe.recipeId,
                    isFavorite: isAdding
                });

                if (isAdding) {
                    addToLocalFavorites(recipe.recipeId);
                    alert('Рецепт добавлен в избранное!');
                } else {
                    removeFromLocalFavorites(recipe.recipeId);
                    alert('Рецепт удалён из избранного');
                }
            } catch (err) {
                console.error('Ошибка изменения избранного:', err);
                alert('Ошибка при изменении избранного');
                // Возвращаем галочку в прежнее состояние при ошибке
                checkbox.checked = !checkbox.checked;
            }
        });
    }
}

// ====================== ДОБАВЛЕНИЕ/РЕДАКТИРОВАНИЕ ====================== //

// ==================== ФОРМА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ РЕЦЕПТА ====================
const recipeFormView = document.getElementById('recipe-form-view');
const recipeForm = document.getElementById('recipe-form');
const formTitle = document.getElementById('form-title');
let editingRecipeId = null; // null = создание, иначе = редактирование

// Загрузка категорий для формы
// Загрузка категорий для формы
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

            // Добавляем обработчик на чекбокс
            const checkbox = label.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', validateCategoriesSelection);

            categoriesContainer.appendChild(label);
        });

        // Скрываем ошибку при успешной загрузке
        if (errorElement) errorElement.style.display = 'none';

    } catch (err) {
        console.error('Ошибка загрузки категорий:', err);
        categoriesContainer.innerHTML = '<span style="color: #d32f2f">Не удалось загрузить категории</span>';
    }
}

// Валидация выбора категорий в реальном времени
function validateCategoriesSelection() {
    const selectedCategories = document.querySelectorAll('input[name="category"]:checked');
    const errorElement = document.getElementById('error-categories');
    const selectedCount = selectedCategories.length;

    if (selectedCount > 2) {
        // Показываем ошибку
        if (errorElement) {
            errorElement.textContent = 'Выберите 1 или 2 категории';
            errorElement.style.display = 'block';
        }
    } else if (selectedCount === 0) {
        // Показываем ошибку (если нужно)
        if (errorElement) {
            errorElement.textContent = 'Выберите хотя бы одну категорию';
            errorElement.style.display = 'block';
        }
    } else {
        // Всё ок (1-2 категории выбрано)
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
}

// Открытие формы для создания
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
    window.location.hash = 'create-recipe';
}

// Открытие формы для редактирования (заглушка)
// Открытие формы для редактирования (полная версия)
async function openEditRecipeForm(recipeId) {
    console.log('Открываем редактирование рецепта ID:', recipeId);
    editingRecipeId = recipeId;
    formTitle.textContent = 'Редактировать рецепт';

    try {
        // Получаем полную информацию о рецепте
        const recipe = await apiRequest(`/recipe/${recipeId}`);
        console.log('Получен рецепт:', recipe);

        // Заполняем форму данными рецепта
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

        // Показываем текущее изображение
        if (recipe.image) {
            imagePreview.src = recipe.image;
            imagePreviewContainer.style.display = 'block';
            imageBase64Input.value = recipe.image;
        }

        // Загружаем категории
        await loadCategoriesForForm();

        // Отмечаем чекбоксы категорий рецепта
        // Получаем ID категорий из списка названий
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

        // Переходим к форме
        window.location.hash = 'create-recipe';

    } catch (err) {
        console.error('Ошибка загрузки рецепта:', err);
        alert('Не удалось загрузить рецепт для редактирования: ' + err.message);
    }
}

// Обработчик отправки формы
recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Сброс ошибок
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

    // Сбор данных формы
    const selectedCategories = Array.from(
        document.querySelectorAll('input[name="category"]:checked')
    ).map(cb => parseInt(cb.value));

    // Финальная проверка перед отправкой
    if (selectedCategories.length < 1 || selectedCategories.length > 2) {
        document.getElementById('error-categories').textContent =
            'Выберите 1 или 2 категории';
        document.getElementById('error-categories').style.display = 'block';
        return; // Прерываем отправку
    }

    const imageData = imageBase64Input ? imageBase64Input.value : '';

    // if (!imageData) {
    //     alert('Пожалуйста, выберите изображение');
    //     return;
    // }
    if (!editingRecipeId && !imageData) {
        alert('Пожалуйста, выберите изображение');
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
        categories: selectedCategories
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

    // Добавляем recipeId если редактируем
    if (editingRecipeId) {
        recipeData.recipeId = editingRecipeId;
    }

    try {
        const submitBtn = document.getElementById('form-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Сохранение...';

        if (editingRecipeId) {
            // Редактирование (PUT)
            await apiRequest('/recipe', 'PUT', recipeData);
            alert('Рецепт успешно обновлён!');
        } else {
            // Создание (POST)
            await apiRequest('/recipe', 'POST', recipeData);
            alert('Рецепт успешно создан!');
        }

        // Возврат в профиль
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

// Обновляем обработчик кнопки "Добавить рецепт"
document.getElementById('add-recipe-btn').addEventListener('click', openCreateRecipeForm);

// Обновляем заглушку openEditRecipe
window.openEditRecipe = openEditRecipeForm;

// ====================== ДОБАВЛЕНИЕ/РЕДАКТИРОВАНИЕ ====================== //

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



// ==================== ЗАГРУЗКА ИЗОБРАЖЕНИЯ ====================
const imageFileInput = document.getElementById('form-image-file');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const imageBase64Input = document.getElementById('form-image-base64');

if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение (JPG, PNG, GIF)');
            imageFileInput.value = '';
            return;
        }

        // Проверка размера (макс 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Размер изображения не должен превышать 5MB');
            imageFileInput.value = '';
            return;
        }

        // Конвертация в base64
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64String = event.target.result;
            imageBase64Input.value = base64String;

            // Показываем превью
            imagePreview.src = base64String;
            imagePreviewContainer.style.display = 'block';
        };
        reader.onerror = () => {
            alert('Ошибка при чтении файла');
            imageFileInput.value = '';
        };
        reader.readAsDataURL(file);
    });
}

// Функция для очистки превью при создании нового рецепта
function clearImagePreview() {
    if (imageFileInput) imageFileInput.value = '';
    if (imageBase64Input) imageBase64Input.value = '';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    if (imagePreview) imagePreview.src = '';

}



// Открытие формы для редактирования (полная версия)
// async function openEditRecipeForm(recipeId) {
//     editingRecipeId = recipeId;
//     formTitle.textContent = 'Редактировать рецепт';

//     try {
//         // Получаем полную информацию о рецепте
//         const recipe = await apiRequest(`/recipe/${recipeId}`);

//         // Заполняем форму данными рецепта
//         document.getElementById('form-recipe-name').value = recipe.recipeName;
//         document.getElementById('form-time').value = recipe.time;
//         document.getElementById('form-calories').value = recipe.calories;
//         document.getElementById('form-proteins').value = recipe.proteins;
//         document.getElementById('form-fats').value = recipe.fats;
//         document.getElementById('form-carbs').value = recipe.carbs;
//         document.getElementById('form-description').value = recipe.description;

//         // Показываем текущее изображение
//         if (recipe.image) {
//             imagePreview.src = recipe.image;
//             imagePreviewContainer.style.display = 'block';
//             imageBase64Input.value = recipe.image;
//         }

//         // Загружаем категории
//         await loadCategoriesForForm();

//         // Отмечаем чекбоксы категорий рецепта
//         // Для этого нужно получить ID категорий (пока заглушка)
//         // В будущем бэкенд должен возвращать categories как массив объектов {id, categoryName}

//     } catch (err) {
//         console.error('Ошибка загрузки рецепта:', err);
//         alert('Не удалось загрузить рецепт для редактирования');
//     }
// }

window.openEditRecipeForm = openEditRecipeForm;
window.openEditRecipe = openEditRecipeForm;


// ==================== ЛОКАЛЬНОЕ ХРАНЕНИЕ ИЗБРАННОГО ====================
// Вспомогательные функции, чтобы галочка "запоминалась" при перезаходе в рецепт
// (Пока бэкенд не возвращает статус isFavorite вместе с рецептом)

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
