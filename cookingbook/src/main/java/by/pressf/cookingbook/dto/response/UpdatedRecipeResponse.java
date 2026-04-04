package by.pressf.cookingbook.dto.response;

import java.time.LocalDateTime;

public record UpdatedRecipeResponse(Long recipeId,
                                    LocalDateTime updatedAt) {
}
