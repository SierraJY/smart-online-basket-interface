package com.sobi.sobi_backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.entity.EpcMap;
import com.sobi.sobi_backend.service.EpcMapService;
import com.sobi.sobi_backend.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.*;

/**
 * Redis 기반 바구니 캐시 관리 서비스
 *
 * 기능:
 * 1. MQTT로 받은 바구니 데이터를 Redis에 저장
 * 2. API 요청 시 Redis에서 바구니 데이터 조회
 * 3. EPC 패턴을 상품 정보로 변환
 * 4. 결제 완료 후 바구니 데이터 삭제
 *
 * Redis 저장 구조:
 * - Key: basket_items:{basketId}
 * - Value: {"PEAC":3,"BLUE":1,"APPL":2} (JSON)
 * - TTL: application.properties에서 설정
 */
@Service
public class BasketCacheService {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Autowired
    private EpcMapService epcMapService;

    @Autowired
    private ProductService productService;

    // application.properties에서 바구니 캐시 TTL 주입
    @Value("${app.basket.cache-ttl-seconds}")
    private long basketTtlSeconds;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Redis 키 접두사
    private static final String BASKET_ITEMS_KEY_PREFIX = "basket_items:";

    // 바구니 데이터 TTL (properties에서 가져온 값으로 Duration 생성)
    private Duration getBasketTtl() {
        return Duration.ofSeconds(basketTtlSeconds);
    }

    /**
     * 바구니 아이템 전체 업데이트 (MQTT에서 호출)
     *
     * MQTT 메시지로 받은 전체 바구니 상태를 Redis에 저장
     * 기존 데이터를 덮어쓰는 방식 (action: "set")
     *
     * @param basketId 바구니 ID (예: 1)
     * @param items EPC 패턴별 수량 맵 (예: {"PEAC":3, "BLUE":1})
     */
    public void updateBasketItems(Integer basketId, Map<String, Integer> items) {
        try {
            String redisKey = BASKET_ITEMS_KEY_PREFIX + basketId;

            if (items == null || items.isEmpty()) {
                // 바구니가 비어있으면 Redis 키 삭제
                redisTemplate.delete(redisKey);
                System.out.println("바구니 비움 처리 완료: basketId=" + basketId);
                return;
            }

            // Map을 JSON 문자열로 변환
            String jsonValue = objectMapper.writeValueAsString(items);

            // Redis에 저장 (TTL 포함, properties에서 가져온 값 사용)
            redisTemplate.opsForValue().set(redisKey, jsonValue, getBasketTtl());

            System.out.println("바구니 데이터 업데이트 완료: basketId=" + basketId + " → " + jsonValue);

        } catch (JsonProcessingException e) {
            System.err.println("바구니 데이터 JSON 변환 실패: " + e.getMessage());
            throw new RuntimeException("바구니 데이터 저장 중 오류 발생", e);
        } catch (Exception e) {
            System.err.println("바구니 데이터 Redis 저장 실패: " + e.getMessage());
            throw new RuntimeException("바구니 데이터 저장 중 오류 발생", e);
        }
    }

    /**
     * 바구니 아이템 조회 (EPC 패턴별 수량)
     *
     * Redis에서 바구니 데이터를 조회하여 Map 형태로 반환
     * API에서 바구니 내용을 조회할 때 사용
     *
     * @param basketId 바구니 ID
     * @return EPC 패턴별 수량 맵, 데이터가 없으면 빈 Map
     */
    public Map<String, Integer> getBasketItems(Integer basketId) {
        try {
            String redisKey = BASKET_ITEMS_KEY_PREFIX + basketId;
            String jsonValue = redisTemplate.opsForValue().get(redisKey);

            if (jsonValue == null || jsonValue.trim().isEmpty()) {
                System.out.println("바구니 데이터 없음: basketId=" + basketId);
                return new HashMap<>();
            }

            // JSON 문자열을 Map으로 변환
            Map<String, Integer> items = objectMapper.readValue(
                    jsonValue,
                    new TypeReference<Map<String, Integer>>() {}
            );

            System.out.println("바구니 데이터 조회 완료: basketId=" + basketId + " → " + items);
            return items;

        } catch (JsonProcessingException e) {
            System.err.println("바구니 데이터 JSON 파싱 실패: " + e.getMessage());
            return new HashMap<>();
        } catch (Exception e) {
            System.err.println("바구니 데이터 Redis 조회 실패: " + e.getMessage());
            return new HashMap<>();
        }
    }

