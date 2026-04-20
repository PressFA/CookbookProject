package by.pressf.cookingbook.dto.response;

public record CardRecipeResponse(Long recipeId,
                                 String image,
                                 String recipeName,
                                 int time) {
}
