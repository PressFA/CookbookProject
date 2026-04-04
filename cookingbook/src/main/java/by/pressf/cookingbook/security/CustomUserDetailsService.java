package by.pressf.cookingbook.security;

import by.pressf.cookingbook.dao.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public CustomUserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.info("Spring Security пытается найти пользователя с username={}", username);
        return userRepository.findByUsername(username).map(CustomUserDetails::new)
                .orElseThrow(() -> {
                    log.warn("Spring Security не смог найти пользователя с username={}", username);
                    return new UsernameNotFoundException(username);
                });
    }
}
