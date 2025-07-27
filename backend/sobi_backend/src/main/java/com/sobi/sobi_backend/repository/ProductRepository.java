package com.sobi.sobi_backend.repository;

import com.sobi.sobi_backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {

    // 상품명으로 찾기
    Optional<Product> findByName(String name);

    // 상품명에 특정 문자열이 포함된 상품들 찾기
    List<Product> findByNameContaining(String keyword);

    // 카테고리로 찾기
    List<Product> findByCategory(String category);

    // 브랜드로 찾기
    List<Product> findByBrand(String brand);
}