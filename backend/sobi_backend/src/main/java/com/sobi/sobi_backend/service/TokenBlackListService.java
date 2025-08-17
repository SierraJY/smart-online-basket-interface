package com.sobi.sobi_backend.service;

/**
 * Redis를 활용한 JWT 토큰 블랙리스트 관리 서비스
 *
 * 주요 기능:
 * 1. 로그아웃 시 토큰 무효화
 * 2. JWT 검증 시 블랙리스트 확인
 * 3. 토큰 만료 시간까지 자동 관리 (TTL)
 *
 * Redis 저장 구조:
 * - Key: "blacklist:{token_hash}"
 * - Value: "revoked"
 * - TTL: 토큰 원래 만료 시간까지
 */
public interface TokenBlackListService {

    /**
     * 토큰을 블랙리스트에 추가
     *
     * 사용 시나리오:
     * - 사용자 로그아웃
     * - 강제 로그아웃 (관리자 기능)
     * - 계정 탈퇴
     *
     * @param token JWT 토큰 문자열
     * @param expirationTime 토큰 만료 시간 (Unix timestamp)
     */
    void addTokenToBlacklist(String token, long expirationTime);

    /**
     * 토큰이 블랙리스트에 있는지 확인
     *
     * 사용 시나리오:
     * - JWT 검증 시 블랙리스트 체크
     * - API 요청마다 호출
     *
     * @param token JWT 토큰 문자열
     * @return true: 블랙리스트에 있음(무효한 토큰), false: 유효한 토큰
     */
    boolean isTokenBlacklisted(String token);
}