package com.sobi.sobi_backend.controller;

import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "9. Monitoring", description = "시스템 모니터링 API")
public class MonitoringController {

    @Autowired
    private DataSource dataSource;

    @GetMapping("/hikari-status")
    @Operation(
            summary = "HikariCP 커넥션 풀 상태 조회",
            description = "데이터베이스 커넥션 풀의 현재 상태를 조회합니다. 활성/유휴/전체 커넥션 수와 대기 중인 스레드 수를 확인할 수 있습니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "커넥션 풀 상태 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "active": 3,
                      "idle": 7,
                      "total": 10,
                      "waiting": 0,
                      "timestamp": 1703923200000
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "200",
                    description = "HikariCP가 아닌 경우",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "Not HikariCP"
                    }
                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
    public ResponseEntity<?> getHikariStatus() {
        if (dataSource instanceof HikariDataSource) {
            HikariDataSource ds = (HikariDataSource) dataSource;
            HikariPoolMXBean pool = ds.getHikariPoolMXBean();

            Map<String, Object> status = new HashMap<>();
            status.put("active", pool.getActiveConnections());
            status.put("idle", pool.getIdleConnections());
            status.put("total", pool.getTotalConnections());
            status.put("waiting", pool.getThreadsAwaitingConnection());
            status.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(status);
        }
        return ResponseEntity.ok(Map.of("error", "Not HikariCP"));
    }
}