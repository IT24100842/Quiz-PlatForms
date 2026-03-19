package com.quizplatform.dto;

public class LoginResponse {
    private boolean success;
    private String role;
    private String name;
    private String email;
    private String token;
    private String message;

    public LoginResponse() {}

    public LoginResponse(boolean success, String role, String name, String email, String message) {
        this.success = success;
        this.role = role;
        this.name = name;
        this.email = email;
        this.message = message;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
