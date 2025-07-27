package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    // 상품 조회 (ID) - EPC 매핑에서 사용
    public Optional<Product> getProductById(Integer id) {
        return productRepository.findById(id);
    }

    // 모든 상품 조회
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    // 상품 검색 (이름 포함)
    public List<Product> searchProducts(String keyword) {
        return productRepository.findByNameContaining(keyword);
    }

    // 재고 감소 (구매 시) - Receipt 생성 시 사용
    public Product decreaseStock(Integer productId, Integer quantity) {
        Optional<Product> productOpt = productRepository.findById(productId);
        if (productOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 상품입니다: " + productId);
        }

        Product product = productOpt.get();
        if (product.getStock() < quantity) {
            throw new IllegalArgumentException("재고가 부족합니다. 현재 재고: " + product.getStock());
        }

        product.setStock(product.getStock() - quantity);
        return productRepository.save(product);
    }

    // 판매량 증가 (구매 완료 시 호출)
    public Product increaseSales(Integer productId, Integer quantity) {
        Optional<Product> productOpt = productRepository.findById(productId);
        if (productOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 상품입니다: " + productId);
        }

        Product product = productOpt.get();
        product.setSales(product.getSales() + quantity);
        return productRepository.save(product);
    }

    // 카테고리별 상품 조회
    public List<Product> getProductsByCategory(String category) {
        return productRepository.findByCategory(category);
    }

    // 브랜드별 상품 조회
    public List<Product> getProductsByBrand(String brand) {
        return productRepository.findByBrand(brand);
    }


}