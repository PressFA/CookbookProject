package by.pressf.cookingbook.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "username не может быть пустым")
        @Email(message = "username должен быть действительным адресом электронной почты")
        String username,
        @NotBlank(message = "password не может быть пустым")
        @Size(min = 8, max = 16, message = "длина password должна составлять от 8 до 16 символов")
        String password) {
}
