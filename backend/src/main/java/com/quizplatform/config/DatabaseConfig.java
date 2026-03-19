package com.quizplatform.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

/**
 * Code-based MySQL DataSource configuration.
 * Active only when the `mysql` Spring profile is selected.
 */
@Configuration
@Profile("mysql")
public class DatabaseConfig {

    @Bean
    @Primary
    public DataSource mysqlDataSource(
            @Value("${spring.datasource.url}") String jdbcUrl,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password,
            @Value("${spring.datasource.driver-class-name}") String driverClassName
    ) {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(jdbcUrl);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        dataSource.setDriverClassName(driverClassName);

        // Conservative pool defaults for local development.
        dataSource.setMaximumPoolSize(10);
        dataSource.setMinimumIdle(2);
        dataSource.setPoolName("quiz-platform-mysql-pool");

        return dataSource;
    }
}
