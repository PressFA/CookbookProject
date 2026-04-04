package by.pressf.cookingbook.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record FavoriteRequest(
        @NotNull(message = "recipeId не может быть null")
        @Min(value = 1, message = "recipeId не может быть меньше 1")
        Long recipeId,
        @NotNull(message = "isFavorite не может быть null")
        Boolean isFavorite) {
}
