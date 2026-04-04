package by.pressf.cookingbook.controller.rest;

import by.pressf.cookingbook.dto.request.auth.LoginRequest;
import by.pressf.cookingbook.dto.request.auth.RegisterRequest;
import by.pressf.cookingbook.dto.response.UserAndJwtTokenResponse;
import by.pressf.cookingbook.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthRestController {
    private final AuthService authService;

    @PostMapping("/sign-in")
    public ResponseEntity<?> singIn(@RequestBody @Valid LoginRequest loginRequest) {
        log.info("Попытка аутентификации пользователя с username={}", loginRequest.username());
        UserAndJwtTokenResponse token = authService.authUser(loginRequest);
        log.info("Пользователь успешно аутентифицирован");

        return ResponseEntity.status(HttpStatus.OK).body(token);
    }

    @PostMapping("/registration")
    public ResponseEntity<?> registration(@RequestBody @Valid RegisterRequest registerRequest) {
        log.info("Попытка регистрации пользователя с username={}", registerRequest.username());
        authService.createUser(registerRequest);
        log.info("Пользователя успешно зарегистрирован");

        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
