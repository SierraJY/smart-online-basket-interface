package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.EpcMap;
import com.sobi.sobi_backend.repository.EpcMapRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class EpcMapService {

    @Autowired
    private EpcMapRepository epcMapRepository;

    // EPC로 물품 확인 (바구니 RFID 스캔용)
    public Optional<EpcMap> getEpcMapByPattern(String epcPattern) {
        return epcMapRepository.findByEpcPattern(epcPattern);
    }

    // 판매 시 EPC 삭제 (구매 완료 처리 - ReceiptService에서 호출)
    public void deleteEpcMap(String epcPattern) {
        Optional<EpcMap> epcMapOpt = epcMapRepository.findByEpcPattern(epcPattern);
        if (epcMapOpt.isPresent()) {
            epcMapRepository.delete(epcMapOpt.get());
        }
    }
}