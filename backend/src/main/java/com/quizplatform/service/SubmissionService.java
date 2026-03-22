package com.quizplatform.service;

import com.quizplatform.dto.SubmissionDto;
import com.quizplatform.dto.SubmissionReportDto;
import com.quizplatform.storage.FileStorageService;
import com.quizplatform.storage.FileStorageService.ResultRow;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SubmissionService {

    private final FileStorageService fileStorageService;

    public SubmissionService(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    public List<SubmissionDto> getAllSubmissions() {
        return fileStorageService.readResults().stream()
                .sorted(Comparator.comparing(this::dateOrMin).reversed())
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<SubmissionDto> getSubmissionsByStudentEmail(String studentEmail) {
        if (studentEmail == null || studentEmail.isBlank()) {
            return List.of();
        }
        return fileStorageService.readResults().stream()
                .filter(row -> row.getEmail() != null && row.getEmail().equalsIgnoreCase(studentEmail.trim()))
                .sorted(Comparator.comparing(this::dateOrMin).reversed())
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public SubmissionDto saveSubmission(SubmissionDto dto) {
        ResultRow row = new ResultRow();
        row.setId(fileStorageService.nextResultId());
        row.setUsername(dto.getStudentName());
        row.setEmail(dto.getStudentEmail());
        row.setQuizId(dto.getQuizId() == null ? 0L : dto.getQuizId());
        row.setQuizTitle(dto.getQuizTitle() != null ? dto.getQuizTitle() : "Unknown Quiz");
        row.setScore(dto.getScore());
        row.setTotal(dto.getTotal());
        row.setDate(LocalDateTime.now().toString());
        fileStorageService.appendResult(row);
        return toDto(row);
    }

    public void clearAllSubmissions() {
        fileStorageService.overwriteResults(List.of());
    }

    public SubmissionReportDto getSummaryReport() {
        List<ResultRow> rows = fileStorageService.readResults();

        SubmissionReportDto report = new SubmissionReportDto();
        report.setAttempts(rows.size());

        if (rows.isEmpty()) {
            report.setAverageScore(0.0);
            report.setHighestScore(0);
            return report;
        }

        int totalScore = rows.stream().mapToInt(ResultRow::getScore).sum();
        int highest = rows.stream().mapToInt(ResultRow::getScore).max().orElse(0);
        report.setAverageScore((double) totalScore / rows.size());
        report.setHighestScore(highest);
        return report;
    }

    private SubmissionDto toDto(ResultRow submission) {
        SubmissionDto dto = new SubmissionDto();
        dto.setId(submission.getId());
        dto.setStudentEmail(submission.getEmail());
        dto.setStudentName(submission.getUsername());
        dto.setQuizId(submission.getQuizId());
        dto.setQuizTitle(submission.getQuizTitle());
        dto.setScore(submission.getScore());
        dto.setTotal(submission.getTotal());
        dto.setSubmittedAt(submission.getDate());
        return dto;
    }

    private LocalDateTime dateOrMin(ResultRow row) {
        if (row.getDate() == null || row.getDate().isBlank()) {
            return LocalDateTime.MIN;
        }
        try {
            return LocalDateTime.parse(row.getDate());
        } catch (DateTimeParseException ex) {
            return LocalDateTime.MIN;
        }
    }
}
