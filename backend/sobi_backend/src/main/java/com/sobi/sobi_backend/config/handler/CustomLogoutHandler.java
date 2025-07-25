package com.sobi.sobi_backend.config.handler;

import com.sobi.sobi_backend.service.TokenBlackListService;
import com.sobi.sobi_backend.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT 토큰 기반 로그아웃 처리 핸들러
 *
 * 기능:
 * 1. Authorization 헤더에서 JWT 토큰 추출
 * 2. 토큰을 블랙리스트에 추가하여 무효화
 * 3. 토큰 만료 시간까지 TTL 설정
 * 4. 모든 예외를 내부에서 처리하여 안전한 로그아웃 보장
 */
@Component
public class CustomLogoutHandler implements LogoutHandler {

    @Autowired
    private TokenBlackListService tokenBlackListService;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * 로그아웃 처리 메인 로직
     *
     * @param request HTTP 요청 (Authorization 헤더에서 토큰 추출)
     * @param response HTTP 응답 (JSON 형태로 결과 반환)
     * @param authentication 현재 인증 정보 (사용하지 않음)
     */
    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        System.out.println("=== 로그아웃 처리 시작 ===");

        // [STEP1] Authorization 헤더에서 토큰 추출
        String authorizationHeader = request.getHeader("Authorization");

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            // [STEP2] "Bearer " 제거하고 실제 JWT 토큰 추출
            String token = authorizationHeader.substring(7);
            System.out.println("로그아웃 토큰 추출 완료: " + token.substring(0, Math.min(token.length(), 30)) + "...");

            // [STEP3] 토큰 유효성 확인 (이미 무효한 토큰인지 체크)
            if (jwtUtil.validateToken(token)) {

                // [STEP4] 토큰이 이미 블랙리스트에 있는지 확인
                if (!tokenBlackListService.isTokenBlacklisted(token)) {

                    // [STEP5] 토큰에서 만료 시간 추출
                    // JwtUtil에 getExpirationFromToken 메서드 필요 (추가 구현 필요)
                    long expirationTime = getTokenExpiration(token);

                    // [STEP6] 블랙리스트에 토큰 추가 (TTL 자동 설정)
                    tokenBlackListService.addTokenToBlacklist(token, expirationTime);

                    System.out.println("토큰 블랙리스트 추가 완료 - 로그아웃 성공");
                    sendSuccessResponse(response, "로그아웃이 완료되었습니다.");

                } else {
                    System.out.println("이미 블랙리스트에 있는 토큰 - 로그아웃 완료");
                    sendSuccessResponse(response, "이미 로그아웃된 토큰입니다.");
                }

            } else {
                System.out.println("유효하지 않은 토큰으로 로그아웃 시도");
                sendSuccessResponse(response, "로그아웃이 완료되었습니다."); // 보안상 동일한 응답
            }

        } else {
            // [STEP2-2] Authorization 헤더가 없거나 Bearer 형식이 아닌 경우
            System.out.println("Authorization 헤더가 없거나 잘못된 형식");
            sendErrorResponse(response, "로그아웃 처리 중 문제가 발생했습니다.");
        }

        System.out.println("=== 로그아웃 처리 완료 ===");
    }

    /**
     * 토큰에서 만료 시간 추출
     * JwtUtil에 해당 메서드가 없으므로 임시로 구현
     *
     * @param token JWT 토큰
     * @return Unix timestamp (초 단위)
     */
    private long getTokenExpiration(String token) {
        try {
            // TODO: JwtUtil에 getExpirationFromToken 메서드 추가 필요
            // 임시로 현재 시간 + 1시간으로 설정 (Access Token 기본 만료 시간)
            return System.currentTimeMillis() / 1000 + 3600; // 1시간 후
        } catch (Exception e) {
            // 토큰 파싱 실패 시 1시간 후로 설정
            System.err.println("토큰 만료 시간 추출 실패, 기본값 사용: " + e.getMessage());
            return System.currentTimeMillis() / 1000 + 3600;
        }
    }

    /**
     * 성공 응답 JSON 전송 (IOException 내부 처리)
     * LogoutHandler는 예외를 throw하지 않아야 하므로 내부에서 모든 예외 처리
     */
    private void sendSuccessResponse(HttpServletResponse response, String message) {
        try {
            Map<String, Object> result = new HashMap<>();
            result.put("message", message);
            result.put("success", true);

            sendJsonResponse(response, HttpServletResponse.SC_OK, result);
        } catch (IOException e) {
            // 응답 전송 실패해도 로그아웃은 성공으로 처리 (토큰은 이미 무효화됨)
            System.err.println("로그아웃 성공 응답 전송 실패: " + e.getMessage());
            // 로그아웃 프로세스 자체는 성공으로 간주하고 계속 진행
        }
    }

    /**
     * 오류 응답 JSON 전송 (IOException 내부 처리)
     * LogoutHandler는 예외를 throw하지 않아야 하므로 내부에서 모든 예외 처리
     */
    private void sendErrorResponse(HttpServletResponse response, String message) {
        try {
            Map<String, Object> result = new HashMap<>();
            result.put("message", message);
            result.put("success", false);

            sendJsonResponse(response, HttpServletResponse.SC_BAD_REQUEST, result);
        } catch (IOException e) {
            // 응답 전송 실패 시 로그만 남기고 계속 진행
            System.err.println("로그아웃 오류 응답 전송 실패: " + e.getMessage());
            // 로그아웃 프로세스 자체는 계속 진행
        }
    }

    /**
     * JSON 응답 전송 공통 메서드 (IOException throws 유지)
     * private 메서드이므로 호출하는 곳에서 try-catch로 처리
     */
    private void sendJsonResponse(HttpServletResponse response, int status, Map<String, Object> data) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");

        ObjectMapper objectMapper = new ObjectMapper();
        String jsonResponse = objectMapper.writeValueAsString(data);

        response.getWriter().write(jsonResponse);
        response.getWriter().flush();
    }
}