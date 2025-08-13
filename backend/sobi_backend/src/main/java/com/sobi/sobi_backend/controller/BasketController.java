package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.entity.Basket;
import com.sobi.sobi_backend.service.BasketService;
import com.sobi.sobi_backend.service.ReceiptService;
import com.sobi.sobi_backend.service.BasketCacheService;
import com.sobi.sobi_backend.service.BasketSseService;
import com.sobi.sobi_backend.config.filter.JwtAuthenticationFilter;
import com.sobi.sobi_backend.config.handler.BasketMqttHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/baskets") // /api/baskets로 시작하는 모든 요청 처리
public class BasketController {

    @Autowired
    private BasketService basketService; // 바구니 관리 서비스

    @Autowired
    private ReceiptService receiptService; // 결제 처리 서비스

    @Autowired
    private RedisTemplate<String, String> redisTemplate; // Redis 연동

    @Autowired
    private BasketCacheService basketCacheService; // 바구니 캐시 서비스

    @Autowired
    private BasketMqttHandler basketMqttHandler; // MQTT 메시지 발행 핸들러 추가

    @Autowired
    private BasketSseService basketSseService; // SSE 서비스

    // application.properties에서 바구니 캐시 TTL 주입 (BasketCacheService와 동일)
    @Value("${app.basket.cache-ttl-seconds}")
    private long basketTtlSeconds;

    // Properties에서 가져온 TTL 값으로 Duration 생성
    private Duration getBasketTtl() {
        return Duration.ofSeconds(basketTtlSeconds);
    }

