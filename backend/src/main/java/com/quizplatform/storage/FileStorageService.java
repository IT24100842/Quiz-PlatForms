package com.quizplatform.storage;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageService.class);

    private static final String USERS_HEADER = "id,username,email,password,role,faculty,createdAt";
    private static final String RESULTS_HEADER = "id,username,email,quizId,quizTitle,score,total,date";

    private final ObjectMapper objectMapper;
    private final Path usersFile;
    private final Path quizzesFile;
    private final Path resultsFile;

    public FileStorageService(ObjectMapper objectMapper,
                              @Value("${app.storage.users-file:data/users.txt}") String usersFile,
                              @Value("${app.storage.quizzes-file:data/quizzes.txt}") String quizzesFile,
                              @Value("${app.storage.results-file:data/results.txt}") String resultsFile) {
        this.objectMapper = objectMapper;
        this.usersFile = Paths.get(usersFile);
        this.quizzesFile = Paths.get(quizzesFile);
        this.resultsFile = Paths.get(resultsFile);
    }

    @PostConstruct
    public void initializeStorageFiles() {
        try {
            createParentIfNeeded(usersFile);
            createParentIfNeeded(quizzesFile);
            createParentIfNeeded(resultsFile);

            ensureFileWithHeader(usersFile, USERS_HEADER);
            ensureFileExists(quizzesFile);
            ensureFileWithHeader(resultsFile, RESULTS_HEADER);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to initialize file storage.", ex);
        }
    }

    public synchronized List<UserRow> readUsers() {
        try {
            List<String> lines = Files.readAllLines(usersFile, StandardCharsets.UTF_8);
            List<UserRow> users = new ArrayList<>();
            for (String line : lines) {
                if (line == null || line.isBlank() || line.startsWith("id,")) {
                    continue;
                }

                List<String> parts = parseCsvLine(line);
                if (parts.size() < 7) {
                    logger.warn("Skipping malformed user row: {}", line);
                    continue;
                }

                UserRow row = new UserRow();
                row.setId(parseLong(parts.get(0), 0L));
                row.setUsername(parts.get(1));
                row.setEmail(parts.get(2));
                row.setPassword(parts.get(3));
                row.setRole(parts.get(4));
                row.setFaculty(parts.get(5));
                row.setCreatedAt(parts.get(6));
                users.add(row);
            }
            return users;
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to read users file.", ex);
        }
    }

    public synchronized void appendUser(UserRow row) {
        appendLine(usersFile, buildUserCsvLine(row));
    }

    public synchronized void overwriteUsers(List<UserRow> users) {
        StringBuilder builder = new StringBuilder();
        builder.append(USERS_HEADER).append(System.lineSeparator());
        for (UserRow row : users) {
            builder.append(buildUserCsvLine(row)).append(System.lineSeparator());
        }
        writeAll(usersFile, builder.toString());
    }

    public synchronized long nextUserId() {
        return readUsers().stream().mapToLong(UserRow::getId).max().orElse(0L) + 1L;
    }

    public synchronized List<QuizRecord> readQuizzes() {
        try {
            List<String> lines = Files.readAllLines(quizzesFile, StandardCharsets.UTF_8);
            List<QuizRecord> quizzes = new ArrayList<>();
            for (String line : lines) {
                if (line == null || line.isBlank()) {
                    continue;
                }
                try {
                    QuizRecord record = objectMapper.readValue(line, QuizRecord.class);
                    if (record.questions == null) {
                        record.questions = new ArrayList<>();
                    }
                    for (QuestionRecord question : record.questions) {
                        if (question.options == null) {
                            question.options = new ArrayList<>();
                        }
                    }
                    quizzes.add(record);
                } catch (Exception parseEx) {
                    logger.warn("Skipping malformed quiz row: {}", line);
                }
            }
            return quizzes;
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to read quizzes file.", ex);
        }
    }

    public synchronized void appendQuiz(QuizRecord record) {
        try {
            appendLine(quizzesFile, objectMapper.writeValueAsString(record));
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to append quiz.", ex);
        }
    }

    public synchronized void overwriteQuizzes(List<QuizRecord> quizzes) {
        try {
            StringBuilder builder = new StringBuilder();
            for (QuizRecord quiz : quizzes) {
                builder.append(objectMapper.writeValueAsString(quiz)).append(System.lineSeparator());
            }
            writeAll(quizzesFile, builder.toString());
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to overwrite quizzes file.", ex);
        }
    }

    public synchronized long nextQuizId() {
        return readQuizzes().stream().mapToLong(quiz -> safeLong(quiz.quizId)).max().orElse(0L) + 1L;
    }

    public synchronized long nextQuestionId() {
        long max = 0L;
        for (QuizRecord quiz : readQuizzes()) {
            for (QuestionRecord question : nullSafe(quiz.questions)) {
                max = Math.max(max, safeLong(question.questionId));
            }
        }
        return max + 1L;
    }

    public synchronized long nextOptionId() {
        long max = 0L;
        for (QuizRecord quiz : readQuizzes()) {
            for (QuestionRecord question : nullSafe(quiz.questions)) {
                for (OptionRecord option : nullSafe(question.options)) {
                    max = Math.max(max, safeLong(option.optionId));
                }
            }
        }
        return max + 1L;
    }

    public synchronized List<ResultRow> readResults() {
        try {
            List<String> lines = Files.readAllLines(resultsFile, StandardCharsets.UTF_8);
            List<ResultRow> results = new ArrayList<>();
            for (String line : lines) {
                if (line == null || line.isBlank() || line.startsWith("id,")) {
                    continue;
                }

                List<String> parts = parseCsvLine(line);
                if (parts.size() < 8) {
                    logger.warn("Skipping malformed result row: {}", line);
                    continue;
                }

                ResultRow row = new ResultRow();
                row.setId(parseLong(parts.get(0), 0L));
                row.setUsername(parts.get(1));
                row.setEmail(parts.get(2));
                row.setQuizId(parseLong(parts.get(3), 0L));
                row.setQuizTitle(parts.get(4));
                row.setScore(parseInt(parts.get(5), 0));
                row.setTotal(parseInt(parts.get(6), 0));
                row.setDate(parts.get(7));
                results.add(row);
            }
            return results;
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to read results file.", ex);
        }
    }

    public synchronized void appendResult(ResultRow row) {
        appendLine(resultsFile, buildResultCsvLine(row));
    }

    public synchronized void overwriteResults(List<ResultRow> rows) {
        StringBuilder builder = new StringBuilder();
        builder.append(RESULTS_HEADER).append(System.lineSeparator());
        for (ResultRow row : rows) {
            builder.append(buildResultCsvLine(row)).append(System.lineSeparator());
        }
        writeAll(resultsFile, builder.toString());
    }

    public synchronized long nextResultId() {
        return readResults().stream().mapToLong(ResultRow::getId).max().orElse(0L) + 1L;
    }

    private void createParentIfNeeded(Path path) throws IOException {
        Path parent = path.toAbsolutePath().getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
    }

    private void ensureFileWithHeader(Path file, String header) throws IOException {
        if (!Files.exists(file)) {
            Files.writeString(file, header + System.lineSeparator(), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        }
    }

    private void ensureFileExists(Path file) throws IOException {
        if (!Files.exists(file)) {
            Files.writeString(file, "", StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        }
    }

    private void appendLine(Path file, String line) {
        try {
            Files.writeString(file, line + System.lineSeparator(), StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to write data to " + file + ".", ex);
        }
    }

    private void writeAll(Path file, String content) {
        try {
            Files.writeString(file, content, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to overwrite data in " + file + ".", ex);
        }
    }

    private String buildUserCsvLine(UserRow row) {
        return toCsvLine(List.of(
                String.valueOf(row.getId()),
                safeString(row.getUsername()),
                safeString(row.getEmail()),
                safeString(row.getPassword()),
                safeString(row.getRole()),
                safeString(row.getFaculty()),
                safeString(row.getCreatedAt())
        ));
    }

    private String buildResultCsvLine(ResultRow row) {
        return toCsvLine(List.of(
                String.valueOf(row.getId()),
                safeString(row.getUsername()),
                safeString(row.getEmail()),
                String.valueOf(row.getQuizId()),
                safeString(row.getQuizTitle()),
                String.valueOf(row.getScore()),
                String.valueOf(row.getTotal()),
                safeString(row.getDate())
        ));
    }

    private String toCsvLine(List<String> parts) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < parts.size(); i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(escapeCsv(parts.get(i)));
        }
        return builder.toString();
    }

    private String escapeCsv(String raw) {
        String value = raw == null ? "" : raw;
        boolean needsQuotes = value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r");
        if (!needsQuotes) {
            return value;
        }
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private List<String> parseCsvLine(String line) {
        if (line == null || line.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch == ',' && !inQuotes) {
                fields.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }

        fields.add(current.toString());
        return fields;
    }

    private long parseLong(String raw, long fallback) {
        try {
            return Long.parseLong(raw.trim());
        } catch (Exception ex) {
            return fallback;
        }
    }

    private int parseInt(String raw, int fallback) {
        try {
            return Integer.parseInt(raw.trim());
        } catch (Exception ex) {
            return fallback;
        }
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private String safeString(String value) {
        return value == null ? "" : value;
    }

    private <T> List<T> nullSafe(List<T> input) {
        return input == null ? List.of() : input;
    }

    public static class UserRow {
        private long id;
        private String username;
        private String email;
        private String password;
        private String role;
        private String faculty;
        private String createdAt;

        public long getId() {
            return id;
        }

        public void setId(long id) {
            this.id = id;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getFaculty() {
            return faculty;
        }

        public void setFaculty(String faculty) {
            this.faculty = faculty;
        }

        public String getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(String createdAt) {
            this.createdAt = createdAt;
        }
    }

    public static class ResultRow {
        private long id;
        private String username;
        private String email;
        private long quizId;
        private String quizTitle;
        private int score;
        private int total;
        private String date;

        public long getId() {
            return id;
        }

        public void setId(long id) {
            this.id = id;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public long getQuizId() {
            return quizId;
        }

        public void setQuizId(long quizId) {
            this.quizId = quizId;
        }

        public String getQuizTitle() {
            return quizTitle;
        }

        public void setQuizTitle(String quizTitle) {
            this.quizTitle = quizTitle;
        }

        public int getScore() {
            return score;
        }

        public void setScore(int score) {
            this.score = score;
        }

        public int getTotal() {
            return total;
        }

        public void setTotal(int total) {
            this.total = total;
        }

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }
    }

    public static class QuizRecord {
        public Long quizId;
        public String title;
        public String module;
        public String facultyId;
        public String targetFaculty;
        public String category;
        public String examType;
        public int totalMarks;
        public int questionsCount;
        public int durationMinutes;
        public String scheduledDate;
        public String url;
        public boolean published;
        public String createdAt;
        public List<QuestionRecord> questions = new ArrayList<>();
    }

    public static class QuestionRecord {
        public Long questionId;
        public String text;
        public String explanation;
        public String questionType;
        public int questionOrder;
        public List<OptionRecord> options = new ArrayList<>();
    }

    public static class OptionRecord {
        public Long optionId;
        public String text;
        public boolean correct;
        public int optionOrder;
    }
}
