package com.quizplatform.service;

import com.quizplatform.dto.SubmissionDto;
import com.quizplatform.model.Submission;
import com.quizplatform.repository.SubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SubmissionService {

    private final SubmissionRepository submissionRepository;

    public SubmissionService(SubmissionRepository submissionRepository) {
        this.submissionRepository = submissionRepository;
    }

    public List<SubmissionDto> getAllSubmissions() {
        return submissionRepository.findAllByOrderBySubmittedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<SubmissionDto> getSubmissionsByStudentEmail(String studentEmail) {
        if (studentEmail == null || studentEmail.isBlank()) {
            return List.of();
        }
        return submissionRepository.findByStudentEmailOrderBySubmittedAtDesc(studentEmail).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public SubmissionDto saveSubmission(SubmissionDto dto) {
        Submission submission = new Submission();
        submission.setStudentEmail(dto.getStudentEmail());
        submission.setStudentName(dto.getStudentName());
        submission.setQuizTitle(dto.getQuizTitle() != null ? dto.getQuizTitle() : "Unknown Quiz");
        submission.setScore(dto.getScore());
        submission.setTotal(dto.getTotal());
        return toDto(submissionRepository.save(submission));
    }

    @Transactional
    public void clearAllSubmissions() {
        submissionRepository.deleteAll();
    }

    private SubmissionDto toDto(Submission submission) {
        SubmissionDto dto = new SubmissionDto();
        dto.setId(submission.getId());
        dto.setStudentEmail(submission.getStudentEmail());
        dto.setStudentName(submission.getStudentName());
        dto.setQuizTitle(submission.getQuizTitle());
        dto.setScore(submission.getScore());
        dto.setTotal(submission.getTotal());
        dto.setSubmittedAt(submission.getSubmittedAt() != null
                ? submission.getSubmittedAt().toString()
                : null);
        return dto;
    }
}
