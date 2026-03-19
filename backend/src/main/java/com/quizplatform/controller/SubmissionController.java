package com.quizplatform.controller;

import com.quizplatform.config.AuthTokenStore;
import com.quizplatform.dto.SubmissionDto;
import com.quizplatform.service.SubmissionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionService submissionService;
    private final AuthTokenStore tokenStore;

    public SubmissionController(SubmissionService submissionService, AuthTokenStore tokenStore) {
        this.submissionService = submissionService;
        this.tokenStore = tokenStore;
    }

    /** Admin only – view all submissions */
    @GetMapping
    public ResponseEntity<List<SubmissionDto>> getAll(
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(submissionService.getAllSubmissions());
    }

    /** Student – submit a quiz result */
    @PostMapping
    public ResponseEntity<SubmissionDto> submit(
            @RequestBody SubmissionDto dto,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session != null) {
            dto.setStudentEmail(session.email());
            dto.setStudentName(session.name());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(submissionService.saveSubmission(dto));
    }

    /** Student – view own submissions */
    @GetMapping("/me")
    public ResponseEntity<List<SubmissionDto>> getMine(
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(submissionService.getSubmissionsByStudentEmail(session.email()));
    }

    /** Admin only – clear all submissions */
    @DeleteMapping
    public ResponseEntity<Void> clearAll(
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        submissionService.clearAllSubmissions();
        return ResponseEntity.noContent().build();
    }
}
