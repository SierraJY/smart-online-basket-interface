package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.service.CustomerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.Cookie;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    // 회원가입
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody CustomerRegisterRequest request) {
        try {
            // 비밀번호 암호화
            String encodedPassword = passwordEncoder.encode(request.getPassword());

            Customer customer = customerService.registerCustomer(
                    request.getUserId(),
                    encodedPassword,
                    request.getGender(),
                    request.getAge()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("message", "회원가입이 완료되었습니다.");
            response.put("userId", customer.getUserId());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // 로그인
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody CustomerLoginRequest request, HttpServletRequest httpRequest) {
        try {
            // Spring Security를 통한 인증
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUserId(), request.getPassword())
            );

            // 인증 성공 시 SecurityContext에 저장
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // 세션 생성 및 SecurityContext 저장
            HttpSession session = httpRequest.getSession(true);
            session.setAttribute("SPRING_SECURITY_CONTEXT", SecurityContextHolder.getContext());

            Customer customer = (Customer) authentication.getPrincipal();

            Map<String, Object> response = new HashMap<>();
            response.put("message", "로그인 성공");
            response.put("userId", customer.getId());
            response.put("username", customer.getUserId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "로그인 실패: 아이디 또는 비밀번호를 확인해주세요.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }

    // 현재 로그인한 사용자 정보 조회
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "로그인이 필요합니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        Customer customer = (Customer) authentication.getPrincipal();
        Map<String, Object> response = new HashMap<>();
        response.put("id", customer.getId());
        response.put("userId", customer.getUserId());
        response.put("gender", customer.getGender());
        response.put("age", customer.getAge());

        return ResponseEntity.ok(response);
    }

    // DTO 클래스들
    public static class CustomerRegisterRequest {
        private String userId;
        private String password;
        private Integer gender;
        private Integer age;

        // Getters and Setters
        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public Integer getGender() { return gender; }
        public void setGender(Integer gender) { this.gender = gender; }
        public Integer getAge() { return age; }
        public void setAge(Integer age) { this.age = age; }
    }

    public static class CustomerLoginRequest {
        private String userId;
        private String password;

        // Getters and Setters
        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}