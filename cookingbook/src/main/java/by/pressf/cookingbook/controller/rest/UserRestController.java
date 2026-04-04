package by.pressf.cookingbook.controller.rest;

import by.pressf.cookingbook.dto.internal.UserReport;
import by.pressf.cookingbook.dto.request.ChangeUserRoleOrStatusRequest;
import by.pressf.cookingbook.dto.response.UserInfoResponse;
import by.pressf.cookingbook.security.jwt.JwtService;
import by.pressf.cookingbook.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/user")
public class UserRestController {
    private final JwtService jwtService;
    private final UserService userService;

    @GetMapping("/me") @PreAuthorize("hasAnyAuthority('USER', 'MODERATOR', 'ADMIN')")
    public ResponseEntity<?> getUserInformation(@RequestHeader("Authorization") String authHeader) {
        Long userId = jwtService.getUserIdFromJwtToken(authHeader);

        log.info("Запрос на получение информации о пользователе userId={}", userId);
        UserInfoResponse response = userService.getUserInfo(userId);
        log.info("Информация о пользователе найдена");

        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/reports") @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> getAllReports(@RequestHeader("Authorization") String authHeader) {
        Long adminId = jwtService.getUserIdFromJwtToken(authHeader);

        log.info("Запрос на получение информации о пользователях");
        List<UserReport> reports = userService.getFullReport(adminId);
        log.info("Кол-во пользователей в системе: {}", reports.size());

        return ResponseEntity.status(HttpStatus.OK).body(reports);
    }

    @PatchMapping("/change-role") @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> changeUserRole(@RequestBody @Valid ChangeUserRoleOrStatusRequest req) {
        log.info("Запрос на смену роли пользователя");
        userService.changeRole(req);
        log.info("Роль пользователя успешно изменена");

        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @PatchMapping("/change-status") @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> changeUserStatus(@RequestBody @Valid ChangeUserRoleOrStatusRequest req) {
        log.info("Запрос на смену статуса пользователя");
        userService.changeStatus(req);
        log.info("Статус пользователя успешно изменен");

        return ResponseEntity.status(HttpStatus.OK).build();
    }
}
