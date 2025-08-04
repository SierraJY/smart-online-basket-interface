package com.sobi.sobi_backend.config.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.sobi_backend.service.BasketCacheService;
import com.sobi.sobi_backend.service.BasketSseService;
import com.sobi.sobi_backend.service.BasketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * MQTT 바구니 메시지 처리 핸들러
 *
 * 기능:
 * 1. MQTT 브로커에서 바구니 업데이트 메시지 수신
 * 2. Topic에서 바구니 ID 추출
 * 3. JSON 페이로드에서 list 부분만 파싱
 * 4. BasketCacheService를 통해 Redis에 저장
 * 5. 바구니 사용자를 찾아서 해당 고객에게만 실시간 알림
 *
 * MQTT 메시지 구조:
 * - Topic: basket/{basketId}/update
 * - Payload: {"id": 1, "list": {"PEAC": 3, "BLUE": 1, "APPL": 2}}
 *
 * 처리 흐름:
 * MQTT 브로커 → MqttConfig → mqttInputChannel → 이 핸들러 → BasketCacheService → Redis
 *                                                              ↘ BasketSseService → 해당 고객 SSE
 */
@Component
public class BasketMqttHandler {

    @Autowired
    private BasketCacheService basketCacheService;

    @Autowired
    private BasketSseService basketSseService;

    @Autowired
    private BasketService basketService;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public BasketMqttHandler() {
        System.out.println("BasketMqttHandler 빈 등록 완료");
    }

    /**
     * MQTT 바구니 업데이트 메시지 처리
     *
     * Spring Integration의 @ServiceActivator를 통해
     * mqttInputChannel로 들어오는 모든 MQTT 메시지를 처리
     *
     * @param payload MQTT 메시지 본문 (JSON 문자열)
     * @param topic MQTT 토픽 (예: "basket/1/update")
     */
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleBasketUpdate(String payload, @Header("mqtt_receivedTopic") String topic) {
        try {
            System.out.println("=== MQTT 바구니 메시지 수신 ===");
            System.out.println("토픽: " + topic);
            System.out.println("페이로드: " + payload);

            // 1. 토픽에서 바구니 ID 추출
            Integer basketId = extractBasketIdFromTopic(topic);
            if (basketId == null) {
                System.err.println("유효하지 않은 토픽 형식: " + topic);
                return;
            }

            // 2. Basket 존재 여부 확인
            if (basketService.getBasketById(basketId).isEmpty()) {
                System.err.println("존재하지 않는 바구니 ID: " + basketId);
                return;
            }

            // 3. JSON 페이로드에서 list 부분만 파싱
            Map<String, Integer> items = parseJsonPayload(payload);
            if (items == null) {
                System.err.println("JSON 파싱 실패 - payload: " + payload);
                return;
            }

            // 4. Redis에 바구니 데이터 저장
            basketCacheService.updateBasketItems(basketId, items);

            // 5. 바구니를 사용하는 고객 찾기
            Integer customerId = findCustomerByBasket(basketId);
            if (customerId != null) {
                // 해당 고객에게만 실시간 알림
                basketSseService.notifyCustomer(customerId, "basket-update");
                System.out.println("바구니 업데이트 알림 완료: basketId=" + basketId + " → 고객ID=" + customerId);
            } else {
                System.out.println("바구니를 사용하는 고객을 찾을 수 없음: basketId=" + basketId);
            }

            System.out.println("바구니 업데이트 처리 완료: basketId=" + basketId + " → " + items.size() + "개 아이템");
            System.out.println("=== MQTT 처리 완료 ===");

        } catch (Exception e) {
            System.err.println("MQTT 바구니 메시지 처리 중 오류 발생: " + e.getMessage());
            e.printStackTrace();

            // MQTT 메시지 처리 실패해도 시스템은 계속 동작
            // 다음 메시지는 정상 처리될 수 있음
        }
    }

    /**
     * Redis에서 바구니를 사용하는 고객 ID 찾기
     *
     * @param basketId 바구니 ID
     * @return 고객 ID, 찾지 못하면 null
     */
    private Integer findCustomerByBasket(Integer basketId) {
        try {
            // Redis에서 basket_user:{basketId} 키로 직접 조회
            String customerIdStr = redisTemplate.opsForValue().get("basket_user:" + basketId);

            if (customerIdStr != null) {
                Integer customerId = Integer.parseInt(customerIdStr);
                System.out.println("바구니 사용자 발견: basketId=" + basketId + " → 고객ID=" + customerId);
                return customerId;
            } else {
                System.out.println("바구니 " + basketId + "를 사용하는 고객을 찾을 수 없음");
                return null;
            }

        } catch (NumberFormatException e) {
            System.err.println("고객 ID 파싱 오류: " + e.getMessage());
            return null;
        } catch (Exception e) {
            System.err.println("고객 조회 중 오류: " + e.getMessage());
            return null;
        }
    }

