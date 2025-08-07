package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.service.CustomerService;
import com.sobi.sobi_backend.util.JwtUtil;
import com.sobi.sobi_backend.config.filter.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/customers") // /api/customers로 시작하는 모든 요청 처리
public class CustomerController {

    @Autowired
    private CustomerService customerService; // 고객 정보 처리 서비스

    @Autowired
    private PasswordEncoder passwordEncoder; // 비밀번호 암호화

    @Autowired
    private AuthenticationManager authenticationManager; // 로그인 처리

    @Autowired
    private JwtUtil jwtUtil; // JWT 토큰 생성

    // 회원가입 처리 (POST /api/customers/register)
    @PostMapping("/signup")
    public ResponseEntity<?> register(@RequestBody CustomerRegisterRequest request) {
        try {
            // 평문 비밀번호를 암호화
            String encodedPassword = passwordEncoder.encode(request.getPassword());

            // 새 고객 등록
            Customer customer = customerService.registerCustomer(
                    request.getUserId(),    // 사용자 ID
                    encodedPassword,        // 암호화된 비밀번호
                    request.getGender(),    // 성별
                    request.getAge()        // 나이
            );

            // 성공 응답 생성
            Map<String, Object> response = new HashMap<>();
            response.put("message", "회원가입이 완료되었습니다.");
            response.put("userId", customer.getUserId());

            return ResponseEntity.status(HttpStatus.CREATED).body(response); // 201 Created
        } catch (IllegalArgumentException e) { // 중복 아이디 등의 오류
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error); // 400 Bad Request
        }
    }

    // 로그인 처리 (POST /api/customers/login)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody CustomerLoginRequest request) {
        try {
            // Spring Security를 통한 아이디/비밀번호 검증
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUserId(), request.getPassword())
            );

            // 인증 성공 시 고객 정보 가져오기
            Customer customer = (Customer) authentication.getPrincipal();
            // JWT 토큰 생성 (사용자ID와 고객ID 포함)
            String token = jwtUtil.generateToken(customer.getUserId(), customer.getId());

            // 성공 응답 생성
            Map<String, Object> response = new HashMap<>();
            response.put("message", "로그인 성공");
            response.put("token", token);           // 클라이언트가 저장해야 할 JWT 토큰
            response.put("userId", customer.getId());
            response.put("username", customer.getUserId());

            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) { // 로그인 실패
            Map<String, String> error = new HashMap<>();
            error.put("error", "로그인 실패: 아이디 또는 비밀번호를 확인해주세요.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error); // 401 Unauthorized
        }
    }

    // 비회원 로그인 처리 (POST /api/customers/guest-login)
    @PostMapping("/guest-login")
    public ResponseEntity<?> guestLogin() {
        try {
            System.out.println("비회원 로그인 요청 받음");

            // 1. 10자리 난수 비밀번호 생성
            String rawPassword = customerService.generateRandomPassword();

            // 2. 비밀번호 암호화
            String encodedPassword = passwordEncoder.encode(rawPassword);

            // 3. 비회원 계정 생성 (암호화된 패스워드 전달)
            Customer guestCustomer = customerService.createGuestAccount(encodedPassword);

            // 4. 액세스 토큰만 생성 (리프레시 토큰 없음)
            String accessToken = jwtUtil.generateToken(guestCustomer.getUserId(), guestCustomer.getId());

            // 5. 성공 응답 생성 (성별, 나이 포함)
            Map<String, Object> response = new HashMap<>();
            response.put("message", "비회원 로그인 성공");
            response.put("accessToken", accessToken);
            response.put("userId", guestCustomer.getUserId());
            response.put("customerId", guestCustomer.getId());
            response.put("gender", guestCustomer.getGender()); // 0
            response.put("age", guestCustomer.getAge());       // 0

            System.out.println("비회원 로그인 완료: userId=" + guestCustomer.getUserId() + ", customerId=" + guestCustomer.getId() + ", gender=0, age=0");
            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            System.err.println("비회원 로그인 실패: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "비회원 로그인 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 로그아웃 메서드 제거 - SecurityConfig의 CustomLogoutHandler에서 처리
    // POST /api/customers/logout 요청은 이제 Spring Security의 로그아웃 필터에서 자동 처리

    // 현재 로그인한 사용자 정보 조회 (GET /api/customers/profile)
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        System.out.println("프로필 조회 요청 - Authentication: " + authentication);

        // 인증되지 않은 사용자인지 확인
        if (authentication == null || !authentication.isAuthenticated()) {
            System.out.println("인증되지 않은 요청");
            Map<String, String> error = new HashMap<>();
            error.put("error", "로그인이 필요합니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        System.out.println("Principal 타입: " + authentication.getPrincipal().getClass().getName());
        System.out.println("Principal 내용: " + authentication.getPrincipal());

        // JWT 필터에서 설정한 사용자 정보인지 확인
        if (authentication.getPrincipal() instanceof JwtAuthenticationFilter.JwtUserPrincipal) {
            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();

            System.out.println("JWT Principal로 인증됨: " + principal);

            // 토큰에서 얻은 사용자ID로 데이터베이스에서 상세 정보 조회
            Optional<Customer> customerOpt = customerService.loginCustomer(principal.getUserId());
            if (customerOpt.isPresent()) { // 사용자가 존재하면
                Customer customer = customerOpt.get();
                Map<String, Object> response = new HashMap<>();
                response.put("id", customer.getId());
                response.put("userId", customer.getUserId());
                // null인 경우 0으로 변환하여 반환
                response.put("gender", customer.getGender() != null ? customer.getGender() : 0);
                response.put("age", customer.getAge() != null ? customer.getAge() : 0);
                return ResponseEntity.ok(response);
            } else { // 사용자가 존재하지 않으면
                System.out.println("사용자를 찾을 수 없음: " + principal.getUserId());
                Map<String, String> error = new HashMap<>();
                error.put("error", "사용자 정보를 찾을 수 없습니다.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
        }

        // 로그인 직후 Customer 객체가 직접 저장된 경우
        if (authentication.getPrincipal() instanceof Customer) {
            Customer customer = (Customer) authentication.getPrincipal();
            System.out.println("Customer 객체로 인증됨: " + customer.getUserId());
            Map<String, Object> response = new HashMap<>();
            response.put("id", customer.getId());
            response.put("userId", customer.getUserId());
            // null인 경우 0으로 변환하여 반환
            response.put("gender", customer.getGender() != null ? customer.getGender() : 0);
            response.put("age", customer.getAge() != null ? customer.getAge() : 0);
            return ResponseEntity.ok(response);
        }

        // 알 수 없는 인증 정보 타입
        System.out.println("알 수 없는 Principal 타입");
        Map<String, String> error = new HashMap<>();
        error.put("error", "인증 정보를 찾을 수 없습니다.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    // 회원가입 요청 데이터 구조
    public static class CustomerRegisterRequest {
        private String userId;      // 사용자 ID
        private String password;    // 비밀번호
        private Integer gender;     // 성별 (0=남성, 1=여성)
        private Integer age;        // 나이

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public Integer getGender() { return gender; }
        public void setGender(Integer gender) { this.gender = gender; }
        public Integer getAge() { return age; }
        public void setAge(Integer age) { this.age = age; }
    }

    // 로그인 요청 데이터 구조
    public static class CustomerLoginRequest {
        private String userId;      // 사용자 ID
        private String password;    // 비밀번호

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}