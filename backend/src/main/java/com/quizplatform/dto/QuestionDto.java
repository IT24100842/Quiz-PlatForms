package com.quizplatform.dto;

import java.util.List;

public class QuestionDto {
    private Long id;
    private String text;
    private String explanation;
    private String questionType;
    private int questionOrder;
    private List<OptionDto> options;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }

    public String getQuestionType() { return questionType; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }

    public int getQuestionOrder() { return questionOrder; }
    public void setQuestionOrder(int questionOrder) { this.questionOrder = questionOrder; }

    public List<OptionDto> getOptions() { return options; }
    public void setOptions(List<OptionDto> options) { this.options = options; }
}
