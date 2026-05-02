package by.pressf.cookingbook.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")  // Применяем ко всем эндпоинтам, начинающимся с /api/
                .allowedOrigins(
                        "http://127.0.0.1:5500",
                        "http://localhost:5500",
                        "http://localhost:5501", // <- remove
                        "http://127.0.0.1:5501", // <- remove
                        "http://localhost:3000"   // если вдруг фронт на React потом
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);      // Разрешаем передачу куки/авторизационных заголовков
    }
}