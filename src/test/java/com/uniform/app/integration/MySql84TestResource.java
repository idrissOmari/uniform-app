package com.uniform.app.integration;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import java.util.Map;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.utility.DockerImageName;

public class MySql84TestResource implements QuarkusTestResourceLifecycleManager {

    private MySQLContainer<?> mysqlContainer;

    @Override
    public Map<String, String> start() {
        mysqlContainer = new MySQLContainer<>(DockerImageName.parse("mysql:8.4"))
                .withDatabaseName("uniform_test_db")
                .withUsername("uniform_test")
                .withPassword("uniform_test")
                .withCommand(
                        "--character-set-server=utf8mb4",
                        "--collation-server=utf8mb4_0900_ai_ci",
                        "--default-time-zone=+00:00"
                );
        mysqlContainer.start();

        return Map.of(
                "quarkus.datasource.jdbc.url", mysqlContainer.getJdbcUrl() + "?useUnicode=true&characterEncoding=utf8&connectionTimeZone=UTC",
                "quarkus.datasource.username", mysqlContainer.getUsername(),
                "quarkus.datasource.password", mysqlContainer.getPassword(),
                "quarkus.hibernate-orm.database.generation", "validate",
                "quarkus.flyway.migrate-at-start", "true"
        );
    }

    @Override
    public void stop() {
        if (mysqlContainer != null) {
            mysqlContainer.stop();
        }
    }
}
