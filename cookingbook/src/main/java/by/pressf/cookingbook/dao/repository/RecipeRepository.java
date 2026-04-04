package by.pressf.cookingbook.dao.repository;

import by.pressf.cookingbook.dao.entity.Recipe;
import by.pressf.cookingbook.dto.internal.RecipeCategoryRow;
import by.pressf.cookingbook.dto.response.CardRecipeResponse;
import by.pressf.cookingbook.dto.response.RecipeResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long>, JpaSpecificationExecutor<Recipe> {
    @Query("""
    SELECT new by.pressf.cookingbook.dto.internal.RecipeCategoryRow(r.id, r.recipeName, r.time, c.categoryName)
    FROM Recipe r
    JOIN r.categories c
    WHERE r.user.id = :userId
    ORDER BY r.recipeName ASC
    """)
    List<RecipeCategoryRow> getAllRecipe(@Param("userId") Long userId);

    @Query("""
    SELECT new by.pressf.cookingbook.dto.response.RecipeResponse(
        r.id, r.recipeName, r.time, u.name, null,
        r.calories, r.proteins, r.fats, r.carbs, r.image,
        r.description, r.createdAt, r.updatedAt
    )
    FROM Recipe r
    JOIN r.user u
    WHERE r.id = :recipeId
    """)
    RecipeResponse getRecipeResponseById(@Param("recipeId") Long recipeId);

    @Query("""
    SELECT c.categoryName
    FROM Recipe r
    JOIN r.categories c
    WHERE r.id = :recipeId
    """)
    List<String> getRecipeCategoryByRecipeId(@Param("recipeId") Long recipeId);

    @Query("""
    SELECT new by.pressf.cookingbook.dto.response.CardRecipeResponse(r.id, r.image, r.recipeName, r.time)
    FROM Recipe r
    """)
    Page<CardRecipeResponse> getPageRecipe(Pageable pageable);
}
