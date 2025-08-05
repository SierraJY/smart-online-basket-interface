package com.sobi.sobi_backend.controller;

import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class MonitoringController {

    @Autowired
    private DataSource dataSource;

    @GetMapping("/hikari-status")
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