package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.entity.EpcMap;
import com.sobi.sobi_backend.service.EpcMapService;
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
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/epc-maps") // /api/epc-maps로 시작하는 모든 요청 처리
@Tag(name = "8. EPC Map", description = "RFID/EPC 매핑 API - RFID 태그 스캔으로 상품 식별")
public class EpcMapController {

    @Autowired
    private EpcMapService epcMapService; // EPC 매핑 처리 서비스

    // RFID 스캔으로 상품 조회 (GET /api/epc-maps/scan/{epcPattern})
    @GetMapping("/scan/{epcPattern}")
    @Operation(
            summary = "RFID 스캔으로 상품 조회",
            description = "RFID 태그의 EPC 패턴을 스캔하여 해당 상품 정보를 조회합니다. 바구니에서 상품 추가/제거 시 사용됩니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "RFID 스캔 성공 - 상품 식별됨",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "RFID 스캔 성공 - 상품 식별됨",
                      "epcMap": {
                        "id": 1,
                        "productId": 1,
                        "epcPattern": "PCH4"
                      }
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "RFID 스캔 실패 - 등록되지 않은 EPC 패턴",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = Map.class),
                            examples = @ExampleObject(
                                    value = """
                    {
                      "message": "등록되지 않은 EPC 패턴입니다",
                      "epcMap": null
                    }
                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "잘못된 요청 - EPC 패턴 없음",
                    content = @Content(
                            mediaType = "application/json",
                            examples = @ExampleObject(
                                    value = """
                    {
                      "error": "EPC 패턴을 입력해주세요"
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
                      "error": "RFID 스캔 처리 중 오류가 발생했습니다: Database connection failed"
                    }
                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
    public ResponseEntity<?> scanProduct(
            @Parameter(
                    description = "스캔된 RFID 태그의 EPC 패턴 (4글자 상품 타입 식별자)",
                    example = "PCH4",
                    required = true
            )
            @PathVariable String epcPattern) {
        try {
            System.out.println("RFID 스캔 요청: " + epcPattern);

            // EPC 패턴이 비어있는지 확인
            if (epcPattern == null || epcPattern.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "EPC 패턴을 입력해주세요");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            // EPC 패턴으로 매핑 조회 (매핑 테이블 본연의 역할)
            Optional<EpcMap> epcMapOpt = epcMapService.getEpcMapByPattern(epcPattern.trim());

            if (epcMapOpt.isPresent()) {
                EpcMap epcMap = epcMapOpt.get();

                Map<String, Object> response = new HashMap<>();
                response.put("message", "RFID 스캔 성공 - 상품 식별됨");
                response.put("epcMap", epcMap);

                System.out.println("RFID 스캔 성공: productId=" + epcMap.getProductId());
                return ResponseEntity.ok(response); // 200 OK
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("message", "등록되지 않은 EPC 패턴입니다");
                response.put("epcMap", null);

                System.out.println("RFID 스캔 실패: 등록되지 않은 EPC 패턴 - " + epcPattern);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response); // 404 Not Found
            }
        } catch (Exception e) {
            System.err.println("RFID 스캔 처리 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "RFID 스캔 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }
}