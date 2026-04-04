package by.pressf.cookingbook.service;

import by.pressf.cookingbook.dao.entity.User;
import by.pressf.cookingbook.dao.entity.enums.Role;
import by.pressf.cookingbook.dao.entity.enums.Status;
import by.pressf.cookingbook.dao.repository.UserRepository;
import by.pressf.cookingbook.dto.request.auth.LoginRequest;
import by.pressf.cookingbook.dto.request.auth.RegisterRequest;
import by.pressf.cookingbook.dto.response.UserAndJwtTokenResponse;
import by.pressf.cookingbook.exception.AppError;
import by.pressf.cookingbook.security.CustomUserDetails;
import by.pressf.cookingbook.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserAndJwtTokenResponse authUser(LoginRequest request) {
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );

            CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();

            User user = userDetails.user();
            String jwtToken = jwtService.generateToken(user.getId(), user.getUsername());
            log.info("Generated JWT token: {}", jwtToken);

            return new UserAndJwtTokenResponse(user.getId(), user.getName(),
                    user.getRole().name(), jwtToken);
        } catch (BadCredentialsException ex) {
            log.error("BadCredentialsException: {}", ex.getMessage());
            throw new AppError(HttpStatus.UNAUTHORIZED, "Неверный логин или пароль");
        } catch (LockedException ex) {
            log.error("LockedException: {}", ex.getMessage());
            throw new AppError(HttpStatus.FORBIDDEN, "Аккаунт заблокирован");
        } catch (AuthenticationException ex) {
            log.error("AuthenticationException: {}", ex.getMessage());
            throw new AppError(HttpStatus.UNAUTHORIZED, "Ошибка входа");
        }
    }

    @Transactional
    public void createUser(RegisterRequest request) {
        User user = User.builder()
                .username(request.username())
                .password(passwordEncoder.encode(request.password()))
                .name(request.name())
                .role(Role.USER)
                .status(Status.ACTIVE)
                .build();
        userRepository.save(user);
    }
}
