package com.quizplatform.controller;

import com.quizplatform.config.AuthTokenStore;
import com.quizplatform.config.GoogleOAuthStateStore;
import com.quizplatform.dto.AuthActionResponse;
import com.quizplatform.dto.ForgotPasswordRequest;
import com.quizplatform.dto.LoginRequest;
import com.quizplatform.dto.LoginResponse;
import com.quizplatform.dto.RegisterRequest;
import com.quizplatform.dto.ResetPasswordRequest;
import com.quizplatform.dto.StudentAdminUpdateRequest;
import com.quizplatform.dto.StudentDto;
import com.quizplatform.service.AuthService;
import com.quizplatform.service.GoogleOAuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String STATIC_STUDENT_LOGIN = "http://localhost:5500/student-login.html";
    private static final String STATIC_ADMIN_LOGIN = "http://localhost:5500/admin-login.html";

    private final AuthService authService;
    private final AuthTokenStore tokenStore;
    private final GoogleOAuthService googleOAuthService;
    private final GoogleOAuthStateStore googleOAuthStateStore;

    public AuthController(AuthService authService,
                          AuthTokenStore tokenStore,
                          GoogleOAuthService googleOAuthService,
                          GoogleOAuthStateStore googleOAuthStateStore) {
        this.authService = authService;
        this.tokenStore = tokenStore;
        this.googleOAuthService = googleOAuthService;
        this.googleOAuthStateStore = googleOAuthStateStore;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/oauth/google/start")
    public ResponseEntity<Void> startGoogleOAuth(
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "successUrl", required = false) String successUrl,
            @RequestParam(value = "failureUrl", required = false) String failureUrl) {

        String normalizedRole = normalizeRole(role);
        String defaultLogin = "ADMIN".equals(normalizedRole) ? STATIC_ADMIN_LOGIN : STATIC_STUDENT_LOGIN;

        String safeSuccess = sanitizeRedirect(successUrl, defaultLogin);
        String safeFailure = sanitizeRedirect(failureUrl, safeSuccess);

        String state = googleOAuthStateStore.issue(normalizedRole, safeSuccess, safeFailure);

        try {
            String authUrl = googleOAuthService.buildAuthorizationUrl(state);
            return redirect(authUrl);
        } catch (IllegalStateException ex) {
            return redirectWithError(safeFailure, ex.getMessage());
        }
    }

    @GetMapping("/oauth/google/callback")
    public ResponseEntity<Void> googleOAuthCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error,
            @RequestParam(value = "error_description", required = false) String errorDescription) {

        var pending = googleOAuthStateStore.consume(state);
        if (pending == null) {
            return redirectWithError(STATIC_STUDENT_LOGIN, "Google sign-in session is invalid or expired. Please try again.");
        }

        if (error != null) {
            String message = errorDescription == null || errorDescription.isBlank()
                    ? "Google sign-in was cancelled or denied."
                    : errorDescription;
            return redirectWithError(pending.failureUrl(), message);
        }

        if (code == null || code.isBlank()) {
            return redirectWithError(pending.failureUrl(), "Google sign-in did not return an authorization code.");
        }

        try {
            var googleProfile = googleOAuthService.fetchProfileByAuthorizationCode(code);
            LoginResponse response = authService.loginWithGoogle(pending.role(), googleProfile.email(), googleProfile.name());

            if (!response.isSuccess()) {
                return redirectWithError(pending.failureUrl(), response.getMessage());
            }

            return redirectWithSuccess(pending.successUrl(), response);
        } catch (IllegalStateException ex) {
            return redirectWithError(pending.failureUrl(), ex.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@RequestBody RegisterRequest request) {
        LoginResponse response = authService.registerStudent(request);
        return ResponseEntity.status(response.isSuccess() ? HttpStatus.CREATED : HttpStatus.BAD_REQUEST).body(response);
    }

    @PostMapping("/forgot-password/request")
    public ResponseEntity<AuthActionResponse> requestForgotPassword(@RequestBody ForgotPasswordRequest request) {
        AuthActionResponse response = authService.requestPasswordReset(request);
        return ResponseEntity.status(response.isSuccess() ? HttpStatus.OK : HttpStatus.BAD_REQUEST).body(response);
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<AuthActionResponse> resetForgotPassword(@RequestBody ResetPasswordRequest request) {
        AuthActionResponse response = authService.resetPassword(request);
        return ResponseEntity.status(response.isSuccess() ? HttpStatus.OK : HttpStatus.BAD_REQUEST).body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        tokenStore.expireToken(token);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponse> me(
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null) {
            return ResponseEntity.ok(new LoginResponse(false, null, null, null, "Not authenticated."));
        }
        return ResponseEntity.ok(new LoginResponse(true, session.role(), session.name(), session.email(), "OK"));
    }

    @GetMapping("/students")
    public ResponseEntity<List<StudentDto>> students(
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(authService.getRegisteredStudents());
    }

    @PutMapping("/students/{id}")
    public ResponseEntity<StudentDto> updateStudent(
            @PathVariable Long id,
            @RequestBody StudentAdminUpdateRequest request,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            return ResponseEntity.ok(authService.updateStudentByAdmin(id, request));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/students/{id}")
    public ResponseEntity<Void> deleteStudent(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            boolean removed = authService.deleteStudentByAdmin(id);
            return removed ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    private ResponseEntity<Void> redirectWithSuccess(String baseUrl, LoginResponse response) {
        String url = UriComponentsBuilder.fromUriString(baseUrl)
                .replaceQuery(null)
                .queryParam("oauth", "success")
                .queryParam("token", response.getToken())
                .queryParam("role", response.getRole())
                .queryParam("name", response.getName())
                .queryParam("email", response.getEmail())
            .build()
            .encode()
                .toUriString();

        return redirect(url);
    }

    private ResponseEntity<Void> redirectWithError(String baseUrl, String message) {
        String safeMessage = message == null || message.isBlank()
                ? "Google sign-in failed."
                : message;

        String url = UriComponentsBuilder.fromUriString(baseUrl)
                .replaceQuery(null)
                .queryParam("oauth", "error")
                .queryParam("message", safeMessage)
            .build()
            .encode()
                .toUriString();

        return redirect(url);
    }

    private ResponseEntity<Void> redirect(String url) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, url)
                .build();
    }

    private String normalizeRole(String role) {
        String normalized = role == null ? "STUDENT" : role.trim().toUpperCase();
        return "ADMIN".equals(normalized) ? "ADMIN" : "STUDENT";
    }

    private String sanitizeRedirect(String candidateUrl, String fallbackUrl) {
        if (candidateUrl == null || candidateUrl.isBlank()) {
            return fallbackUrl;
        }

        try {
            URI uri = URI.create(candidateUrl.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();

            boolean validScheme = "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
            boolean validHost = "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host);

            if (!validScheme || !validHost) {
                return fallbackUrl;
            }

            return uri.toString();
        } catch (Exception ex) {
            return fallbackUrl;
        }
    }
}
