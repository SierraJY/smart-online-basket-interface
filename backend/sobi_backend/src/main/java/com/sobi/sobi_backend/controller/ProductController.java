package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/products") // /api/products로 시작하는 모든 요청 처리
@Tag(name = "3. Product", description = "상품 관리 API - 상품 조회, 검색, 카테고리별/브랜드별 조회")
public class ProductController {

    @Autowired
    private ProductService productService; // 상품 정보 처리 서비스

    // 모든 상품 조회 (GET /api/products)
    @GetMapping
    @Operation(
            summary = "전체 상품 목록 조회",
            description = "등록된 모든 상품의 목록을 조회합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "상품 목록 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "상품 목록 조회 성공",
                      "count": 11,
                      "products": [
                        {
                          "id": 1,
                          "name": "[12brix 당도선별] 고당도 프리미엄 복숭아 4kg 8-12과",
                          "price": 15000,
                          "stock": 50,
                          "category": "과일",
                          "discountRate": 10,
                          "sales": 25
                        }
                      ]
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
                      "error": "상품 목록 조회 중 오류가 발생했습니다: Database connection failed"
                    }
                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
    public ResponseEntity<?> getAllProducts() {
        try {
            List<Product> products = productService.getAllProducts();

            Map<String, Object> response = new HashMap<>();
            response.put("message", "상품 목록 조회 성공");
            response.put("count", products.size());
            response.put("products", products);

            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "상품 목록 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 상품 상세 조회 (GET /api/products/{id})
    @GetMapping("/{id}")
    @Operation(
            summary = "상품 상세 조회",
            description = "특정 상품의 상세 정보를 조회합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "상품 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "상품 조회 성공",
                      "product": {
                        "id": 1,
                        "name": "[12brix 당도선별] 고당도 프리미엄 복숭아 4kg 8-12과",
                        "price": 15000,
                        "stock": 50,
                        "category": "과일",
                        "imageUrl": "https://example.com/peach.jpg",
                        "discountRate": 10,
                        "sales": 25,
                        "tag": "#프리미엄#당도선별",
                        "location": "A-1-3",
                        "description": "12brix 당도 보장 프리미엄 복숭아",
                        "brand": "농협"
                      }
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "상품 없음",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "존재하지 않는 상품입니다: 999"
                    }
                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
    public ResponseEntity<?> getProductById(
            @Parameter(description = "조회할 상품 ID", example = "1", required = true)
            @PathVariable Integer id) {
        try {
            Optional<Product> productOpt = productService.getProductById(id);

            if (productOpt.isPresent()) {
                Product product = productOpt.get();

                Map<String, Object> response = new HashMap<>();
                response.put("message", "상품 조회 성공");
                response.put("product", product);

                return ResponseEntity.ok(response); // 200 OK
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "존재하지 않는 상품입니다: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error); // 404 Not Found
            }
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "상품 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 상품 검색 (GET /api/products/search?keyword=검색어)
    @GetMapping("/search")
    @Operation(
            summary = "상품 검색",
            description = "상품명에 키워드가 포함된 상품들을 검색합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "상품 검색 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "상품 검색 완료",
                      "keyword": "복숭아",
                      "count": 2,
                      "products": [
                        {
                          "id": 1,
                          "name": "[12brix 당도선별] 고당도 프리미엄 복숭아 4kg 8-12과",
                          "price": 15000,
                          "stock": 50
                        },
                        {
                          "id": 7,
                          "name": "달콤한 백도 복숭아 4kg 16과내",
                          "price": 12000,
                          "stock": 30
                        }
                      ]
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "잘못된 요청 - 검색어 없음",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "검색어를 입력해주세요"
                    }
                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
    public ResponseEntity<?> searchProducts(
            @Parameter(description = "검색할 키워드", example = "복숭아", required = true)
            @RequestParam String keyword) {
        try {
            // 검색어가 비어있는지 확인
            if (keyword == null || keyword.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "검색어를 입력해주세요");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            List<Product> products = productService.searchProducts(keyword.trim());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "상품 검색 완료");
            response.put("keyword", keyword.trim());
            response.put("count", products.size());
            response.put("products", products);

            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "상품 검색 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 카테고리별 상품 조회 (GET /api/products/category/{category})
    @GetMapping("/category/{category}")
    @Operation(
            summary = "카테고리별 상품 조회",
            description = "특정 카테고리에 속한 상품들을 조회합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "카테고리별 상품 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "카테고리별 상품 조회 완료",
                      "category": "과일",
                      "count": 8,
                      "products": [
                        {
                          "id": 1,
                          "name": "[12brix 당도선별] 고당도 프리미엄 복숭아 4kg 8-12과",
                          "price": 15000,
                          "category": "과일"
                        }
                      ]
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "잘못된 요청 - 카테고리 없음",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "카테고리를 입력해주세요"
                    }
                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
    public ResponseEntity<?> getProductsByCategory(
            @Parameter(description = "조회할 카테고리명", example = "과일", required = true)
            @PathVariable String category) {
        try {
            // 카테고리가 비어있는지 확인
            if (category == null || category.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "카테고리를 입력해주세요");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            List<Product> products = productService.getProductsByCategory(category.trim());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "카테고리별 상품 조회 완료");
            response.put("category", category.trim());
            response.put("count", products.size());
            response.put("products", products);

            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "카테고리별 상품 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 브랜드별 상품 조회 (GET /api/products/brand/{brand})
    @GetMapping("/brand/{brand}")
    @Operation(
            summary = "브랜드별 상품 조회",
            description = "특정 브랜드의 상품들을 조회합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "브랜드별 상품 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "브랜드별 상품 조회 완료",
                      "brand": "농협",
                      "count": 3,
                      "products": [
                        {
                          "id": 1,
                          "name": "[12brix 당도선별] 고당도 프리미엄 복숭아 4kg 8-12과",
                          "price": 15000,
                          "brand": "농협"
                        }
                      ]
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "잘못된 요청 - 브랜드 없음",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "브랜드를 입력해주세요"
                    }
                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
    public ResponseEntity<?> getProductsByBrand(
            @Parameter(description = "조회할 브랜드명", example = "농협", required = true)
            @PathVariable String brand) {
        try {
            // 브랜드가 비어있는지 확인
            if (brand == null || brand.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "브랜드를 입력해주세요");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            List<Product> products = productService.getProductsByBrand(brand.trim());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "브랜드별 상품 조회 완료");
            response.put("brand", brand.trim());
            response.put("count", products.size());
            response.put("products", products);

            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "브랜드별 상품 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }
}