package com.sobi.sobi_backend.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Calendar;
import java.util.Date;

//JWT 토큰 생성 & 검증

@Component
public class JwtUtil {

    // JWT 토큰을 만들고 검증할 때 사용하는 비밀키 (충분히 길어야 함)
    private final String SECRET_KEY = "sobi_b103_103b_park_yang_yang_hwang_kim_jjang_jjang";

    // 비밀키를 암호화 알고리즘에 맞는 형태로 변환
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    }

    // 액세스 토큰 만료시간 생성
    private Date createAccessTokenExpiredDate() {
        Calendar c = Calendar.getInstance();
        // c.add(Calendar.SECOND, 3); // 3초
        c.add(Calendar.HOUR, 1); // 1시간
        // c.add(Calendar.HOUR, 8); // 8시간
        // c.add(Calendar.DATE, 1); // 1일
        return c.getTime();
    }

    // 리프레시 토큰 만료시간 생성
    private Date createRefreshTokenExpiredDate() {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DATE, 7); // 7일
        return c.getTime();
    }

    // JWT 액세스 토큰 생성 (사용자ID와 고객ID를 토큰에 포함)
    public String generateToken(String userId, Integer customerId) {
        Date now = new Date();
        Date expiryDate = createAccessTokenExpiredDate();

        return Jwts.builder()
                .setSubject(userId) // 토큰의 주인 = 사용자ID
                .claim("customerId", customerId) // 추가 정보로 고객ID 저장
                .setIssuedAt(now) // 토큰 발급 시간
                .setExpiration(expiryDate) // 토큰 만료 시간
                .signWith(getSigningKey()) // 비밀키로 서명
                .compact(); // 최종 토큰 문자열 생성
    }

    // JWT 리프레시 토큰 생성
    public String generateRefreshToken(String userId, Integer customerId) {
        Date now = new Date();
        Date expiryDate = createRefreshTokenExpiredDate();

        return Jwts.builder()
                .setSubject(userId) // 토큰의 주인 = 사용자ID
                .claim("customerId", customerId) // 추가 정보로 고객ID 저장
                .setIssuedAt(now) // 토큰 발급 시간
                .setExpiration(expiryDate) // 토큰 만료 시간
                .signWith(getSigningKey()) // 비밀키로 서명
                .compact();
    }

    // JWT 토큰에서 사용자ID 추출
    public String getUserIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder() // 토큰 파서 생성
                .setSigningKey(getSigningKey()) // 비밀키 설정
                .build()
                .parseClaimsJws(token) // 토큰 파싱 (서명 검증 포함)
                .getBody(); // 토큰 내용 추출

        return claims.getSubject(); // Subject = 사용자ID
    }

    // JWT 토큰에서 고객ID 추출
    public Integer getCustomerIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

        return claims.get("customerId", Integer.class); // customerId 필드를 Integer로 추출
    }

    // 리프레시 토큰에서 사용자ID 추출
    public String getUserIdFromRefreshToken(String refreshToken) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey()) // 같은 비밀키 사용
                .build()
                .parseClaimsJws(refreshToken)
                .getBody();

        return claims.getSubject();
    }

    // 리프레시 토큰에서 고객ID 추출
    public Integer getCustomerIdFromRefreshToken(String refreshToken) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey()) // 같은 비밀키 사용
                .build()
                .parseClaimsJws(refreshToken)
                .getBody();

        return claims.get("customerId", Integer.class);
    }

    // JWT 액세스 토큰이 유효한지 검증 (만료, 서명, 형식 등 체크)
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey()) // 비밀키로 서명 검증
                    .build()
                    .parseClaimsJws(token); // 토큰 파싱 시도
            return true; // 예외 없으면 유효한 토큰
        } catch (JwtException | IllegalArgumentException e) {
            return false; // 예외 발생하면 무효한 토큰
        }
    }

    // JWT 리프레시 토큰이 유효한지 검증
    public boolean validateRefreshToken(String refreshToken) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey()) // 같은 비밀키로 서명 검증
                    .build()
                    .parseClaimsJws(refreshToken);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // 리프레시 토큰으로 새로운 액세스 토큰 생성
    public String refreshAccessToken(String refreshToken) {
        if (!validateRefreshToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 리프레시 토큰입니다.");
        }

        String userId = getUserIdFromRefreshToken(refreshToken);
        Integer customerId = getCustomerIdFromRefreshToken(refreshToken);

        return generateToken(userId, customerId);
    }
}