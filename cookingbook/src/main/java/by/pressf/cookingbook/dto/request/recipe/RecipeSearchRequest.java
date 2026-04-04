package by.pressf.cookingbook.dto.request.recipe;

import jakarta.validation.constraints.Size;

public record RecipeSearchRequest(
        @Size(max = 48, message = "В поисковой строке (recipeName) можно ввести максимум 48 символов")
        String recipeName,
        @Size(min = 4, max = 19, message = "category1 должна быть от 4 до 19 символов")
        String category1,
        @Size(min = 4, max = 19, message = "category2 должна быть от 4 до 19 символов")
        String category2) {
}
