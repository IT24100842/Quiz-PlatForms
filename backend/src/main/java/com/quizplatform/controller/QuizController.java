package com.quizplatform.controller;

import com.quizplatform.config.AuthTokenStore;
import com.quizplatform.dto.QuizDto;
import com.quizplatform.service.QuizService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    private final QuizService quizService;
    private final AuthTokenStore tokenStore;

    public QuizController(QuizService quizService, AuthTokenStore tokenStore) {
        this.quizService = quizService;
        this.tokenStore = tokenStore;
    }

    @GetMapping
    public ResponseEntity<List<QuizDto>> getAll() {
        return ResponseEntity.ok(quizService.getAllQuizzes());
    }

    @GetMapping("/published")
    public ResponseEntity<List<QuizDto>> getPublished() {
        return ResponseEntity.ok(quizService.getPublishedQuizzes());
    }

    @GetMapping("/published/me")
    public ResponseEntity<List<QuizDto>> getPublishedForStudent(
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!"STUDENT".equalsIgnoreCase(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(quizService.getPublishedQuizzesForStudent(session.email()));
    }

    @GetMapping("/published/me/{id}")
    public ResponseEntity<QuizDto> getPublishedOneForStudent(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!"STUDENT".equalsIgnoreCase(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return quizService.getPublishedQuizByIdForStudent(session.email(), id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/published/{id}")
    public ResponseEntity<QuizDto> getPublishedOne(@PathVariable Long id) {
        return quizService.getPublishedQuizById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuizDto> getOne(@PathVariable Long id) {
        return quizService.getQuizById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<QuizDto> create(
            @RequestBody QuizDto dto,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(quizService.addQuiz(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        quizService.deleteQuiz(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<QuizDto> publish(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return quizService.setPublished(id, true)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/unpublish")
    public ResponseEntity<QuizDto> unpublish(
            @PathVariable Long id,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return quizService.setPublished(id, false)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
