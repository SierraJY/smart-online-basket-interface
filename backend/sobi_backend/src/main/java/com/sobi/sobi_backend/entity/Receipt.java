package com.sobi.sobi_backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "receipt")
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false, insertable = false, updatable = false)
    private Integer userId;

    //외래키 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private Customer customer;

    @Column(name = "product_list", nullable = false, columnDefinition = "json")
    @JdbcTypeCode(SqlTypes.JSON)
    private String productList;

    @Column(name = "purchased_at", nullable = false)
    private LocalDateTime purchasedAt;

    // Default constructor
    public Receipt() {}

    // All args constructor
    public Receipt(Integer id, Integer userId, Customer customer, String productList, LocalDateTime purchasedAt) {
        this.id = id;
        this.userId = userId;
        this.customer = customer;
        this.productList = productList;
        this.purchasedAt = purchasedAt;
    }

    @PrePersist
    protected void onCreate() {
        if (purchasedAt == null) {
            purchasedAt = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public String getProductList() {
        return productList;
    }

    public void setProductList(String productList) {
        this.productList = productList;
    }

    public LocalDateTime getPurchasedAt() {
        return purchasedAt;
    }

    public void setPurchasedAt(LocalDateTime purchasedAt) {
        this.purchasedAt = purchasedAt;
    }
}