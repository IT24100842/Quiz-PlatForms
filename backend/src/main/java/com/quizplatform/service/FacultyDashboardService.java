package com.quizplatform.service;

import com.quizplatform.config.AuthTokenStore;
import com.quizplatform.dto.FacultyDashboardResponse;
import com.quizplatform.model.Faculty;
import com.quizplatform.model.User;
import com.quizplatform.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FacultyDashboardService {

    private final AuthTokenStore tokenStore;
    private final UserRepository userRepository;

    public FacultyDashboardService(AuthTokenStore tokenStore, UserRepository userRepository) {
        this.tokenStore = tokenStore;
        this.userRepository = userRepository;
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

        Optional<User> optionalUser = userRepository.findByEmailIgnoreCase(session.email());
        if (optionalUser.isEmpty()) {
            response.setSuccess(false);
            response.setMessage("Student account not found.");
            return response;
        }

        User user = optionalUser.get();
        Faculty faculty = user.getFaculty() == null ? Faculty.IT : user.getFaculty();

        response.setSuccess(true);
        response.setStudentName(user.getName());
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
}
