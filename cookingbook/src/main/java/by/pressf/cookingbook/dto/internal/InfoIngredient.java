package by.pressf.cookingbook.dto.internal;

import by.pressf.cookingbook.dao.entity.enums.MeasureUnit;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InfoIngredient(
        @NotBlank(message = "name не может быть пустым!")
        @Size(min = 3, max = 24, message = "Длина name должна быть от 3 до 24 символов")
        String name,
        @Min(value = 1, message = "quantity должен быть минимум от 1")
        int quantity,
        @NotNull(message = "measureUnit не может быть пустым!")
        MeasureUnit measureUnit) {
}
