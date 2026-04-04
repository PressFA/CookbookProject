package by.pressf.cookingbook.dto.request.recipe;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateRecipeRequest(
        @Min(value = 1, message = "recipeId не может быть меньше 1")
        Long recipeId,
        @NotBlank(message = "recipeName не может быть пустым")
        @Size(min = 4, max = 48, message = "Длина recipeName должно быть от 4 до 48 символов")
        String recipeName,
        @Min(value = 1, message = "Время приготовления должно быть не меньше 1 минуты")
        int time,
        @Min(value = 1, message = "Калории должны быть не меньше 1")
        int calories,
        @Min(value = 1, message = "Белки должны быть не меньше 1")
        int proteins,
        @Min(value = 1, message = "Жиры должны быть не меньше 1")
        int fats,
        @Min(value = 1, message = "Углеводы должны быть не меньше 1")
        int carbs,
        @NotBlank(message = "Описание не может быть пустым")
        String description,
        @NotEmpty(message = "Список категорий не может быть пустым")
        @Size(min = 1, max = 2, message = "Количество категорий должно быть от 1 до 2")
        List<Long> categories) {
}
