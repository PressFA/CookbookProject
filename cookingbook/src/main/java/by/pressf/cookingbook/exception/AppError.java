package by.pressf.cookingbook.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppError extends RuntimeException {
    private final HttpStatus status;
    private final String message;

    public AppError(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}
