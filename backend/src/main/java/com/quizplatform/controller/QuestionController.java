package com.quizplatform.controller;

import com.quizplatform.config.AuthTokenStore;
import com.quizplatform.dto.QuestionDto;
import com.quizplatform.service.QuestionService;
import com.quizplatform.service.QuizService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quizzes/{quizId}/questions")
public class QuestionController {

    private final QuestionService questionService;
    private final QuizService quizService;
    private final AuthTokenStore tokenStore;

    public QuestionController(QuestionService questionService, QuizService quizService, AuthTokenStore tokenStore) {
        this.questionService = questionService;
        this.quizService = quizService;
        this.tokenStore = tokenStore;
    }

    /**
     * Protected:
     * - ADMIN can access any quiz questions.
     * - STUDENT can access only published quizzes that match their faculty modules.
     */
    @GetMapping
    public ResponseEntity<List<QuestionDto>> getAll(
            @PathVariable Long quizId,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if ("ADMIN".equalsIgnoreCase(session.role())) {
            return ResponseEntity.ok(questionService.getByQuiz(quizId));
        }
        if ("STUDENT".equalsIgnoreCase(session.role())) {
            if (!quizService.canStudentAccessPublishedQuiz(session.email(), quizId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            return ResponseEntity.ok(questionService.getByQuiz(quizId));
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @PostMapping
    public ResponseEntity<QuestionDto> create(
            @PathVariable Long quizId,
            @RequestBody QuestionDto dto,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(questionService.addQuestion(quizId, dto));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PutMapping("/{questionId}")
    public ResponseEntity<QuestionDto> update(
            @PathVariable Long quizId,
            @PathVariable Long questionId,
            @RequestBody QuestionDto dto,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.ok(questionService.updateQuestion(quizId, questionId, dto));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @DeleteMapping("/{questionId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long quizId,
            @PathVariable Long questionId,
            @RequestHeader(value = "X-Auth-Token", required = false) String token) {
        var session = tokenStore.getSession(token);
        if (session == null || !"ADMIN".equals(session.role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            questionService.deleteQuestion(quizId, questionId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
}
