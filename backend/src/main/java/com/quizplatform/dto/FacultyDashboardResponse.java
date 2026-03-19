package com.quizplatform.dto;

import java.util.ArrayList;
import java.util.List;

public class FacultyDashboardResponse {
    private boolean success;
    private String studentName;
    private String email;
    private String faculty;
    private List<String> modules = new ArrayList<>();
    private String message;

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFaculty() { return faculty; }
    public void setFaculty(String faculty) { this.faculty = faculty; }

    public List<String> getModules() { return modules; }
    public void setModules(List<String> modules) { this.modules = modules; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
