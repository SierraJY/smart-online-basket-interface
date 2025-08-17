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

    // deleteEpcMap 메서드 제거 - EPC 패턴은 상품 타입을 나타내므로 삭제하지 않음
}