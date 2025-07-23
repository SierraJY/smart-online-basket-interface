package com.sobi.sobi_backend.repository;

import com.sobi.sobi_backend.entity.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, Integer> {

    // 특정 고객의 구매 기록 조회
    List<Receipt> findByUserId(Integer userId);
}