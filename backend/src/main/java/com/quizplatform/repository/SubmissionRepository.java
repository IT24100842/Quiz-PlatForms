package com.quizplatform.repository;

import com.quizplatform.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findAllByOrderBySubmittedAtDesc();
    List<Submission> findByStudentEmailOrderBySubmittedAtDesc(String studentEmail);
}