    /**
     * MQTT 토픽에서 바구니 ID 추출
     *
     * 토픽 형식: basket/{basketId}/update
     * 예: "basket/1/update" → 1
     *
     * @param topic MQTT 토픽 문자열
     * @return 바구니 ID, 추출 실패 시 null
     */
    private Integer extractBasketIdFromTopic(String topic) {
        try {
            if (topic == null || topic.trim().isEmpty()) {
                System.err.println("토픽이 null 또는 빈 문자열입니다");
                return null;
            }

            // "basket/{basketId}/update" 형식 검증 및 파싱
            String[] parts = topic.split("/");

            // 예상 형식: ["basket", "{basketId}", "update"]
            if (parts.length != 3) {
                System.err.println("토픽 형식 오류 - 예상: basket/{basketId}/update, 실제: " + topic);
                return null;
            }

            if (!"basket".equals(parts[0])) {
                System.err.println("토픽 접두사 오류 - 예상: basket, 실제: " + parts[0]);
                return null;
            }

            if (!"update".equals(parts[2])) {
                System.err.println("토픽 접미사 오류 - 예상: update, 실제: " + parts[2]);
                return null;
            }

            String basketIdStr = parts[1];
            if (basketIdStr.trim().isEmpty()) {
                System.err.println("바구니 ID가 비어있습니다");
                return null;
            }

            // 문자열을 Integer로 변환
            Integer basketId = Integer.parseInt(basketIdStr.trim());
            if (basketId <= 0) {
                System.err.println("유효하지 않은 바구니 ID: " + basketId);
                return null;
            }

            System.out.println("바구니 ID 추출 성공: " + basketId);
            return basketId;

        } catch (NumberFormatException e) {
            System.err.println("바구니 ID 파싱 실패 - 숫자가 아님: " + e.getMessage());
            return null;
        } catch (Exception e) {
            System.err.println("토픽 파싱 중 오류: " + e.getMessage());
            return null;
        }
    }

    /**
     * JSON 페이로드에서 list 부분만 파싱
     *
     * 페이로드 형식: {"id": 1, "list": {"PEAC": 3, "BLUE": 1, "APPL": 2}}
     * id는 받되 사용하지 않고, list 부분만 기존 파싱 로직 사용
     *
     * @param payload JSON 문자열
     * @return EPC 패턴별 수량 맵, 파싱 실패 시 null
     */
    private Map<String, Integer> parseJsonPayload(String payload) {
        try {
            if (payload == null || payload.trim().isEmpty()) {
                System.err.println("페이로드가 null 또는 빈 문자열입니다");
                return null;
            }

            // JSON 문자열을 Map으로 파싱
            Map<String, Object> jsonMap = objectMapper.readValue(
                    payload.trim(),
                    new TypeReference<Map<String, Object>>() {}
            );

            // list 부분 추출
            Object listObj = jsonMap.get("list");
            if (listObj == null) {
                System.err.println("페이로드에 'list' 필드가 없습니다");
                return null;
            }

            // list를 Map<String, Integer>로 변환
            Map<String, Integer> items = objectMapper.convertValue(
                    listObj,
                    new TypeReference<Map<String, Integer>>() {}
            );

            // 기본 검증
            if (items == null) {
                System.err.println("list 파싱 결과가 null입니다");
                return null;
            }

            // 빈 바구니 허용 (모든 상품 제거된 경우)
            if (items.isEmpty()) {
                System.out.println("빈 바구니 상태입니다 (모든 상품 제거됨)");
                return items;
            }

            // 데이터 유효성 검증
            for (Map.Entry<String, Integer> entry : items.entrySet()) {
                String epcPattern = entry.getKey();
                Integer quantity = entry.getValue();

                if (epcPattern == null || epcPattern.trim().isEmpty()) {
                    System.err.println("유효하지 않은 EPC 패턴: " + epcPattern);
                    return null;
                }

                if (quantity == null || quantity < 0) {
                    System.err.println("유효하지 않은 수량: " + quantity + " (EPC: " + epcPattern + ")");
                    return null;
                }

                // 수량이 0인 아이템 제거 (바구니에서 제거된 상품)
                if (quantity == 0) {
                    items.remove(epcPattern);
                    System.out.println("수량 0 아이템 제거: " + epcPattern);
                }
            }

            System.out.println("JSON 파싱 성공: " + items.size() + "개 아이템");
            for (Map.Entry<String, Integer> entry : items.entrySet()) {
                System.out.println("  - " + entry.getKey() + ": " + entry.getValue() + "개");
            }

            return items;

        } catch (Exception e) {
            System.err.println("JSON 파싱 중 오류: " + e.getMessage());
            System.err.println("원본 페이로드: " + payload);
            return null;
        }
    }
}