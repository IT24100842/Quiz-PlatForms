package com.quizplatform.config;

import com.quizplatform.model.Faculty;
import com.quizplatform.model.User;
import com.quizplatform.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Seeds default admin and student accounts on first startup
 * (only when the users table is empty).
 */
@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner seedDefaultUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.count() > 0) {
                return; // Skip – users already exist
            }

            User admin = new User();
            admin.setName("Admin");
            admin.setEmail("admin@quizplatform.com");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            userRepository.save(admin);

            User student = new User();
            student.setName("Student User");
            student.setEmail("student@quizplatform.com");
            student.setPasswordHash(passwordEncoder.encode("student123"));
            student.setRole("STUDENT");
            student.setFaculty(Faculty.IT);
            userRepository.save(student);

            System.out.println("-----------------------------------------------");
            System.out.println("Default accounts seeded into the database:");
            System.out.println("  Admin   : admin@quizplatform.com   / admin123");
            System.out.println("  Student : student@quizplatform.com / student123");
            System.out.println("  (Change these passwords after first login)");
            System.out.println("-----------------------------------------------");
        };
    }
}
