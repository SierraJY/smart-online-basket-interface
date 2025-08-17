package com.sobi.sobi_backend.repository;

import com.sobi.sobi_backend.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Integer> {

    // 특정 사용자의 찜 목록 조회
    List<Favorite> findByUserId(Integer userId);

    // 특정 사용자가 특정 상품을 찜했는지 확인
    boolean existsByUserIdAndProductId(Integer userId, Integer productId);

    // 특정 사용자의 찜 개수
    long countByUserId(Integer userId);

    // 찜 삭제 (사용자ID + 상품ID)
    void deleteByUserIdAndProductId(Integer userId, Integer productId);
}