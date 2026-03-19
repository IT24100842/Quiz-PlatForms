package com.quizplatform.config;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class PasswordResetStore {

    private static final Duration EXPIRY = Duration.ofMinutes(10);
    private final Map<String, ResetEntry> store = new ConcurrentHashMap<>();

    public String issueCode(String email, String role) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedRole = normalizeRole(role);
        String key = key(normalizedEmail, normalizedRole);
        String code = String.valueOf(ThreadLocalRandom.current().nextInt(100000, 1000000));
        store.put(key, new ResetEntry(code, LocalDateTime.now().plus(EXPIRY)));
        return code;
    }

    public boolean consumeCode(String email, String role, String code) {
        String key = key(normalizeEmail(email), normalizeRole(role));
        ResetEntry entry = store.get(key);
        if (entry == null) {
            return false;
        }

        if (entry.expiresAt().isBefore(LocalDateTime.now())) {
            store.remove(key);
            return false;
        }

        if (!entry.code().equals(code)) {
            return false;
        }

        store.remove(key);
        return true;
    }

    private String key(String email, String role) {
        return role + "::" + email;
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String normalizeRole(String role) {
        return role == null ? "" : role.trim().toUpperCase();
    }

    private record ResetEntry(String code, LocalDateTime expiresAt) {}
}
