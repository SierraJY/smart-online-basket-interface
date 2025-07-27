package com.sobi.sobi_backend.config.filter;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.stereotype.Component;

// JSON 로그인 처리
// 아이디와 비밀번호 기반의 데이터를 JSON으로 전송받아 '인증'을 담당하는 필터

@Component
public class CustomAuthenticationFilter extends UsernamePasswordAuthenticationFilter {

    // AuthenticationManager를 통해 실제 인증 처리를 위임
    public CustomAuthenticationFilter(AuthenticationManager authenticationManager) {
        super.setAuthenticationManager(authenticationManager);
    }

    // 지정된 URL로 JSON 전송을 하였을 경우 파라미터 정보를 가져와서 인증을 시도
    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response)
            throws AuthenticationException {

        UsernamePasswordAuthenticationToken authRequest;
        try {
            // 요청에서 인증 토큰 생성
            authRequest = getAuthRequest(request);
            // 요청의 세부 정보 설정 (IP 주소, 세션 ID 등)
            setDetails(request, authRequest);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        // AuthenticationManager에게 실제 인증 처리 위임
        return this.getAuthenticationManager().authenticate(authRequest);
    }

    // HTTP 요청에서 사용자 ID와 비밀번호를 추출하여 인증 토큰을 생성
    // JSON 형태의 요청 본문을 파싱하여 로그인 정보를 추출
    private UsernamePasswordAuthenticationToken getAuthRequest(HttpServletRequest request) throws Exception {
        try {
            // JSON 파서 설정 및 ObjectMapper 생성
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.configure(JsonParser.Feature.AUTO_CLOSE_SOURCE, true);

            // 요청 본문에서 JSON을 LoginRequest 객체로 변환
            LoginRequest loginRequest = objectMapper.readValue(request.getInputStream(), LoginRequest.class);
            System.out.println("CustomAuthenticationFilter :: userId:" + loginRequest.getUserId() + " userPasswd:" + loginRequest.getUserPasswd());

            // 사용자 ID와 비밀번호를 기반으로 인증 토큰 생성
            return new UsernamePasswordAuthenticationToken(loginRequest.getUserId(), loginRequest.getUserPasswd());
        } catch (UsernameNotFoundException ae) {
            throw new UsernameNotFoundException(ae.getMessage());
        }
    }

    // 로그인 요청 JSON을 받기 위한 DTO 클래스
    // 클라이언트에서 전송하는 로그인 정보를 담는 데이터 전송 객체
    public static class LoginRequest {
        private String userId;      // 사용자 ID
        private String userPasswd;  // 사용자 비밀번호

        // 기본 생성자 (JSON 역직렬화를 위해 필요)
        public LoginRequest() {}

        // userId 필드의 getter 메서드
        public String getUserId() {
            return userId;
        }

        // userId 필드의 setter 메서드
        public void setUserId(String userId) {
            this.userId = userId;
        }

        // userPasswd 필드의 getter 메서드
        public String getUserPasswd() {
            return userPasswd;
        }

        // userPasswd 필드의 setter 메서드
        public void setUserPasswd(String userPasswd) {
            this.userPasswd = userPasswd;
        }
    }
}