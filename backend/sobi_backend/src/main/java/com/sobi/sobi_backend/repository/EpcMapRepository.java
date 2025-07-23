package com.sobi.sobi_backend.repository;

import com.sobi.sobi_backend.entity.EpcMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EpcMapRepository extends JpaRepository<EpcMap, Integer> {

    // EPC 패턴으로 매핑 정보 찾기
    Optional<EpcMap> findByEpcPattern(String epcPattern);

    // 특정 상품의 모든 EPC 매핑 조회
    List<EpcMap> findByProductId(Integer productId);
}