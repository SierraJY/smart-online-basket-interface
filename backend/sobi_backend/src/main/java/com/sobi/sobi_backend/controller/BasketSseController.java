package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.service.BasketSseService;
import com.sobi.sobi_backend.service.BasketCacheService;
import com.sobi.sobi_backend.config.filter.JwtAuthenticationFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/baskets")
@Tag(name = "5. Basket SSE", description = "바구니 실시간 알림 API - SSE(Server-Sent Events)를 통한 바구니 상태 실시간 업데이트")
public class BasketSseController {

    @Autowired
    private BasketSseService basketSseService;

    @Autowired
    private BasketCacheService basketCacheService;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    // SSE 타임아웃 상수
    private static final long SSE_TIMEOUT_MS = 30 * 60 * 1000L; // 30분
    private static final long ERROR_EMITTER_TIMEOUT_MS = 5000L;  // 5초

    // 바구니 실시간 업데이트 SSE 스트림 연결
    @GetMapping(value = "/my/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(
            summary = "바구니 실시간 업데이트 스트림",
            description = "SSE를 통해 바구니 상품 추가/제거 시 실시간으로 바구니 상태와 AI 추천 상품을 받습니다."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "SSE 스트림 연결 성공",
                    content = @Content(
                            mediaType = "text/event-stream",
                            schema = @Schema(type = "string"),
                            examples = @ExampleObject(
                                    name = "SSE Event Example",
                                    value = """
                                    event: basket-initial
                                    data: {
                                      "items": [
                                        {
                                          "epcPattern": "PCH4",
                                          "quantity": 2,
                                          "product": {
                                            "id": 1,
                                            "name": "[12brix 당도선별] 고당도 프리미엄 복숭아 4kg 8-12과",
                                            "price": 15000,
                                            "discountRate": 10
                                          },
                                          "totalPrice": 27000
                                        }
                                      ],
                                      "totalCount": 2,
                                      "totalPrice": 27000,
                                      "recommendations": [
                                        {
                                          "id": 3,
                                          "name": "미국산 냉동 블루베리 1.5kg 봉",
                                          "price": 12000
                                        }
                                      ],
                                      "basketId": 1
                                    }
                                    
                                    event: heartbeat
                                    data: {
                                      "type": "heartbeat",
                                      "timestamp": 1703923200000,
                                      "connection": "established"
                                    }
                                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "인증 실패 - 로그인 필요",
                    content = @Content(
                            mediaType = "text/event-stream",
                            examples = @ExampleObject(
                                    value = """
                                    event: error
                                    data: {"error":"로그인이 필요합니다"}
                                    """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "바구니 없음 - 사용 중인 바구니가 없음",
                    content = @Content(
                            mediaType = "text/event-stream",
                            examples = @ExampleObject(
                                    value = """
                                    event: error
                                    data: {"error":"사용 중인 바구니가 없습니다"}
                                    """
                            )
                    )
            )
    })
    @SecurityRequirement(name = "")
    public SseEmitter streamBasketUpdates(Authentication authentication) {
        try {
            System.out.println("바구니 SSE 연결 요청");

            // 인증된 사용자 정보 가져오기
            if (authentication == null || !authentication.isAuthenticated()) {
                System.err.println("SSE 연결 실패: 인증되지 않은 사용자");
                return makeErrorEmitter("error", "{\"error\":\"로그인이 필요합니다\"}");
            }

            JwtAuthenticationFilter.JwtUserPrincipal principal =
                    (JwtAuthenticationFilter.JwtUserPrincipal) authentication.getPrincipal();
            Integer customerId = principal.getId();

            // Redis에서 사용자의 바구니 ID 조회
            String basketIdStr = redisTemplate.opsForValue().get("user_basket:" + customerId);
            if (basketIdStr == null) {
                System.err.println("SSE 연결 실패: 사용 중인 바구니가 없음");
                return makeErrorEmitter("error", "{\"error\":\"사용 중인 바구니가 없습니다\"}");
            }

            Integer basketId;
            try {
                basketId = Integer.parseInt(basketIdStr);
            } catch (NumberFormatException e) {
                System.err.println("SSE 연결 실패: 바구니 ID 파싱 오류");
                return makeErrorEmitter("error", "{\"error\":\"바구니 정보가 올바르지 않습니다\"}");
            }

            // SSE Emitter 생성
            SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);

            // SSE 서비스에 등록
            basketSseService.addEmitter(customerId, emitter);

            // 연결 즉시 현재 바구니 상태 전송 (MQTT 발행 없이)
            basketSseService.notifyCustomer(customerId, "basket-initial");


            System.out.println("바구니 SSE 연결 성공: 고객ID=" + customerId + ", basketId=" + basketId);
            return emitter;

        } catch (Exception e) {
            System.err.println("바구니 SSE 연결 실패: " + e.getMessage());
            e.printStackTrace();

            return makeErrorEmitter("error", "{\"error\":\"SSE 연결 중 오류가 발생했습니다\"}");
        }
    }

    /**
     * 에러 응답용 SseEmitter 생성
     */
    private SseEmitter makeErrorEmitter(String eventName, String data) {
        SseEmitter errorEmitter = new SseEmitter(ERROR_EMITTER_TIMEOUT_MS);

        try {
            errorEmitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(data));
            errorEmitter.complete();
        } catch (Exception ignored) {}
        return errorEmitter;
    }
}