package com.sobi.sobi_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "basket")
public class Basket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "board_mac", nullable = false)
    private String boardMac;

    @Column(name = "usable", nullable = false)
    private Boolean usable = true;

    // Default constructor
    public Basket() {}

    // All args constructor
    public Basket(Integer id, String boardMac, Boolean usable) {
        this.id = id;
        this.boardMac = boardMac;
        this.usable = usable;
    }

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getBoardMac() {
        return boardMac;
    }

    public void setBoardMac(String boardMac) {
        this.boardMac = boardMac;
    }

    public Boolean getUsable() {
        return usable;
    }

    public void setUsable(Boolean usable) {
        this.usable = usable;
    }
}