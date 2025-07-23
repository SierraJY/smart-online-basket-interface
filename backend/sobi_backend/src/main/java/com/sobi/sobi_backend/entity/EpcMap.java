package com.sobi.sobi_backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "epc_map")
public class EpcMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "product_id", nullable = false, insertable = false, updatable = false)
    private Integer productId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    private Product product;

    @Column(name = "epc_pattern", nullable = false)
    private String epcPattern; // 실제 EPC: {epc_pattern}{write_date}

    // Default constructor
    public EpcMap() {}

    // All args constructor
    public EpcMap(Integer id, Integer productId, Product product, String epcPattern) {
        this.id = id;
        this.productId = productId;
        this.product = product;
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

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getEpcPattern() {
        return epcPattern;
    }

    public void setEpcPattern(String epcPattern) {
        this.epcPattern = epcPattern;
    }
}