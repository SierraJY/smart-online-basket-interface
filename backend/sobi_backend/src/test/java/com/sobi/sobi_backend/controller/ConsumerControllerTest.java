package com.sobi.sobi_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.service.CustomerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CustomerControllerTest {

    private MockMvc mockMvc;

    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private CustomerService customerService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private CustomerController customerController;

    private Customer testCustomer;
    private CustomerController.CustomerRegisterRequest registerRequest;
    private CustomerController.CustomerLoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(customerController).build();

        // 테스트용 Customer 객체 생성
        testCustomer = new Customer();
        testCustomer.setId(1);
        testCustomer.setUserId("testuser1");
        testCustomer.setUserPasswd("encodedPassword");
        testCustomer.setGender(0);
        testCustomer.setAge(25);

        // 회원가입 요청 객체
        registerRequest = new CustomerController.CustomerRegisterRequest();
        registerRequest.setUserId("testuser1");
        registerRequest.setPassword("test1234");
        registerRequest.setGender(0);
        registerRequest.setAge(25);

        // 로그인 요청 객체
        loginRequest = new CustomerController.CustomerLoginRequest();
        loginRequest.setUserId("testuser1");
        loginRequest.setPassword("test1234");
    }

    @Test
    @DisplayName("회원가입 성공 테스트")
    void registerSuccess() throws Exception {
        // Given
        when(passwordEncoder.encode("test1234")).thenReturn("encodedPassword");
        when(customerService.registerCustomer("testuser1", "encodedPassword", 0, 25))
                .thenReturn(testCustomer);

        // When & Then
        mockMvc.perform(post("/api/customers/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andDo(print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("회원가입이 완료되었습니다."))
                .andExpect(jsonPath("$.userId").value("testuser1"));

        // Verify
        verify(passwordEncoder).encode("test1234");
        verify(customerService).registerCustomer("testuser1", "encodedPassword", 0, 25);
    }

    @Test
    @DisplayName("회원가입 실패 - 중복 아이디")
    void registerFailDuplicateUserId() throws Exception {
        // Given
        when(passwordEncoder.encode("test1234")).thenReturn("encodedPassword");
        when(customerService.registerCustomer("testuser1", "encodedPassword", 0, 25))
                .thenThrow(new IllegalArgumentException("이미 존재하는 사용자 ID입니다: testuser1"));

        // When & Then
        mockMvc.perform(post("/api/customers/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("이미 존재하는 사용자 ID입니다: testuser1"));
    }

    @Test
    @DisplayName("로그인 성공 테스트")
    void loginSuccess() throws Exception {
        // Given
        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getPrincipal()).thenReturn(testCustomer);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mockAuth);

        // When & Then
        mockMvc.perform(post("/api/customers/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("로그인 성공"))
                .andExpect(jsonPath("$.userId").value(1))
                .andExpect(jsonPath("$.username").value("testuser1"));

        // Verify
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    @DisplayName("로그인 실패 - 잘못된 인증 정보")
    void loginFailInvalidCredentials() throws Exception {
        // Given
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new RuntimeException("Authentication failed"));

        // When & Then
        mockMvc.perform(post("/api/customers/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andDo(print())
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("로그인 실패: 아이디 또는 비밀번호를 확인해주세요."));
    }

    @Test
    @DisplayName("프로필 조회 실패 - 인증되지 않은 사용자 (MockMvc)")
    void getProfileFailUnauthenticated() throws Exception {
        // When & Then (Authentication이 null인 경우)
        mockMvc.perform(get("/api/customers/profile"))
                .andDo(print())
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("로그인이 필요합니다."));
    }

    @Test
    @DisplayName("프로필 조회 성공 테스트 - 직접 메서드 호출")
    void getProfileSuccessDirect() {
        // Given
        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.isAuthenticated()).thenReturn(true);
        when(mockAuth.getPrincipal()).thenReturn(testCustomer);

        // When
        var result = customerController.getProfile(mockAuth);

        // Then
        assertEquals(200, result.getStatusCode().value());
        Map<String, Object> responseBody = (Map<String, Object>) result.getBody();
        assertEquals(1, responseBody.get("id"));
        assertEquals("testuser1", responseBody.get("userId"));
        assertEquals(0, responseBody.get("gender"));
        assertEquals(25, responseBody.get("age"));
    }

    @Test
    @DisplayName("프로필 조회 실패 테스트 - 직접 메서드 호출")
    void getProfileFailAuthenticatedDirect() {
        // Given - null Authentication
        Authentication nullAuth = null;

        // When
        var result = customerController.getProfile(nullAuth);

        // Then
        assertEquals(401, result.getStatusCode().value());
        Map<String, Object> responseBody = (Map<String, Object>) result.getBody();
        assertEquals("로그인이 필요합니다.", responseBody.get("error"));
    }

    @Test
    @DisplayName("잘못된 요청 데이터 테스트")
    void invalidRequestData() throws Exception {
        // Given - null 값들이 있는 요청 객체
        CustomerController.CustomerRegisterRequest invalidRequest = new CustomerController.CustomerRegisterRequest();
        // userId, password 등이 null

        when(passwordEncoder.encode(null)).thenReturn("encodedPassword");
        when(customerService.registerCustomer(null, "encodedPassword", null, null))
                .thenThrow(new IllegalArgumentException("필수 필드가 누락되었습니다."));

        // When & Then
        mockMvc.perform(post("/api/customers/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andDo(print())
                .andExpect(status().isBadRequest());
    }
}