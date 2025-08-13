package com.sobi.sobi_backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * SpringDoc OpenAPI 3.0 설정 클래스
 *
 * 역할:
 * 1. API 문서의 기본 정보 설정 (제목, 버전, 설명 등)
 * 2. JWT 인증 방식 정의
 * 3. 연락처 정보 설정
 *
 * 접근 방법:
 * - Swagger UI: http://localhost:8080/swagger-ui.html (로컬 개발 환경)
 * - Swagger UI: http://배포서버IP:포트/swagger-ui.html (배포 환경 - IP 접근)
 * - Swagger UI: https://도메인/swagger-ui.html (배포 환경 - 도메인 접근)
 * - OpenAPI JSON: http://localhost:8080/api-docs (로컬 개발 환경)
 * - OpenAPI JSON: http://배포서버IP:포트/api-docs (배포 환경 - IP 접근)
 * - OpenAPI JSON: https://도메인/api-docs (배포 환경 - 도메인 접근)
 *
 * 특징:
 * - 서버 정보는 자동 감지 (현재 접속한 서버를 기본으로 사용)
 * - 라이선스 정보는 별도 설정 없음
 */
@Configuration
public class OpenApiConfig {

    /**
     * OpenAPI 3.0 스펙 설정
     *
     * 이 메서드에서 설정하는 것들:
     * 1. API 기본 정보 (제목, 버전, 설명)
     * 2. JWT Bearer 토큰 인증 스키마
     * 3. 글로벌 보안 요구사항
     * 4. 서버 정보 (로컬/배포 환경)
     *
     * @return OpenAPI 설정 객체
     */
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                // API 기본 정보 설정
                .info(createApiInfo())
                // JWT 인증 컴포넌트 설정
                .components(createSecurityComponents())
                // 모든 API에 JWT 인증 적용 (로그인, 회원가입 등 제외는 컨트롤러에서 개별 설정)
                .addSecurityItem(createSecurityRequirement());
    }

    /**
     * API 기본 정보 생성
     *
     * Swagger UI 상단에 표시되는 API 문서의 기본 정보
     *
     * @return Info 객체 (API 제목, 버전, 설명, 연락처, 라이선스)
     */
    private Info createApiInfo() {
        return new Info()
                .title("SOBI API Documentation")
                .version("1.0.0")
                .description("""
                        # SOBI (Smart Object Basket Intelligence) API
                        
                        ## 프로젝트 개요
                        - **스마트 바구니 기반 무인 결제 시스템**
                        - RFID 태그를 이용한 상품 자동 인식
                        - MQTT 통신을 통한 실시간 바구니 상태 관리
                        - AI 기반 상품 추천 시스템
                        
                        ## 주요 기능
                        1. **인증/회원관리**: 회원가입, 로그인, JWT 토큰 관리
                        2. **상품 관리**: 상품 조회, 검색, 카테고리별 조회
                        3. **바구니 시스템**: RFID 기반 상품 추가/제거, 실시간 SSE 알림
                        4. **결제/영수증**: 무인 결제 처리, 구매 기록 관리
                        5. **찜 기능**: 상품 찜하기/해제, 찜 목록 관리
                        6. **추천 시스템**: AI 기반 개인화 상품 추천
                        
                        ## 인증 방식
                        - **JWT Bearer Token** 사용
                        - Access Token 유효기간: 6시간
                        - Refresh Token 유효기간: 7일
                        
                        ## 기술 스택
                        - Spring Boot 3.5.3, PostgreSQL, Redis, MQTT, SSE
                        """)
                .contact(createContactInfo());
    }

    /**
     * 연락처 정보 생성
     *
     * API 문서에서 "Contact" 섹션에 표시될 정보
     *
     * @return Contact 객체
     */
    private Contact createContactInfo() {
        return new Contact()
                .name("SOBI Development Team")
                .url("https://lab.ssafy.com/s13-webmobile3-sub1/S13P11B103");
    }

    /**
     * JWT 인증 보안 컴포넌트 생성
     *
     * OpenAPI에서 JWT Bearer 토큰 인증 방식을 정의
     * Swagger UI에서 "Authorize" 버튼을 통해 토큰 입력 가능
     *
     * @return Components 객체 (보안 스키마 포함)
     */
    private Components createSecurityComponents() {
        return new Components()
                .addSecuritySchemes("JWT", createJwtSecurityScheme());
    }

    /**
     * JWT 보안 스키마 정의
     *
     * HTTP Bearer 토큰 방식의 JWT 인증 스키마
     *
     * 사용법:
     * 1. Swagger UI에서 "Authorize" 클릭
     * 2. "Bearer <your-jwt-token>" 형태로 입력
     * 3. 모든 인증 필요 API에 자동으로 Authorization 헤더 추가
     *
     * @return SecurityScheme 객체
     */
    private SecurityScheme createJwtSecurityScheme() {
        return new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)     // HTTP 인증 타입
                .scheme("bearer")                   // Bearer 토큰 방식
                .bearerFormat("JWT")                // JWT 포맷 명시
                .description("JWT 토큰을 입력하세요. 'Bearer ' 접두사는 자동으로 추가됩니다.");
    }

    /**
     * 글로벌 보안 요구사항 생성
     *
     * 모든 API 엔드포인트에 기본적으로 적용될 보안 요구사항
     * 개별 컨트롤러에서 @SecurityRequirement(name = "") 로 제외 가능
     *
     * @return SecurityRequirement 객체
     */
    private SecurityRequirement createSecurityRequirement() {
        return new SecurityRequirement().addList("JWT");
    }
}