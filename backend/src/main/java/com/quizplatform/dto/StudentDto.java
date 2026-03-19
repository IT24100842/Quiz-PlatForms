package com.quizplatform.dto;

public class StudentDto {
    private Long id;
    private String name;
    private String email;
    private String faculty;
    private String registeredAt;
    private boolean active;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFaculty() { return faculty; }
    public void setFaculty(String faculty) { this.faculty = faculty; }

    public String getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(String registeredAt) { this.registeredAt = registeredAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