    // 바구니 사용 시작 (POST /api/baskets/start/{basketId})
    @PostMapping("/start/{basketId}")
    public ResponseEntity<?> startBasket(@PathVariable Integer basketId, Authentication authentication) {
        try {
            System.out.println("바구니 사용 시작 요청: basketId=" + basketId);

            // basketId 검증
            if (basketId == null || basketId <= 0) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "유효하지 않은 바구니 ID입니다");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "로그인이 필요합니다");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error); // 401 Unauthorized
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // 기존 사용 중인 바구니 확인
            String existingBasket = redisTemplate.opsForValue().get("user_basket:" + customerId);
            if (existingBasket != null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "이미 사용 중인 바구니가 있습니다: " + existingBasket);
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // 바구니 존재 확인
            Optional<Basket> basketOpt = basketService.getBasketById(basketId);
            if (basketOpt.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "존재하지 않는 바구니입니다: " + basketId);
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            Basket basket = basketOpt.get();

            // 바구니 사용 가능 여부 확인
            if (!basket.getUsable()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "사용할 수 없는 바구니입니다: " + basketId);
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // 바구니 사용 시작 (상태 변경)
            basketService.startUsingBasket(basketId);

            try {
                // MQTT 시작 메시지 발행 먼저 시도 (WakeUp)
                basketMqttHandler.publishStartMessage(basketId);

                // MQTT 발행 성공 후 Redis 매핑 저장
                Duration ttl = getBasketTtl();
                redisTemplate.opsForValue().set("user_basket:" + customerId, basketId.toString(), ttl);
                redisTemplate.opsForValue().set("basket_user:" + basketId, customerId.toString(), ttl);

                Map<String, Object> response = new HashMap<>();
                response.put("message", "바구니 사용을 시작했습니다");
                response.put("basket", basket);
                response.put("customerId", customerId);
                response.put("basketId", basketId);

                System.out.println("바구니 사용 시작 완료: basketId=" + basketId + ", 고객ID=" + customerId + ", MQTT 시작 메시지 발행 완료, Redis 양방향 매핑 저장 완료 (TTL: " + basketTtlSeconds + "초)");
                return ResponseEntity.ok(response); // 200 OK

            } catch (RuntimeException mqttException) {
                // MQTT 발행 실패 시 바구니 상태 롤백
                System.err.println("바구니 시작 중 오류로 롤백 진행: " + mqttException.getMessage());

                try {
                    basketService.returnBasket(basketId); // 바구니 상태를 사용 가능으로 되돌림
                    System.out.println("바구니 상태 롤백 완료: basketId=" + basketId);
                } catch (Exception rollbackException) {
                    System.err.println("바구니 상태 롤백 실패: " + rollbackException.getMessage());
                    // 롤백 실패해도 MQTT 오류를 우선적으로 반환
                }

                Map<String, String> error = new HashMap<>();
                error.put("error", "바구니 시작 신호 전송에 실패했습니다. 다시 시도해주세요.");
                error.put("detail", mqttException.getMessage());
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error); // 503 Service Unavailable
            }

        } catch (Exception e) {
            System.err.println("바구니 사용 시작 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "바구니 사용 시작 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 내 바구니 내용 조회 (GET /api/baskets/my/items)
    @GetMapping("/my/items")
    public ResponseEntity<?> getMyBasketItems(Authentication authentication) {
        try {
            System.out.println("내 바구니 내용 조회 요청");

            // 인증 및 바구니 조회 공통 로직
            BasketInfo basketInfo = getBasketInfo(authentication);
            if (basketInfo.errorResponse != null) {
                return basketInfo.errorResponse;
            }

            Basket basket = basketInfo.basket;

            // Redis에서 실제 바구니 데이터 조회 (상품 정보 포함)
            List<BasketCacheService.BasketItemInfo> basketItems =
                    basketCacheService.getBasketItemsWithProductInfo(basketInfo.basketId);

            // 총 가격 계산
            int totalPrice = basketItems.stream()
                    .mapToInt(BasketCacheService.BasketItemInfo::getTotalPrice)
                    .sum();

            // 총 아이템 개수 계산
            int totalCount = basketItems.stream()
                    .mapToInt(BasketCacheService.BasketItemInfo::getQuantity)
                    .sum();

            // 응답 구성
            Map<String, Object> response = new HashMap<>();
            response.put("message", "바구니 내용 조회 완료");
            response.put("basket", basket);
            response.put("items", basketItems);           // 실제 상품 정보 리스트
            response.put("totalCount", totalCount);       // 전체 아이템 개수
            response.put("totalPrice", totalPrice);       // 전체 가격 (할인 적용됨)
            response.put("basketId", basketInfo.basketId);

            System.out.println("바구니 내용 조회 완료: 고객ID=" + basketInfo.customerId + ", basketId=" + basketInfo.basketId + ", 아이템수=" + totalCount);
            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            System.err.println("바구니 내용 조회 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "바구니 내용 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 내 바구니 결제 + 바구니 반납 (POST /api/baskets/my/checkout)
    @PostMapping("/my/checkout")
    public ResponseEntity<?> checkoutMyBasket(Authentication authentication) {
        try {
            System.out.println("내 바구니 결제 요청");

            // 인증 및 바구니 조회 공통 로직
            BasketInfo basketInfo = getBasketInfo(authentication);
            if (basketInfo.errorResponse != null) {
                return basketInfo.errorResponse;
            }

            // EPC 패턴 목록으로 결제 처리
            List<String> epcPatterns = basketCacheService.getEpcPatternsForCheckout(basketInfo.basketId);

            // 바구니가 비어있는지 확인
            if (epcPatterns.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "구매할 상품이 없습니다");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // 결제 처리 (Redis에서 가져온 EPC 패턴들로 자동 결제)
            var receipt = receiptService.createReceiptFromEpcPatterns(basketInfo.customerId, epcPatterns);

            // 바구니 정리 및 MQTT 종료 메시지 발행
            cleanupBasket(basketInfo.customerId, basketInfo.basketId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "결제가 완료되었습니다");
            response.put("receipt", receipt);
            response.put("basketReturned", true);
            response.put("epcPatterns", epcPatterns);
            response.put("totalItems", epcPatterns.size());
            response.put("basketId", basketInfo.basketId);

            System.out.println("바구니 결제 및 반납 완료: 고객ID=" + basketInfo.customerId + ", basketId=" + basketInfo.basketId + ", 영수증ID=" + receipt.getId() + ", Redis 양방향 매핑 삭제 완료, MQTT 종료 메시지 발행 완료");
            return ResponseEntity.ok(response); // 200 OK
        } catch (IllegalArgumentException e) { // 유효하지 않은 EPC 패턴 등
            System.err.println("바구니 결제 실패: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error); // 400 Bad Request
        } catch (Exception e) {
            System.err.println("바구니 결제 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "결제 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 내 바구니 사용 취소 (POST /api/baskets/my/cancel)
    @PostMapping("/my/cancel")
    public ResponseEntity<?> cancelMyBasket(Authentication authentication) {
        try {
            System.out.println("내 바구니 사용 취소 요청");

            // 인증 및 바구니 조회 공통 로직
            BasketInfo basketInfo = getBasketInfo(authentication);
            if (basketInfo.errorResponse != null) {
                return basketInfo.errorResponse;
            }

            // 바구니가 비어있는지 확인
            Map<String, Integer> basketItems = basketCacheService.getBasketItems(basketInfo.basketId);
            if (!basketItems.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "바구니에 상품이 있어 취소할 수 없습니다. 결제를 진행하거나 상품을 모두 제거해주세요");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // 바구니 정리 및 MQTT 종료 메시지 발행
            cleanupBasket(basketInfo.customerId, basketInfo.basketId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "바구니 사용이 취소되었습니다");
            response.put("basketReturned", true);
            response.put("basketId", basketInfo.basketId);
            response.put("customerId", basketInfo.customerId);

            System.out.println("바구니 사용 취소 완료: 고객ID=" + basketInfo.customerId + ", basketId=" + basketInfo.basketId + ", Redis 양방향 매핑 삭제 완료, MQTT 종료 메시지 발행 완료");
            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            System.err.println("바구니 사용 취소 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "바구니 사용 취소 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 인증 및 바구니 조회 공통 로직
    private BasketInfo getBasketInfo(Authentication authentication) {
        BasketInfo info = new BasketInfo();

        // 인증된 사용자 정보 가져오기
        if (authentication == null || !authentication.isAuthenticated()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "로그인이 필요합니다");
            info.errorResponse = ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            return info;
        }

        JwtAuthenticationFilter.JwtUserPrincipal principal =
                (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
        info.customerId = principal.getId();

        // Redis에서 사용자의 바구니 ID 조회
        String basketIdStr = redisTemplate.opsForValue().get("user_basket:" + info.customerId);
        if (basketIdStr == null) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "사용 중인 바구니가 없습니다");
            info.errorResponse = ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            return info;
        }

        try {
            info.basketId = Integer.parseInt(basketIdStr);
        } catch (NumberFormatException e) {
            // Redis 데이터 불일치 - 정리
            redisTemplate.delete("user_basket:" + info.customerId);
            redisTemplate.delete("basket_user:" + basketIdStr);
            Map<String, String> error = new HashMap<>();
            error.put("error", "바구니 정보가 올바르지 않습니다. 다시 시작해주세요");
            info.errorResponse = ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            return info;
        }

        // 바구니 존재 및 사용 중 확인
        Optional<Basket> basketOpt = basketService.getBasketById(info.basketId);
        if (basketOpt.isEmpty()) {
            // Redis 데이터 불일치 - 정리
            redisTemplate.delete("user_basket:" + info.customerId);
            redisTemplate.delete("basket_user:" + info.basketId);
            Map<String, String> error = new HashMap<>();
            error.put("error", "바구니 정보가 일치하지 않습니다. 다시 시작해주세요");
            info.errorResponse = ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            return info;
        }

        info.basket = basketOpt.get();
        if (info.basket.getUsable()) {
            // Redis 데이터 불일치 - 정리
            redisTemplate.delete("user_basket:" + info.customerId);
            redisTemplate.delete("basket_user:" + info.basketId);
            Map<String, String> error = new HashMap<>();
            error.put("error", "사용 중이지 않은 바구니입니다");
            info.errorResponse = ResponseEntity.badRequest().body(error);
            return info;
        }

        return info;
    }

    // 바구니 정리 공통 로직
    private void cleanupBasket(Integer customerId, Integer basketId) {
        // 바구니 반납 (결제 완료 또는 취소 후)
        basketService.returnBasket(basketId);

        // Redis에서 바구니 데이터 삭제
        basketCacheService.clearBasketItems(basketId);

        // Redis에서 양방향 매핑 삭제
        redisTemplate.delete("user_basket:" + customerId);
        redisTemplate.delete("basket_user:" + basketId);

        // MQTT 종료 메시지 발행
        basketMqttHandler.publishEndMessage(basketId);

        // SSE 연결 해제
        basketSseService.removeCustomerConnection(customerId);
    }

    // 바구니 정보를 담는 내부 클래스
    private static class BasketInfo {
        Integer customerId;
        Integer basketId;
        Basket basket;
        ResponseEntity<?> errorResponse;
    }
}