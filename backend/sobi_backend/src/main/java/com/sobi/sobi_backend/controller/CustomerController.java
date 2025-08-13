package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.service.CustomerService;
import com.sobi.sobi_backend.util.JwtUtil;
import com.sobi.sobi_backend.config.filter.JwtAuthenticationFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Customer", description = "고객 관리 API - 회원가입, 로그인, 프로필 관리")
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
    @Operation(
            summary = "회원가입",
            description = "새로운 고객 계정을 생성합니다. 사용자 ID 중복 확인 후 비밀번호를 암호화하여 저장합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "회원가입 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "회원가입이 완료되었습니다.",
                      "userId": "testuser123"
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "회원가입 실패 - 중복된 사용자 ID",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "이미 존재하는 사용자 ID입니다: testuser123"
                    }
                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
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
    @Operation(
            summary = "로그인",
            description = "사용자 ID와 비밀번호로 인증 후 JWT 액세스 토큰과 리프레시 토큰을 발급합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "로그인 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "로그인 성공",
                      "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
                      "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
                      "userId": "testuser123",
                      "customerId": 1
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "로그인 실패 - 잘못된 인증 정보",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "로그인 실패: 아이디 또는 비밀번호를 확인해주세요."
                    }
                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
    public ResponseEntity<?> login(@RequestBody CustomerLoginRequest request) {
        try {
            // Spring Security를 통한 아이디/비밀번호 검증
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUserId(), request.getUserPasswd())
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
    @Operation(
            summary = "비회원 로그인",
            description = "임시 게스트 계정을 생성하고 JWT 액세스 토큰을 발급합니다. 리프레시 토큰은 제공되지 않습니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "비회원 로그인 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "비회원 로그인 성공",
                      "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
                      "userId": "guest1a2b3c4d5e",
                      "customerId": 42,
                      "gender": 0,
                      "age": 0
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "500",
                    description = "비회원 로그인 실패 - 서버 오류",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "비회원 로그인 처리 중 오류가 발생했습니다: Internal server error"
                    }
                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
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

    // 회원탈퇴 처리 (POST /api/customers/withdrawal)
    @PostMapping("/withdrawal")
    @Operation(
            summary = "회원탈퇴",
            description = "현재 로그인한 사용자의 계정을 삭제하고 JWT 토큰을 블랙리스트에 추가합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "회원탈퇴 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "회원탈퇴가 완료되었습니다",
                      "customerId": 1
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "회원탈퇴 실패 - 잘못된 요청",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "이미 탈퇴한 계정입니다"
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "인증 실패 - 유효하지 않은 토큰",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "유효하지 않은 토큰입니다"
                    }
                    """
                            )
                    )
            )
    })
    public ResponseEntity<?> deleteAccount(Authentication authentication, @RequestHeader("Authorization") String authorizationHeader) {
        try {
            System.out.println("회원탈퇴 요청");

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "로그인이 필요합니다");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // Authorization 헤더에서 토큰 추출
            if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "유효하지 않은 토큰입니다");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }

            String token = authorizationHeader.substring(7);

            // 회원탈퇴 처리
            customerService.deleteCustomer(customerId, token);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "회원탈퇴가 완료되었습니다");
            response.put("customerId", customerId);

            System.out.println("회원탈퇴 완료: customerId=" + customerId);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            System.err.println("회원탈퇴 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "회원탈퇴 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // 현재 로그인한 사용자 정보 조회 (GET /api/customers/profile)
    @GetMapping("/profile")
    @Operation(
            summary = "프로필 조회",
            description = "현재 로그인한 사용자의 프로필 정보를 조회합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "프로필 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "id": 1,
                      "userId": "testuser123",
                      "gender": 1,
                      "age": 25
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "인증 실패 - 로그인 필요",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "로그인이 필요합니다."
                    }
                    """
                            )
                    )
            )
    })
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
        private String userPasswd;  // 비밀번호

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        public String getUserPasswd() { return userPasswd; }
        public void setUserPasswd(String userPasswd) { this.userPasswd = userPasswd; }
    }
}