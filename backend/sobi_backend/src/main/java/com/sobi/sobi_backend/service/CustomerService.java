package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Customer;
import com.sobi.sobi_backend.repository.CustomerRepository;
import com.sobi.sobi_backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Optional;
import java.util.UUID;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TokenBlackListService tokenBlackListService;

    @Autowired
    private JwtUtil jwtUtil;

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
        return customerRepository.findByUserId(userId)
                .filter(c -> !c.getDeleted());
    }

    // ID로 고객 조회 (프로필 조회용)
    public Optional<Customer> getCustomerById(Integer id) {
        return customerRepository.findById(id);
    }

    // 회원탈퇴
    @Transactional
    public void deleteCustomer(Integer customerId, String token) {
        Optional<Customer> customerOpt = customerRepository.findById(customerId);
        if (customerOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 고객입니다: " + customerId);
        }

        Customer customer = customerOpt.get();
        if (customer.getDeleted()) {
            throw new IllegalArgumentException("이미 탈퇴한 계정입니다");
        }

        customer.setDeleted(true);
        customerRepository.save(customer);

        long expirationTime = jwtUtil.getExpirationFromToken(token);
        tokenBlackListService.addTokenToBlacklist(token, expirationTime);
    }

    // 비회원 계정 생성 (패스워드는 외부에서 암호화된 것을 받음)
    public Customer createGuestAccount(String encodedPassword) {
        try {
            System.out.println("비회원 계정 생성 시작");

            // 1. SHA-256 기반 guest ID 생성
            String guestId = generateGuestId();

            // 2. Customer 객체 생성
            Customer guestCustomer = new Customer();
            guestCustomer.setUserId(guestId);
            guestCustomer.setUserPasswd(encodedPassword);  // 이미 암호화된 패스워드 사용
            guestCustomer.setGender(0);  // 비회원은 성별 0으로 설정
            guestCustomer.setAge(0);     // 비회원은 나이 0으로 설정

            // 3. DB 저장
            Customer savedCustomer = customerRepository.save(guestCustomer);

            System.out.println("비회원 계정 생성 완료: userId=" + guestId + ", customerId=" + savedCustomer.getId());
            return savedCustomer;

        } catch (Exception e) {
            System.err.println("비회원 계정 생성 실패: " + e.getMessage());
            throw new RuntimeException("비회원 계정 생성 중 오류 발생", e);
        }
    }

    // SHA-256 기반 guest ID 생성
    private String generateGuestId() {
        try {
            // 현재 시각 + UUID를 조합하여 고유성 보장
            String input = System.currentTimeMillis() + UUID.randomUUID().toString();

            // SHA-256 해시 생성
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes());

            // 바이트 배열을 16진수 문자열로 변환
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }

            // 앞 10자리만 사용
            String hashSubstring = hexString.toString().substring(0, 10);

            // "guest" + 10자리 해시
            String guestId = "guest" + hashSubstring;

            System.out.println("생성된 guest ID: " + guestId);
            return guestId;

        } catch (NoSuchAlgorithmException e) {
            // SHA-256은 JDK 표준이므로 이 예외는 발생하지 않아야 함
            throw new RuntimeException("SHA-256 알고리즘을 찾을 수 없음", e);
        }
    }

    // 10자리 난수 비밀번호 생성
    public String generateRandomPassword() {
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder();

        for (int i = 0; i < 10; i++) {
            int index = random.nextInt(characters.length());
            password.append(characters.charAt(index));
        }

        System.out.println("생성된 임시 비밀번호 길이: " + password.length());
        return password.toString();
    }
}