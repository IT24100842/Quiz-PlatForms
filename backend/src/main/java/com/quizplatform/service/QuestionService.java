package com.quizplatform.service;

import com.quizplatform.dto.OptionDto;
import com.quizplatform.dto.QuestionDto;
import com.quizplatform.model.Option;
import com.quizplatform.model.Question;
import com.quizplatform.model.Quiz;
import com.quizplatform.repository.QuestionRepository;
import com.quizplatform.repository.QuizRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final QuizRepository quizRepository;

    public QuestionService(QuestionRepository questionRepository, QuizRepository quizRepository) {
        this.questionRepository = questionRepository;
        this.quizRepository = quizRepository;
    }

    public List<QuestionDto> getByQuiz(Long quizId) {
        return questionRepository.findByQuizIdOrderByQuestionOrderAsc(quizId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public QuestionDto addQuestion(Long quizId, QuestionDto dto) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found: " + quizId));

        validateQuestionPayload(dto);

        int nextOrder = questionRepository.countByQuizId(quizId) + 1;

        Question q = new Question();
        q.setQuiz(quiz);
        q.setText(dto.getText().trim());
        q.setExplanation(normalizeExplanation(dto.getExplanation()));
        q.setQuestionType(normalizeQuestionType(dto.getQuestionType()));
        q.setQuestionOrder(nextOrder);

        int idx = 1;
        for (OptionDto odto : dto.getOptions()) {
            Option o = new Option();
            o.setQuestion(q);
            o.setText(odto.getText().trim());
            o.setCorrect(odto.isCorrect());
            o.setOptionOrder(idx++);
            q.getOptions().add(o);
        }

        // Keep questionsCount in sync
        quiz.setQuestionsCount(nextOrder);
        quizRepository.save(quiz);

        return toDto(questionRepository.save(q));
    }

    @Transactional
    public QuestionDto updateQuestion(Long quizId, Long questionId, QuestionDto dto) {
        Question q = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));
        if (!q.getQuiz().getId().equals(quizId)) {
            throw new IllegalArgumentException("Question does not belong to quiz");
        }

        validateQuestionPayload(dto);

        q.setText(dto.getText().trim());
        q.setExplanation(normalizeExplanation(dto.getExplanation()));
        q.setQuestionType(normalizeQuestionType(dto.getQuestionType()));

        // Replace options
        q.getOptions().clear();
        int idx = 1;
        for (OptionDto odto : dto.getOptions()) {
            Option o = new Option();
            o.setQuestion(q);
            o.setText(odto.getText().trim());
            o.setCorrect(odto.isCorrect());
            o.setOptionOrder(idx++);
            q.getOptions().add(o);
        }

        return toDto(questionRepository.save(q));
    }

    @Transactional
    public void deleteQuestion(Long quizId, Long questionId) {
        Question q = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));
        if (!q.getQuiz().getId().equals(quizId)) {
            throw new IllegalArgumentException("Question does not belong to quiz");
        }
        Quiz quiz = q.getQuiz();
        questionRepository.delete(q);

        // Renumber remaining questions
        List<Question> remaining = questionRepository.findByQuizIdOrderByQuestionOrderAsc(quizId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setQuestionOrder(i + 1);
        }
        questionRepository.saveAll(remaining);

        // Update quiz question count
        quiz.setQuestionsCount(remaining.size());
        quizRepository.save(quiz);
    }

    private QuestionDto toDto(Question q) {
        QuestionDto dto = new QuestionDto();
        dto.setId(q.getId());
        dto.setText(q.getText());
        dto.setExplanation(q.getExplanation());
        dto.setQuestionType(q.getQuestionType());
        dto.setQuestionOrder(q.getQuestionOrder());
        List<OptionDto> opts = q.getOptions().stream().map(o -> {
            OptionDto od = new OptionDto();
            od.setId(o.getId());
            od.setText(o.getText());
            od.setCorrect(o.isCorrect());
            od.setOptionOrder(o.getOptionOrder());
            return od;
        }).collect(Collectors.toList());
        dto.setOptions(opts);
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
}
