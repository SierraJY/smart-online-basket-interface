package com.sobi.sobi_backend.config.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.sobi_backend.service.BasketCacheService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * MQTT 바구니 메시지 처리 핸들러
 *
 * 기능:
 * 1. MQTT 브로커에서 바구니 업데이트 메시지 수신
 * 2. Topic에서 바구니 MAC 주소 추출
 * 3. JSON 페이로드를 Map으로 파싱
 * 4. BasketCacheService를 통해 Redis에 저장
 *
 * MQTT 메시지 구조:
 * - Topic: basket/{boardMac}/update
 * - Payload: {"PEAC": 3, "BLUE": 1, "APPL": 2}
 *
 * 처리 흐름:
 * MQTT 브로커 → MqttConfig → mqttInputChannel → 이 핸들러 → BasketCacheService → Redis
 */
@Component
public class BasketMqttHandler {

    @Autowired
    private BasketCacheService basketCacheService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // 생성자에 로그 추가
    public BasketMqttHandler() {
        System.out.println("🔧 BasketMqttHandler 생성자 호출됨 - 빈 등록 완료");
    }

    /**
     * MQTT 바구니 업데이트 메시지 처리
     *
     * Spring Integration의 @ServiceActivator를 통해
     * mqttInputChannel로 들어오는 모든 MQTT 메시지를 처리
     *
     * @param payload MQTT 메시지 본문 (JSON 문자열)
     * @param topic MQTT 토픽 (예: "basket/2c:cf:67:11:93:6b/update")
     */
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleBasketUpdate(String payload, @Header("mqtt_receivedTopic") String topic) {
        try {
            System.out.println("=== MQTT 바구니 메시지 수신 ===");
            System.out.println("토픽: " + topic);
            System.out.println("페이로드: " + payload);

            // 1. 토픽에서 바구니 MAC 주소 추출
            String boardMac = extractBoardMacFromTopic(topic);
            if (boardMac == null || boardMac.trim().isEmpty()) {
                System.err.println("유효하지 않은 토픽 형식: " + topic);
                return;
            }

            // 2. JSON 페이로드를 Map으로 파싱
            Map<String, Integer> items = parseJsonPayload(payload);
            if (items == null) {
                System.err.println("JSON 파싱 실패 - payload: " + payload);
                return;
            }

            // 3. BasketCacheService를 통해 Redis에 저장
            basketCacheService.updateBasketItems(boardMac, items);

            System.out.println("바구니 업데이트 처리 완료: " + boardMac + " → " + items.size() + "개 아이템");
            System.out.println("=== MQTT 처리 완료 ===");

        } catch (Exception e) {
            System.err.println("MQTT 바구니 메시지 처리 중 오류 발생: " + e.getMessage());
            e.printStackTrace();

            // MQTT 메시지 처리 실패해도 시스템은 계속 동작
            // 다음 메시지는 정상 처리될 수 있음
        }
    }

    /**
     * MQTT 토픽에서 바구니 MAC 주소 추출
     *
     * 토픽 형식: basket/{boardMac}/update
     * 예: "basket/2c:cf:67:11:93:6b/update" → "2c:cf:67:11:93:6b"
     *
     * @param topic MQTT 토픽 문자열
     * @return 바구니 MAC 주소, 추출 실패 시 null
     */
    private String extractBoardMacFromTopic(String topic) {
        try {
            if (topic == null || topic.trim().isEmpty()) {
                System.err.println("토픽이 null 또는 빈 문자열입니다");
                return null;
            }

            // "basket/{boardMac}/update" 형식 검증 및 파싱
            String[] parts = topic.split("/");

            // 예상 형식: ["basket", "{boardMac}", "update"]
            if (parts.length != 3) {
                System.err.println("토픽 형식 오류 - 예상: basket/{boardMac}/update, 실제: " + topic);
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

            String boardMac = parts[1];
            if (boardMac.trim().isEmpty()) {
                System.err.println("바구니 MAC 주소가 비어있습니다");
                return null;
            }

            System.out.println("바구니 MAC 주소 추출 성공: " + boardMac);
            return boardMac;

        } catch (Exception e) {
            System.err.println("토픽 파싱 중 오류: " + e.getMessage());
            return null;
        }
    }

    /**
     * JSON 페이로드를 Map으로 파싱
     *
     * 예상 형식: {"PEAC": 3, "BLUE": 1, "APPL": 2}
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

            // JSON 문자열을 Map<String, Integer>로 변환
            Map<String, Integer> items = objectMapper.readValue(
                    payload.trim(),
                    new TypeReference<Map<String, Integer>>() {}
            );

            // 기본 검증
            if (items == null) {
                System.err.println("JSON 파싱 결과가 null입니다");
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