package com.quizplatform.service;

import com.quizplatform.dto.OptionDto;
import com.quizplatform.dto.QuestionDto;
import com.quizplatform.storage.FileStorageService;
import com.quizplatform.storage.FileStorageService.OptionRecord;
import com.quizplatform.storage.FileStorageService.QuestionRecord;
import com.quizplatform.storage.FileStorageService.QuizRecord;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class QuestionService {

    private final FileStorageService fileStorageService;

    public QuestionService(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    public List<QuestionDto> getByQuiz(Long quizId) {
        return findQuizById(quizId)
                .map(quiz -> quiz.questions.stream()
                        .sorted((a, b) -> Integer.compare(a.questionOrder, b.questionOrder))
                        .map(this::toDto)
                        .collect(Collectors.toList()))
                .orElse(List.of());
    }

    public QuestionDto addQuestion(Long quizId, QuestionDto dto) {
        validateQuestionPayload(dto);

        List<QuizRecord> quizzes = fileStorageService.readQuizzes();
        QuizRecord quiz = findQuizInList(quizzes, quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found: " + quizId));

        int nextOrder = quiz.questions.size() + 1;
        long nextQuestionId = fileStorageService.nextQuestionId();
        long nextOptionId = fileStorageService.nextOptionId();

        QuestionRecord question = new QuestionRecord();
        question.questionId = nextQuestionId;
        question.text = dto.getText().trim();
        question.explanation = normalizeExplanation(dto.getExplanation());
        question.questionType = normalizeQuestionType(dto.getQuestionType());
        question.questionOrder = nextOrder;

        int optionOrder = 1;
        for (OptionDto optionDto : dto.getOptions()) {
            OptionRecord option = new OptionRecord();
            option.optionId = nextOptionId++;
            option.text = optionDto.getText().trim();
            option.correct = optionDto.isCorrect();
            option.optionOrder = optionOrder++;
            question.options.add(option);
        }

        quiz.questions.add(question);
        quiz.questionsCount = quiz.questions.size();
        fileStorageService.overwriteQuizzes(quizzes);

        return toDto(question);
    }

    public QuestionDto updateQuestion(Long quizId, Long questionId, QuestionDto dto) {
        validateQuestionPayload(dto);

        List<QuizRecord> quizzes = fileStorageService.readQuizzes();
        QuizRecord quiz = findQuizInList(quizzes, quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found: " + quizId));

        QuestionRecord question = quiz.questions.stream()
                .filter(item -> item.questionId != null && item.questionId.equals(questionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));

        question.text = dto.getText().trim();
        question.explanation = normalizeExplanation(dto.getExplanation());
        question.questionType = normalizeQuestionType(dto.getQuestionType());

        question.options.clear();
        long nextOptionId = fileStorageService.nextOptionId();
        int optionOrder = 1;
        for (OptionDto optionDto : dto.getOptions()) {
            OptionRecord option = new OptionRecord();
            option.optionId = nextOptionId++;
            option.text = optionDto.getText().trim();
            option.correct = optionDto.isCorrect();
            option.optionOrder = optionOrder++;
            question.options.add(option);
        }

        fileStorageService.overwriteQuizzes(quizzes);
        return toDto(question);
    }

    public void deleteQuestion(Long quizId, Long questionId) {
        List<QuizRecord> quizzes = fileStorageService.readQuizzes();
        QuizRecord quiz = findQuizInList(quizzes, quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found: " + quizId));

        boolean removed = quiz.questions.removeIf(item -> item.questionId != null && item.questionId.equals(questionId));
        if (!removed) {
            throw new IllegalArgumentException("Question not found: " + questionId);
        }

        for (int i = 0; i < quiz.questions.size(); i++) {
            quiz.questions.get(i).questionOrder = i + 1;
        }
        quiz.questionsCount = quiz.questions.size();
        fileStorageService.overwriteQuizzes(quizzes);
    }

    private QuestionDto toDto(QuestionRecord question) {
        QuestionDto dto = new QuestionDto();
        dto.setId(question.questionId);
        dto.setText(question.text);
        dto.setExplanation(question.explanation);
        dto.setQuestionType(question.questionType);
        dto.setQuestionOrder(question.questionOrder);
        List<OptionDto> options = question.options.stream()
                .sorted((a, b) -> Integer.compare(a.optionOrder, b.optionOrder))
                .map(option -> {
                    OptionDto dtoOption = new OptionDto();
                    dtoOption.setId(option.optionId);
                    dtoOption.setText(option.text);
                    dtoOption.setCorrect(option.correct);
                    dtoOption.setOptionOrder(option.optionOrder);
                    return dtoOption;
                })
                .collect(Collectors.toList());
        dto.setOptions(options);
        return dto;
    }

    private void validateQuestionPayload(QuestionDto dto) {
        if (dto == null || dto.getText() == null || dto.getText().trim().isEmpty()) {
            throw new IllegalArgumentException("Question text is required");
        }
        List<OptionDto> options = dto.getOptions();
        if (options == null || options.size() != 5) {
            throw new IllegalArgumentException("Exactly five options are required");
        }
        String questionType = normalizeQuestionType(dto.getQuestionType());
        long correctCount = options.stream().filter(OptionDto::isCorrect).count();
        if ("SINGLE".equals(questionType) && correctCount != 1) {
            throw new IllegalArgumentException("Single-answer MCQ requires exactly one correct option");
        }
        if ("MULTIPLE".equals(questionType) && correctCount < 2) {
            throw new IllegalArgumentException("Multiple-answer MCQ requires at least two correct options");
        }
        boolean hasBlank = options.stream().anyMatch(o -> o.getText() == null || o.getText().trim().isEmpty());
        if (hasBlank) {
            throw new IllegalArgumentException("Option text cannot be blank");
        }
    }

    private String normalizeQuestionType(String rawType) {
        if (rawType == null) {
            return "SINGLE";
        }
        String value = rawType.trim().toUpperCase();
        if ("MULTIPLE".equals(value)) {
            return "MULTIPLE";
        }
        return "SINGLE";
    }

    private String normalizeExplanation(String explanation) {
        if (explanation == null) {
            return null;
        }
        String normalized = explanation.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private Optional<QuizRecord> findQuizById(Long quizId) {
        if (quizId == null) {
            return Optional.empty();
        }
        return fileStorageService.readQuizzes().stream()
                .filter(quiz -> quiz.quizId != null && quiz.quizId.equals(quizId))
                .findFirst();
    }

    private Optional<QuizRecord> findQuizInList(List<QuizRecord> quizzes, Long quizId) {
        if (quizId == null) {
            return Optional.empty();
        }
        return quizzes.stream()
                .filter(quiz -> quiz.quizId != null && quiz.quizId.equals(quizId))
                .findFirst();
    }
}
