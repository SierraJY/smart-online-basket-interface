package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.entity.EpcMap;
import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.entity.Receipt;
import com.sobi.sobi_backend.repository.CustomerRepository;
import com.sobi.sobi_backend.repository.EpcMapRepository;
import com.sobi.sobi_backend.repository.ReceiptRepository;
import org.junit.jupiter.api.Test;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest
@MockitoSettings(strictness = Strictness.LENIENT)
class ReceiptServiceTest {

    @Autowired
    private ReceiptService receiptService;

    @MockitoBean
    private ReceiptRepository receiptRepository;

    @MockitoBean
    private CustomerRepository customerRepository;

    @MockitoBean
    private ProductService productService;

    @MockitoBean
    private EpcMapRepository epcMapRepository;

    @Test
    void testCreateReceipt_Success() {
        // Given
        Customer customer = new Customer();
        customer.setId(1);
        customer.setUserId("testuser");

        when(customerRepository.findById(1)).thenReturn(Optional.of(customer));

        Product updatedProduct1 = new Product(1, "사과", 1500, 8);
        Product updatedProduct2 = new Product(2, "바나나", 2000, 3);

        when(productService.decreaseStock(1, 2)).thenReturn(updatedProduct1);
        when(productService.decreaseStock(2, 1)).thenReturn(updatedProduct2);

        EpcMap epcMap1 = new EpcMap(1, 1, null, "EPC001");
        EpcMap epcMap2 = new EpcMap(2, 1, null, "EPC002");
        EpcMap epcMap3 = new EpcMap(3, 2, null, "EPC003");

        when(epcMapRepository.findByEpcPattern("EPC001")).thenReturn(Optional.of(epcMap1));
        when(epcMapRepository.findByEpcPattern("EPC002")).thenReturn(Optional.of(epcMap2));
        when(epcMapRepository.findByEpcPattern("EPC003")).thenReturn(Optional.of(epcMap3));

        Receipt savedReceipt = new Receipt();
        savedReceipt.setId(1);
        savedReceipt.setUserId(1);
        savedReceipt.setProductList("{\"1\": 2, \"2\": 1}");

        when(receiptRepository.save(any(Receipt.class))).thenReturn(savedReceipt);

        // When
        Map<String, Integer> productMap = new HashMap<>();
        productMap.put("1", 2);
        productMap.put("2", 1);

        List<String> usedEpcPatterns = Arrays.asList("EPC001", "EPC002", "EPC003");

        Receipt result = receiptService.createReceipt(1, productMap, usedEpcPatterns);

        // Then
        assertThat(result.getId()).isEqualTo(1);
        assertThat(result.getProductList()).isEqualTo("{\"1\": 2, \"2\": 1}");

        // EPC 매핑 삭제 확인
        verify(epcMapRepository).delete(epcMap1);
        verify(epcMapRepository).delete(epcMap2);
        verify(epcMapRepository).delete(epcMap3);
    }

    @Test
    void testCreateReceipt_CustomerNotFound() {
        // Given
        when(customerRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        Map<String, Integer> productMap = new HashMap<>();
        productMap.put("1", 1);

        List<String> usedEpcPatterns = Arrays.asList("EPC001");

        assertThatThrownBy(() -> receiptService.createReceipt(999, productMap, usedEpcPatterns))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("존재하지 않는 고객입니다: 999");
    }

    @Test
    void testCreateReceiptFromEpcPatterns_Success() {
        // Given
        Customer customer = new Customer();
        customer.setId(1);
        customer.setUserId("testuser");

        when(customerRepository.findById(1)).thenReturn(Optional.of(customer));

        Product product1 = new Product(1, "사과", 1500, 10);
        Product product2 = new Product(2, "바나나", 2000, 5);

        EpcMap epcMap1 = new EpcMap(1, 1, product1, "EPC001");
        EpcMap epcMap2 = new EpcMap(2, 1, product1, "EPC002"); // 같은 상품
        EpcMap epcMap3 = new EpcMap(3, 2, product2, "EPC003"); // 다른 상품

        when(epcMapRepository.findByEpcPattern("EPC001")).thenReturn(Optional.of(epcMap1));
        when(epcMapRepository.findByEpcPattern("EPC002")).thenReturn(Optional.of(epcMap2));
        when(epcMapRepository.findByEpcPattern("EPC003")).thenReturn(Optional.of(epcMap3));

        when(productService.decreaseStock(1, 2)).thenReturn(product1);
        when(productService.decreaseStock(2, 1)).thenReturn(product2);

        Receipt savedReceipt = new Receipt();
        savedReceipt.setId(1);
        savedReceipt.setUserId(1);
        savedReceipt.setProductList("{\"1\": 2, \"2\": 1}");

        when(receiptRepository.save(any(Receipt.class))).thenReturn(savedReceipt);

        // When
        List<String> epcPatterns = Arrays.asList("EPC001", "EPC002", "EPC003");
        Receipt result = receiptService.createReceiptFromEpcPatterns(1, epcPatterns);

        // Then
        assertThat(result.getProductList()).isEqualTo("{\"1\": 2, \"2\": 1}");
    }

    @Test
    void testCreateReceiptFromEpcPatterns_NoValidProducts() {
        // Given
        when(epcMapRepository.findByEpcPattern("INVALID001")).thenReturn(Optional.empty());
        when(epcMapRepository.findByEpcPattern("INVALID002")).thenReturn(Optional.empty());

        // When & Then
        List<String> epcPatterns = Arrays.asList("INVALID001", "INVALID002");

        assertThatThrownBy(() -> receiptService.createReceiptFromEpcPatterns(1, epcPatterns))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("유효한 상품이 없습니다.");
    }

    @Test
    void testGetReceiptsByUserId() {
        // Given
        Receipt receipt1 = new Receipt();
        receipt1.setId(1);
        receipt1.setUserId(1);

        Receipt receipt2 = new Receipt();
        receipt2.setId(2);
        receipt2.setUserId(1);

        when(receiptRepository.findByUserId(1)).thenReturn(Arrays.asList(receipt1, receipt2));

        // When
        List<Receipt> result = receiptService.getReceiptsByUserId(1);

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(1);
        assertThat(result.get(1).getId()).isEqualTo(2);
    }
}