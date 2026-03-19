package com.quizplatform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.mail.provider:smtp}")
    private String mailProvider;

    @Value("${app.mail.from:}")
    private String fromAddress;

    @Value("${app.mail.gmail.client-id:}")
    private String gmailClientId;

    @Value("${app.mail.gmail.client-secret:}")
    private String gmailClientSecret;

    @Value("${app.mail.gmail.refresh-token:}")
    private String gmailRefreshToken;

    @Value("${app.mail.gmail.sender:}")
    private String gmailSender;

    public EmailService(JavaMailSender mailSender, ObjectMapper objectMapper) {
        this.mailSender = mailSender;
        this.objectMapper = objectMapper;
    }

    public boolean isEnabled() {
        return mailEnabled;
    }

    public void sendPasswordResetCode(String toEmail, String role, String resetCode) {
        if (!mailEnabled) {
            throw new IllegalStateException("Mail sending is disabled. Enable app.mail.enabled and configure a mail provider.");
        }

        String subject = "Quiz Platform Password Reset Code";
        String body =
                "Hi,\n\n" +
                "We received a password reset request for your " + role + " account.\n" +
                "Your reset code is: " + resetCode + "\n\n" +
                "This code expires in 10 minutes.\n" +
                "If you did not request this reset, you can ignore this email.\n\n" +
                "- Quiz Platform";

        String provider = (mailProvider == null || mailProvider.isBlank())
            ? "smtp"
            : mailProvider.trim().toLowerCase();

        if ("gmail-api".equals(provider)) {
            sendViaGmailApi(toEmail, subject, body);
            return;
        }

        if ("smtp".equals(provider)) {
            sendViaSmtp(toEmail, subject, body);
            return;
        }

        throw new IllegalStateException("Unsupported mail provider. Use app.mail.provider=smtp or gmail-api.");
    }

    private void sendViaSmtp(String toEmail, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (fromAddress != null && !fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);

        mailSender.send(message);
    }

    private void sendViaGmailApi(String toEmail, String subject, String body) {
        if (isBlank(gmailClientId) || isBlank(gmailClientSecret) || isBlank(gmailRefreshToken) || isBlank(gmailSender)) {
            throw new IllegalStateException("Google Cloud Gmail API is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_SENDER.");
        }

        try {
            String accessToken = fetchAccessToken();
            String rawMessage = buildRawMimeMessage(gmailSender, toEmail, subject, body);
            String payload = objectMapper.writeValueAsString(Map.of("raw", rawMessage));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://gmail.googleapis.com/gmail/v1/users/me/messages/send"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new MailSendException("Gmail API send failed: HTTP " + response.statusCode() + " - " + response.body());
            }
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new MailSendException("Failed to send email via Gmail API.", ex);
        }
    }

    private String fetchAccessToken() throws IOException, InterruptedException {
        String form =
                "client_id=" + encode(gmailClientId) +
                "&client_secret=" + encode(gmailClientSecret) +
                "&refresh_token=" + encode(gmailRefreshToken) +
                "&grant_type=refresh_token";

        HttpRequest tokenRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/token"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

        HttpResponse<String> tokenResponse = httpClient.send(tokenRequest, HttpResponse.BodyHandlers.ofString());
        if (tokenResponse.statusCode() < 200 || tokenResponse.statusCode() >= 300) {
            throw new MailSendException("Google OAuth token request failed: HTTP " + tokenResponse.statusCode() + " - " + tokenResponse.body());
        }

        JsonNode json = objectMapper.readTree(tokenResponse.body());
        JsonNode accessTokenNode = json.get("access_token");
        if (accessTokenNode == null || accessTokenNode.asText().isBlank()) {
            throw new MailSendException("Google OAuth token response missing access_token.");
        }
        return accessTokenNode.asText();
    }

    private String buildRawMimeMessage(String from, String to, String subject, String body) {
        String mime = "From: " + from + "\r\n" +
                "To: " + to + "\r\n" +
                "Subject: " + subject + "\r\n" +
                "MIME-Version: 1.0\r\n" +
                "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
                body;

        return Base64.getUrlEncoder().withoutPadding().encodeToString(mime.getBytes(StandardCharsets.UTF_8));
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
