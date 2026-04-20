package by.pressf.cookingbook.dao.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Builder
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Entity @Table(name = "recipes")
public class Recipe {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;
    @Column(nullable = false, length = 48)
    private String recipeName;
    @Column(nullable = false)
    private int time;
    @Column(nullable = false)
    private int calories;
    @Column(nullable = false)
    private int proteins;
    @Column(nullable = false)
    private int fats;
    @Column(nullable = false)
    private int carbs;
    @Column(nullable = false, columnDefinition = "TEXT", updatable = false)
    private String image;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @ManyToMany // Таблица, которая связывает категории и рецепты
    @JoinTable(
            name = "recipe_category",
            joinColumns = @JoinColumn(name = "recipe_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    @Builder.Default
    private Set<Category> categories = new HashSet<>();
    @ManyToMany(mappedBy = "favoriteRecipes")
    @Builder.Default
    private Set<User> favoriteByUsers = new HashSet<>();
}
