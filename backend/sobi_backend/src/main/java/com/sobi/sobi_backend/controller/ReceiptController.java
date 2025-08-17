package com.sobi.sobi_backend.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sobi.sobi_backend.entity.Receipt;
import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.service.ReceiptService;
import com.sobi.sobi_backend.service.ProductService;
import com.sobi.sobi_backend.config.filter.JwtAuthenticationFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/receipts") // /api/receipts로 시작하는 모든 요청 처리
@Tag(name = "7. Receipt", description = "영수증 관리 API - 구매 기록 조회")
public class ReceiptController {

    @Autowired
    private ReceiptService receiptService; // 영수증 처리 서비스

    @Autowired
    private ProductService productService; // 상품 정보 조회 서비스

    private final ObjectMapper objectMapper = new ObjectMapper(); // JSON 파싱용

    // 내 구매 기록 전체 조회 (GET /api/receipts/my)
    @GetMapping("/my")
    @Operation(
            summary = "내 구매 기록 조회",
            description = "현재 로그인한 사용자의 모든 구매 기록을 최신순으로 조회합니다. 구매한 상품 정보와 수량이 포함됩니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "구매 기록 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "구매 기록 조회 완료",
                      "customerId": 1,
                      "count": 2,
                      "receipts": [
                        {
                          "id": 123,
                          "purchasedAt": "2024-12-30T15:30:00",
                          "purchasedProducts": [
                            {
                              "product": {
                                "id": 1,
                                "name": "[12brix 당도선별] 고당도 프리미엄 복숭아 4kg 8-12과",
                                "price": 15000,
                                "discountRate": 10,
                                "discountedPrice": 13500
                              },
                              "quantity": 2
                            },
                            {
                              "product": {
                                "id": 3,
                                "name": "미국산 냉동 블루베리 1.5kg 봉",
                                "price": 12000,
                                "discountRate": 0,
                                "discountedPrice": 12000
                              },
                              "quantity": 1
                            }
                          ]
                        }
                      ]
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "인증 실패 - 로그인 필요",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "로그인이 필요합니다"
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "500",
                    description = "서버 오류",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "구매 기록 조회 중 오류가 발생했습니다: Database connection failed"
                    }
                    """
                            )
                    )
            )
    })
    public ResponseEntity<?> getMyReceipts(Authentication authentication) {
        try {
            System.out.println("내 구매 기록 조회 요청");

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "로그인이 필요합니다");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error); // 401 Unauthorized
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // 해당 고객의 모든 구매 기록 조회 (최신순)
            List<Receipt> receipts = receiptService.getReceiptsByUserId(customerId);

            // Receipt 목록을 ReceiptResponse 목록으로 변환
            List<ReceiptResponse> receiptResponses = receipts.stream()
                    .map(this::convertToReceiptResponse)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "구매 기록 조회 완료");
            response.put("customerId", customerId);
            response.put("count", receiptResponses.size());
            response.put("receipts", receiptResponses);

            System.out.println("구매 기록 조회 완료: 고객ID=" + customerId + ", 기록 수=" + receiptResponses.size());
            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            System.err.println("구매 기록 조회 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "구매 기록 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    /**
     * Receipt 엔티티를 ReceiptResponse DTO로 변환
     */
    private ReceiptResponse convertToReceiptResponse(Receipt receipt) {
        try {
            ReceiptResponse response = new ReceiptResponse();
            response.setId(receipt.getId());
            response.setPurchasedAt(receipt.getPurchasedAt());

            // JSON 문자열을 Map으로 파싱: "{\"4\": 1, \"5\": 1}" → Map<String, Integer>
            Map<String, Integer> productMap = objectMapper.readValue(
                    receipt.getProductList(),
                    new TypeReference<Map<String, Integer>>() {}
            );

            // 상품 정보와 수량을 포함한 PurchasedProductInfo 리스트 생성
            List<PurchasedProductInfo> purchasedProducts = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : productMap.entrySet()) {
                Integer productId = Integer.parseInt(entry.getKey());
                Integer quantity = entry.getValue();

                // 상품 정보 조회
                Optional<Product> productOpt = productService.getProductById(productId);
                if (productOpt.isPresent()) {
                    Product product = productOpt.get();

                    PurchasedProductInfo productInfo = new PurchasedProductInfo();
                    productInfo.setProduct(product);
                    productInfo.setQuantity(quantity);

                    purchasedProducts.add(productInfo);

                    System.out.println("상품 정보 변환 완료: 상품ID=" + productId + ", 상품명=" + product.getName() + ", 수량=" + quantity);
                } else {
                    // 방어적 프로그래밍 - 이론상 발생하지 않음
                    System.err.println("상품 정보를 찾을 수 없음: 상품ID=" + productId);
                }
            }

            response.setPurchasedProducts(purchasedProducts);

            System.out.println("영수증 변환 완료: 영수증ID=" + receipt.getId() + ", 상품수=" + purchasedProducts.size());
            return response;

        } catch (Exception e) {
            System.err.println("영수증 변환 중 오류: " + e.getMessage());
            e.printStackTrace();

            // 변환 실패 시 기본 구조 반환
            ReceiptResponse errorResponse = new ReceiptResponse();
            errorResponse.setId(receipt.getId());
            errorResponse.setPurchasedAt(receipt.getPurchasedAt());
            errorResponse.setPurchasedProducts(new ArrayList<>());
            return errorResponse;
        }
    }

    /**
     * 구매한 상품 정보 DTO
     */
    public static class PurchasedProductInfo {
        private Product product;    // 상품 전체 정보
        private Integer quantity;   // 구매 수량

        // 기본 생성자
        public PurchasedProductInfo() {}

        // Getters and Setters
        public Product getProduct() {
            return product;
        }

        public void setProduct(Product product) {
            this.product = product;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }
    }

    /**
     * 영수증 응답 DTO
     */
    public static class ReceiptResponse {
        private Integer id;                                     // 영수증 ID
        private LocalDateTime purchasedAt;                     // 구매 시간
        private List<PurchasedProductInfo> purchasedProducts;   // 구매한 상품 리스트

        // 기본 생성자
        public ReceiptResponse() {}

        // Getters and Setters
        public Integer getId() {
            return id;
        }

        public void setId(Integer id) {
            this.id = id;
        }

        public LocalDateTime getPurchasedAt() {
            return purchasedAt;
        }

        public void setPurchasedAt(LocalDateTime purchasedAt) {
            this.purchasedAt = purchasedAt;
        }

        public List<PurchasedProductInfo> getPurchasedProducts() {
            return purchasedProducts;
        }

        public void setPurchasedProducts(List<PurchasedProductInfo> purchasedProducts) {
            this.purchasedProducts = purchasedProducts;
        }
    }
}