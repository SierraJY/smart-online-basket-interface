package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.service.BasketSseService;
import com.sobi.sobi_backend.service.BasketCacheService;
import com.sobi.sobi_backend.config.filter.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/baskets")
public class BasketSseController {

    @Autowired
    private BasketSseService basketSseService;

    @Autowired
    private BasketCacheService basketCacheService;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    /**
     * 바구니 실시간 업데이트 SSE 스트림 연결
     *
     * 사용법:
     * const eventSource = new EventSource('/api/baskets/my/stream', {
     *     headers: { 'Authorization': 'Bearer ' + token }
     * });
     *
     * eventSource.addEventListener('basket-update', (event) => {
     *     const basketItems = JSON.parse(event.data);
     *     updateBasketUI(basketItems);
     * });
     */
    @GetMapping(value = "/my/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamBasketUpdates(Authentication authentication) {
        try {
            System.out.println("바구니 SSE 연결 요청");

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                System.err.println("SSE 연결 실패: 인증되지 않은 사용자");
                SseEmitter errorEmitter = new SseEmitter(1000L);
                try {
                    errorEmitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"error\":\"로그인이 필요합니다\"}"));
                    errorEmitter.complete();
                } catch (Exception ignored) {}
                return errorEmitter;
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // Redis에서 사용자의 바구니 ID 조회
            String basketIdStr = redisTemplate.opsForValue().get("user_basket:" + customerId);
            if (basketIdStr == null) {
                System.err.println("SSE 연결 실패: 사용 중인 바구니가 없음");
                SseEmitter errorEmitter = new SseEmitter(1000L);
                try {
                    errorEmitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"error\":\"사용 중인 바구니가 없습니다\"}"));
                    errorEmitter.complete();
                } catch (Exception ignored) {}
                return errorEmitter;
            }

            Integer basketId;
            try {
                basketId = Integer.parseInt(basketIdStr);
            } catch (NumberFormatException e) {
                System.err.println("SSE 연결 실패: 바구니 ID 파싱 오류");
                SseEmitter errorEmitter = new SseEmitter(1000L);
                try {
                    errorEmitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"error\":\"바구니 정보가 올바르지 않습니다\"}"));
                    errorEmitter.complete();
                } catch (Exception ignored) {}
                return errorEmitter;
            }

            // SSE Emitter 생성 (30분 타임아웃)
            SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);

            // SSE 서비스에 등록
            basketSseService.addEmitter(basketId, customerId, emitter);

            // 연결 즉시 현재 바구니 상태 전송
            List<BasketCacheService.BasketItemInfo> currentItems =
                    basketCacheService.getBasketItemsWithProductInfo(basketId);

            try {
                emitter.send(SseEmitter.event()
                        .name("basket-initial")
                        .data(createBasketResponse(currentItems, basketId)));

                System.out.println("SSE 초기 데이터 전송 완료");
            } catch (Exception e) {
                System.err.println("초기 데이터 전송 실패: " + e.getMessage());
            }

            System.out.println("바구니 SSE 연결 성공: 고객ID=" + customerId + ", basketId=" + basketId);
            return emitter; // 직접 SseEmitter 반환

        } catch (Exception e) {
            System.err.println("바구니 SSE 연결 실패: " + e.getMessage());
            e.printStackTrace();

            SseEmitter errorEmitter = new SseEmitter(1000L);
            try {
                errorEmitter.send(SseEmitter.event()
                        .name("error")
                        .data("{\"error\":\"SSE 연결 중 오류가 발생했습니다\"}"));
                errorEmitter.complete();
            } catch (Exception ignored) {}
            return errorEmitter;
        }
    }

    /**
     * SSE로 전송할 바구니 응답 데이터 생성
     */
    private Map<String, Object> createBasketResponse(List<BasketCacheService.BasketItemInfo> basketItems, Integer basketId) {
        // 총 가격 계산
        int totalPrice = basketItems.stream()
                .mapToInt(BasketCacheService.BasketItemInfo::getTotalPrice)
                .sum();

        // 총 아이템 개수 계산
        int totalCount = basketItems.stream()
                .mapToInt(BasketCacheService.BasketItemInfo::getQuantity)
                .sum();

        Map<String, Object> response = new HashMap<>();
        response.put("items", basketItems);
        response.put("totalCount", totalCount);
        response.put("totalPrice", totalPrice);
        response.put("basketId", basketId);
        response.put("timestamp", System.currentTimeMillis());

        return response;
    }
}