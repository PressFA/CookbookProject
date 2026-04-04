package by.pressf.cookingbook.dto.response;

public record CardRecipeResponse(Long recipeId,
                                 String recipeName,
                                 String image,
                                 int time) {
}
