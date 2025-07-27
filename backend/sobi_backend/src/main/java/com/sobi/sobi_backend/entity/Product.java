package com.sobi.sobi_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "product",
        uniqueConstraints = @UniqueConstraint(columnNames = {"name", "image_url"}))
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "price", nullable = false)
    private Integer price;

    @Column(name = "stock", nullable = false)
    private Integer stock = 0;

    @Column(name = "category")
    private String category;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "discount_rate")
    private Integer discountRate = 0;

    @Column(name = "sales")
    private Integer sales = 0;

    @Column(name = "tag")
    private String tag; // "#tag1#tag2#tag3" 형식

    @Column(name = "location")
    private String location;

    @Lob
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "brand")
    private String brand; // 브랜드 (NULL 가능)

    // Default constructor
    public Product() {}

    // 기본 필수 필드 생성자 (테스트용)
    public Product(Integer id, String name, Integer price, Integer stock) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.stock = stock;
    }

    // All args constructor
    public Product(Integer id, String name, Integer price, Integer stock, String category,
                   String imageUrl, Integer discountRate, Integer sales, String tag,
                   String location, String description, String brand) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.stock = stock;
        this.category = category;
        this.imageUrl = imageUrl;
        this.discountRate = discountRate;
        this.sales = sales;
        this.tag = tag;
        this.location = location;
        this.description = description;
        this.brand = brand;
    }

    // 할인된 실제 가격 계산 메서드
    public Integer getDiscountedPrice() {
        if (discountRate == null || discountRate == 0) {
            return price;
        }
        return price - (price * discountRate / 100);
    }

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getPrice() {
        return price;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Integer getDiscountRate() {
        return discountRate;
    }

    public void setDiscountRate(Integer discountRate) {
        this.discountRate = discountRate;
    }

    public Integer getSales() {
        return sales;
    }

    public void setSales(Integer sales) {
        this.sales = sales;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }
}