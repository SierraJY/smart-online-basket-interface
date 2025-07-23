package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.EpcMap;
import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.repository.EpcMapRepository;
import com.sobi.sobi_backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EpcMapService {

    @Autowired
    private EpcMapRepository epcMapRepository;

    @Autowired
    private ProductRepository productRepository;

    // EPC 매핑 생성 (상품 입고 시)
    public EpcMap createEpcMap(Integer productId, String epcPattern) {
        // 상품 존재 확인
        Optional<Product> productOpt = productRepository.findById(productId);
        if (productOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 상품입니다: " + productId);
        }

        // 중복 EPC 패턴 체크
        if (epcMapRepository.findByEpcPattern(epcPattern).isPresent()) {
            throw new IllegalArgumentException("이미 등록된 EPC 패턴입니다: " + epcPattern);
        }

        EpcMap epcMap = new EpcMap();
        epcMap.setProductId(productId);
        epcMap.setProduct(productOpt.get());
        epcMap.setEpcPattern(epcPattern);

        return epcMapRepository.save(epcMap);
    }

    // EPC 패턴으로 매핑 조회 (RFID 스캔 시 사용)
    public Optional<EpcMap> getEpcMapByPattern(String epcPattern) {
        return epcMapRepository.findByEpcPattern(epcPattern);
    }

    // 상품별 EPC 매핑 조회 (재고 확인용)
    public List<EpcMap> getEpcMapsByProductId(Integer productId) {
        return epcMapRepository.findByProductId(productId);
    }

    // 모든 EPC 매핑 조회
    public List<EpcMap> getAllEpcMaps() {
        return epcMapRepository.findAll();
    }

    // RFID 스캔으로 상품 정보 조회 (바구니 시스템 핵심 기능)
    public Optional<Product> getProductByEpcPattern(String epcPattern) {
        Optional<EpcMap> epcMapOpt = epcMapRepository.findByEpcPattern(epcPattern);
        if (epcMapOpt.isPresent()) {
            return Optional.of(epcMapOpt.get().getProduct());
        }
        return Optional.empty();
    }

    // 상품의 실제 재고 개수 조회 (EPC 태그 개수 = 실제 재고)
    public long getActualStockByProductId(Integer productId) {
        return epcMapRepository.findByProductId(productId).size();
    }

    // EPC 매핑 삭제 (ReceiptService에서 사용 - 구매 완료 시)
    public void deleteEpcMap(String epcPattern) {
        Optional<EpcMap> epcMapOpt = epcMapRepository.findByEpcPattern(epcPattern);
        if (epcMapOpt.isPresent()) {
            epcMapRepository.delete(epcMapOpt.get());
        }
    }
}