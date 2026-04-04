package by.pressf.cookingbook.dto.internal;

import java.util.List;

public record UserRecipe(Long recipeId,
                         String recipeName,
                         int time,
                         List<String> categories) {
}
