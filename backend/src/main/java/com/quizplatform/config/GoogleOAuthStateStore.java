package com.quizplatform.config;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GoogleOAuthStateStore {

    private static final Duration EXPIRY = Duration.ofMinutes(5);
    private final Map<String, PendingRequest> pendingRequests = new ConcurrentHashMap<>();

    public String issue(String role, String successUrl, String failureUrl) {
        cleanupExpired();
        String state = UUID.randomUUID().toString();
        pendingRequests.put(state, new PendingRequest(role, successUrl, failureUrl, LocalDateTime.now().plus(EXPIRY)));
        return state;
    }

    public PendingRequest consume(String state) {
        if (state == null || state.isBlank()) {
            return null;
        }

        PendingRequest request = pendingRequests.remove(state);
        if (request == null) {
            return null;
        }

        if (request.expiresAt().isBefore(LocalDateTime.now())) {
            return null;
        }

        return request;
    }

    private void cleanupExpired() {
        LocalDateTime now = LocalDateTime.now();
        pendingRequests.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    public record PendingRequest(String role, String successUrl, String failureUrl, LocalDateTime expiresAt) {}
}
