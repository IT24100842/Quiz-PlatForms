package com.quizplatform.config;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory token store for stateless header-based authentication.
 * Each login creates a UUID token returned to the frontend.
 * Frontend sends the token as "X-Auth-Token" header on every API request.
 */
@Component
public class AuthTokenStore {

    private final Map<String, UserSession> sessions = new ConcurrentHashMap<>();

    public String createToken(String email, String role, String name) {
        String token = UUID.randomUUID().toString();
        sessions.put(token, new UserSession(email, role, name));
        return token;
    }

    public UserSession getSession(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        return sessions.get(token);
    }

    public void expireToken(String token) {
        if (token != null) {
            sessions.remove(token);
        }
    }

    public void expireSessionsForEmail(String email) {
        if (email == null || email.isBlank()) {
            return;
        }

        sessions.entrySet().removeIf(entry -> email.equalsIgnoreCase(entry.getValue().email()));
    }

    public boolean hasActiveSessionForEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }

        return sessions.values().stream()
                .anyMatch(session -> email.equalsIgnoreCase(session.email()));
    }

    public record UserSession(String email, String role, String name) {}
}
