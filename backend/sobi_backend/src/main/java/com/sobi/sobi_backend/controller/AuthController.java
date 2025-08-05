package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtUtil jwtUtil; // JWT 토큰 처리 유틸리티

    // 리프레시 토큰으로 새로운 액세스 토큰 발급
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshToken(@RequestBody RefreshTokenRequest request) {
        Map<String, Object> response = new HashMap<>();

        try {
            System.out.println("리프레시 토큰 요청 받음: " + request.getRefreshToken().substring(0, 50) + "...");

            // 리프레시 토큰 유효성 검증
            if (!jwtUtil.validateRefreshToken(request.getRefreshToken())) {
                System.out.println("리프레시 토큰 유효성 검증 실패");
                response.put("message", "유효하지 않은 리프레시 토큰입니다.");
                response.put("error", "INVALID_REFRESH_TOKEN");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }

            // 리프레시 토큰에서 사용자 정보 추출
            String userId = jwtUtil.getUserIdFromRefreshToken(request.getRefreshToken());
            Integer customerId = jwtUtil.getCustomerIdFromRefreshToken(request.getRefreshToken());

            System.out.println("리프레시 토큰에서 추출된 정보 - userId: " + userId + ", customerId: " + customerId);

            // 새로운 액세스 토큰 생성
            String newAccessToken = jwtUtil.generateToken(userId, customerId);

            System.out.println("새로운 액세스 토큰 발급 완료");

            // 성공 응답
            response.put("message", "액세스 토큰 갱신 성공");
            response.put("accessToken", newAccessToken);
            response.put("userId", userId);
            response.put("customerId", customerId);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.out.println("리프레시 토큰 처리 중 오류: " + e.getMessage());
            e.printStackTrace();

            response.put("message", "토큰 갱신 처리 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // 리프레시 토큰 요청을 받기 위한 DTO 클래스
    public static class RefreshTokenRequest {
        private String refreshToken; // 리프레시 토큰

        // 기본 생성자
        public RefreshTokenRequest() {}

        // refreshToken 필드의 getter 메서드
        public String getRefreshToken() {
            return refreshToken;
        }

        // refreshToken 필드의 setter 메서드
        public void setRefreshToken(String refreshToken) {
            this.refreshToken = refreshToken;
        }
    }
}