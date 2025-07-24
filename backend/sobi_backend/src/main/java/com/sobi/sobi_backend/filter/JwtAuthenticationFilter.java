package com.sobi.sobi_backend.filter;

import com.sobi.sobi_backend.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil; // JWT 토큰 처리 유틸리티

    // 모든 HTTP 요청이 올 때마다 실행되는 필터 메서드
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        System.out.println("=== JWT 필터 실행됨 ===");
        System.out.println("요청 URL: " + request.getRequestURL());

        // HTTP 요청 헤더에서 Authorization 값 가져오기
        String authorizationHeader = request.getHeader("Authorization");
        System.out.println("Authorization 헤더: " + authorizationHeader);

        // Authorization 헤더가 있고 "Bearer "로 시작하는지 확인
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            // "Bearer " 다음부터가 실제 JWT 토큰 (7글자 건너뛰기)
            String jwt = authorizationHeader.substring(7);
            System.out.println("JWT 토큰 추출됨: " + jwt.substring(0, Math.min(jwt.length(), 50)) + "...");

            try {
                // 토큰이 유효한지 검증
                if (jwtUtil.validateToken(jwt)) {
                    System.out.println("JWT 토큰 유효성 검증 성공");
                    // 토큰에서 사용자 정보 추출
                    String userId = jwtUtil.getUserIdFromToken(jwt);
                    Integer customerId = jwtUtil.getCustomerIdFromToken(jwt);
                    System.out.println("토큰에서 추출된 정보 - userId: " + userId + ", customerId: " + customerId);

                    // 사용자 정보가 있고, 아직 인증되지 않은 상태라면
                    if (userId != null && customerId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                        // 간단한 사용자 정보 객체 생성
                        JwtUserPrincipal principal = new JwtUserPrincipal(customerId, userId);

                        // Spring Security 인증 객체 생성
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        principal,  // 사용자 정보
                                        null,       // 비밀번호 (JWT에서는 불필요)
                                        List.of(new SimpleGrantedAuthority("ROLE_USER")) // 권한 목록
                                );
                        // 요청 세부정보 추가 (IP, 세션ID 등)
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        // Spring Security에 인증 정보 저장 (이제 인증된 사용자로 인식)
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        System.out.println("JWT 인증 성공: userId=" + userId + ", customerId=" + customerId);
                    } else {
                        System.out.println("인증 설정 실패 - userId: " + userId + ", customerId: " + customerId + ", 기존 인증: " + SecurityContextHolder.getContext().getAuthentication());
                    }
                } else {
                    System.out.println("JWT 토큰 유효성 검증 실패");
                }
            } catch (Exception e) {
                System.out.println("JWT 처리 중 오류: " + e.getMessage());
                e.printStackTrace();
            }
        } else {
            System.out.println("Authorization 헤더가 없거나 Bearer로 시작하지 않음");
        }

        // 다음 필터로 요청 전달 (필터 체인 계속)
        filterChain.doFilter(request, response);
        System.out.println("=== JWT 필터 완료 ===");
    }

    // JWT에서 추출한 사용자 정보를 담는 간단한 클래스
    public static class JwtUserPrincipal {
        private final Integer id;       // 고객 ID (숫자)
        private final String userId;    // 사용자 ID (문자열)

        public JwtUserPrincipal(Integer id, String userId) {
            this.id = id;
            this.userId = userId;
        }

        public Integer getId() { return id; }
        public String getUserId() { return userId; }

        @Override
        public String toString() {
            return "JwtUserPrincipal{id=" + id + ", userId='" + userId + "'}";
        }
    }
}