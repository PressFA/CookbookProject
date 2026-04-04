package by.pressf.cookingbook.controller.rest;

import by.pressf.cookingbook.dto.internal.UserRecipe;
import by.pressf.cookingbook.dto.request.recipe.CreateRecipeRequest;
import by.pressf.cookingbook.dto.request.recipe.RecipeSearchRequest;
import by.pressf.cookingbook.dto.request.recipe.UpdateRecipeRequest;
import by.pressf.cookingbook.dto.response.CardRecipeResponse;
import by.pressf.cookingbook.dto.response.RecipeResponse;
import by.pressf.cookingbook.dto.response.UpdatedRecipeResponse;
import by.pressf.cookingbook.security.jwt.JwtService;
import by.pressf.cookingbook.service.RecipeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/recipe")
public class RecipeRestController {
    private final JwtService jwtService;
    private final RecipeService recipeService;

    @GetMapping("/user-recipes/me") @PreAuthorize("hasAnyAuthority('USER', 'MODERATOR')")
    public ResponseEntity<?> getAllUserRecipes(@RequestHeader("Authorization") String authHeader) {
        Long userId = jwtService.getUserIdFromJwtToken(authHeader);

        log.info("Запрос от пользователя с id={} на получение своих рецептов", userId);
        List<UserRecipe> recipeList = recipeService.getAllMyRecipes(userId);
        log.info("Все рецепты пользователя были найдены");

        return ResponseEntity.status(HttpStatus.OK).body(recipeList);
    }

    @GetMapping("/favorite-recipes/me") @PreAuthorize("hasAnyAuthority('USER', 'MODERATOR')")
    public ResponseEntity<?> getAllUserFavoriteRecipes(@RequestHeader("Authorization") String authHeader) {
        Long userId = jwtService.getUserIdFromJwtToken(authHeader);

        log.info("Запрос от пользователя id={} на получение избранных рецептов", userId);
        List<UserRecipe> recipeList = recipeService.getAllMyFavoriteRecipes(userId);
        log.info("Все избранные рецепты были найдены");

        return ResponseEntity.status(HttpStatus.OK).body(recipeList);
    }

    @GetMapping("/{recipeId}")
    public ResponseEntity<?> getRecipe(@PathVariable Long recipeId) {
        log.info("Запрос на информацию о рецепте id={}", recipeId);
        RecipeResponse response = recipeService.getRecipeById(recipeId);
        log.info("Рецепт с id={} успешно найден", recipeId);

        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping
    public ResponseEntity<?> getAllRecipes(Pageable pageable) {
        log.info("Запрос на получение рецептов для главной страницы: page={}, size={}, sort={}",
                pageable.getPageNumber(), pageable.getPageSize(), pageable.getSort());
        Page<CardRecipeResponse> cardsRecipe = recipeService.getAllRecipes(pageable);
        log.info("Найдено {} рецептов", cardsRecipe.getSize());

        return ResponseEntity.status(HttpStatus.OK).body(cardsRecipe);
    }

    @PostMapping("/search") @PreAuthorize("hasAnyAuthority('USER', 'MODERATOR', 'ADMIN')")
    public ResponseEntity<?> getSearchedRecipes(@RequestBody @Valid RecipeSearchRequest searchRequest,
                                                Pageable pageable) {
        log.info("Запрос на поиск рецептов с параметрами: recipeName={}, category1={}, category2={}, page={}, size={}, sort={}",
                searchRequest.recipeName(), searchRequest.category1(), searchRequest.category2(),
                pageable.getPageNumber(), pageable.getPageSize(), pageable.getSort());
        Page<CardRecipeResponse> cardsRecipe = recipeService.getSearchedRecipes(searchRequest, pageable);
        log.info("По параметрам найдено {} рецептов", cardsRecipe.getSize());

        return ResponseEntity.status(HttpStatus.OK).body(cardsRecipe);
    }

    @PostMapping @PreAuthorize("hasAnyAuthority('USER', 'MODERATOR')")
    public ResponseEntity<?> addRecipe(@RequestHeader("Authorization") String authHeader,
                                       @RequestBody @Valid CreateRecipeRequest recipeRequest) {
        Long userId = jwtService.getUserIdFromJwtToken(authHeader);

        log.info("Запрос на добавление рецепта от пользователя id={}", userId);
        Map<String, Long> response = recipeService.createRecipe(userId, recipeRequest);
        log.info("Добавлен новый рецепт recipeId={}", response.get("recipeId"));

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping @PreAuthorize("hasAnyAuthority('USER', 'MODERATOR')")
    public ResponseEntity<?> updateRecipe(@RequestHeader("Authorization") String authHeader,
                                          @RequestBody @Valid UpdateRecipeRequest recipeRequest) {
        Long userId = jwtService.getUserIdFromJwtToken(authHeader);

        log.info("Запрос на обновление рецепта recipeId={}", recipeRequest.recipeId());
        UpdatedRecipeResponse response = recipeService.updateRecipe(userId, recipeRequest);
        log.info("Рецепт успешно обновлён");

        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @DeleteMapping("/user-delete/{recipeId}") @PreAuthorize("hasAuthority('USER')")
    public ResponseEntity<?> deleteUserRecipe(@RequestHeader("Authorization") String authHeader,
                                              @PathVariable Long recipeId) {
        Long userId = jwtService.getUserIdFromJwtToken(authHeader);

        log.info("Запрос на удаления рецепта от пользователя id={}", userId);
        recipeService.deleteUserRecipe(userId, recipeId);
        log.info("Пользователь успешно удалил свой рецепт");

        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @DeleteMapping("/moder-delete/{recipeId}") @PreAuthorize("hasAuthority('MODERATOR')")
    public ResponseEntity<?> deleteModeratorRecipe(@PathVariable Long recipeId) {
        log.info("Запрос на удаление рецепта от модератора");
        recipeService.deleteModerRecipe(recipeId);
        log.info("Модератор успешно удалил рецепт");

        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