    /**
     * 바구니 아이템을 상품 정보로 변환
     *
     * EPC 패턴을 실제 상품 정보로 변환하여 프론트엔드에서 사용할 수 있는 형태로 제공
     * EpcMapService를 통해 EPC → Product 매핑 조회
     *
     * @param basketId 바구니 ID
     * @return 바구니에 담긴 상품 정보 리스트 (수량 포함)
     */
    @Transactional(readOnly = true)
    public List<BasketItemInfo> getBasketItemsWithProductInfo(Integer basketId) {
        Map<String, Integer> basketItems = getBasketItems(basketId);

        if (basketItems.isEmpty()) {
            return new ArrayList<>();
        }

        List<BasketItemInfo> result = new ArrayList<>();

        for (Map.Entry<String, Integer> entry : basketItems.entrySet()) {
            String epcPattern = entry.getKey();
            Integer quantity = entry.getValue();

            // EPC 패턴으로 EpcMap 조회 후 ProductId로 Product 조회
            Optional<EpcMap> epcMapOpt = epcMapService.getEpcMapByPattern(epcPattern);

            if (epcMapOpt.isPresent()) {
                Integer productId = epcMapOpt.get().getProductId();
                Optional<Product> productOpt = productService.getProductById(productId);

                if (productOpt.isPresent()) {
                    Product product = productOpt.get();
                    BasketItemInfo itemInfo = new BasketItemInfo();
                    itemInfo.setEpcPattern(epcPattern);
                    itemInfo.setQuantity(quantity);
                    itemInfo.setProduct(product);
                    itemInfo.setTotalPrice(product.getDiscountedPrice() * quantity);

                    result.add(itemInfo);

                    System.out.println("상품 매핑 성공: " + epcPattern + " → " + product.getName() + " x" + quantity);
                } else {
                    System.err.println("상품 조회 실패 - ProductId: " + productId);
                    addUnknownItem(result, epcPattern, quantity);
                }
            } else {
                System.err.println("상품 매핑 실패 - 등록되지 않은 EPC 패턴: " + epcPattern);
                addUnknownItem(result, epcPattern, quantity);
            }
        }

        return result;
    }

    /**
     * 알 수 없는 상품 아이템 추가 (헬퍼 메서드)
     */
    private void addUnknownItem(List<BasketItemInfo> result, String epcPattern, Integer quantity) {
        BasketItemInfo unknownItem = new BasketItemInfo();
        unknownItem.setEpcPattern(epcPattern);
        unknownItem.setQuantity(quantity);
        unknownItem.setProduct(null);
        unknownItem.setTotalPrice(0);
        result.add(unknownItem);
    }

    /**
     * 바구니 데이터 삭제
     *
     * 결제 완료 후 또는 바구니 사용 종료 시 Redis에서 바구니 데이터 삭제
     *
     * @param basketId 바구니 ID
     * @return 삭제 성공 여부
     */
    public boolean clearBasketItems(Integer basketId) {
        try {
            String redisKey = BASKET_ITEMS_KEY_PREFIX + basketId;
            Boolean deleted = redisTemplate.delete(redisKey);

            System.out.println("바구니 데이터 삭제 완료: basketId=" + basketId + " → " + deleted);
            return Boolean.TRUE.equals(deleted);

        } catch (Exception e) {
            System.err.println("바구니 데이터 삭제 실패: " + e.getMessage());
            return false;
        }
    }

    /**
     * 바구니 존재 여부 확인
     *
     * @param basketId 바구니 ID
     * @return 바구니 데이터 존재 여부
     */
    public boolean hasBasketItems(Integer basketId) {
        try {
            String redisKey = BASKET_ITEMS_KEY_PREFIX + basketId;
            return Boolean.TRUE.equals(redisTemplate.hasKey(redisKey));
        } catch (Exception e) {
            System.err.println("바구니 존재 여부 확인 실패: " + e.getMessage());
            return false;
        }
    }

    /**
     * 바구니 아이템을 EPC 패턴 리스트로 변환 (결제용)
     *
     * 결제 처리 시 ReceiptService에서 사용
     * 수량에 따라 동일한 EPC 패턴을 반복하여 리스트 생성
     *
     * @param basketId 바구니 ID
     * @return EPC 패턴 리스트 (수량만큼 반복)
     */
    public List<String> getEpcPatternsForCheckout(Integer basketId) {
        Map<String, Integer> basketItems = getBasketItems(basketId);

        List<String> epcPatterns = new ArrayList<>();

        for (Map.Entry<String, Integer> entry : basketItems.entrySet()) {
            String epcPattern = entry.getKey();
            Integer quantity = entry.getValue();

            // 수량만큼 EPC 패턴 반복 추가
            for (int i = 0; i < quantity; i++) {
                epcPatterns.add(epcPattern);
            }
        }

        System.out.println("결제용 EPC 패턴 리스트 생성: basketId=" + basketId + " → " + epcPatterns);
        return epcPatterns;
    }

    /**
     * 바구니 아이템 정보 DTO 클래스
     *
     * 프론트엔드로 전달할 바구니 아이템 정보를 담는 데이터 구조
     */
    public static class BasketItemInfo {
        private String epcPattern;      // EPC 패턴
        private Integer quantity;       // 수량
        private Product product;        // 상품 정보 (null 가능)
        private Integer totalPrice;     // 총 가격 (할인 적용)

        // Getters and Setters
        public String getEpcPattern() {
            return epcPattern;
        }

        public void setEpcPattern(String epcPattern) {
            this.epcPattern = epcPattern;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }

        public Product getProduct() {
            return product;
        }

        public void setProduct(Product product) {
            this.product = product;
        }

        public Integer getTotalPrice() {
            return totalPrice;
        }

        public void setTotalPrice(Integer totalPrice) {
            this.totalPrice = totalPrice;
        }
    }
}