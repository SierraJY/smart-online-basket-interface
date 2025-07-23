package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.repository.ProductRepository;
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
import static org.mockito.Mockito.when;

@SpringBootTest
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductServiceTest {

    @Autowired
    private ProductService productService;

    @MockitoBean
    private ProductRepository productRepository;

    @Test
    void testGetProductById_Success() {
        // Given
        Product product = new Product();
        product.setId(1);
        product.setName("사과");
        product.setPrice(1500);
        product.setStock(10);

        when(productRepository.findById(1)).thenReturn(Optional.of(product));

        // When
        Optional<Product> result = productService.getProductById(1);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("사과");
        assertThat(result.get().getPrice()).isEqualTo(1500);
    }

    @Test
    void testGetAllProducts() {
        // Given
        Product product1 = new Product(1, "사과", 1500, 10);
        Product product2 = new Product(2, "바나나", 2000, 5);

        when(productRepository.findAll()).thenReturn(Arrays.asList(product1, product2));

        // When
        List<Product> result = productService.getAllProducts();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("사과");
        assertThat(result.get(1).getName()).isEqualTo("바나나");
    }

    @Test
    void testSearchProducts() {
        // Given
        Product product = new Product(1, "사과주스", 3000, 8);

        when(productRepository.findByNameContaining("사과")).thenReturn(Arrays.asList(product));

        // When
        List<Product> result = productService.searchProducts("사과");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("사과주스");
    }

    @Test
    void testDecreaseStock_Success() {
        // Given
        Product product = new Product();
        product.setId(1);
        product.setName("사과");
        product.setPrice(1500);
        product.setStock(10);

        Product updatedProduct = new Product();
        updatedProduct.setId(1);
        updatedProduct.setName("사과");
        updatedProduct.setPrice(1500);
        updatedProduct.setStock(8);

        when(productRepository.findById(1)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(updatedProduct);

        // When
        Product result = productService.decreaseStock(1, 2);

        // Then
        assertThat(result.getStock()).isEqualTo(8);
    }

    @Test
    void testDecreaseStock_InsufficientStock() {
        // Given
        Product product = new Product();
        product.setId(1);
        product.setStock(3);

        when(productRepository.findById(1)).thenReturn(Optional.of(product));

        // When & Then
        assertThatThrownBy(() -> productService.decreaseStock(1, 5))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("재고가 부족합니다. 현재 재고: 3");
    }

    @Test
    void testDecreaseStock_ProductNotFound() {
        // Given
        when(productRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> productService.decreaseStock(999, 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("존재하지 않는 상품입니다: 999");
    }
}