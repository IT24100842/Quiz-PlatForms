package com.quizplatform.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Column(nullable = false, length = 1000)
    private String text;

    @Column(length = 2000)
    private String explanation;

    @Column(name = "question_type", length = 20)
    private String questionType;

    @Column(name = "question_order")
    private int questionOrder;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("optionOrder ASC")
    private List<Option> options = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Quiz getQuiz() { return quiz; }
    public void setQuiz(Quiz quiz) { this.quiz = quiz; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }

    public String getQuestionType() { return questionType; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }

    public int getQuestionOrder() { return questionOrder; }
    public void setQuestionOrder(int questionOrder) { this.questionOrder = questionOrder; }

    public List<Option> getOptions() { return options; }
    public void setOptions(List<Option> options) { this.options = options; }
}
