package by.pressf.cookingbook.dto.response;

public record UserInfoResponse(Long userId,
                               String name,
                               String role,
                               int recipesSize,
                               int favoritesSize) {
}
