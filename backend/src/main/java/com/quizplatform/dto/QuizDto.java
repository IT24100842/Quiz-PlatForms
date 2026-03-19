package com.quizplatform.dto;

public class QuizDto {
    private Long id;
    private String title;
    private String module;
    private String targetFaculty;
    private String category;
    private String examType;
    private int totalMarks;
    private int questions;
    private int minutes;
    private String scheduledDate;
    private String url;
    private boolean published;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public String getTargetFaculty() { return targetFaculty; }
    public void setTargetFaculty(String targetFaculty) { this.targetFaculty = targetFaculty; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getExamType() { return examType; }
    public void setExamType(String examType) { this.examType = examType; }

    public int getTotalMarks() { return totalMarks; }
    public void setTotalMarks(int totalMarks) { this.totalMarks = totalMarks; }

    public int getQuestions() { return questions; }
    public void setQuestions(int questions) { this.questions = questions; }

    public int getMinutes() { return minutes; }
    public void setMinutes(int minutes) { this.minutes = minutes; }

    public String getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(String scheduledDate) { this.scheduledDate = scheduledDate; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public boolean isPublished() { return published; }
    public void setPublished(boolean published) { this.published = published; }
}
