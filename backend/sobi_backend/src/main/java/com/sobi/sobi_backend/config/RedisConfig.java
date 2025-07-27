package com.sobi.sobi_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis 환경 설정 클래스
 * - Spring Boot 애플리케이션과 Redis 서버 간의 연결 및 데이터 처리 방식을 설정
 * - 블랙리스트 기능을 위한 기본 Redis 구성
 * - 향후 장바구니 캐시, 세션 관리 등 확장 기능을 위한 기반 설정
 */
@Configuration // Spring 설정 클래스임을 명시
public class RedisConfig {

    // application.properties에서 redis 호스트 정보를 읽어옴 (기본값: localhost)
    // Docker 컨테이너 환경에서는 localhost:6379로 Redis 접근 가능
    @Value("${spring.data.redis.host:localhost}")
    private String host;

    // application.properties에서 redis 포트 정보를 읽어옴 (기본값: 6379)
    // 현재 Docker compose에서 6379:6379로 포트 매핑되어 있음
    @Value("${spring.data.redis.port:6379}")
    private int port;

    /**
     * Redis 서버와의 물리적 연결을 담당하는 팩토리 빈 생성
     *
     * 작동 원리:
     * 1. LettuceConnectionFactory: 비동기 Redis 클라이언트 Lettuce 사용
     * 2. Lettuce vs Jedis: Lettuce가 더 현대적이고 성능이 좋음 (Spring Boot 기본)
     * 3. 연결 풀 관리, 재연결, 에러 핸들링 등을 자동으로 처리
     *
     * @return RedisConnectionFactory - Redis 연결을 생성하는 팩토리
     */
    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        return new LettuceConnectionFactory(host, port);
    }

    /**
     * Redis 데이터 읽기/쓰기를 위한 템플릿 빈 생성
     *
     * 작동 원리:
     * 1. RedisTemplate: Redis 명령어를 Java 메서드로 추상화
     * 2. 직렬화(Serialization): Java 객체 ↔ Redis 저장 형태 변환
     * 3. StringRedisSerializer: 모든 데이터를 UTF-8 문자열로 처리
     *
     * 블랙리스트 활용 예시:
     * - Key: "blacklist:eyJhbGciOiJIUzI1NiJ9..." (토큰 해시)
     * - Value: "1735689600" (만료 시간 timestamp)
     *
     * @return RedisTemplate<String, String> - 문자열 키-값 처리용 템플릿
     */
    @Bean
    public RedisTemplate<String, String> redisTemplate() {
        // String 타입 키-값만 처리하는 템플릿 생성 (블랙리스트용으로 최적화)
        RedisTemplate<String, String> redisTemplate = new RedisTemplate<>();

        // 위에서 생성한 연결 팩토리를 템플릿에 연결
        redisTemplate.setConnectionFactory(redisConnectionFactory());

        // Redis Key 직렬화 방식 설정
        // StringRedisSerializer: "blacklist:token123" → UTF-8 바이트 배열
        redisTemplate.setKeySerializer(new StringRedisSerializer());

        // Redis Value 직렬화 방식 설정
        // StringRedisSerializer: "1735689600" → UTF-8 바이트 배열
        redisTemplate.setValueSerializer(new StringRedisSerializer());

        // Hash 구조 사용 시 Key 직렬화 (현재 블랙리스트에서는 미사용)
        // 향후 장바구니 캐시에서 사용 가능: HSET cart:user123 product1 quantity2
        redisTemplate.setHashKeySerializer(new StringRedisSerializer());

        // Hash 구조 사용 시 Value 직렬화 (현재 블랙리스트에서는 미사용)
        redisTemplate.setHashValueSerializer(new StringRedisSerializer());

        // 모든 타입에 대한 기본 직렬화 방식
        // 명시적으로 설정하지 않은 데이터 타입에 대한 fallback
        redisTemplate.setDefaultSerializer(new StringRedisSerializer());

        return redisTemplate;
    }
}