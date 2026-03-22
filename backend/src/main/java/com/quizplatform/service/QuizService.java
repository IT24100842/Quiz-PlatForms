package com.quizplatform.service;

import com.quizplatform.dto.QuizDto;
import com.quizplatform.model.Faculty;
import com.quizplatform.storage.FileStorageService;
import com.quizplatform.storage.FileStorageService.QuizRecord;
import com.quizplatform.storage.FileStorageService.UserRow;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class QuizService {

    private final FileStorageService fileStorageService;

    public QuizService(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    public List<QuizDto> getAllQuizzes() {
        return fileStorageService.readQuizzes().stream()
                .sorted(Comparator.comparing(this::createdAtOrMin))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<QuizDto> getPublishedQuizzes() {
        return fileStorageService.readQuizzes().stream()
                .filter(quiz -> quiz.published)
                .sorted(Comparator.comparing(this::createdAtOrMin))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public Optional<QuizDto> getQuizById(Long id) {
        return findQuizById(id).map(this::toDto);
    }

    public Optional<QuizDto> getPublishedQuizById(Long id) {
        return findQuizById(id).filter(quiz -> quiz.published).map(this::toDto);
    }

    public List<QuizDto> getPublishedQuizzesForStudent(String studentEmail) {
        Faculty faculty = findFacultyOrDefault(studentEmail);
        String studentFacultyId = faculty.name();

        return fileStorageService.readQuizzes().stream()
            .filter(quiz -> quiz.published)
            .filter(quiz -> isQuizAllowedForFaculty(quiz, studentFacultyId))
            .sorted(Comparator.comparing(this::createdAtOrMin))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public Optional<QuizDto> getPublishedQuizByIdForStudent(String studentEmail, Long quizId) {
        Faculty faculty = findFacultyOrDefault(studentEmail);
        String studentFacultyId = faculty.name();

        return findQuizById(quizId)
            .filter(quiz -> quiz.published)
            .filter(quiz -> isQuizAllowedForFaculty(quiz, studentFacultyId))
                .map(this::toDto);
    }

    public boolean canStudentAccessPublishedQuiz(String studentEmail, Long quizId) {
        return getPublishedQuizByIdForStudent(studentEmail, quizId).isPresent();
    }

    public QuizDto addQuiz(QuizDto dto) {
        QuizRecord quiz = new QuizRecord();
        quiz.quizId = fileStorageService.nextQuizId();
        quiz.title = dto.getTitle();
        quiz.category = resolveModule(dto);
        String facultyId = resolveQuizFacultyId(dto);
        quiz.facultyId = facultyId;
        quiz.targetFaculty = facultyId;
        quiz.examType = resolveExamType(dto);
        quiz.totalMarks = resolveTotalMarks(dto);
        quiz.questionsCount = Math.max(dto.getQuestions(), 0);
        quiz.durationMinutes = Math.max(dto.getMinutes(), 0);
        quiz.scheduledDate = resolveScheduledDate(dto);
        quiz.url = dto.getUrl() != null ? dto.getUrl() : "";
        quiz.published = false;
        quiz.createdAt = LocalDateTime.now().toString();
        quiz.module = quiz.category;
        fileStorageService.appendQuiz(quiz);
        return toDto(quiz);
    }

    public Optional<QuizDto> setPublished(Long id, boolean published) {
        List<QuizRecord> quizzes = fileStorageService.readQuizzes();
        for (QuizRecord quiz : quizzes) {
            if (quiz.quizId != null && quiz.quizId.equals(id)) {
                quiz.published = published;
                fileStorageService.overwriteQuizzes(quizzes);
                return Optional.of(toDto(quiz));
            }
        }
        return Optional.empty();
    }

    public void deleteQuiz(Long id) {
        List<QuizRecord> quizzes = fileStorageService.readQuizzes();
        quizzes.removeIf(quiz -> quiz.quizId != null && quiz.quizId.equals(id));
        fileStorageService.overwriteQuizzes(quizzes);
    }

    private QuizDto toDto(QuizRecord quiz) {
        QuizDto dto = new QuizDto();
        dto.setId(quiz.quizId);
        dto.setTitle(quiz.title);
        dto.setModule(quiz.category);
        dto.setFacultyId(resolveStoredFacultyId(quiz));
        dto.setTargetFaculty(resolveStoredFacultyId(quiz));
        dto.setCategory(quiz.category);
        dto.setExamType(quiz.examType != null ? quiz.examType : "General");
        dto.setTotalMarks(quiz.totalMarks > 0 ? quiz.totalMarks : 100);
        dto.setQuestions(Math.max(quiz.questionsCount, 0));
        dto.setMinutes(Math.max(quiz.durationMinutes, 0));
        dto.setScheduledDate(quiz.scheduledDate);
        dto.setUrl(quiz.url);
        dto.setPublished(quiz.published);
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

    private String resolveScheduledDate(QuizDto dto) {
        String raw = dto.getScheduledDate() != null ? dto.getScheduledDate().trim() : "";
        if (raw.isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(raw).toString();
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private String resolveQuizFacultyId(QuizDto dto) {
        String raw = dto.getFacultyId() == null ? "" : dto.getFacultyId().trim().toUpperCase();
        if (raw.isEmpty()) {
            raw = dto.getTargetFaculty() == null ? "" : dto.getTargetFaculty().trim().toUpperCase();
        }
        if (raw.isEmpty()) {
            return "ALL";
        }
        if ("ALL".equals(raw)) {
            return "ALL";
        }
        if ("COMPUTING".equals(raw)) {
            return Faculty.IT.name();
        }
        try {
            return Faculty.valueOf(raw).name();
        } catch (IllegalArgumentException ex) {
            return "ALL";
        }
    }

    private Faculty findFacultyOrDefault(String studentEmail) {
        String target = studentEmail == null ? "" : studentEmail.trim().toLowerCase();
        if (target.isBlank()) {
            return Faculty.IT;
        }

        Optional<UserRow> user = fileStorageService.readUsers().stream()
                .filter(item -> item.getEmail() != null && item.getEmail().trim().equalsIgnoreCase(target))
                .findFirst();

        if (user.isEmpty()) {
            return Faculty.IT;
        }

        String faculty = user.get().getFaculty();
        if (faculty == null || faculty.isBlank()) {
            return Faculty.IT;
        }

        if ("COMPUTING".equalsIgnoreCase(faculty)) {
            return Faculty.IT;
        }

        try {
            return Faculty.valueOf(faculty.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Faculty.IT;
        }
    }

    private String resolveStoredFacultyId(QuizRecord quiz) {
        String raw = quiz.facultyId == null ? "" : quiz.facultyId.trim().toUpperCase();
        if (raw.isEmpty()) {
            raw = quiz.targetFaculty == null ? "" : quiz.targetFaculty.trim().toUpperCase();
        }
        return raw.isEmpty() ? "ALL" : raw;
    }

    private boolean isQuizAllowedForFaculty(QuizRecord quiz, String studentFacultyId) {
        String quizFacultyId = resolveStoredFacultyId(quiz);
        return "ALL".equals(quizFacultyId) || quizFacultyId.equalsIgnoreCase(studentFacultyId);
    }

    private Optional<QuizRecord> findQuizById(Long id) {
        if (id == null) {
            return Optional.empty();
        }

        return fileStorageService.readQuizzes().stream()
                .filter(quiz -> quiz.quizId != null && quiz.quizId.equals(id))
                .findFirst();
    }

    private LocalDateTime createdAtOrMin(QuizRecord quiz) {
        if (quiz.createdAt == null || quiz.createdAt.isBlank()) {
            return LocalDateTime.MIN;
        }
        try {
            return LocalDateTime.parse(quiz.createdAt);
        } catch (DateTimeParseException ex) {
            return LocalDateTime.MIN;
        }
    }
}
