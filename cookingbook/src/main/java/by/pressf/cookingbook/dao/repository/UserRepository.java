package by.pressf.cookingbook.dao.repository;

import by.pressf.cookingbook.dao.entity.User;
import by.pressf.cookingbook.dto.internal.RecipeCategoryRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @Query("""
    SELECT new by.pressf.cookingbook.dto.internal.RecipeCategoryRow(r.id, r.recipeName, r.time, c.categoryName)
    FROM User u
    JOIN u.favoriteRecipes r
    JOIN r.categories c
    WHERE u.id = :userId
    ORDER BY r.recipeName ASC
    """)
    List<RecipeCategoryRow> getAllFavoriteRecipe(@Param("userId") Long userId);

    @Query("""
    SELECT u
    FROM User u
    WHERE u.id != :adminId
    ORDER BY u.status ASC, u.role DESC, u.username ASC
    """)
    List<User> getAllUsers(@Param("adminId") Long adminId);

    // Для Spring Security
    Optional<User> findByUsername(String username);
}
