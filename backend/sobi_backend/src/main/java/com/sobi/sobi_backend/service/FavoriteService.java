package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Favorite;
import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.repository.FavoriteRepository;
import com.sobi.sobi_backend.repository.ProductRepository;
import com.sobi.sobi_backend.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FavoriteService {

    @Autowired
    private FavoriteRepository favoriteRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CustomerRepository customerRepository;

    // 찜 추가
    @Transactional
    public Favorite addFavorite(Integer userId, Integer productId) {
        // 사용자 및 상품 존재 확인
        if (!customerRepository.existsById(userId)) {
            throw new IllegalArgumentException("존재하지 않는 사용자입니다: " + userId);
        }
        if (!productRepository.existsById(productId)) {
            throw new IllegalArgumentException("존재하지 않는 상품입니다: " + productId);
        }

        // 이미 찜한 상품인지 확인
        if (favoriteRepository.existsByUserIdAndProductId(userId, productId)) {
            throw new IllegalArgumentException("이미 찜한 상품입니다.");
        }

        Favorite favorite = new Favorite(userId, productId);
        return favoriteRepository.save(favorite);
    }

    // 찜 삭제
    @Transactional
    public void removeFavorite(Integer userId, Integer productId) {
        if (!favoriteRepository.existsByUserIdAndProductId(userId, productId)) {
            throw new IllegalArgumentException("찜하지 않은 상품입니다.");
        }
        favoriteRepository.deleteByUserIdAndProductId(userId, productId);
    }

    // 사용자의 찜 목록 조회 (상품 정보 포함)
    public List<Product> getFavoriteProducts(Integer userId) {
        List<Favorite> favorites = favoriteRepository.findByUserId(userId);
        return favorites.stream()
                .map(favorite -> productRepository.findById(favorite.getProductId()))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
    }

    // 찜 여부 확인
    public boolean isFavorite(Integer userId, Integer productId) {
        return favoriteRepository.existsByUserIdAndProductId(userId, productId);
    }

    // 사용자의 찜 개수
    public long getFavoriteCount(Integer userId) {
        return favoriteRepository.countByUserId(userId);
    }
}