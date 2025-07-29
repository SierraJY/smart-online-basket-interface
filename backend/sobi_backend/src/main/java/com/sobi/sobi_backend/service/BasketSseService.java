package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.service.BasketCacheService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 바구니 실시간 업데이트를 위한 SSE 관리 서비스
 *
 * 기능:
 * 1. 바구니별 SSE 연결 관리
 * 2. MQTT 메시지 수신 시 해당 바구니 사용자들에게 실시간 전송
 * 3. 연결 해제 및 타임아웃 관리
 * 4. 사용자별 중복 연결 관리
 */
@Service
public class BasketSseService {

    @Autowired
    private BasketCacheService basketCacheService;

    /**
     * 바구니 MAC 주소별 SSE 연결 관리
     * Key: boardMac (바구니 MAC 주소)
     * Value: Map<customerId, SseEmitter> (고객별 연결)
     */
    private final Map<String, Map<Integer, SseEmitter>> basketEmitters = new ConcurrentHashMap<>();

    /**
     * 고객별 현재 연결된 바구니 추적
     * Key: customerId
     * Value: boardMac
     */
    private final Map<Integer, String> customerBaskets = new ConcurrentHashMap<>();

    /**
     * SSE 연결 추가
     *
     * @param boardMac 바구니 MAC 주소
     * @param customerId 고객 ID
     * @param emitter SSE Emitter
     */
    public void addEmitter(String boardMac, Integer customerId, SseEmitter emitter) {
        try {
            // 기존 연결이 있다면 해제
            removeCustomerEmitter(customerId);

            // 새로운 연결 등록
            basketEmitters.computeIfAbsent(boardMac, k -> new ConcurrentHashMap<>())
                    .put(customerId, emitter);
            customerBaskets.put(customerId, boardMac);

            // 연결 종료 시 정리 작업 등록
            emitter.onCompletion(() -> {
                System.out.println("SSE 연결 완료: 고객ID=" + customerId + ", MAC=" + boardMac);
                removeEmitter(boardMac, customerId);
            });

            emitter.onTimeout(() -> {
                System.out.println("SSE 연결 타임아웃: 고객ID=" + customerId + ", MAC=" + boardMac);
                removeEmitter(boardMac, customerId);
            });

            emitter.onError((ex) -> {
                System.err.println("SSE 연결 오류: 고객ID=" + customerId + ", 오류=" + ex.getMessage());
                removeEmitter(boardMac, customerId);
            });

            System.out.println("SSE 연결 추가 완료: 고객ID=" + customerId + ", MAC=" + boardMac);
            logConnectionStatus();

        } catch (Exception e) {
            System.err.println("SSE 연결 추가 실패: " + e.getMessage());
            throw new RuntimeException("SSE 연결 등록 중 오류 발생", e);
        }
    }

