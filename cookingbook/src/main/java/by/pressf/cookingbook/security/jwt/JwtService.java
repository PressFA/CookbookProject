package by.pressf.cookingbook.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {
    @Value("${token.secret-key}")
    private String jwtSecret;
    @Value("${token.lifetime}")
    private Duration jwtLifetime;

    public String generateToken(Long userId, String username) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);

        Date startDate = new Date();
        Date expDate = new Date(startDate.getTime() + jwtLifetime.toMillis());

        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(startDate)
                .expiration(expDate)
                .signWith(getSecretKey())
                .compact();
    }

    public Long getUserIdFromJwtToken(String jwtToken) {
        jwtToken = jwtToken.substring(7);
        return getPayloadFromJwtToken(jwtToken).get("userId", Long.class);
    }

    public String getUsernameFromJwtToken(String jwtToken) {
        return getPayloadFromJwtToken(jwtToken).getSubject();
    }

    private Claims getPayloadFromJwtToken(String jwtToken) {
        return Jwts.parser()
                .verifyWith(getSecretKey())
                .build()
                .parseSignedClaims(jwtToken)
                .getPayload();
    }

    private SecretKey getSecretKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
