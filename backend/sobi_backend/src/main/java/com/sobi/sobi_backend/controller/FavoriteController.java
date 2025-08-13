package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.entity.Favorite;
import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.service.FavoriteService;
import com.sobi.sobi_backend.config.filter.JwtAuthenticationFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites") // /api/favorites로 시작하는 모든 요청 처리
@Tag(name = "6. Favorite", description = "찜 관리 API - 상품 찜하기/해제, 찜 목록 조회")
public class FavoriteController {

    @Autowired
    private FavoriteService favoriteService; // 찜 기능 처리 서비스

    // 찜 추가 (POST /api/favorites/{productId})
    // 로그인한 사용자가 특정 상품을 찜 목록에 추가
    @PostMapping("/{productId}")
    @Operation(
            summary = "상품 찜하기",
            description = "특정 상품을 찜 목록에 추가합니다. 이미 찜한 상품은 중복 추가할 수 없습니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "찜 추가 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "찜이 추가되었습니다",
                      "customerId": 1,
                      "productId": 3
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "찜 추가 실패 - 중복 또는 잘못된 요청",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "이미 찜한 상품입니다."
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
            )
    })
    public ResponseEntity<?> addFavorite(
            @Parameter(description = "찜할 상품 ID", example = "3", required = true)
            @PathVariable Integer productId,
            Authentication authentication) {
        try {
            System.out.println("찜 추가 요청: 상품ID=" + productId);

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "로그인이 필요합니다");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error); // 401 Unauthorized
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // 상품 ID 검증
            if (productId == null || productId <= 0) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "유효하지 않은 상품 ID입니다");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // 찜 추가
            Favorite favorite = favoriteService.addFavorite(customerId, productId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "찜이 추가되었습니다");
            response.put("customerId", customerId);
            response.put("productId", productId);

            System.out.println("찜 추가 완료: 고객ID=" + customerId + ", 상품ID=" + productId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response); // 201 Created
        } catch (IllegalArgumentException e) { // 중복 찜, 존재하지 않는 상품 등
            System.err.println("찜 추가 실패: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error); // 400 Bad Request
        } catch (Exception e) {
            System.err.println("찜 추가 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "찜 추가 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 찜 삭제 (DELETE /api/favorites/{productId})
    // 찜한 상품을 찜 목록에서 제거
    @DeleteMapping("/{productId}")
    @Operation(
            summary = "상품 찜 해제",
            description = "찜한 상품을 찜 목록에서 제거합니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "찜 삭제 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "찜이 삭제되었습니다",
                      "customerId": 1,
                      "productId": 3
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "찜 삭제 실패 - 찜하지 않은 상품",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "찜하지 않은 상품입니다."
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
            )
    })
    public ResponseEntity<?> removeFavorite(
            @Parameter(description = "찜 해제할 상품 ID", example = "3", required = true)
            @PathVariable Integer productId,
            Authentication authentication) {
        try {
            System.out.println("찜 삭제 요청: 상품ID=" + productId);

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "로그인이 필요합니다");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error); // 401 Unauthorized
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // 상품 ID 검증
            if (productId == null || productId <= 0) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "유효하지 않은 상품 ID입니다");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // 찜 삭제
            favoriteService.removeFavorite(customerId, productId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "찜이 삭제되었습니다");
            response.put("customerId", customerId);
            response.put("productId", productId);

            System.out.println("찜 삭제 완료: 고객ID=" + customerId + ", 상품ID=" + productId);
            return ResponseEntity.ok(response); // 200 OK
        } catch (IllegalArgumentException e) { // 찜하지 않은 상품 등
            System.err.println("찜 삭제 실패: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error); // 400 Bad Request
        } catch (Exception e) {
            System.err.println("찜 삭제 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "찜 삭제 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 내 찜 목록 조회 (GET /api/favorites/my)
    // 로그인한 사용자의 모든 찜 상품 목록 (상품 정보 포함)
    @GetMapping("/my")
    @Operation(
            summary = "내 찜 목록 조회",
            description = "현재 로그인한 사용자의 모든 찜 상품 목록을 조회합니다. 상품의 상세 정보가 포함됩니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "찜 목록 조회 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "찜 목록 조회 완료",
                      "customerId": 1,
                      "count": 2,
                      "favoriteProducts": [
                        {
                          "id": 3,
                          "name": "미국산 냉동 블루베리 1.5kg 봉",
                          "price": 12000,
                          "stock": 25,
                          "category": "과일",
                          "discountRate": 0,
                          "sales": 15
                        },
                        {
                          "id": 8,
                          "name": "사과 알뜰 중소과 4kg(13~19과)",
                          "price": 8000,
                          "stock": 40,
                          "category": "과일",
                          "discountRate": 5,
                          "sales": 32
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
            )
    })
    public ResponseEntity<?> getMyFavorites(Authentication authentication) {
        try {
            System.out.println("내 찜 목록 조회 요청");

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "로그인이 필요합니다");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error); // 401 Unauthorized
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // 내 찜 목록 조회 (상품 정보 포함)
            List<Product> favoriteProducts = favoriteService.getFavoriteProducts(customerId);
            long favoriteCount = favoriteService.getFavoriteCount(customerId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "찜 목록 조회 완료");
            response.put("customerId", customerId);
            response.put("count", favoriteCount);
            response.put("favoriteProducts", favoriteProducts);

            System.out.println("찜 목록 조회 완료: 고객ID=" + customerId + ", 찜 개수=" + favoriteCount);
            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            System.err.println("찜 목록 조회 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "찜 목록 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 찜 여부 확인 (GET /api/favorites/{productId}/check)
    // 특정 상품을 찜했는지 여부 확인 (UI에서 하트 표시용)
    @GetMapping("/{productId}/check")
    @Operation(
            summary = "상품 찜 여부 확인",
            description = "특정 상품을 찜했는지 여부를 확인합니다. UI에서 하트 아이콘 표시에 사용됩니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "찜 여부 확인 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "찜 여부 확인 완료",
                      "customerId": 1,
                      "productId": 3,
                      "isFavorite": true
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "잘못된 요청 - 유효하지 않은 상품 ID",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "유효하지 않은 상품 ID입니다"
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
            )
    })
    public ResponseEntity<?> checkFavorite(
            @Parameter(description = "찜 여부를 확인할 상품 ID", example = "3", required = true)
            @PathVariable Integer productId,
            Authentication authentication) {
        try {
            System.out.println("찜 여부 확인 요청: 상품ID=" + productId);

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "로그인이 필요합니다");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error); // 401 Unauthorized
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // 상품 ID 검증
            if (productId == null || productId <= 0) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "유효하지 않은 상품 ID입니다");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // 찜 여부 확인
            boolean isFavorite = favoriteService.isFavorite(customerId, productId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "찜 여부 확인 완료");
            response.put("customerId", customerId);
            response.put("productId", productId);
            response.put("isFavorite", isFavorite);

            System.out.println("찜 여부 확인 완료: 고객ID=" + customerId + ", 상품ID=" + productId + ", 찜 여부=" + isFavorite);
            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            System.err.println("찜 여부 확인 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "찜 여부 확인 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }
}