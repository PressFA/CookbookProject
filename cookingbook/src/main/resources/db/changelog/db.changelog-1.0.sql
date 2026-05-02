--liquibase formatted sql

--changeset pressf:1
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(36) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(12) NOT NULL UNIQUE,
    role VARCHAR(9) NOT NULL,
    status VARCHAR(7) NOT NULL,

    CHECK (role IN ('ADMIN', 'MODERATOR', 'USER')),
    CHECK (status IN ('ACTIVE', 'BLOCKED'))
);

--changeset pressf:2
CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(24) NOT NULL UNIQUE
);

--changeset pressf:3
CREATE TABLE recipes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    recipe_name VARCHAR(48) NOT NULL,
    time INTEGER NOT NULL,
    calories INTEGER NOT NULL,
    proteins INTEGER NOT NULL,
    fats INTEGER NOT NULL,
    carbs INTEGER NOT NULL,
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP(0) NOT NULL,
    updated_at TIMESTAMP(0),

    CONSTRAINT fk_recipes_user FOREIGN KEY (user_id) REFERENCES users(id)
);

--changeset pressf:4
CREATE TABLE recipe_category (
    recipe_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,

    PRIMARY KEY (recipe_id, category_id),
    CONSTRAINT fk_rc_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    CONSTRAINT fk_rc_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

--changeset pressf:5
CREATE TABLE favorites (
    user_id BIGINT NOT NULL,
    recipe_id BIGINT NOT NULL,

    PRIMARY KEY (user_id, recipe_id),
    CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_fav_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

--changeset pressf:6
CREATE TABLE ingredients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipe_id BIGINT NOT NULL,
    name VARCHAR(24) NOT NULL,
    quantity INT NOT NULL,
    measure_unit VARCHAR(10) NOT NULL,

    CONSTRAINT fk_ingr_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    CHECK (measure_unit IN ('GRAM', 'MILLILITER', 'PIECE'))
)