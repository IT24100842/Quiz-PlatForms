package com.quizplatform.repository;

import com.quizplatform.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
    List<Quiz> findAllByOrderByCreatedAtAsc();
    List<Quiz> findAllByPublishedTrueOrderByCreatedAtAsc();
    java.util.Optional<Quiz> findByIdAndPublishedTrue(Long id);
}
