package com.quizplatform.repository;

import com.quizplatform.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByQuizIdOrderByQuestionOrderAsc(Long quizId);
    int countByQuizId(Long quizId);
}
