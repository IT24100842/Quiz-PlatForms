package com.quizplatform.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quizzes")
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(name = "faculty_id", length = 30)
    private String facultyId;

    @Column(name = "target_faculty", length = 30)
    private String targetFaculty;

    @Column(name = "questions_count")
    private int questionsCount;

    @Column(name = "duration_minutes")
    private int durationMinutes;

    @Column(name = "exam_type", length = 80)
    private String examType;

    @Column(name = "total_marks")
    private Integer totalMarks;

    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;

    @Column(length = 500)
    private String url;

    @Column(name = "is_published")
    private Boolean published;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Question> questions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (published == null) {
            published = Boolean.FALSE;
        }
        if (facultyId == null || facultyId.isBlank()) {
            facultyId = targetFaculty;
        }
        if (targetFaculty == null || targetFaculty.isBlank()) {
            targetFaculty = "ALL";
        }
        if (facultyId == null || facultyId.isBlank()) {
            facultyId = "ALL";
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getFacultyId() { return facultyId; }
    public void setFacultyId(String facultyId) { this.facultyId = facultyId; }

    public String getTargetFaculty() { return targetFaculty; }
    public void setTargetFaculty(String targetFaculty) { this.targetFaculty = targetFaculty; }

    public int getQuestionsCount() { return questionsCount; }
    public void setQuestionsCount(int questionsCount) { this.questionsCount = questionsCount; }

    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getExamType() { return examType; }
    public void setExamType(String examType) { this.examType = examType; }

    public Integer getTotalMarks() { return totalMarks; }
    public void setTotalMarks(Integer totalMarks) { this.totalMarks = totalMarks; }

    public LocalDate getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDate scheduledDate) { this.scheduledDate = scheduledDate; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public Boolean getPublished() { return published; }
    public void setPublished(Boolean published) { this.published = published; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<Question> getQuestions() { return questions; }
    public void setQuestions(List<Question> questions) { this.questions = questions; }
}
