package com.sobi.sobi_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "epc_map")
public class EpcMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "product_id", nullable = false)
    private Integer productId;

    @Column(name = "epc_pattern", nullable = false)
    private String epcPattern; // 실제 EPC: {epc_pattern}{write_date}

    // Default constructor
    public EpcMap() {}

    // 필수 필드 생성자
    public EpcMap(Integer productId, String epcPattern) {
        this.productId = productId;
        this.epcPattern = epcPattern;
    }

    // All args constructor
    public EpcMap(Integer id, Integer productId, String epcPattern) {
        this.id = id;
        this.productId = productId;
        this.epcPattern = epcPattern;
    }

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getProductId() {
        return productId;
    }

    public void setProductId(Integer productId) {
        this.productId = productId;
    }

    public String getEpcPattern() {
        return epcPattern;
    }

    public void setEpcPattern(String epcPattern) {
        this.epcPattern = epcPattern;
    }
}