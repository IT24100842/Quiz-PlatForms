package com.quizplatform.dto;

import java.util.List;

public class OptionDto {
    private Long id;
    private String text;
    private boolean correct;
    private int optionOrder;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public boolean isCorrect() { return correct; }
    public void setCorrect(boolean correct) { this.correct = correct; }

    public int getOptionOrder() { return optionOrder; }
    public void setOptionOrder(int optionOrder) { this.optionOrder = optionOrder; }
}
