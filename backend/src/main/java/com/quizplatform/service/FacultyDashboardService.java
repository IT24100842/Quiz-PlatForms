package com.quizplatform.service;

import com.quizplatform.config.AuthTokenStore;
import com.quizplatform.dto.FacultyDashboardResponse;
import com.quizplatform.model.Faculty;
import com.quizplatform.storage.FileStorageService;
import com.quizplatform.storage.FileStorageService.UserRow;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FacultyDashboardService {

    private final AuthTokenStore tokenStore;
    private final FileStorageService fileStorageService;

    public FacultyDashboardService(AuthTokenStore tokenStore, FileStorageService fileStorageService) {
        this.tokenStore = tokenStore;
        this.fileStorageService = fileStorageService;
    }

    public FacultyDashboardResponse getModulesForLoggedInStudent(String token) {
        FacultyDashboardResponse response = new FacultyDashboardResponse();

        var session = tokenStore.getSession(token);
        if (session == null) {
            response.setSuccess(false);
            response.setMessage("Not authenticated. Please login first.");
            return response;
        }

        if (!"STUDENT".equalsIgnoreCase(session.role())) {
            response.setSuccess(false);
            response.setMessage("Only student accounts can access student dashboard modules.");
            return response;
        }

        Optional<UserRow> optionalUser = fileStorageService.readUsers().stream()
            .filter(user -> user.getEmail() != null && user.getEmail().equalsIgnoreCase(session.email()))
            .findFirst();
        if (optionalUser.isEmpty()) {
            response.setSuccess(false);
            response.setMessage("Student account not found.");
            return response;
        }

        UserRow user = optionalUser.get();
        Faculty faculty = parseFacultyOrDefault(user.getFaculty());

        response.setSuccess(true);
        response.setStudentName(user.getUsername());
        response.setEmail(user.getEmail());
        response.setFaculty(faculty.name());
        response.setModules(modulesForFaculty(faculty));
        response.setMessage("Dashboard modules loaded.");
        return response;
    }

    private List<String> modulesForFaculty(Faculty faculty) {
        return switch (faculty) {
            case IT -> List.of("Programming", "Databases", "AI");
            case BUSINESS -> List.of("Accounting", "Marketing", "Finance");
            case ENGINEERING -> List.of("Mechanics", "Electronics", "Thermodynamics");
            case MEDICINE -> List.of("Anatomy", "Physiology", "Pharmacology");
        };
    }

    private Faculty parseFacultyOrDefault(String raw) {
        if (raw == null || raw.isBlank()) {
            return Faculty.IT;
        }
        if ("COMPUTING".equalsIgnoreCase(raw)) {
            return Faculty.IT;
        }
        try {
            return Faculty.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Faculty.IT;
        }
    }
}
