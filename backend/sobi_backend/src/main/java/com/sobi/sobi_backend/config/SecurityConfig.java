package com.sobi.sobi_backend.config;

import com.sobi.sobi_backend.filter.JwtAuthenticationFilter;
import com.sobi.sobi_backend.service.CustomerService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private CustomerService customerService; // 고객 정보 조회 서비스

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter; // JWT 인증 필터

    // 비밀번호 암호화/검증을 위한 인코더 (BCrypt 알고리즘 사용)
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // 로그인 시 사용자 정보를 조회하는 서비스 (아이디로 사용자 찾기)
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            return customerService.loginCustomer(username) // 아이디로 고객 정보 조회
                    .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + username));
        };
    }

    // 로그인 처리를 담당하는 매니저 (아이디/비밀번호 검증)
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // Spring Security 전체 설정
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CORS 설정 적용 (다른 도메인에서 API 호출 허용)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // CSRF 보안 비활성화 (REST API에서는 불필요)
                .csrf(csrf -> csrf.disable())
                // 세션 정책: STATELESS (세션 사용 안함, JWT로만 인증)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                // URL별 접근 권한 설정
                .authorizeHttpRequests(authz -> authz
                        // 회원가입, 로그인은 누구나 접근 가능
                        .requestMatchers("/api/customers/register", "/api/customers/login").permitAll()
                        // 상품 조회는 누구나 접근 가능
                        .requestMatchers("/api/products/**").permitAll()
                        // RFID 스캔은 바구니에서 수행하므로 누구나 접근 가능
                        .requestMatchers("/api/epc-maps/scan/**").permitAll()
                        // 나머지 모든 요청은 인증 필요
                        .anyRequest().authenticated()
                )
                // JWT 필터를 기본 로그인 필터 앞에 추가
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // 로그아웃 처리 설정
                .logout(logout -> logout
                        .logoutUrl("/api/customers/logout") // 로그아웃 URL
                        .logoutSuccessHandler((request, response, authentication) -> {
                            // 로그아웃 성공 시 JSON 응답
                            response.setStatus(HttpServletResponse.SC_OK);
                            response.setContentType("application/json;charset=UTF-8");
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write("{\"message\":\"로그아웃 되었습니다.\"}");
                        })
                        .permitAll() // 로그아웃은 누구나 가능
                );

        return http.build();
    }

    // CORS 설정: 다른 도메인에서 API 호출을 허용하는 정책
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // 모든 도메인에서 접근 허용
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        // 허용할 HTTP 메서드
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // 모든 헤더 허용
        configuration.setAllowedHeaders(Arrays.asList("*"));
        // 쿠키/인증 정보 전송 허용
        configuration.setAllowCredentials(true);

        // 모든 URL 경로에 CORS 설정 적용
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}