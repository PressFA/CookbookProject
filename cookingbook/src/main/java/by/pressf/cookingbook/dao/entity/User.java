package by.pressf.cookingbook.dao.entity;

import by.pressf.cookingbook.dao.entity.enums.*;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data @Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity @Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false, length = 36)
    private String username;
    @Column(nullable = false, length = 255)
    private String password;
    @Column(nullable = false, unique = true, length = 12)
    private String name;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 9)
    private Role role;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 7)
    private Status status;
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "user", fetch = FetchType.LAZY, orphanRemoval = true)
    private List<Recipe> recipes;
    @ManyToMany // Таблица избранное
    @JoinTable(
            name = "favorites",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "recipe_id")
    )
    @Builder.Default
    private Set<Recipe> favoriteRecipes = new HashSet<>();
}
