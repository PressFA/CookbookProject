package by.pressf.cookingbook.dto.response;

import by.pressf.cookingbook.dto.internal.InfoIngredient;

import java.time.LocalDateTime;
import java.util.List;

public record RecipeResponse(Long recipeId,
                             String recipeName,
                             int time,
                             String name, // имя пользователя
                             List<String> categories,
                             int calories,
                             int proteins,
                             int fats,
                             int carbs,
                             String image,
                             List<InfoIngredient> ingredients,
                             String description,
                             LocalDateTime createdAt,
                             LocalDateTime updatedAt) {
    public RecipeResponse setLists(List<String> newCategories, List<InfoIngredient> newIngredients) {
        return new RecipeResponse(
                recipeId, recipeName, time, name, newCategories,
                calories, proteins, fats, carbs, image,
                newIngredients, description, createdAt, updatedAt
        );
    }
}
