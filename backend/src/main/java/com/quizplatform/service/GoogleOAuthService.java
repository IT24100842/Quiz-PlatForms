package com.quizplatform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

@Service
public class GoogleOAuthService {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.auth.google.enabled:false}")
    private boolean enabled;

    @Value("${app.auth.google.client-id:}")
    private String clientId;

    @Value("${app.auth.google.client-secret:}")
    private String clientSecret;

    @Value("${app.auth.google.redirect-uri:http://localhost:8080/api/auth/oauth/google/callback}")
    private String redirectUri;

    public GoogleOAuthService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String buildAuthorizationUrl(String state) {
        ensureConfigured();

        return "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + encode(clientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&response_type=code"
                + "&scope=" + encode("openid email profile")
                + "&state=" + encode(state)
                + "&prompt=select_account";
    }

    public GoogleProfile fetchProfileByAuthorizationCode(String code) {
        ensureConfigured();

        try {
            String accessToken = exchangeCodeForAccessToken(code);

            HttpRequest profileRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://openidconnect.googleapis.com/v1/userinfo"))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();

            HttpResponse<String> profileResponse = httpClient.send(profileRequest, HttpResponse.BodyHandlers.ofString());
            if (profileResponse.statusCode() < 200 || profileResponse.statusCode() >= 300) {
                throw new IllegalStateException("Google profile lookup failed. Please try again.");
            }

            JsonNode profileJson = objectMapper.readTree(profileResponse.body());
            String email = text(profileJson.get("email"));
            String name = text(profileJson.get("name"));
            boolean verified = profileJson.path("email_verified").asBoolean(false);

            if (email.isBlank()) {
                throw new IllegalStateException("Google did not return an email address.");
            }
            if (!verified) {
                throw new IllegalStateException("Google account email is not verified.");
            }

            String normalizedName;
            if (!name.isBlank()) {
                normalizedName = name;
            } else {
                int atIndex = email.indexOf('@');
                normalizedName = atIndex > 0 ? email.substring(0, atIndex) : "Student";
            }
            return new GoogleProfile(email, normalizedName);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Google sign-in failed while contacting Google.", ex);
        } catch (IOException ex) {
            throw new IllegalStateException("Google sign-in failed while contacting Google.", ex);
        }
    }

    private String exchangeCodeForAccessToken(String code) throws IOException, InterruptedException {
        String payload = "code=" + encode(code)
                + "&client_id=" + encode(clientId)
                + "&client_secret=" + encode(clientSecret)
                + "&redirect_uri=" + encode(redirectUri)
                + "&grant_type=authorization_code";

        HttpRequest tokenRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/token"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        HttpResponse<String> tokenResponse = httpClient.send(tokenRequest, HttpResponse.BodyHandlers.ofString());
        if (tokenResponse.statusCode() < 200 || tokenResponse.statusCode() >= 300) {
            throw new IllegalStateException("Google token exchange failed. Check client ID/secret and redirect URI.");
        }

        JsonNode tokenJson = objectMapper.readTree(tokenResponse.body());
        String accessToken = text(tokenJson.get("access_token"));
        if (accessToken.isBlank()) {
            throw new IllegalStateException("Google token response did not include an access token.");
        }

        return accessToken;
    }

    private void ensureConfigured() {
        if (!enabled || isBlank(clientId) || isBlank(clientSecret) || isBlank(redirectUri)) {
            throw new IllegalStateException(
                    "Google sign-in is not configured. Set GOOGLE_AUTH_ENABLED, GOOGLE_AUTH_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET, and GOOGLE_AUTH_REDIRECT_URI.");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String text(JsonNode node) {
        return node == null ? "" : node.asText("").trim();
    }

    private static String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    public record GoogleProfile(String email, String name) {}
}
