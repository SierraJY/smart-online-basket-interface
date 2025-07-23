package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.EpcMap;
import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.repository.EpcMapRepository;
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
class EpcMapServiceTest {

    @Autowired
    private EpcMapService epcMapService;

    @MockitoBean
    private EpcMapRepository epcMapRepository;

    @MockitoBean
    private ProductRepository productRepository;

    @Test
    void testCreateEpcMap_Success() {
        // Given
        Product product = new Product(1, "사과", 1500, 10);
        when(productRepository.findById(1)).thenReturn(Optional.of(product));
        when(epcMapRepository.findByEpcPattern("EPC001")).thenReturn(Optional.empty());

        EpcMap savedEpcMap = new EpcMap();
        savedEpcMap.setId(1);
        savedEpcMap.setProductId(1);
        savedEpcMap.setProduct(product);
        savedEpcMap.setEpcPattern("EPC001");

        when(epcMapRepository.save(any(EpcMap.class))).thenReturn(savedEpcMap);

        // When
        EpcMap result = epcMapService.createEpcMap(1, "EPC001");

        // Then
        assertThat(result.getId()).isEqualTo(1);
        assertThat(result.getProductId()).isEqualTo(1);
        assertThat(result.getEpcPattern()).isEqualTo("EPC001");
    }

    @Test
    void testCreateEpcMap_ProductNotFound() {
        // Given
        when(productRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> epcMapService.createEpcMap(999, "EPC001"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("존재하지 않는 상품입니다: 999");
    }

    @Test
    void testCreateEpcMap_DuplicateEpcPattern() {
        // Given
        Product product = new Product(1, "사과", 1500, 10);
        when(productRepository.findById(1)).thenReturn(Optional.of(product));

        EpcMap existingEpcMap = new EpcMap();
        when(epcMapRepository.findByEpcPattern("EPC001")).thenReturn(Optional.of(existingEpcMap));

        // When & Then
        assertThatThrownBy(() -> epcMapService.createEpcMap(1, "EPC001"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 등록된 EPC 패턴입니다: EPC001");
    }

    @Test
    void testGetProductByEpcPattern_Success() {
        // Given
        Product product = new Product(1, "사과", 1500, 10);

        EpcMap epcMap = new EpcMap();
        epcMap.setProductId(1);
        epcMap.setProduct(product);
        epcMap.setEpcPattern("EPC001");

        when(epcMapRepository.findByEpcPattern("EPC001")).thenReturn(Optional.of(epcMap));

        // When
        Optional<Product> result = epcMapService.getProductByEpcPattern("EPC001");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("사과");
        assertThat(result.get().getId()).isEqualTo(1);
    }

    @Test
    void testGetProductByEpcPattern_NotFound() {
        // Given
        when(epcMapRepository.findByEpcPattern("NONEXISTENT")).thenReturn(Optional.empty());

        // When
        Optional<Product> result = epcMapService.getProductByEpcPattern("NONEXISTENT");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    void testGetActualStockByProductId() {
        // Given
        EpcMap epcMap1 = new EpcMap(1, 1, null, "EPC001");
        EpcMap epcMap2 = new EpcMap(2, 1, null, "EPC002");
        EpcMap epcMap3 = new EpcMap(3, 1, null, "EPC003");

        when(epcMapRepository.findByProductId(1)).thenReturn(Arrays.asList(epcMap1, epcMap2, epcMap3));

        // When
        long actualStock = epcMapService.getActualStockByProductId(1);

        // Then
        assertThat(actualStock).isEqualTo(3);
    }

    @Test
    void testGetEpcMapsByProductId() {
        // Given
        EpcMap epcMap1 = new EpcMap(1, 1, null, "EPC001");
        EpcMap epcMap2 = new EpcMap(2, 1, null, "EPC002");

        when(epcMapRepository.findByProductId(1)).thenReturn(Arrays.asList(epcMap1, epcMap2));

        // When
        List<EpcMap> result = epcMapService.getEpcMapsByProductId(1);

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getEpcPattern()).isEqualTo("EPC001");
        assertThat(result.get(1).getEpcPattern()).isEqualTo("EPC002");
    }
}