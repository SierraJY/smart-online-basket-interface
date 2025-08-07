package com.sobi.sobi_backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI 서버와 HTTP 통신하여 상품 추천을 받는 서비스
 */
@Service
public class RecommendationService {

    // application.properties에서 AI 서버 설정 주입
    @Value("${app.ai.recommendation-url}")
    private String recommendationUrl;

    @Value("${app.ai.connection-timeout}")
    private int connectionTimeout;

    @Value("${app.ai.read-timeout}")
    private int readTimeout;

    private final ObjectMapper objectMapper;

    /**
     * RestTemplate 설정 및 초기화
     */
    public RecommendationService() {
        this.objectMapper = new ObjectMapper();

        System.out.println("RecommendationService 초기화 완료");
    }

    /**
     * RestTemplate 빈 설정
     */
    private RestTemplate createRestTemplate() {
        RestTemplateBuilder builder = new RestTemplateBuilder();

        // Spring Boot 3.4.0+ 새로운 방식
        return builder
                .connectTimeout(Duration.ofMillis(connectionTimeout))
                .readTimeout(Duration.ofMillis(readTimeout))
                .build();
    }

    /**
     * AI 서버에서 상품 추천 받기
     */
    public List<String> getRecommendations(String userId, Integer gender, Integer age,
                                           List<String> cartProductIds, List<String> wishlistProductIds) {
        try {
            System.out.println("=== AI 추천 요청 시작 ===");
            System.out.println("사용자: " + userId + ", 성별: " + gender + ", 나이: " + age);
            System.out.println("바구니: " + cartProductIds);
            System.out.println("찜목록: " + wishlistProductIds);

            // 1. 요청 데이터 구성
            Map<String, Object> requestData = createRequestData(userId, gender, age, cartProductIds, wishlistProductIds);

            // 2. HTTP 요청 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // 3. HTTP 요청 엔티티 생성
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestData, headers);

            System.out.println("AI 서버 요청: " + objectMapper.writeValueAsString(requestData));

            // 4. AI 서버에 POST 요청
            RestTemplate restTemplate = createRestTemplate();
            ResponseEntity<Map> response = restTemplate.exchange(
                    recommendationUrl,
                    HttpMethod.POST,
                    requestEntity,
                    Map.class
            );

            // 5. 응답 처리
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<String> recommendations = extractRecommendations(response.getBody());
                System.out.println("AI 추천 결과: " + recommendations);
                System.out.println("=== AI 추천 요청 완료 ===");
                return recommendations;
            } else {
                System.err.println("AI 서버 응답 오류 - 상태코드: " + response.getStatusCode());
                return List.of(); // 빈 리스트 반환
            }

        } catch (Exception e) {
            System.err.println("AI 추천 요청 실패: " + e.getMessage());
            // 네트워크 오류나 AI 서버 장애 시에도 서비스는 계속 동작
            return List.of(); // 빈 리스트 반환
        }
    }

    /**
     * AI 서버 요청 데이터 생성
     */
    private Map<String, Object> createRequestData(String userId, Integer gender, Integer age,
                                                  List<String> cartProductIds, List<String> wishlistProductIds) {
        Map<String, Object> requestData = new HashMap<>();

        requestData.put("user_id", userId);
        // null인 경우 0으로 변환하여 전송
        requestData.put("gender", gender != null ? gender.toString() : "0");
        requestData.put("age", age != null ? age : 0);
        requestData.put("cart", cartProductIds != null ? cartProductIds : List.of());
        requestData.put("wishlist", wishlistProductIds != null ? wishlistProductIds : List.of());

        return requestData;
    }

    /**
     * AI 서버 응답에서 추천 상품 ID 리스트 추출
     */
    @SuppressWarnings("unchecked")
    private List<String> extractRecommendations(Map<String, Object> responseBody) {
        try {
            Object recommendationsObj = responseBody.get("recommendations");

            if (recommendationsObj instanceof List) {
                List<Object> recommendationsList = (List<Object>) recommendationsObj;

                // Object 리스트를 String 리스트로 변환
                return recommendationsList.stream()
                        .map(Object::toString)
                        .toList();
            } else {
                System.err.println("AI 서버 응답 형식 오류 - recommendations가 리스트가 아님");
                return List.of();
            }

        } catch (Exception e) {
            System.err.println("AI 서버 응답 파싱 실패: " + e.getMessage());
            return List.of();
        }
    }
}