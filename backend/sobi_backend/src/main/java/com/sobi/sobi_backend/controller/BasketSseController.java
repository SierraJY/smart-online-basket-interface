package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.config.handler.BasketMqttHandler;
import com.sobi.sobi_backend.service.BasketSseService;
import com.sobi.sobi_backend.service.BasketCacheService;
import com.sobi.sobi_backend.config.filter.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/baskets")
public class BasketSseController {

    @Autowired
    private BasketSseService basketSseService;

    @Autowired
    private BasketMqttHandler basketMqttHandler; // 추가

    @Autowired
    private BasketCacheService basketCacheService;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    // SSE 타임아웃 상수
    private static final long SSE_TIMEOUT_MS = 30 * 60 * 1000L; // 30분
    private static final long ERROR_EMITTER_TIMEOUT_MS = 5000L;  // 5초

    // 바구니 실시간 업데이트 SSE 스트림 연결
    @GetMapping(value = "/my/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamBasketUpdates(Authentication authentication) {
        try {
            System.out.println("바구니 SSE 연결 요청");

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                System.err.println("SSE 연결 실패: 인증되지 않은 사용자");
                return makeErrorEmitter("error", "{\"error\":\"로그인이 필요합니다\"}");
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // Redis에서 사용자의 바구니 ID 조회
            String basketIdStr = redisTemplate.opsForValue().get("user_basket:" + customerId);
            if (basketIdStr == null) {
                System.err.println("SSE 연결 실패: 사용 중인 바구니가 없음");
                return makeErrorEmitter("error", "{\"error\":\"사용 중인 바구니가 없습니다\"}");
            }

            Integer basketId;
            try {
                basketId = Integer.parseInt(basketIdStr);
            } catch (NumberFormatException e) {
                System.err.println("SSE 연결 실패: 바구니 ID 파싱 오류");
                return makeErrorEmitter("error", "{\"error\":\"바구니 정보가 올바르지 않습니다\"}");
            }

            // SSE Emitter 생성
            SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);

            // SSE 서비스에 등록
            basketSseService.addEmitter(customerId, emitter);

            // 연결 즉시 현재 바구니 상태 전송
            int totalPrice = basketSseService.notifyCustomer(customerId, "basket-initial");

            // 초기 총 가격도 MQTT로 발행
            basketMqttHandler.publishTotalPrice(basketId, totalPrice);

            System.out.println("바구니 SSE 연결 성공: 고객ID=" + customerId + ", basketId=" + basketId);
            return emitter;

        } catch (Exception e) {
            System.err.println("바구니 SSE 연결 실패: " + e.getMessage());
            e.printStackTrace();

            return makeErrorEmitter("error", "{\"error\":\"SSE 연결 중 오류가 발생했습니다\"}");
        }
    }

    /**
     * 에러 응답용 SseEmitter 생성
     */
    private SseEmitter makeErrorEmitter(String eventName, String data) {
        SseEmitter errorEmitter = new SseEmitter(ERROR_EMITTER_TIMEOUT_MS);

        try {
            errorEmitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(data));
            errorEmitter.complete();
        } catch (Exception ignored) {}
        return errorEmitter;
    }
}