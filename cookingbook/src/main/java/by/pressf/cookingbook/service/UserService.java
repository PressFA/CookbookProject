package by.pressf.cookingbook.service;

import by.pressf.cookingbook.dao.entity.User;
import by.pressf.cookingbook.dao.entity.enums.Role;
import by.pressf.cookingbook.dao.entity.enums.Status;
import by.pressf.cookingbook.dao.repository.UserRepository;
import by.pressf.cookingbook.dto.internal.UserReport;
import by.pressf.cookingbook.dto.request.ChangeUserRoleOrStatusRequest;
import by.pressf.cookingbook.dto.response.UserInfoResponse;
import by.pressf.cookingbook.exception.AppError;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserInfoResponse getUserInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.error("Ошибка (getUserInfo): Пользователь с id={} не найден", userId);
                    return new AppError(HttpStatus.NOT_FOUND, "Пользователь не найден");
                });

        return new UserInfoResponse(user.getId(), user.getName(), user.getRole().name(),
                user.getRecipes().size(), user.getFavoriteRecipes().size());
    }

    @Transactional(readOnly = true)
    public List<UserReport> getFullReport(Long adminId) {
        return userRepository.getAllUsers(adminId).stream()
                .map(user -> new UserReport(user.getId(), user.getName(), user.getUsername(),
                        user.getRole().name(), user.getStatus().name()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void changeRole(ChangeUserRoleOrStatusRequest request) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> {
                    log.error("Ошибка (changeRole): Пользователь с id={} не найден", request.userId());
                    return new AppError(HttpStatus.NOT_FOUND, "Пользователь не найден");
                });

        if (request.change()) {
            user.setRole(Role.MODERATOR);
        } else {
            user.setRole(Role.USER);
        }

        userRepository.save(user);
    }

    @Transactional
    public void changeStatus(ChangeUserRoleOrStatusRequest request) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> {
                    log.error("Ошибка (changeStatus): Пользователь с id={} не найден", request.userId());
                    return new AppError(HttpStatus.NOT_FOUND, "Пользователь не найден");
                });

        if (request.change()) {
            user.setStatus(Status.BLOCKED);
        } else {
            user.setStatus(Status.ACTIVE);
        }

        userRepository.save(user);
    }
}
