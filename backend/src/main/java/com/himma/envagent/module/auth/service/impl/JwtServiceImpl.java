package com.himma.envagent.module.auth.service.impl;

import com.himma.envagent.module.auth.config.JwtProperties;
import com.himma.envagent.module.auth.domain.UserEntity;
import com.himma.envagent.module.auth.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class JwtServiceImpl implements JwtService {

    private final JwtProperties jwtProperties;

    public JwtServiceImpl(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    @Override
    public String generateToken(UserEntity user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(jwtProperties.getExpirationSeconds());
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("role", user.getRole())
                .claim("userId", user.getId())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(getSigningKey())
                .compact();
    }

    @Override
    public Optional<String> extractUsername(String token) {
        try {
            return Optional.ofNullable(parseClaims(token).getSubject());
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    @Override
    public boolean isTokenValid(String token, UserEntity user) {
        return extractUsername(token)
                .map(username -> username.equals(user.getUsername()) && !parseClaims(token).getExpiration().before(new Date()))
                .orElse(false);
    }

    @Override
    public long getExpirationSeconds() {
        return jwtProperties.getExpirationSeconds();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith((javax.crypto.SecretKey) getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtProperties.getSecret()));
    }
}
