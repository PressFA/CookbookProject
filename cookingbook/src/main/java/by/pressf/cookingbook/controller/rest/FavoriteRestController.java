package by.pressf.cookingbook.controller.rest;

import by.pressf.cookingbook.dto.request.FavoriteRequest;
import by.pressf.cookingbook.security.jwt.JwtService;
import by.pressf.cookingbook.service.FavoriteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/favorite")
public class FavoriteRestController {
    private final JwtService jwtService;
    private final FavoriteService favoriteService;

    @PostMapping @PreAuthorize("hasAnyAuthority('USER', 'MODERATOR')")
    public ResponseEntity<?> updateFavoriteRecipe(@RequestHeader("Authorization") String authHeader,
                                                  @RequestBody @Valid FavoriteRequest favoriteRequest) {
        Long userId = jwtService.getUserIdFromJwtToken(authHeader);

        log.info("Запрос на добавление или удаление рецепта из избранного");
        HttpStatus status = favoriteService.addOrDeleteRecipe(userId, favoriteRequest);
        log.info("Запрос успешно обработан");

        return ResponseEntity.status(status).build();
    }
}
