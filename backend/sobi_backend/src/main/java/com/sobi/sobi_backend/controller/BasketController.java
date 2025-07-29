package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.entity.Basket;
import com.sobi.sobi_backend.service.BasketService;
import com.sobi.sobi_backend.service.ReceiptService;
import com.sobi.sobi_backend.service.BasketCacheService;
import com.sobi.sobi_backend.config.filter.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
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

    // 바구니 사용 시작 (POST /api/baskets/start/{boardMac})
    @PostMapping("/start/{boardMac}")
    public ResponseEntity<?> startBasket(@PathVariable String boardMac, Authentication authentication) {
        try {
            System.out.println("바구니 사용 시작 요청: " + boardMac);

            // MAC 주소 검증
            if (boardMac == null || boardMac.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "바구니 MAC 주소를 입력해주세요");
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
            String userId = principal.getUserId();

            // 기존 사용 중인 바구니 확인
            String existingBasket = redisTemplate.opsForValue().get("user_basket:" + customerId);
            if (existingBasket != null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "이미 사용 중인 바구니가 있습니다: " + existingBasket);
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // 바구니 사용 시작
            Basket basket = basketService.startUsingBasket(boardMac.trim());

            // Redis에 사용자-바구니 매핑 저장 (TTL 1시간)
            redisTemplate.opsForValue().set(
                    "user_basket:" + customerId,
                    boardMac.trim(),
                    Duration.ofHours(1)
            );

            Map<String, Object> response = new HashMap<>();
            response.put("message", "바구니 사용을 시작했습니다");
            response.put("basket", basket);
            response.put("customerId", customerId);
            response.put("userId", userId);

            System.out.println("바구니 사용 시작 완료: " + boardMac + ", 고객ID: " + customerId + ", 사용자ID: " + userId + ", Redis 저장 완료");
            return ResponseEntity.ok(response); // 200 OK
        } catch (IllegalArgumentException e) { // 존재하지 않거나 사용할 수 없는 바구니
            System.err.println("바구니 사용 시작 실패: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error); // 400 Bad Request
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

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "로그인이 필요합니다");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error); // 401 Unauthorized
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // Redis에서 사용자의 바구니 MAC 주소 조회
            String boardMac = redisTemplate.opsForValue().get("user_basket:" + customerId);
            if (boardMac == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "사용 중인 바구니가 없습니다");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error); // 404 Not Found
            }

            // 바구니 존재 확인
            Optional<Basket> basketOpt = basketService.getBasketByMac(boardMac);
            if (basketOpt.isEmpty()) {
                // Redis 데이터 불일치 - 정리
                redisTemplate.delete("user_basket:" + customerId);
                Map<String, String> error = new HashMap<>();
                error.put("error", "바구니 정보가 일치하지 않습니다. 다시 시작해주세요");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error); // 404 Not Found
            }

            Basket basket = basketOpt.get();

            // Redis에서 실제 바구니 데이터 조회 (상품 정보 포함)
            List<BasketCacheService.BasketItemInfo> basketItems =
                    basketCacheService.getBasketItemsWithProductInfo(boardMac);

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
            response.put("boardMac", boardMac);

            System.out.println("바구니 내용 조회 완료: 고객ID=" + customerId + ", MAC=" + boardMac + ", 아이템수=" + totalCount);
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

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "로그인이 필요합니다");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error); // 401 Unauthorized
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // Redis에서 사용자의 바구니 MAC 주소 조회
            String boardMac = redisTemplate.opsForValue().get("user_basket:" + customerId);
            if (boardMac == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "사용 중인 바구니가 없습니다");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error); // 404 Not Found
            }

            // 바구니 존재 및 사용 중 확인
            Optional<Basket> basketOpt = basketService.getBasketByMac(boardMac);
            if (basketOpt.isEmpty()) {
                // Redis 데이터 불일치 - 정리
                redisTemplate.delete("user_basket:" + customerId);
                Map<String, String> error = new HashMap<>();
                error.put("error", "바구니 정보가 일치하지 않습니다. 다시 시작해주세요");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error); // 404 Not Found
            }

            Basket basket = basketOpt.get();
            if (basket.getUsable()) {
                // Redis 데이터 불일치 - 정리
                redisTemplate.delete("user_basket:" + customerId);
                Map<String, String> error = new HashMap<>();
                error.put("error", "사용 중이지 않은 바구니입니다");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // EPC 패턴 목록으로 결제 처리
            List<String> epcPatterns = basketCacheService.getEpcPatternsForCheckout(boardMac);

            // 바구니가 비어있는지 확인
            if (epcPatterns.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "구매할 상품이 없습니다");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // 결제 처리 (Redis에서 가져온 EPC 패턴들로 자동 결제)
            var receipt = receiptService.createReceiptFromEpcPatterns(customerId, epcPatterns);

            // 바구니 반납 (결제 완료 후)
            basketService.returnBasket(boardMac);

            // Redis에서 바구니 데이터 삭제 (핵심!)
            basketCacheService.clearBasketItems(boardMac);

            // Redis에서 사용자-바구니 매핑 삭제
            redisTemplate.delete("user_basket:" + customerId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "결제가 완료되었습니다");
            response.put("receipt", receipt);
            response.put("basketReturned", true);
            response.put("epcPatterns", epcPatterns);
            response.put("totalItems", epcPatterns.size());

            System.out.println("바구니 결제 및 반납 완료: 고객ID=" + customerId + ", MAC=" + boardMac + ", 영수증ID=" + receipt.getId() + ", Redis 삭제 완료");
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
}