    /**
     * 특정 바구니의 모든 연결된 클라이언트에게 업데이트 전송
     *
     * @param boardMac 바구니 MAC 주소
     */
    public void broadcastBasketUpdate(String boardMac) {
        try {
            Map<Integer, SseEmitter> emitters = basketEmitters.get(boardMac);
            if (emitters == null || emitters.isEmpty()) {
                System.out.println("SSE 브로드캐스트 대상 없음: " + boardMac);
                return;
            }

            // 현재 바구니 상태 조회
            List<BasketCacheService.BasketItemInfo> basketItems =
                    basketCacheService.getBasketItemsWithProductInfo(boardMac);

            // 응답 데이터 생성
            Map<String, Object> responseData = createBasketResponse(basketItems, boardMac);

            System.out.println("[SSE] 브로드캐스트 시작: " + boardMac + " → " + emitters.size() + "명 연결");

            // 각 연결된 클라이언트에게 전송
            Iterator<Map.Entry<Integer, SseEmitter>> iterator = emitters.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<Integer, SseEmitter> entry = iterator.next();
                Integer customerId = entry.getKey();
                SseEmitter emitter = entry.getValue();

                try {
                    emitter.send(SseEmitter.event()
                            .name("basket-update")
                            .data(responseData));

                    System.out.println("[SSE] 전송 성공: 고객ID=" + customerId);

                } catch (Exception e) {
                    System.err.println("[SSE] 전송 실패: 고객ID=" + customerId + ", 오류=" + e.getMessage());

                    // 전송 실패한 연결 제거
                    iterator.remove();
                    customerBaskets.remove(customerId);

                    try {
                        emitter.completeWithError(e);
                    } catch (Exception ignored) {}
                }
            }

            System.out.println("[SSE] 브로드캐스트 완료: " + boardMac);

        } catch (Exception e) {
            System.err.println("SSE 브로드캐스트 중 오류: " + e.getMessage());
        }
    }

    /**
     * 특정 바구니-고객 연결 제거
     */
    private void removeEmitter(String boardMac, Integer customerId) {
        try {
            Map<Integer, SseEmitter> emitters = basketEmitters.get(boardMac);
            if (emitters != null) {
                emitters.remove(customerId);

                // 해당 바구니에 연결된 클라이언트가 없으면 바구니 항목도 제거
                if (emitters.isEmpty()) {
                    basketEmitters.remove(boardMac);
                }
            }

            customerBaskets.remove(customerId);

            System.out.println("SSE 연결 제거: 고객ID=" + customerId + ", MAC=" + boardMac);
            logConnectionStatus();

        } catch (Exception e) {
            System.err.println("SSE 연결 제거 실패: " + e.getMessage());
        }
    }

    /**
     * 고객의 기존 연결 제거 (중복 연결 방지)
     */
    private void removeCustomerEmitter(Integer customerId) {
        String previousBasket = customerBaskets.get(customerId);
        if (previousBasket != null) {
            Map<Integer, SseEmitter> emitters = basketEmitters.get(previousBasket);
            if (emitters != null) {
                SseEmitter previousEmitter = emitters.remove(customerId);
                if (previousEmitter != null) {
                    try {
                        previousEmitter.complete();
                    } catch (Exception e) {
                        System.err.println("기존 SSE 연결 종료 실패: " + e.getMessage());
                    }
                }

                if (emitters.isEmpty()) {
                    basketEmitters.remove(previousBasket);
                }
            }
            customerBaskets.remove(customerId);

            System.out.println("기존 SSE 연결 제거: 고객ID=" + customerId + ", 이전 바구니=" + previousBasket);
        }
    }

    /**
     * SSE로 전송할 바구니 응답 데이터 생성
     */
    private Map<String, Object> createBasketResponse(List<BasketCacheService.BasketItemInfo> basketItems, String boardMac) {
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
        response.put("boardMac", boardMac);
        response.put("timestamp", System.currentTimeMillis());

        return response;
    }

    /**
     * 현재 연결 상태 로깅 (디버깅용)
     */
    private void logConnectionStatus() {
        int totalConnections = basketEmitters.values().stream()
                .mapToInt(Map::size)
                .sum();

        System.out.println("현재 SSE 연결 상태: " + basketEmitters.size() + "개 바구니, " + totalConnections + "개 연결");
    }

    /**
     * 전체 연결 정보 조회 (관리자/디버깅용)
     */
    public Map<String, Object> getConnectionInfo() {
        Map<String, Object> info = new HashMap<>();

        Map<String, Integer> basketConnections = new HashMap<>();
        for (Map.Entry<String, Map<Integer, SseEmitter>> entry : basketEmitters.entrySet()) {
            basketConnections.put(entry.getKey(), entry.getValue().size());
        }

        int totalConnections = basketEmitters.values().stream()
                .mapToInt(Map::size)
                .sum();

        info.put("totalBaskets", basketEmitters.size());
        info.put("totalConnections", totalConnections);
        info.put("basketConnections", basketConnections);
        info.put("timestamp", System.currentTimeMillis());

        return info;
    }
}