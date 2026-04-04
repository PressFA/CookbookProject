package by.pressf.cookingbook.service;

import by.pressf.cookingbook.dao.entity.Recipe;
import by.pressf.cookingbook.dao.entity.User;
import by.pressf.cookingbook.dao.repository.RecipeRepository;
import by.pressf.cookingbook.dao.repository.UserRepository;
import by.pressf.cookingbook.dto.request.FavoriteRequest;
import by.pressf.cookingbook.exception.AppError;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteService {
    private final UserRepository userRepository;
    private final RecipeRepository recipeRepository;

    @Transactional
    public HttpStatus addOrDeleteRecipe(Long userId, FavoriteRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.error("Ошибка (addOrDeleteRecipe): Пользователь с id={} не найден при попытке изменить избранное", userId);
                    return new AppError(HttpStatus.NOT_FOUND, "Пользователь не найден");
                });
        Recipe recipe = recipeRepository.findById(request.recipeId())
                .orElseThrow(() -> {
                    log.error("Ошибка (addOrDeleteRecipe): Рецепт с id={} не найден при попытке изменить избранное", request.recipeId());
                    return new AppError(HttpStatus.NOT_FOUND, "Рецепт не найден");
                });

        if (request.isFavorite()) {
            user.getFavoriteRecipes().add(recipe);
            log.info("Рецепт с id={} успешно добавлен в избранное пользователю с id={}",
                    recipe.getId(), user.getId());
            userRepository.save(user);
            return HttpStatus.CREATED;
        } else {
            user.getFavoriteRecipes().remove(recipe);
            log.info("Рецепт с id={} успешно удален из избранного пользователя с id={}",
                    recipe.getId(), user.getId());
            userRepository.save(user);
            return HttpStatus.NO_CONTENT;
        }
    }
}
