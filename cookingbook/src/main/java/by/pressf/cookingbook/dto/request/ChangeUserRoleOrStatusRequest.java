package by.pressf.cookingbook.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ChangeUserRoleOrStatusRequest(
        @NotNull(message = "userId не может быть null")
        @Min(value = 1, message = "userId не может быть меньше 1")
        Long userId,
        @NotNull(message = "change не может быть null")
        Boolean change) {
}
