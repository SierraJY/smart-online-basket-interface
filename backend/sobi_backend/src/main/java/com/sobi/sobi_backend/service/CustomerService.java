package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    // 회원가입
    public Customer registerCustomer(String userId, String password, Integer gender, Integer age) {
        // 중복 아이디 체크
        if (customerRepository.existsByUserId(userId)) {
            throw new IllegalArgumentException("이미 존재하는 사용자 ID입니다: " + userId);
        }

        Customer customer = new Customer();
        customer.setUserId(userId);
        customer.setUserPasswd(password); // 이미 암호화된 패스워드를 받음
        customer.setGender(gender);
        customer.setAge(age);

        return customerRepository.save(customer);
    }

    // 로그인 (아이디로 조회)
    public Optional<Customer> loginCustomer(String userId) {
        return customerRepository.findByUserId(userId);
    }

    // ID로 고객 조회 (프로필 조회용)
    public Optional<Customer> getCustomerById(Integer id) {
        return customerRepository.findById(id);
    }
}