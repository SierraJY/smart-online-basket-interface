package com.sobi.sobi_backend.repository;

import com.sobi.sobi_backend.entity.Customer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@Rollback
class CustomerRepositoryTest {

    @Autowired
    private CustomerRepository customerRepository;

    @Test
    void testSaveAndFindCustomer() {
        // Given
        Customer customer = new Customer();
        customer.setUserId("test001");
        customer.setUserPasswd("password123");
        customer.setGender(0);
        customer.setAge(25);

        // When
        Customer savedCustomer = customerRepository.save(customer);

        // Then
        assertThat(savedCustomer.getId()).isNotNull();
        assertThat(savedCustomer.getUserId()).isEqualTo("test001");
    }

    @Test
    void testFindByUserId() {
        // Given
        Customer customer = new Customer();
        customer.setUserId("testuser");
        customer.setUserPasswd("password");
        customerRepository.save(customer);

        // When
        Optional<Customer> found = customerRepository.findByUserId("testuser");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo("testuser");
    }

    @Test
    void testExistsByUserId() {
        // Given
        Customer customer = new Customer();
        customer.setUserId("existuser");
        customer.setUserPasswd("password");
        customerRepository.save(customer);

        // When & Then
        assertThat(customerRepository.existsByUserId("existuser")).isTrue();
        assertThat(customerRepository.existsByUserId("nonexistuser")).isFalse();
    }
}