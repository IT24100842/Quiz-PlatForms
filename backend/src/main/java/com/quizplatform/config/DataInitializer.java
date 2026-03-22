package com.quizplatform.config;

import com.quizplatform.model.Faculty;
import com.quizplatform.storage.FileStorageService;
import com.quizplatform.storage.FileStorageService.UserRow;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

/**
 * Seeds default admin and student accounts on first startup.
 */
@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner seedDefaultUsers(FileStorageService fileStorageService, PasswordEncoder passwordEncoder) {
        return args -> {
            if (!fileStorageService.readUsers().isEmpty()) {
                return;
            }

            UserRow admin = new UserRow();
            admin.setId(fileStorageService.nextUserId());
            admin.setUsername("Admin");
            admin.setEmail("admin@quizplatform.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            admin.setFaculty("");
            admin.setCreatedAt(LocalDateTime.now().toString());
            fileStorageService.appendUser(admin);

            UserRow student = new UserRow();
            student.setId(fileStorageService.nextUserId());
            student.setUsername("Student User");
            student.setEmail("student@quizplatform.com");
            student.setPassword(passwordEncoder.encode("student123"));
            student.setRole("STUDENT");
            student.setFaculty(Faculty.IT.name());
            student.setCreatedAt(LocalDateTime.now().toString());
            fileStorageService.appendUser(student);

            System.out.println("-----------------------------------------------");
            System.out.println("Default accounts seeded into users.txt:");
            System.out.println("  Admin   : admin@quizplatform.com   / admin123");
            System.out.println("  Student : student@quizplatform.com / student123");
            System.out.println("  (Change these passwords after first login)");
            System.out.println("-----------------------------------------------");
        };
    }
}
