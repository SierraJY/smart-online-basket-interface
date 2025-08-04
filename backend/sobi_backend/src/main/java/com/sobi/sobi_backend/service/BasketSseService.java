package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.service.BasketCacheService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 바구니 실시간 업데이트를 위한 SSE 관리 서비스
 *
 * 기능:
 * 1. 고객별 SSE 연결 관리 (1:1 구조)
 * 2. MQTT 메시지 수신 시 해당 고객에게만 실시간 전송
 * 3. AI 서버에서 추천 상품 받아서 함께 전송
 * 4. 연결 해제 및 타임아웃 관리
 * 5. 고객별 단일 연결 보장
 */
@Service
public class BasketSseService {

    @Autowired
    private BasketCacheService basketCacheService;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Autowired
    private RecommendationService recommendationService;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private FavoriteService favoriteService;

    @Autowired
    private ProductService productService;

    /**
     * 고객별 SSE 연결 관리
     * Key: customerId (고객 ID)
     * Value: SseEmitter (연결)
     */
    private final Map<Integer, SseEmitter> customerEmitters = new ConcurrentHashMap<>();

    /**
     * SSE 연결 추가
     *
     * @param customerId 고객 ID
     * @param emitter SSE Emitter
     */
    public void addEmitter(Integer customerId, SseEmitter emitter) {
        try {
            // 기존 연결이 있다면 해제
            removeCustomerEmitter(customerId);

            // 새로운 연결 등록
            customerEmitters.put(customerId, emitter);

            // 연결 종료 시 정리 작업 등록
            emitter.onCompletion(() -> {
                System.out.println("SSE 연결 정상 종료: 고객ID=" + customerId);
                customerEmitters.remove(customerId);
            });

            emitter.onTimeout(() -> {
                System.out.println("SSE 연결 타임아웃으로 종료: 고객ID=" + customerId);
                customerEmitters.remove(customerId);
            });

            emitter.onError((ex) -> {
                System.err.println("SSE 연결 오류로 종료: 고객ID=" + customerId + ", 오류=" + ex.getMessage());
                customerEmitters.remove(customerId);
            });

            System.out.println("SSE 연결 추가 완료: 고객ID=" + customerId);
            logConnectionStatus();

        } catch (Exception e) {
            System.err.println("SSE 연결 추가 실패: " + e.getMessage());
            throw new RuntimeException("SSE 연결 등록 중 오류 발생", e);
        }
    }

    /**
     * 특정 고객에게 바구니 업데이트 알림
     *
     * @param customerId 고객 ID
     * @param eventName SSE 이벤트명
     */
    public void notifyCustomer(Integer customerId, String eventName) {
        try {
            SseEmitter emitter = customerEmitters.get(customerId);
            if (emitter == null) {
                System.out.println("SSE 알림 대상 없음: 고객ID=" + customerId);
                return;
            }

            // Redis에서 고객의 바구니 ID 조회
            String basketIdStr = redisTemplate.opsForValue().get("user_basket:" + customerId);
            if (basketIdStr == null) {
                System.out.println("고객의 사용 중인 바구니 없음: 고객ID=" + customerId);
                return;
            }

            Integer basketId = Integer.parseInt(basketIdStr);

            // 현재 바구니 상태 조회
            List<BasketCacheService.BasketItemInfo> basketItems =
                    basketCacheService.getBasketItemsWithProductInfo(basketId);

            // AI 추천 상품 조회
            List<Product> recommendedProducts = getRecommendedProducts(customerId, basketItems);

            // 응답 데이터 생성
            Map<String, Object> responseData = createBasketResponse(basketItems, basketId, recommendedProducts);

            System.out.println("[SSE] 알림 전송 시작: 고객ID=" + customerId + ", basketId=" + basketId + ", 추천상품수=" + recommendedProducts.size());

            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(responseData));

                System.out.println("[SSE] 알림 전송 성공: 고객ID=" + customerId);

            } catch (Exception e) {
                System.err.println("[SSE] 알림 전송 실패: 고객ID=" + customerId + ", 오류=" + e.getMessage());

                // 전송 실패한 연결 제거
                customerEmitters.remove(customerId);

                try {
                    emitter.completeWithError(e);
                } catch (Exception ignored) {}
            }

        } catch (Exception e) {
            System.err.println("SSE 고객 알림 중 오류: " + e.getMessage());
        }
    }

    /**
     * AI 서버에서 추천 상품 조회
     *
     * @param customerId 고객 ID
     * @param basketItems 현재 바구니 아이템들
     * @return 추천 상품 리스트
     */
    private List<Product> getRecommendedProducts(Integer customerId, List<BasketCacheService.BasketItemInfo> basketItems) {
        try {
            // 1. 고객 정보 조회
            Optional<Customer> customerOpt = customerService.getCustomerById(customerId);
            if (customerOpt.isEmpty()) {
                System.err.println("고객 정보 조회 실패: customerId=" + customerId);
                return List.of();
            }

            Customer customer = customerOpt.get();
            String userId = customer.getUserId();
            Integer gender = customer.getGender();
            Integer age = customer.getAge();

            // 2. 현재 바구니의 상품 ID 리스트 생성
            List<String> cartProductIds = basketItems.stream()
                    .map(item -> item.getProduct() != null ? item.getProduct().getId().toString() : null)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            // 3. 찜 목록 조회
            List<Product> favoriteProducts = favoriteService.getFavoriteProducts(customerId);
            List<String> wishlistProductIds = favoriteProducts.stream()
                    .map(product -> product.getId().toString())
                    .collect(Collectors.toList());

            // 4. AI 서버에 추천 요청
            List<String> recommendedProductIds = recommendationService.getRecommendations(
                    userId, gender, age, cartProductIds, wishlistProductIds);

            // 5. 추천 상품 ID를 Product 객체로 변환
            List<Product> recommendedProducts = new ArrayList<>();
            for (String productIdStr : recommendedProductIds) {
                try {
                    Integer productId = Integer.parseInt(productIdStr);
                    Optional<Product> productOpt = productService.getProductById(productId);
                    productOpt.ifPresent(recommendedProducts::add);
                } catch (NumberFormatException e) {
                    System.err.println("추천 상품 ID 파싱 실패: " + productIdStr);
                }
            }

            System.out.println("추천 상품 조회 완료: 고객ID=" + customerId + ", 추천수=" + recommendedProducts.size());
            return recommendedProducts;

        } catch (Exception e) {
            System.err.println("추천 상품 조회 실패: " + e.getMessage());
            return List.of();
        }
    }

    /**
     * 고객의 기존 연결 제거
     */
    private void removeCustomerEmitter(Integer customerId) {
        try {
            SseEmitter previousEmitter = customerEmitters.remove(customerId);
            if (previousEmitter != null) {
                try {
                    previousEmitter.complete();
                    System.out.println("기존 SSE 연결 정리 완료: 고객ID=" + customerId);
                } catch (Exception e) {
                    System.err.println("기존 SSE 연결 종료 실패: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.err.println("고객 연결 제거 실패: " + e.getMessage());
        }
    }

    /**
     * SSE로 전송할 바구니 응답 데이터 생성
     */
    public Map<String, Object> createBasketResponse(List<BasketCacheService.BasketItemInfo> basketItems,
                                                    Integer basketId, List<Product> recommendedProducts) {
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
        response.put("recommendations", recommendedProducts);
        response.put("timestamp", System.currentTimeMillis());

        return response;
    }

    /**
     * 현재 연결 상태 로깅
     */
    private void logConnectionStatus() {
        System.out.println("현재 SSE 연결 상태: " + customerEmitters.size() + "명 연결");
    }
}