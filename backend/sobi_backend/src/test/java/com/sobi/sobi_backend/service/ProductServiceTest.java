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
        product.setCategory("과일");
        product.setImageUrl("http://example.com/apple.jpg");
        product.setDiscountRate(10);
        product.setSales(100);
        product.setTag("#신선#과일#건강");
        product.setLocation("A-1");
        product.setDescription("신선한 사과입니다.");
        product.setBrand("농협");

        when(productRepository.findById(1)).thenReturn(Optional.of(product));

        // When
        Optional<Product> result = productService.getProductById(1);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("사과");
        assertThat(result.get().getPrice()).isEqualTo(1500);
        assertThat(result.get().getCategory()).isEqualTo("과일");
        assertThat(result.get().getDiscountRate()).isEqualTo(10);
        assertThat(result.get().getDiscountedPrice()).isEqualTo(1350); // 1500 - (1500 * 10 / 100)
        assertThat(result.get().getSales()).isEqualTo(100);
        assertThat(result.get().getTag()).isEqualTo("#신선#과일#건강");
        assertThat(result.get().getTagArray()).containsExactly("신선", "과일", "건강");
        assertThat(result.get().getBrand()).isEqualTo("농협");
    }

    @Test
    void testGetAllProducts() {
        // Given
        Product product1 = new Product(1, "사과", 1500, 10);
        product1.setCategory("과일");
        product1.setDiscountRate(0);
        product1.setSales(50);
        product1.setBrand("농협");

        Product product2 = new Product(2, "바나나", 2000, 5);
        product2.setCategory("과일");
        product2.setDiscountRate(15);
        product2.setSales(30);
        product2.setBrand("델몬트");

        when(productRepository.findAll()).thenReturn(Arrays.asList(product1, product2));

        // When
        List<Product> result = productService.getAllProducts();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("사과");
        assertThat(result.get(0).getDiscountedPrice()).isEqualTo(1500); // 할인 없음
        assertThat(result.get(0).getBrand()).isEqualTo("농협");
        assertThat(result.get(1).getName()).isEqualTo("바나나");
        assertThat(result.get(1).getDiscountedPrice()).isEqualTo(1700); // 2000 - (2000 * 15 / 100)
        assertThat(result.get(1).getBrand()).isEqualTo("델몬트");
    }

    @Test
    void testSearchProducts() {
        // Given
        Product product = new Product(1, "사과주스", 3000, 8);
        product.setCategory("음료");
        product.setDiscountRate(20);
        product.setSales(75);
        product.setBrand("롯데");

        when(productRepository.findByNameContaining("사과")).thenReturn(Arrays.asList(product));

        // When
        List<Product> result = productService.searchProducts("사과");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("사과주스");
        assertThat(result.get(0).getCategory()).isEqualTo("음료");
        assertThat(result.get(0).getDiscountedPrice()).isEqualTo(2400); // 3000 - (3000 * 20 / 100)
        assertThat(result.get(0).getBrand()).isEqualTo("롯데");
    }

    @Test
    void testDecreaseStock_Success() {
        // Given
        Product product = new Product();
        product.setId(1);
        product.setName("사과");
        product.setPrice(1500);
        product.setStock(10);
        product.setSales(50);
        product.setBrand("농협");

        Product updatedProduct = new Product();
        updatedProduct.setId(1);
        updatedProduct.setName("사과");
        updatedProduct.setPrice(1500);
        updatedProduct.setStock(8);
        updatedProduct.setSales(50);
        updatedProduct.setBrand("농협");

        when(productRepository.findById(1)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(updatedProduct);

        // When
        Product result = productService.decreaseStock(1, 2);

        // Then
        assertThat(result.getStock()).isEqualTo(8);
        assertThat(result.getBrand()).isEqualTo("농협");
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

    @Test
    void testIncreaseSales_Success() {
        // Given
        Product product = new Product();
        product.setId(1);
        product.setName("사과");
        product.setPrice(1500);
        product.setStock(10);
        product.setSales(50);
        product.setBrand("농협");

        Product updatedProduct = new Product();
        updatedProduct.setId(1);
        updatedProduct.setName("사과");
        updatedProduct.setPrice(1500);
        updatedProduct.setStock(10);
        updatedProduct.setSales(52);
        updatedProduct.setBrand("농협");

        when(productRepository.findById(1)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(updatedProduct);

        // When
        Product result = productService.increaseSales(1, 2);

        // Then
        assertThat(result.getSales()).isEqualTo(52);
        assertThat(result.getBrand()).isEqualTo("농협");
    }

    @Test
    void testIncreaseSales_ProductNotFound() {
        // Given
        when(productRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> productService.increaseSales(999, 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("존재하지 않는 상품입니다: 999");
    }

    @Test
    void testGetProductsByCategory_Success() {
        // Given
        Product product1 = new Product(1, "사과", 1500, 10);
        product1.setCategory("과일");
        product1.setBrand("농협");

        Product product2 = new Product(2, "바나나", 2000, 5);
        product2.setCategory("과일");
        product2.setBrand("델몬트");

        when(productRepository.findByCategory("과일")).thenReturn(Arrays.asList(product1, product2));

        // When
        List<Product> result = productService.getProductsByCategory("과일");

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getCategory()).isEqualTo("과일");
        assertThat(result.get(0).getBrand()).isEqualTo("농협");
        assertThat(result.get(1).getCategory()).isEqualTo("과일");
        assertThat(result.get(1).getBrand()).isEqualTo("델몬트");
    }

    @Test
    void testGetProductsByBrand_Success() {
        // Given
        Product product1 = new Product(1, "사과", 1500, 10);
        product1.setCategory("과일");
        product1.setBrand("농협");

        Product product2 = new Product(2, "배", 2500, 8);
        product2.setCategory("과일");
        product2.setBrand("농협");

        when(productRepository.findByBrand("농협")).thenReturn(Arrays.asList(product1, product2));

        // When
        List<Product> result = productService.getProductsByBrand("농협");

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getBrand()).isEqualTo("농협");
        assertThat(result.get(1).getBrand()).isEqualTo("농협");
    }

    @Test
    void testProductWithNullBrand() {
        // Given
        Product product = new Product();
        product.setId(1);
        product.setName("노브랜드 상품");
        product.setPrice(1000);
        product.setStock(5);
        product.setBrand(null); // 브랜드 없음

        when(productRepository.findById(1)).thenReturn(Optional.of(product));

        // When
        Optional<Product> result = productService.getProductById(1);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getBrand()).isNull();
        assertThat(result.get().getName()).isEqualTo("노브랜드 상품");
    }

    @Test
    void testProductDiscountCalculation() {
        // Given
        Product product = new Product();
        product.setPrice(1000);
        product.setDiscountRate(25);

        // When & Then
        assertThat(product.getDiscountedPrice()).isEqualTo(750); // 1000 - (1000 * 25 / 100)
        assertThat(product.getDiscountAmount()).isEqualTo(250); // 1000 * 25 / 100
    }

    @Test
    void testProductTagHandling() {
        // Given
        Product product = new Product();
        product.setTag("#신선#과일#건강#");

        // When & Then
        String[] tags = product.getTagArray();
        assertThat(tags).containsExactly("신선", "과일", "건강");

        // Tag 배열로 설정 테스트
        product.setTagFromArray(new String[]{"새로운", "태그", "테스트"});
        assertThat(product.getTag()).isEqualTo("#새로운#태그#테스트#");
    }

    @Test
    void testProductNoDiscount() {
        // Given
        Product product = new Product();
        product.setPrice(1000);
        product.setDiscountRate(0); // 할인 없음

        // When & Then
        assertThat(product.getDiscountedPrice()).isEqualTo(1000);
        assertThat(product.getDiscountAmount()).isEqualTo(0);
    }
}