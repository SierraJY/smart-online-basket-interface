package com.sobi.sobi_backend.repository;

import com.sobi.sobi_backend.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Integer> {

    // 로그인용: userId로 고객 찾기
    Optional<Customer> findByUserId(String userId);

    // userId 중복 체크
    boolean existsByUserId(String userId);
}