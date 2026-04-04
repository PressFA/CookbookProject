package by.pressf.cookingbook.controller.rest;

import by.pressf.cookingbook.dao.entity.Category;
import by.pressf.cookingbook.service.CategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/category")
public class CategoryRestController {
    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<?> findAll() {
        log.info("Пришёл запрос на получение всех категорий");
        List<Category> list = categoryService.findAllCategories();
        log.info("Запрос обработан успешно");

        return ResponseEntity.status(HttpStatus.OK).body(list);
    }
}
