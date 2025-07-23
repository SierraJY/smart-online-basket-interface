package com.sobi.sobi_backend.repository;

import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.entity.Receipt;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@Rollback
class ReceiptRepositoryTest {

    @Autowired
    private ReceiptRepository receiptRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Test
    void testSaveAndFindReceipt() {
        // Given - Customer 먼저 생성
        Customer customer = new Customer();
        customer.setUserId("testuser");
        customer.setUserPasswd("password");
        Customer savedCustomer = customerRepository.save(customer);

        // Given - Receipt 생성
        Receipt receipt = new Receipt();
        receipt.setUserId(savedCustomer.getId());
        receipt.setCustomer(savedCustomer);
        receipt.setProductList("{\"1\": 2, \"3\": 1}"); // 상품1: 2개, 상품3: 1개
        receipt.setPurchasedAt(LocalDateTime.now());

        // When
        Receipt savedReceipt = receiptRepository.save(receipt);

        // Then
        assertThat(savedReceipt.getId()).isNotNull();
        assertThat(savedReceipt.getUserId()).isEqualTo(savedCustomer.getId());
        assertThat(savedReceipt.getProductList()).contains("\"1\"");
    }

    @Test
    void testFindByUserId() {
        // Given - Customer 생성
        Customer customer = new Customer();
        customer.setUserId("customer123");
        customer.setUserPasswd("password");
        Customer savedCustomer = customerRepository.save(customer);

        // Given - Receipt 여러 개 생성
        Receipt receipt1 = new Receipt();
        receipt1.setUserId(savedCustomer.getId());
        receipt1.setCustomer(savedCustomer);
        receipt1.setProductList("{\"1\": 3, \"2\": 1}"); // 상품1: 3개, 상품2: 1개
        receipt1.setPurchasedAt(LocalDateTime.now().minusHours(1));

        Receipt receipt2 = new Receipt();
        receipt2.setUserId(savedCustomer.getId());
        receipt2.setCustomer(savedCustomer);
        receipt2.setProductList("{\"4\": 2}"); // 상품4: 2개
        receipt2.setPurchasedAt(LocalDateTime.now());

        receiptRepository.save(receipt1);
        receiptRepository.save(receipt2);

        // When
        List<Receipt> receipts = receiptRepository.findByUserId(savedCustomer.getId());

        // Then
        assertThat(receipts).hasSize(2);
        assertThat(receipts.get(0).getUserId()).isEqualTo(savedCustomer.getId());
        assertThat(receipts.get(1).getUserId()).isEqualTo(savedCustomer.getId());
    }

    @Test
    void testFindByUserIdWithNoReceipts() {
        // Given - Customer 생성 (구매 기록 없음)
        Customer customer = new Customer();
        customer.setUserId("noreceipts");
        customer.setUserPasswd("password");
        Customer savedCustomer = customerRepository.save(customer);

        // When
        List<Receipt> receipts = receiptRepository.findByUserId(savedCustomer.getId());

        // Then
        assertThat(receipts).isEmpty();
    }
}