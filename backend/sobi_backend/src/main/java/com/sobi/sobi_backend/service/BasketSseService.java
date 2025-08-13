package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.service.BasketCacheService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
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
 * 6. **총 가격 계산 후 반환** (MQTT 발행에서 재사용)
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
     * 고객별 하트비트 스레드 참조 관리
     * Key: customerId (고객 ID)
     * Value: Thread (하트비트 스레드)
     */
    private final Map<Integer, Thread> heartbeatThreads = new ConcurrentHashMap<>();

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
                cleanupHeartbeatThread(customerId);
            });

            emitter.onTimeout(() -> {
                System.out.println("SSE 연결 타임아웃으로 종료: 고객ID=" + customerId);
                cleanupHeartbeatThread(customerId);
            });

            emitter.onError((ex) -> {
                System.err.println("SSE 연결 오류로 종료: 고객ID=" + customerId + ", 오류=" + ex.getMessage());
                cleanupHeartbeatThread(customerId);
            });

            // 하트비트 스케줄러 시작
            startHeartbeat(customerId, emitter);

            // 연결 즉시 1초 후 하트비트 전송 (연결 확인용)
            sendImmediateHeartbeat(customerId, emitter);

            System.out.println("SSE 연결 추가 완료: 고객ID=" + customerId);
            logConnectionStatus();

        } catch (Exception e) {
            System.err.println("SSE 연결 추가 실패: " + e.getMessage());
            throw new RuntimeException("SSE 연결 등록 중 오류 발생", e);
        }
    }

    /**
     * 연결 1초 후 하트비트 전송 (연결 확인용) - 1초 지연으로 안정화
     */
    private void sendImmediateHeartbeat(Integer customerId, SseEmitter emitter) {
        // 1초 후에 하트비트 전송 (연결 안정화 대기)
        CompletableFuture.delayedExecutor(1, TimeUnit.SECONDS).execute(() -> {
            try {
                if (customerEmitters.containsKey(customerId)) {
                    Map<String, Object> heartbeatData = new HashMap<>();
                    heartbeatData.put("type", "heartbeat");
                    heartbeatData.put("timestamp", System.currentTimeMillis());
                    heartbeatData.put("connection", "established");

                    emitter.send(SseEmitter.event()
                            .name("heartbeat")
                            .data(heartbeatData));

                    System.out.println("연결 즉시 하트비트 전송: 고객ID=" + customerId);
                }
            } catch (Exception e) {
                System.err.println("연결 즉시 하트비트 전송 실패: 고객ID=" + customerId + ", 오류=" + e.getMessage());
                // 즉시 하트비트 전송 실패 시 연결 제거
                cleanupHeartbeatThread(customerId);
            }
        });
    }

    /**
     * 하트비트 메시지 전송 스케줄러
     */
    private void startHeartbeat(Integer customerId, SseEmitter emitter) {
        Thread heartbeatThread = new Thread(() -> {
            try {
                while (!Thread.currentThread().isInterrupted() && customerEmitters.containsKey(customerId)) {
                    Thread.sleep(60000); // 1분마다 하트비트 전송

                    if (customerEmitters.containsKey(customerId)) {
                        try {
                            Map<String, Object> heartbeatData = new HashMap<>();
                            heartbeatData.put("type", "heartbeat");
                            heartbeatData.put("timestamp", System.currentTimeMillis());

                            emitter.send(SseEmitter.event()
                                    .name("heartbeat")
                                    .data(heartbeatData));

                            System.out.println("하트비트 전송: 고객ID=" + customerId);
                        } catch (Exception e) {
                            System.err.println("하트비트 전송 실패: 고객ID=" + customerId + ", 오류=" + e.getMessage());
                            // 하트비트 전송 실패 시 연결 제거
                            cleanupHeartbeatThread(customerId);
                            break;
                        }
                    }
                }
            } catch (InterruptedException e) {
                System.out.println("하트비트 스레드 중단: 고객ID=" + customerId);
            }
        });
        heartbeatThread.setDaemon(true);
        heartbeatThread.setName("SSE-Heartbeat-" + customerId);

        // 스레드 참조 저장 (핵심 변경사항)
        heartbeatThreads.put(customerId, heartbeatThread);

        heartbeatThread.start();
    }

    /**
     * 특정 고객에게 바구니 업데이트 알림 및 총 가격 반환
     *
     * @param customerId 고객 ID
     * @param eventName SSE 이벤트명
     * @return 계산된 총 가격 (MQTT 발행에서 재사용)
     */
    public int notifyCustomer(Integer customerId, String eventName) {
        try {
            SseEmitter emitter = customerEmitters.get(customerId);
            if (emitter == null) {
                System.out.println("SSE 알림 대상 없음: 고객ID=" + customerId);
            }

            // Redis에서 고객의 바구니 ID 조회
            String basketIdStr = redisTemplate.opsForValue().get("user_basket:" + customerId);
            if (basketIdStr == null) {
                System.out.println("고객의 사용 중인 바구니 없음: 고객ID=" + customerId);
                return 0;
            }

            Integer basketId = Integer.parseInt(basketIdStr);

            // 현재 바구니 상태 조회 (상품 정보 포함)
            List<BasketCacheService.BasketItemInfo> basketItems =
                    basketCacheService.getBasketItemsWithProductInfo(basketId);

            // AI 추천 상품 조회
            List<Product> recommendedProducts = getRecommendedProducts(customerId, basketItems);

            // 총 가격 계산 (할인 적용된 가격)
            int totalPrice = basketItems.stream()
                    .mapToInt(BasketCacheService.BasketItemInfo::getTotalPrice)
                    .sum();

            // SSE 연결이 있을 때만 전송
            if (emitter != null) {
                // 응답 데이터 생성 (계산된 총 가격 전달)
                Map<String, Object> responseData = createBasketResponse(basketItems, basketId, recommendedProducts, totalPrice);

                System.out.println("[SSE] 알림 전송 시작: 고객ID=" + customerId + ", basketId=" + basketId + ", 총가격=" + totalPrice + ", 추천상품수=" + recommendedProducts.size());

                try {
                    emitter.send(SseEmitter.event()
                            .name(eventName)
                            .data(responseData));

                    System.out.println("[SSE] 알림 전송 성공: 고객ID=" + customerId);

                } catch (Exception e) {
                    System.err.println("[SSE] 알림 전송 실패: 고객ID=" + customerId + ", 오류=" + e.getMessage());

                    // 전송 실패한 연결 제거
                    cleanupHeartbeatThread(customerId);

                    try {
                        emitter.completeWithError(e);
                    } catch (Exception ignored) {}
                }
            }

            // 계산된 총 가격 반환 (MQTT 발행에서 재사용)
            return totalPrice;

        } catch (Exception e) {
            System.err.println("SSE 고객 알림 중 오류: " + e.getMessage());
            return 0;
        }
    }

    /**
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
                    previousEmitter.completeWithError(new RuntimeException("Connection replaced"));
                    System.out.println("기존 SSE 연결 정리 완료: 고객ID=" + customerId);
                } catch (Exception e) {
                    System.err.println("기존 SSE 연결 종료 실패: " + e.getMessage());
                }
            }

            // 하트비트 스레드 중단
            Thread heartbeatThread = heartbeatThreads.remove(customerId);
            if (heartbeatThread != null) {
                heartbeatThread.interrupt();
                System.out.println("하트비트 스레드 중단: 고객ID=" + customerId);
            }
        } catch (Exception e) {
            System.err.println("고객 연결 제거 실패: " + e.getMessage());
        }
    }

    /**
     * 하트비트 스레드 정리 (중복 코드 제거용 헬퍼 메서드)
     */
    private void cleanupHeartbeatThread(Integer customerId) {
        customerEmitters.remove(customerId);
        Thread heartbeatThread = heartbeatThreads.remove(customerId);
        if (heartbeatThread != null) {
            heartbeatThread.interrupt();
        }
    }

    /**
     * 고객 연결 강제 해제 (결제 완료 시 호출)
     */
    public void removeCustomerConnection(Integer customerId) {
        cleanupHeartbeatThread(customerId);
        System.out.println("고객 연결 강제 해제 완료: 고객ID=" + customerId);
    }

    /**
     * SSE로 전송할 바구니 응답 데이터 생성
     */
    public Map<String, Object> createBasketResponse(List<BasketCacheService.BasketItemInfo> basketItems,
                                                    Integer basketId, List<Product> recommendedProducts, int totalPrice) {
        // 총 아이템 개수 계산
        int totalCount = basketItems.stream()
                .mapToInt(BasketCacheService.BasketItemInfo::getQuantity)
                .sum();

        Map<String, Object> response = new HashMap<>();
        response.put("items", basketItems);
        response.put("totalCount", totalCount);
        response.put("totalPrice", totalPrice); // 전달받은 총 가격 사용
        response.put("basketId", basketId);
        response.put("recommendations", recommendedProducts);

        return response;
    }

    /**
     * 현재 연결 상태 로깅
     */
    private void logConnectionStatus() {
        System.out.println("현재 SSE 연결 상태: " + customerEmitters.size() + "명 연결");

        // 연결된 고객 ID 목록 출력
        if (!customerEmitters.isEmpty()) {
            System.out.println("연결된 고객 ID: " + customerEmitters.keySet());
        }
    }

    /**
     * 연결 상태 상세 정보 조회
     */
    public Map<String, Object> getConnectionStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("totalConnections", customerEmitters.size());
        status.put("connectedCustomerIds", new ArrayList<>(customerEmitters.keySet()));
        status.put("timestamp", System.currentTimeMillis());
        return status;
    }

    /**
     * 특정 고객의 연결 상태 확인
     */
    public boolean isCustomerConnected(Integer customerId) {
        return customerEmitters.containsKey(customerId);
    }
}