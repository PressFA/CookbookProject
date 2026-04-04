package by.pressf.cookingbook.dto.response;

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
                             String description,
                             LocalDateTime createdAt,
                             LocalDateTime updatedAt) {
    public RecipeResponse setCategories(List<String> newCategories) {
        return new RecipeResponse(
                recipeId, recipeName, time, name, newCategories,
                calories, proteins, fats, carbs, image,
                description, createdAt, updatedAt
        );
    }
}
