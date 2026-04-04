package by.pressf.cookingbook.dto.response;

public record UserAndJwtTokenResponse(Long userId,
                                      String name,
                                      String role,
                                      String jwtToken) {
}
