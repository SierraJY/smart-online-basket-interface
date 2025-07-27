package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.entity.Receipt;
import com.sobi.sobi_backend.service.ReceiptService;
import com.sobi.sobi_backend.config.filter.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/receipts") // /api/receipts로 시작하는 모든 요청 처리
public class ReceiptController {

    @Autowired
    private ReceiptService receiptService; // 영수증 처리 서비스

    // 내 구매 기록 전체 조회 (GET /api/receipts/my)
    @GetMapping("/my")
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

            Map<String, Object> response = new HashMap<>();
            response.put("message", "구매 기록 조회 완료");
            response.put("customerId", customerId);
            response.put("count", receipts.size());
            response.put("receipts", receipts);

            System.out.println("구매 기록 조회 완료: 고객ID=" + customerId + ", 기록 수=" + receipts.size());
            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            System.err.println("구매 기록 조회 중 오류: " + e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "구매 기록 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }
}