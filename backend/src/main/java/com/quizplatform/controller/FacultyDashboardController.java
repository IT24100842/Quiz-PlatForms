package com.quizplatform.controller;

import com.quizplatform.dto.FacultyDashboardResponse;
import com.quizplatform.service.FacultyDashboardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class FacultyDashboardController {

    private final FacultyDashboardService facultyDashboardService;

    public FacultyDashboardController(FacultyDashboardService facultyDashboardService) {
        this.facultyDashboardService = facultyDashboardService;
    }

    @GetMapping("/modules")
    public ResponseEntity<FacultyDashboardResponse> getModules(
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        FacultyDashboardResponse response = facultyDashboardService.getModulesForLoggedInStudent(token);
        if (!response.isSuccess()) {
            HttpStatus status = "Not authenticated. Please login first.".equals(response.getMessage())
                    ? HttpStatus.UNAUTHORIZED
                    : HttpStatus.FORBIDDEN;
            return ResponseEntity.status(status).body(response);
        }
        return ResponseEntity.ok(response);
    }
}
