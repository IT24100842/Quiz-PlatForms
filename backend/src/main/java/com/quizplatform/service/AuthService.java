package com.quizplatform.service;

import com.quizplatform.config.AuthTokenStore;
import com.quizplatform.config.PasswordResetStore;
import com.quizplatform.dto.AuthActionResponse;
import com.quizplatform.dto.ForgotPasswordRequest;
import com.quizplatform.dto.LoginRequest;
import com.quizplatform.dto.LoginResponse;
import com.quizplatform.dto.RegisterRequest;
import com.quizplatform.dto.ResetPasswordRequest;
import com.quizplatform.dto.StudentAdminUpdateRequest;
import com.quizplatform.dto.StudentDto;
import com.quizplatform.model.Faculty;
import com.quizplatform.model.User;
import com.quizplatform.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthTokenStore tokenStore;
    private final PasswordResetStore passwordResetStore;
    private final EmailService emailService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthTokenStore tokenStore,
                       PasswordResetStore passwordResetStore,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenStore = tokenStore;
        this.passwordResetStore = passwordResetStore;
        this.emailService = emailService;
    }

    public LoginResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            return new LoginResponse(false, null, null, null, "Email and password are required.");
        }

        Optional<User> optionalUser = userRepository.findByEmailIgnoreCase(request.getEmail().trim());
        if (optionalUser.isEmpty()) {
            return new LoginResponse(false, null, null, null, "Invalid email or password.");
        }

        User user = optionalUser.get();
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return new LoginResponse(false, null, null, null, "Invalid email or password.");
        }

        if (request.getRole() != null && !request.getRole().equalsIgnoreCase(user.getRole())) {
            return new LoginResponse(false, null, null, null,
                    "Access denied. This account is not registered as " + request.getRole().toLowerCase() + ".");
        }

        String token = tokenStore.createToken(user.getEmail(), user.getRole(), user.getName());
        LoginResponse response = new LoginResponse(true, user.getRole(), user.getName(), user.getEmail(), "Login successful.");
        response.setToken(token);
        return response;
    }

    public LoginResponse registerStudent(RegisterRequest request) {
        String name = request.getName() == null ? "" : request.getName().trim();
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String password = request.getPassword() == null ? "" : request.getPassword().trim();
        Faculty faculty = parseFacultyOrDefault(request.getFaculty());

        if (name.isEmpty() || email.isEmpty() || password.isEmpty()) {
            return new LoginResponse(false, null, null, null, "Name, email, and password are required.");
        }

        if (password.length() < 6) {
            return new LoginResponse(false, null, null, null, "Password must be at least 6 characters long.");
        }

        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            return new LoginResponse(false, null, null, null, "A user with this email already exists.");
        }

        User student = new User();
        student.setName(name);
        student.setEmail(email);
        student.setPasswordHash(passwordEncoder.encode(password));
        student.setRole("STUDENT");
        student.setFaculty(faculty);
        userRepository.save(student);

        return new LoginResponse(true, "STUDENT", student.getName(), student.getEmail(), "Registration successful. You can now sign in.");
    }

    public LoginResponse loginWithGoogle(String requestedRole, String email, String displayName) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        String normalizedRole = normalizeRole(requestedRole);

        if (normalizedEmail.isBlank()) {
            return new LoginResponse(false, null, null, null, "Google sign-in did not return a valid email address.");
        }

        Optional<User> optionalUser = userRepository.findByEmailIgnoreCase(normalizedEmail);
        User user;

        if (optionalUser.isPresent()) {
            user = optionalUser.get();
            if (!normalizedRole.equalsIgnoreCase(user.getRole())) {
                return new LoginResponse(false, null, null, null,
                        "Access denied. This account is not registered as " + normalizedRole.toLowerCase() + ".");
            }

            if ((user.getName() == null || user.getName().isBlank()) && displayName != null && !displayName.isBlank()) {
                user.setName(displayName.trim());
                user = userRepository.save(user);
            }
        } else {
            if (!"STUDENT".equals(normalizedRole)) {
                return new LoginResponse(false, null, null, null,
                        "No admin account exists for this Google email. Contact an administrator.");
            }

            User student = new User();
            student.setName(resolveName(displayName, normalizedEmail));
            student.setEmail(normalizedEmail);
            // Social sign-ins do not use password auth, but DB column is required.
            student.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            student.setRole("STUDENT");
            student.setFaculty(Faculty.IT);
            user = userRepository.save(student);
        }

        String token = tokenStore.createToken(user.getEmail(), user.getRole(), user.getName());
        LoginResponse response = new LoginResponse(true, user.getRole(), user.getName(), user.getEmail(), "Google sign-in successful.");
        response.setToken(token);
        return response;
    }

    public List<StudentDto> getRegisteredStudents() {
        return userRepository.findAllByRoleIgnoreCaseOrderByCreatedAtDesc("STUDENT")
                .stream()
                .map(this::toStudentDto)
                .collect(Collectors.toList());
    }

    public StudentDto updateStudentByAdmin(Long id, StudentAdminUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Student not found."));

        if (!"STUDENT".equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("Only student accounts can be edited here.");
        }

        String nextName = request == null ? null : request.getName();
        if (nextName != null && !nextName.trim().isEmpty()) {
            user.setName(nextName.trim());
        }

        User saved = userRepository.save(user);
        return toStudentDto(saved);
    }

    public boolean deleteStudentByAdmin(Long id) {
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return false;
        }

        User user = optionalUser.get();
        if (!"STUDENT".equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("Only student accounts can be deleted here.");
        }

        tokenStore.expireSessionsForEmail(user.getEmail());
        userRepository.delete(user);
        return true;
    }

    public AuthActionResponse requestPasswordReset(ForgotPasswordRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        String role = request.getRole() == null ? "" : request.getRole().trim().toUpperCase();

        if (email.isEmpty() || role.isEmpty()) {
            return new AuthActionResponse(false, "Email and role are required.");
        }

        Optional<User> optionalUser = userRepository.findByEmailIgnoreCase(email);
        if (optionalUser.isEmpty() || !role.equalsIgnoreCase(optionalUser.get().getRole())) {
            // Do not leak user existence details.
            return new AuthActionResponse(true, "If the account exists, a reset code has been sent to your email.");
        }

        String code = passwordResetStore.issueCode(email, role);

        try {
            emailService.sendPasswordResetCode(email, role, code);
            return new AuthActionResponse(true, "Reset code sent to your Gmail account.");
        } catch (IllegalStateException ex) {
            logger.warn("Password reset email is not configured correctly: {}", ex.getMessage());
            return new AuthActionResponse(false, "Email service is not configured yet. Please contact admin.");
        } catch (MailException ex) {
            logger.error("Failed to send password reset email to {} via configured provider.", email, ex);
            return new AuthActionResponse(false, "Failed to send reset code email. Please try again.");
        } catch (Exception ex) {
            logger.error("Unexpected error while sending password reset email.", ex);
            return new AuthActionResponse(false, "Failed to send reset code email. Please try again.");
        }
    }

    public AuthActionResponse resetPassword(ResetPasswordRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        String role = request.getRole() == null ? "" : request.getRole().trim().toUpperCase();
        String code = request.getCode() == null ? "" : request.getCode().trim();
        String newPassword = request.getNewPassword() == null ? "" : request.getNewPassword().trim();

        if (email.isEmpty() || role.isEmpty() || code.isEmpty() || newPassword.isEmpty()) {
            return new AuthActionResponse(false, "Email, role, reset code, and new password are required.");
        }

        if (newPassword.length() < 6) {
            return new AuthActionResponse(false, "Password must be at least 6 characters long.");
        }

        Optional<User> optionalUser = userRepository.findByEmailIgnoreCase(email);
        if (optionalUser.isEmpty() || !role.equalsIgnoreCase(optionalUser.get().getRole())) {
            return new AuthActionResponse(false, "Invalid reset request.");
        }

        boolean validCode = passwordResetStore.consumeCode(email, role, code);
        if (!validCode) {
            return new AuthActionResponse(false, "Invalid or expired reset code.");
        }

        User user = optionalUser.get();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return new AuthActionResponse(true, "Password reset successful. Please sign in.");
    }

    private StudentDto toStudentDto(User user) {
        StudentDto dto = new StudentDto();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setFaculty(user.getFaculty() == null ? null : user.getFaculty().name());
        dto.setRegisteredAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        dto.setActive(tokenStore.hasActiveSessionForEmail(user.getEmail()));
        return dto;
    }

    private Faculty parseFacultyOrDefault(String input) {
        if (input == null || input.isBlank()) {
            return Faculty.IT;
        }

        try {
            return Faculty.valueOf(input.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Faculty.IT;
        }
    }

    private String normalizeRole(String role) {
        String normalized = role == null ? "STUDENT" : role.trim().toUpperCase();
        return "ADMIN".equals(normalized) ? "ADMIN" : "STUDENT";
    }

    private String resolveName(String displayName, String email) {
        if (displayName != null && !displayName.isBlank()) {
            return displayName.trim();
        }

        int atIndex = email.indexOf('@');
        if (atIndex > 0) {
            return email.substring(0, atIndex);
        }
        return "Student";
    }
}
