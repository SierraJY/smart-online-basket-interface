package com.sobi.sobi_backend.repository;

import com.sobi.sobi_backend.entity.Basket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BasketRepository extends JpaRepository<Basket, Integer> {

    // MAC 주소로 바구니 찾기
    Optional<Basket> findByBoardMac(String boardMac);
}