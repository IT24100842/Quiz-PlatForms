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
import com.quizplatform.storage.FileStorageService;
import com.quizplatform.storage.FileStorageService.UserRow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;
    private final AuthTokenStore tokenStore;
    private final PasswordResetStore passwordResetStore;
    private final EmailService emailService;

    public AuthService(FileStorageService fileStorageService,
                       PasswordEncoder passwordEncoder,
                       AuthTokenStore tokenStore,
                       PasswordResetStore passwordResetStore,
                       EmailService emailService) {
        this.fileStorageService = fileStorageService;
        this.passwordEncoder = passwordEncoder;
        this.tokenStore = tokenStore;
        this.passwordResetStore = passwordResetStore;
        this.emailService = emailService;
    }

    public LoginResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            return new LoginResponse(false, null, null, null, "Email and password are required.");
        }

        Optional<User> optionalUser = findByEmail(request.getEmail().trim());
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
        Faculty userFaculty = user.getFaculty();
        if (userFaculty != null) {
            response.setFaculty(userFaculty.name());
            response.setFacultyId(userFaculty.name());
        }
        return response;
    }

    public LoginResponse registerStudent(RegisterRequest request) {
        String name = request.getName() == null ? "" : request.getName().trim();
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        String password = request.getPassword() == null ? "" : request.getPassword().trim();
        Faculty faculty = parseFacultyNullable(preferredFacultyInput(request.getFacultyId(), request.getFaculty()));

        if (name.isEmpty() || email.isEmpty() || password.isEmpty()) {
            return new LoginResponse(false, null, null, null, "Name, email, and password are required.");
        }

        if (faculty == null) {
            return new LoginResponse(false, null, null, null, "Faculty selection is required for student registration.");
        }

        if (password.length() < 6) {
            return new LoginResponse(false, null, null, null, "Password must be at least 6 characters long.");
        }

        if (findByEmail(email).isPresent()) {
            return new LoginResponse(false, null, null, null, "A user with this email already exists.");
        }

        User student = new User();
        student.setId(fileStorageService.nextUserId());
        student.setName(name);
        student.setEmail(email);
        student.setPasswordHash(passwordEncoder.encode(password));
        student.setRole("STUDENT");
        student.setFaculty(faculty);
        student.setCreatedAt(LocalDateTime.now());
        saveUser(student);

        LoginResponse response = new LoginResponse(true, "STUDENT", student.getName(), student.getEmail(),
            "Registration successful. You can now sign in.");
        response.setFaculty(faculty.name());
        response.setFacultyId(faculty.name());
        return response;
    }

    public LoginResponse loginWithGoogle(String requestedRole, String email, String displayName) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        String normalizedRole = normalizeRole(requestedRole);

        if (normalizedEmail.isBlank()) {
            return new LoginResponse(false, null, null, null, "Google sign-in did not return a valid email address.");
        }

        Optional<User> optionalUser = findByEmail(normalizedEmail);
        User user;

        if (optionalUser.isPresent()) {
            user = optionalUser.get();
            if (!normalizedRole.equalsIgnoreCase(user.getRole())) {
                return new LoginResponse(false, null, null, null,
                        "Access denied. This account is not registered as " + normalizedRole.toLowerCase() + ".");
            }

            if ((user.getName() == null || user.getName().isBlank()) && displayName != null && !displayName.isBlank()) {
                user.setName(displayName.trim());
                user = saveUser(user);
            }
        } else {
            if (!"STUDENT".equals(normalizedRole)) {
                return new LoginResponse(false, null, null, null,
                        "No admin account exists for this Google email. Contact an administrator.");
            }

            User student = new User();
            student.setId(fileStorageService.nextUserId());
            student.setName(resolveName(displayName, normalizedEmail));
            student.setEmail(normalizedEmail);
            // Social sign-ins do not use password auth, but DB column is required.
            student.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            student.setRole("STUDENT");
            student.setFaculty(Faculty.IT);
            student.setCreatedAt(LocalDateTime.now());
            user = saveUser(student);
        }

        String token = tokenStore.createToken(user.getEmail(), user.getRole(), user.getName());
        LoginResponse response = new LoginResponse(true, user.getRole(), user.getName(), user.getEmail(), "Google sign-in successful.");
        response.setToken(token);
        return response;
    }

    public List<StudentDto> getRegisteredStudents() {
        return fileStorageService.readUsers().stream()
            .map(this::toUser)
            .filter(user -> "STUDENT".equalsIgnoreCase(user.getRole()))
            .sorted(Comparator.comparing(User::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toStudentDto)
                .collect(Collectors.toList());
    }

    public StudentDto updateStudentByAdmin(Long id, StudentAdminUpdateRequest request) {
        User user = findById(id)
                .orElseThrow(() -> new NoSuchElementException("Student not found."));

        if (!"STUDENT".equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("Only student accounts can be edited here.");
        }

        String nextName = request == null ? null : request.getName();
        if (nextName != null && !nextName.trim().isEmpty()) {
            user.setName(nextName.trim());
        }

        User saved = saveUser(user);
        return toStudentDto(saved);
    }

    public boolean deleteStudentByAdmin(Long id) {
        Optional<User> optionalUser = findById(id);
        if (optionalUser.isEmpty()) {
            return false;
        }

        User user = optionalUser.get();
        if (!"STUDENT".equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("Only student accounts can be deleted here.");
        }

        tokenStore.expireSessionsForEmail(user.getEmail());
        List<UserRow> users = fileStorageService.readUsers();
        users.removeIf(row -> row.getId() == id);
        fileStorageService.overwriteUsers(users);
        return true;
    }

    public AuthActionResponse requestPasswordReset(ForgotPasswordRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        String role = request.getRole() == null ? "" : request.getRole().trim().toUpperCase();

        if (email.isEmpty() || role.isEmpty()) {
            return new AuthActionResponse(false, "Email and role are required.");
        }

        Optional<User> optionalUser = findByEmail(email);
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

        Optional<User> optionalUser = findByEmail(email);
        if (optionalUser.isEmpty() || !role.equalsIgnoreCase(optionalUser.get().getRole())) {
            return new AuthActionResponse(false, "Invalid reset request.");
        }

        if ("STUDENT".equalsIgnoreCase(role)) {
            Faculty selectedFaculty = parseFacultyNullable(preferredFacultyInput(request.getFacultyId(), request.getFaculty()));
            if (selectedFaculty == null) {
                return new AuthActionResponse(false, "Please select your faculty to reset password.");
            }

            Faculty storedFaculty = optionalUser.get().getFaculty() == null ? Faculty.IT : optionalUser.get().getFaculty();
            if (selectedFaculty != storedFaculty) {
                return new AuthActionResponse(false, "Selected faculty does not match this student account.");
            }
        }

        boolean validCode = passwordResetStore.consumeCode(email, role, code);
        if (!validCode) {
            return new AuthActionResponse(false, "Invalid or expired reset code.");
        }

        User user = optionalUser.get();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        saveUser(user);

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

    private Faculty parseFacultyNullable(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }

        String normalized = input.trim().toUpperCase();
        if ("COMPUTING".equals(normalized)) {
            return Faculty.IT;
        }

        try {
            return Faculty.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String preferredFacultyInput(String facultyId, String faculty) {
        String rawFacultyId = facultyId == null ? "" : facultyId.trim();
        if (!rawFacultyId.isBlank()) {
            return rawFacultyId;
        }
        return faculty == null ? "" : faculty.trim();
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

    private Optional<User> findByEmail(String email) {
        String target = email == null ? "" : email.trim().toLowerCase();
        if (target.isBlank()) {
            return Optional.empty();
        }

        return fileStorageService.readUsers().stream()
                .map(this::toUser)
                .filter(user -> user.getEmail() != null && user.getEmail().trim().equalsIgnoreCase(target))
                .findFirst();
    }

    private Optional<User> findById(Long id) {
        if (id == null) {
            return Optional.empty();
        }

        return fileStorageService.readUsers().stream()
                .filter(row -> row.getId() == id)
                .findFirst()
                .map(this::toUser);
    }

    private User saveUser(User user) {
        if (user.getId() == null || user.getId() <= 0) {
            user.setId(fileStorageService.nextUserId());
        }
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(LocalDateTime.now());
        }

        List<UserRow> users = fileStorageService.readUsers();
        UserRow row = toRow(user);

        int existingIndex = -1;
        for (int i = 0; i < users.size(); i++) {
            if (users.get(i).getId() == user.getId()) {
                existingIndex = i;
                break;
            }
        }

        if (existingIndex >= 0) {
            users.set(existingIndex, row);
            fileStorageService.overwriteUsers(users);
        } else {
            fileStorageService.appendUser(row);
        }

        return user;
    }

    private User toUser(UserRow row) {
        User user = new User();
        user.setId(row.getId());
        user.setName(row.getUsername());
        user.setEmail(row.getEmail());
        user.setPasswordHash(row.getPassword());
        user.setRole(row.getRole());
        user.setFaculty(parseFacultyNullable(row.getFaculty()));
        user.setCreatedAt(parseDateTime(row.getCreatedAt()));
        return user;
    }

    private UserRow toRow(User user) {
        UserRow row = new UserRow();
        row.setId(user.getId() == null ? 0L : user.getId());
        row.setUsername(user.getName());
        row.setEmail(user.getEmail());
        row.setPassword(user.getPasswordHash());
        row.setRole(user.getRole());
        row.setFaculty(user.getFaculty() == null ? "" : user.getFaculty().name());
        row.setCreatedAt((user.getCreatedAt() == null ? LocalDateTime.now() : user.getCreatedAt()).toString());
        return row;
    }

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) {
            return LocalDateTime.now();
        }
        try {
            return LocalDateTime.parse(raw);
        } catch (DateTimeParseException ex) {
            return LocalDateTime.now();
        }
    }
}
