package com.sobi.sobi_backend.service.impl;

import com.sobi.sobi_backend.service.TokenBlackListService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;

/**
 * Redis를 활용한 JWT 토큰 블랙리스트 관리 서비스 구현체
 *
 * 참고 블로그와의 차이점:
 * 1. List 대신 Key-Value 구조 사용 (성능 최적화)
 * 2. TTL 기능 추가 (자동 만료)
 * 3. 토큰 해시화로 키 길이 최적화
 * 4. 불필요한 기능 제거 (getAll, remove)
 */
@Service
public class TokenBlackListServiceImpl implements TokenBlackListService {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    // Redis 키 접두사 - 블랙리스트 토큰임을 명시
    private static final String BLACKLIST_KEY_PREFIX = "blacklist:";

    /**
     * 토큰을 블랙리스트에 추가
     *
     * 작동 원리:
     * 1. JWT 토큰을 SHA-256으로 해시화 (키 길이 최적화)
     * 2. Redis에 "blacklist:{hash}" = "revoked" 저장
     * 3. TTL 설정으로 토큰 만료 시간까지만 저장
     *
     * 참고 블로그와 차이점:
     * - List 구조 대신 개별 Key-Value 사용 (O(1) 조회 성능)
     * - TTL 자동 만료 기능 추가
     *
     * @param token JWT 토큰 문자열
     * @param expirationTime 토큰 만료 시간 (Unix timestamp - 초 단위)
     */
    @Override
    public void addTokenToBlacklist(String token, long expirationTime) {
        try {
            // 1. 토큰을 해시화하여 Redis 키 생성
            String hashedToken = hashToken(token);
            String redisKey = BLACKLIST_KEY_PREFIX + hashedToken;

            // 2. 현재 시간과 토큰 만료 시간 비교하여 TTL 계산
            long currentTime = Instant.now().getEpochSecond();
            long timeToLive = expirationTime - currentTime;

            // 3. 이미 만료된 토큰이면 저장하지 않음 (불필요한 저장 방지)
            if (timeToLive <= 0) {
                System.out.println("토큰이 이미 만료됨 - 블랙리스트 저장 생략: " + timeToLive);
                return;
            }

            // 4. Redis에 저장 (TTL 설정으로 자동 만료)
            redisTemplate.opsForValue().set(redisKey, "revoked", Duration.ofSeconds(timeToLive));

            System.out.println("토큰 블랙리스트 추가 완료 - TTL: " + timeToLive + "초");

        } catch (Exception e) {
            System.err.println("토큰 블랙리스트 추가 실패: " + e.getMessage());
            throw new RuntimeException("블랙리스트 추가 중 오류 발생", e);
        }
    }

    /**
     * 토큰이 블랙리스트에 있는지 확인
     *
     * 작동 원리:
     * 1. JWT 토큰을 동일한 방식으로 해시화
     * 2. Redis에서 해당 키 존재 여부 확인
     * 3. TTL이 만료된 키는 자동으로 삭제되어 false 반환
     *
     * 참고 블로그와 차이점:
     * - List 전체 순회(O(n)) 대신 Key 존재 확인(O(1))
     * - Stream API 불필요 (성능 향상)
     *
     * @param token JWT 토큰 문자열
     * @return true: 블랙리스트에 있음(무효한 토큰), false: 유효한 토큰
     */
    @Override
    public boolean isTokenBlacklisted(String token) {
        try {
            // 1. 토큰을 해시화하여 Redis 키 생성
            String hashedToken = hashToken(token);
            String redisKey = BLACKLIST_KEY_PREFIX + hashedToken;

            // 2. Redis에서 키 존재 여부 확인 (O(1) 연산)
            Boolean exists = redisTemplate.hasKey(redisKey);

            System.out.println("토큰 블랙리스트 확인 - 결과: " + (exists != null && exists));

            return exists != null && exists;

        } catch (Exception e) {
            System.err.println("토큰 블랙리스트 확인 실패: " + e.getMessage());
            // 확인 실패 시 안전을 위해 false 반환 (토큰을 유효하다고 가정)
            return false;
        }
    }

    /**
     * JWT 토큰을 SHA-256으로 해시화
     *
     * 목적:
     * 1. Redis 키 길이 최적화 (긴 JWT → 고정 길이 해시)
     * 2. 토큰 내용 보안 (원본 토큰이 Redis에 직접 저장되지 않음)
     * 3. 키 네이밍 일관성
     *
     * @param token 원본 JWT 토큰
     * @return SHA-256 해시 문자열 (64자리 16진수)
     */
    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(token.getBytes());

            // 바이트 배열을 16진수 문자열로 변환
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }

            return hexString.toString();

        } catch (NoSuchAlgorithmException e) {
            // SHA-256은 JDK 표준이므로 이 예외는 발생하지 않아야 함
            throw new RuntimeException("SHA-256 알고리즘을 찾을 수 없음", e);
        }
    }
}