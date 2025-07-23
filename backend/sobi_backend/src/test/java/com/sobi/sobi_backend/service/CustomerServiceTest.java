package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.repository.CustomerRepository;
import org.junit.jupiter.api.Test;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
@MockitoSettings(strictness = Strictness.LENIENT)
class CustomerServiceTest {

    @Autowired
    private CustomerService customerService;

    @MockitoBean
    private CustomerRepository customerRepository;

    @Test
    void testRegisterCustomer_Success() {
        // Given
        when(customerRepository.existsByUserId("newuser")).thenReturn(false);

        Customer savedCustomer = new Customer();
        savedCustomer.setId(1);
        savedCustomer.setUserId("newuser");
        savedCustomer.setUserPasswd("password");
        savedCustomer.setGender(0);
        savedCustomer.setAge(25);

        when(customerRepository.save(any(Customer.class))).thenReturn(savedCustomer);

        // When
        Customer result = customerService.registerCustomer("newuser", "password", 0, 25);

        // Then
        assertThat(result.getId()).isEqualTo(1);
        assertThat(result.getUserId()).isEqualTo("newuser");
        assertThat(result.getGender()).isEqualTo(0);
        assertThat(result.getAge()).isEqualTo(25);
    }

    @Test
    void testRegisterCustomer_DuplicateUserId() {
        // Given
        when(customerRepository.existsByUserId("duplicate")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> customerService.registerCustomer("duplicate", "password", 0, 25))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 존재하는 사용자 ID입니다: duplicate");
    }

    @Test
    void testLoginCustomer_Success() {
        // Given
        Customer customer = new Customer();
        customer.setUserId("testuser");
        customer.setUserPasswd("password");

        when(customerRepository.findByUserId("testuser")).thenReturn(Optional.of(customer));

        // When
        Optional<Customer> result = customerService.loginCustomer("testuser");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getUserId()).isEqualTo("testuser");
    }

    @Test
    void testLoginCustomer_UserNotFound() {
        // Given
        when(customerRepository.findByUserId("nonexistent")).thenReturn(Optional.empty());

        // When
        Optional<Customer> result = customerService.loginCustomer("nonexistent");

        // Then
        assertThat(result).isEmpty();
    }
}