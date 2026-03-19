package com.quizplatform.service;

import com.quizplatform.dto.QuizDto;
import com.quizplatform.model.Faculty;
import com.quizplatform.model.Quiz;
import com.quizplatform.repository.QuizRepository;
import com.quizplatform.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class QuizService {

    private final QuizRepository quizRepository;
    private final UserRepository userRepository;

    public QuizService(QuizRepository quizRepository, UserRepository userRepository) {
        this.quizRepository = quizRepository;
        this.userRepository = userRepository;
    }

    public List<QuizDto> getAllQuizzes() {
        return quizRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<QuizDto> getPublishedQuizzes() {
        return quizRepository.findAllByPublishedTrueOrderByCreatedAtAsc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public Optional<QuizDto> getQuizById(Long id) {
        return quizRepository.findById(id).map(this::toDto);
    }

    public Optional<QuizDto> getPublishedQuizById(Long id) {
        return quizRepository.findByIdAndPublishedTrue(id).map(this::toDto);
    }

    public List<QuizDto> getPublishedQuizzesForStudent(String studentEmail) {
        Faculty faculty = findFacultyOrDefault(studentEmail);
        String studentFaculty = faculty.name();

        return quizRepository.findAllByPublishedTrueOrderByCreatedAtAsc().stream()
            .filter(quiz -> isQuizAllowedForFaculty(quiz, studentFaculty))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public Optional<QuizDto> getPublishedQuizByIdForStudent(String studentEmail, Long quizId) {
        Faculty faculty = findFacultyOrDefault(studentEmail);
        String studentFaculty = faculty.name();

        return quizRepository.findByIdAndPublishedTrue(quizId)
            .filter(quiz -> isQuizAllowedForFaculty(quiz, studentFaculty))
                .map(this::toDto);
    }

    public boolean canStudentAccessPublishedQuiz(String studentEmail, Long quizId) {
        return getPublishedQuizByIdForStudent(studentEmail, quizId).isPresent();
    }

    public QuizDto addQuiz(QuizDto dto) {
        Quiz quiz = new Quiz();
        quiz.setTitle(dto.getTitle());
        quiz.setCategory(resolveModule(dto));
        quiz.setTargetFaculty(resolveTargetFaculty(dto));
        quiz.setExamType(resolveExamType(dto));
        quiz.setTotalMarks(resolveTotalMarks(dto));
        quiz.setQuestionsCount(dto.getQuestions());
        quiz.setDurationMinutes(dto.getMinutes());
        quiz.setScheduledDate(resolveScheduledDate(dto));
        quiz.setUrl(dto.getUrl() != null ? dto.getUrl() : "");
        quiz.setPublished(Boolean.FALSE);
        return toDto(quizRepository.save(quiz));
    }

    public Optional<QuizDto> setPublished(Long id, boolean published) {
        return quizRepository.findById(id)
                .map(quiz -> {
                    quiz.setPublished(published);
                    return toDto(quizRepository.save(quiz));
                });
    }

    public void deleteQuiz(Long id) {
        quizRepository.deleteById(id);
    }

    private QuizDto toDto(Quiz quiz) {
        QuizDto dto = new QuizDto();
        dto.setId(quiz.getId());
        dto.setTitle(quiz.getTitle());
        dto.setModule(quiz.getCategory());
        dto.setTargetFaculty(resolveStoredTargetFaculty(quiz));
        dto.setCategory(quiz.getCategory());
        dto.setExamType(quiz.getExamType() != null ? quiz.getExamType() : "General");
        dto.setTotalMarks(quiz.getTotalMarks() != null ? quiz.getTotalMarks() : 100);
        dto.setQuestions(quiz.getQuestionsCount());
        dto.setMinutes(quiz.getDurationMinutes());
        dto.setScheduledDate(quiz.getScheduledDate() != null ? quiz.getScheduledDate().toString() : null);
        dto.setUrl(quiz.getUrl());
        dto.setPublished(Boolean.TRUE.equals(quiz.getPublished()));
        return dto;
    }

    private String resolveModule(QuizDto dto) {
        String module = dto.getModule() != null ? dto.getModule().trim() : "";
        if (!module.isEmpty()) {
            return module;
        }
        String legacyCategory = dto.getCategory() != null ? dto.getCategory().trim() : "";
        return legacyCategory.isEmpty() ? "General" : legacyCategory;
    }

    private String resolveExamType(QuizDto dto) {
        String examType = dto.getExamType() != null ? dto.getExamType().trim() : "";
        return examType.isEmpty() ? "General" : examType;
    }

    private int resolveTotalMarks(QuizDto dto) {
        return dto.getTotalMarks() > 0 ? dto.getTotalMarks() : 100;
    }

    private LocalDate resolveScheduledDate(QuizDto dto) {
        String raw = dto.getScheduledDate() != null ? dto.getScheduledDate().trim() : "";
        if (raw.isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private String resolveTargetFaculty(QuizDto dto) {
        String raw = dto.getTargetFaculty() == null ? "" : dto.getTargetFaculty().trim().toUpperCase();
        if (raw.isEmpty()) {
            return "ALL";
        }
        if ("ALL".equals(raw)) {
            return "ALL";
        }
        try {
            return Faculty.valueOf(raw).name();
        } catch (IllegalArgumentException ex) {
            return "ALL";
        }
    }

    private Faculty findFacultyOrDefault(String studentEmail) {
        return userRepository.findByEmailIgnoreCase(studentEmail)
                .map(user -> user.getFaculty() == null ? Faculty.IT : user.getFaculty())
                .orElse(Faculty.IT);
    }

    private String resolveStoredTargetFaculty(Quiz quiz) {
        String raw = quiz.getTargetFaculty() == null ? "" : quiz.getTargetFaculty().trim().toUpperCase();
        return raw.isEmpty() ? "ALL" : raw;
    }

    private boolean isQuizAllowedForFaculty(Quiz quiz, String studentFaculty) {
        String targetFaculty = resolveStoredTargetFaculty(quiz);
        return "ALL".equals(targetFaculty) || targetFaculty.equalsIgnoreCase(studentFaculty);
    }
}
