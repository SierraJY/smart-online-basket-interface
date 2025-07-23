package com.sobi.sobi_backend.entity;

import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "customer")
public class Customer implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false, unique = true)
    private String userId;

    @Column(name = "user_passwd", nullable = false)
    private String userPasswd;

    @Column(name = "gender")
    private Integer gender; // 0 for man, 1 for female

    @Column(name = "age")
    private Integer age;

    // Default constructor
    public Customer() {}

    // All args constructor
    public Customer(Integer id, String userId, String userPasswd, Integer gender, Integer age) {
        this.id = id;
        this.userId = userId;
        this.userPasswd = userPasswd;
        this.gender = gender;
        this.age = age;
    }

    // UserDetails 구현 메소드들
    @Override
    public String getUsername() {
        return userId;
    }

    @Override
    public String getPassword() {
        return userPasswd;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true; // 항상 활성화
    }

    // 기존 Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserPasswd() {
        return userPasswd;
    }

    public void setUserPasswd(String userPasswd) {
        this.userPasswd = userPasswd;
    }

    public Integer getGender() {
        return gender;
    }

    public void setGender(Integer gender) {
        this.gender = gender;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }
}