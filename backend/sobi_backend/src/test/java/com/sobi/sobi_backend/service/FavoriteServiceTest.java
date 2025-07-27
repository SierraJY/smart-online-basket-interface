package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Favorite;
import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.repository.FavoriteRepository;
import com.sobi.sobi_backend.repository.ProductRepository;
import com.sobi.sobi_backend.repository.CustomerRepository;
import org.junit.jupiter.api.Test;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@MockitoSettings(strictness = Strictness.LENIENT)
class FavoriteServiceTest {

    @Autowired
    private FavoriteService favoriteService;

    @MockitoBean
    private FavoriteRepository favoriteRepository;

    @MockitoBean
    private ProductRepository productRepository;

    @MockitoBean
    private CustomerRepository customerRepository;

    @Test
    void testAddFavorite_Success() {
        // Given
        Integer userId = 1;
        Integer productId = 10;

        when(customerRepository.existsById(userId)).thenReturn(true);
        when(productRepository.existsById(productId)).thenReturn(true);
        when(favoriteRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(false);

        Favorite savedFavorite = new Favorite(1, userId, productId);
        when(favoriteRepository.save(any(Favorite.class))).thenReturn(savedFavorite);

        // When
        Favorite result = favoriteService.addFavorite(userId, productId);

        // Then
        assertThat(result.getId()).isEqualTo(1);
        assertThat(result.getUserId()).isEqualTo(userId);
        assertThat(result.getProductId()).isEqualTo(productId);
        verify(favoriteRepository).save(any(Favorite.class));
    }

    @Test
    void testAddFavorite_UserNotFound() {
        // Given
        Integer userId = 999;
        Integer productId = 10;

        when(customerRepository.existsById(userId)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> favoriteService.addFavorite(userId, productId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("존재하지 않는 사용자입니다: 999");

        verify(favoriteRepository, never()).save(any());
    }

    @Test
    void testAddFavorite_ProductNotFound() {
        // Given
        Integer userId = 1;
        Integer productId = 999;

        when(customerRepository.existsById(userId)).thenReturn(true);
        when(productRepository.existsById(productId)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> favoriteService.addFavorite(userId, productId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("존재하지 않는 상품입니다: 999");

        verify(favoriteRepository, never()).save(any());
    }

    @Test
    void testAddFavorite_AlreadyExists() {
        // Given
        Integer userId = 1;
        Integer productId = 10;

        when(customerRepository.existsById(userId)).thenReturn(true);
        when(productRepository.existsById(productId)).thenReturn(true);
        when(favoriteRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> favoriteService.addFavorite(userId, productId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 찜한 상품입니다.");

        verify(favoriteRepository, never()).save(any());
    }

    @Test
    void testRemoveFavorite_Success() {
        // Given
        Integer userId = 1;
        Integer productId = 10;

        when(favoriteRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(true);
        doNothing().when(favoriteRepository).deleteByUserIdAndProductId(userId, productId);

        // When
        favoriteService.removeFavorite(userId, productId);

        // Then
        verify(favoriteRepository).deleteByUserIdAndProductId(userId, productId);
    }

    @Test
    void testRemoveFavorite_NotExists() {
        // Given
        Integer userId = 1;
        Integer productId = 10;

        when(favoriteRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> favoriteService.removeFavorite(userId, productId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("찜하지 않은 상품입니다.");

        verify(favoriteRepository, never()).deleteByUserIdAndProductId(any(), any());
    }

    @Test
    void testGetFavoriteProducts_Success() {
        // Given
        Integer userId = 1;

        Favorite favorite1 = new Favorite(1, userId, 10);
        Favorite favorite2 = new Favorite(2, userId, 20);
        List<Favorite> favorites = Arrays.asList(favorite1, favorite2);

        Product product1 = new Product(10, "사과", 1500, 10);
        Product product2 = new Product(20, "바나나", 2000, 5);

        when(favoriteRepository.findByUserId(userId)).thenReturn(favorites);
        when(productRepository.findById(10)).thenReturn(Optional.of(product1));
        when(productRepository.findById(20)).thenReturn(Optional.of(product2));

        // When
        List<Product> result = favoriteService.getFavoriteProducts(userId);

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("사과");
        assertThat(result.get(1).getName()).isEqualTo("바나나");
    }

    @Test
    void testGetFavoriteProducts_WithDeletedProduct() {
        // Given
        Integer userId = 1;

        Favorite favorite1 = new Favorite(1, userId, 10);
        Favorite favorite2 = new Favorite(2, userId, 999); // 삭제된 상품
        List<Favorite> favorites = Arrays.asList(favorite1, favorite2);

        Product product1 = new Product(10, "사과", 1500, 10);

        when(favoriteRepository.findByUserId(userId)).thenReturn(favorites);
        when(productRepository.findById(10)).thenReturn(Optional.of(product1));
        when(productRepository.findById(999)).thenReturn(Optional.empty()); // 삭제된 상품

        // When
        List<Product> result = favoriteService.getFavoriteProducts(userId);

        // Then
        assertThat(result).hasSize(1); // 존재하는 상품만 반환
        assertThat(result.get(0).getName()).isEqualTo("사과");
    }

    @Test
    void testIsFavorite_True() {
        // Given
        Integer userId = 1;
        Integer productId = 10;

        when(favoriteRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(true);

        // When
        boolean result = favoriteService.isFavorite(userId, productId);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    void testIsFavorite_False() {
        // Given
        Integer userId = 1;
        Integer productId = 10;

        when(favoriteRepository.existsByUserIdAndProductId(userId, productId)).thenReturn(false);

        // When
        boolean result = favoriteService.isFavorite(userId, productId);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    void testGetFavoriteCount() {
        // Given
        Integer userId = 1;
        long expectedCount = 5L;

        when(favoriteRepository.countByUserId(userId)).thenReturn(expectedCount);

        // When
        long result = favoriteService.getFavoriteCount(userId);

        // Then
        assertThat(result).isEqualTo(expectedCount);
    }

    @Test
    void testGetFavoriteCount_ZeroFavorites() {
        // Given
        Integer userId = 1;
        long expectedCount = 0L;

        when(favoriteRepository.countByUserId(userId)).thenReturn(expectedCount);

        // When
        long result = favoriteService.getFavoriteCount(userId);

        // Then
        assertThat(result).isEqualTo(0L);
    }

    @Test
    void testMultipleUsersCanFavoriteSameProduct() {
        // Given - 여러 사용자가 같은 상품을 찜할 수 있음을 테스트
        Integer productId = 10;
        Integer user1 = 1;
        Integer user2 = 2;

        // User1이 상품10을 찜
        when(customerRepository.existsById(user1)).thenReturn(true);
        when(productRepository.existsById(productId)).thenReturn(true);
        when(favoriteRepository.existsByUserIdAndProductId(user1, productId)).thenReturn(false);

        Favorite favorite1 = new Favorite(1, user1, productId);
        when(favoriteRepository.save(any(Favorite.class))).thenReturn(favorite1);

        // When
        Favorite result1 = favoriteService.addFavorite(user1, productId);

        // User2도 같은 상품10을 찜
        when(customerRepository.existsById(user2)).thenReturn(true);
        when(favoriteRepository.existsByUserIdAndProductId(user2, productId)).thenReturn(false);

        Favorite favorite2 = new Favorite(2, user2, productId);
        when(favoriteRepository.save(any(Favorite.class))).thenReturn(favorite2);

        Favorite result2 = favoriteService.addFavorite(user2, productId);

        // Then
        assertThat(result1.getUserId()).isEqualTo(user1);
        assertThat(result1.getProductId()).isEqualTo(productId);
        assertThat(result2.getUserId()).isEqualTo(user2);
        assertThat(result2.getProductId()).isEqualTo(productId);
    }

    @Test
    void testSameUserCanFavoriteMultipleProducts() {
        // Given - 같은 사용자가 여러 상품을 찜할 수 있음을 테스트
        Integer userId = 1;
        Integer product1 = 10;
        Integer product2 = 20;

        when(customerRepository.existsById(userId)).thenReturn(true);
        when(productRepository.existsById(product1)).thenReturn(true);
        when(productRepository.existsById(product2)).thenReturn(true);
        when(favoriteRepository.existsByUserIdAndProductId(userId, product1)).thenReturn(false);
        when(favoriteRepository.existsByUserIdAndProductId(userId, product2)).thenReturn(false);

        Favorite favorite1 = new Favorite(1, userId, product1);
        Favorite favorite2 = new Favorite(2, userId, product2);
        when(favoriteRepository.save(any(Favorite.class))).thenReturn(favorite1, favorite2);

        // When
        Favorite result1 = favoriteService.addFavorite(userId, product1);
        Favorite result2 = favoriteService.addFavorite(userId, product2);

        // Then
        assertThat(result1.getUserId()).isEqualTo(userId);
        assertThat(result1.getProductId()).isEqualTo(product1);
        assertThat(result2.getUserId()).isEqualTo(userId);
        assertThat(result2.getProductId()).isEqualTo(product2);
    }
}