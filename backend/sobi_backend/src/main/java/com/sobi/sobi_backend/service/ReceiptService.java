package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Receipt;
import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.entity.EpcMap;
import com.sobi.sobi_backend.repository.ReceiptRepository;
import com.sobi.sobi_backend.repository.CustomerRepository;
import com.sobi.sobi_backend.repository.EpcMapRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ReceiptService {

    @Autowired
    private ReceiptRepository receiptRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ProductService productService;

    @Autowired
    private EpcMapRepository epcMapRepository;

    // 구매 기록 생성 (EPC 매핑 삭제 제거됨)
    @Transactional
    public Receipt createReceipt(Integer userId, Map<String, Integer> productMap) {
        // 고객 존재 확인
        Optional<Customer> customerOpt = customerRepository.findById(userId);
        if (customerOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 고객입니다: " + userId);
        }

        // 재고 확인 및 감소
        for (Map.Entry<String, Integer> entry : productMap.entrySet()) {
            Integer productId = Integer.parseInt(entry.getKey());
            Integer quantity = entry.getValue();
            productService.decreaseStock(productId, quantity);
        }

        // JSON 문자열 생성 {"1": 2, "3": 1}
        StringBuilder jsonBuilder = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Integer> entry : productMap.entrySet()) {
            if (!first) jsonBuilder.append(", ");
            jsonBuilder.append("\"").append(entry.getKey()).append("\": ").append(entry.getValue());
            first = false;
        }
        jsonBuilder.append("}");

        Receipt receipt = new Receipt();
        receipt.setUserId(userId);
        receipt.setCustomer(customerOpt.get());
        receipt.setProductList(jsonBuilder.toString());
        receipt.setPurchasedAt(LocalDateTime.now());

        return receiptRepository.save(receipt);
    }

    // 바구니에서 EPC 패턴들로 자동 구매 처리 (EPC 삭제 로직 제거됨)
    @Transactional
    public Receipt createReceiptFromEpcPatterns(Integer userId, List<String> epcPatterns) {
        Map<String, Integer> productMap = new java.util.HashMap<>();

        // EPC 패턴들을 상품별로 카운트
        for (String epcPattern : epcPatterns) {
            Optional<EpcMap> epcMapOpt = epcMapRepository.findByEpcPattern(epcPattern);
            if (epcMapOpt.isPresent()) {
                String productId = epcMapOpt.get().getProductId().toString();
                productMap.put(productId, productMap.getOrDefault(productId, 0) + 1);
            }
        }

        if (productMap.isEmpty()) {
            throw new IllegalArgumentException("유효한 상품이 없습니다.");
        }

        // EPC 매핑 삭제 로직 제거 - 상품 타입 패턴은 계속 유지됨
        return createReceipt(userId, productMap);
    }

    // 구매 기록 조회 (ID)
    public Optional<Receipt> getReceiptById(Integer id) {
        return receiptRepository.findById(id);
    }

    // 고객별 구매 기록 조회
    public List<Receipt> getReceiptsByUserId(Integer userId) {
        return receiptRepository.findByUserId(userId);
    }

    // 모든 구매 기록 조회
    public List<Receipt> getAllReceipts() {
        return receiptRepository.findAll();
    }
}