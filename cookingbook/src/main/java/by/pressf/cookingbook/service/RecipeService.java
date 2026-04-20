package by.pressf.cookingbook.service;

import by.pressf.cookingbook.dao.entity.Category;
import by.pressf.cookingbook.dao.entity.Recipe;
import by.pressf.cookingbook.dao.entity.User;
import by.pressf.cookingbook.dao.repository.CategoryRepository;
import by.pressf.cookingbook.dao.repository.RecipeRepository;
import by.pressf.cookingbook.dao.repository.UserRepository;
import by.pressf.cookingbook.dto.internal.RecipeCategoryRow;
import by.pressf.cookingbook.dto.internal.UserRecipe;
import by.pressf.cookingbook.dto.request.recipe.CreateRecipeRequest;
import by.pressf.cookingbook.dto.request.recipe.RecipeSearchRequest;
import by.pressf.cookingbook.dto.request.recipe.UpdateRecipeRequest;
import by.pressf.cookingbook.dto.response.CardRecipeResponse;
import by.pressf.cookingbook.dto.response.RecipeResponse;
import by.pressf.cookingbook.dto.response.UpdatedRecipeResponse;
import by.pressf.cookingbook.exception.AppError;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecipeService {
    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<UserRecipe> getAllMyRecipes(Long userId) {
        List<RecipeCategoryRow> intermediateList = recipeRepository.getAllRecipe(userId);
        return mapToUserRecipes(intermediateList);
    }

    @Transactional(readOnly = true)
    public List<UserRecipe> getAllMyFavoriteRecipes(Long userId) {
        List<RecipeCategoryRow> intermediateList = userRepository.getAllFavoriteRecipe(userId);
        return mapToUserRecipes(intermediateList);
    }

    @Transactional(readOnly = true)
    public RecipeResponse getRecipeById(Long recipeId) {
        RecipeResponse resp = recipeRepository.getRecipeResponseById(recipeId);
        List<String> categories = recipeRepository.getRecipeCategoryByRecipeId(recipeId);

        return resp.setCategories(categories);
    }

    @Transactional(readOnly = true)
    public Page<CardRecipeResponse> getAllRecipes(Pageable pageable) {
        return recipeRepository.getPageRecipe(pageable);
    }

    @Transactional(readOnly = true)
    public Page<CardRecipeResponse> getSearchedRecipes(RecipeSearchRequest request, Pageable pageable) {
        Specification<Recipe> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Поиск по названию (если есть)
            if (StringUtils.hasText(request.recipeName())) {
                predicates.add(cb.like(cb.lower(root.get("recipeName")),
                        "%" + request.recipeName().toLowerCase() + "%"));
            }

            // 2. Поиск по категориям (Логика OR между ними)
            if (StringUtils.hasText(request.category1()) || StringUtils.hasText(request.category2())) {
                // Делаем Join с таблицей категорий
                Join<Recipe, Category> categoriesJoin = root.join("categories");

                List<Predicate> catPredicates = new ArrayList<>();
                if (StringUtils.hasText(request.category1())) {
                    catPredicates.add(cb.equal(categoriesJoin.get("categoryName"), request.category1()));
                }
                if (StringUtils.hasText(request.category2())) {
                    catPredicates.add(cb.equal(categoriesJoin.get("categoryName"), request.category2()));
                }

                // Объединяем категории через OR и добавляем в общий список через AND
                predicates.add(cb.or(catPredicates.toArray(new Predicate[0])));
            }

            // Убираем дубликаты, так как используем JOIN
            query.distinct(true);

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // Выполняем поиск и мапим в DTO
        return recipeRepository.findAll(spec, pageable)
                .map(r -> new CardRecipeResponse(r.getId(), r.getRecipeName(), r.getImage(), r.getTime()));
    }

    @Transactional
    public Map<String, Long> createRecipe(Long userId, CreateRecipeRequest recipeRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.error("Ошибка (createRecipe): Пользователь с id={} не найден", userId);
                    return new AppError(HttpStatus.NOT_FOUND, "Пользователь не найден");
                });

        List<Category> categoryList = categoryRepository.findAllById(recipeRequest.categories());
        if (categoryList.size() != recipeRequest.categories().size()) {
            log.error("Ошибка (createRecipe): Одна или несколько категорий из списка {} не найдены",
                    recipeRequest.categories());
            throw new AppError(HttpStatus.NOT_FOUND, "Одна или несколько категорий не найдены");
        }

        Recipe recipe = Recipe.builder()
                .user(user)
                .recipeName(recipeRequest.recipeName())
                .time(recipeRequest.time())
                .calories(recipeRequest.calories())
                .proteins(recipeRequest.proteins())
                .fats(recipeRequest.fats())
                .carbs(recipeRequest.carbs())
                .image(recipeRequest.image())
                .description(recipeRequest.description())
                .createdAt(LocalDateTime.now())
                .updatedAt(null)
                .categories(new HashSet<>(categoryList))
                .build();
        Recipe savedRecipe = recipeRepository.save(recipe);

        return Map.of("recipeId", savedRecipe.getId());
    }

    @Transactional
    public UpdatedRecipeResponse updateRecipe(Long userId, UpdateRecipeRequest recipeRequest) {
        Recipe recipe = recipeRepository.findById(recipeRequest.recipeId())
                .orElseThrow(() -> {
                    log.error("Ошибка (updateRecipe): Рецепт с id={} не найден", recipeRequest.recipeId());
                    return new AppError(HttpStatus.NOT_FOUND, "Рецепт не найден");
                });

        if (!recipe.getUser().getId().equals(userId)) {
            log.error("Пользователь id={} пытался изменить чужой рецепт", userId);
            throw new AppError(HttpStatus.FORBIDDEN, "Вы не можете редактировать чужой рецепт");
        }

        recipe.setRecipeName(recipeRequest.recipeName());
        recipe.setTime(recipeRequest.time());
        recipe.setCalories(recipeRequest.calories());
        recipe.setProteins(recipeRequest.proteins());
        recipe.setFats(recipeRequest.fats());
        recipe.setCarbs(recipeRequest.carbs());
        recipe.setDescription(recipeRequest.description());
        recipe.setUpdatedAt(LocalDateTime.now());

        List<Category> categoryList = categoryRepository.findAllById(recipeRequest.categories());
        if (categoryList.size() != recipeRequest.categories().size()) {
            log.error("Ошибка (updateRecipe): Одна или несколько категорий из списка {} не найдены",
                    recipeRequest.categories());
            throw new AppError(HttpStatus.NOT_FOUND, "Одна или несколько категорий не найдены");
        }
        recipe.getCategories().clear();
        recipe.getCategories().addAll(categoryList);

        recipeRepository.save(recipe);

        return new UpdatedRecipeResponse(recipe.getId(), recipe.getUpdatedAt());
    }

    @Transactional
    public void deleteUserRecipe(Long userId, Long recipeId) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(()-> {
                    log.error("Ошибка (deleteUserRecipe): Рецепт с id={} не найден", recipeId);
                    return new AppError(HttpStatus.NOT_FOUND, "Рецепт не найден");
                });

        if (!recipe.getUser().getId().equals(userId)) {
            log.warn("Пользователь userId={} пытался удалить чужой рецепт recipeId={}", userId, recipeId);
            throw new AppError(HttpStatus.FORBIDDEN, "Пользователь не является автором данного рецепта");
        }

        // Перебираем всех пользователей, у которых в избранном данный рецепт и удаляем его
        recipe.getFavoriteByUsers().forEach(user -> user.getFavoriteRecipes().remove(recipe));

        recipeRepository.delete(recipe);
    }

    @Transactional
    public void deleteModerRecipe(Long recipeId) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(()-> {
                    log.error("Ошибка (deleteModerRecipe): Рецепт с id={} не найден", recipeId);
                    return new AppError(HttpStatus.NOT_FOUND, "Рецепт не найден");
                });
        recipeRepository.delete(recipe);
    }

    private List<UserRecipe> mapToUserRecipes(List<RecipeCategoryRow> intermediateList) {
        Map<Long, UserRecipe> userRecipes = new LinkedHashMap<>();
        intermediateList.forEach(obj -> {
            if (!userRecipes.containsKey(obj.recipeId())) {
                userRecipes.put(obj.recipeId(), new UserRecipe(obj.recipeId(), obj.recipeName(), obj.time(),
                        new ArrayList<>(Collections.singletonList(obj.categoryName()))));
            } else {
                userRecipes.get(obj.recipeId()).categories().add(obj.categoryName());
            }
        });
        return new ArrayList<>(userRecipes.values());
    }
}
