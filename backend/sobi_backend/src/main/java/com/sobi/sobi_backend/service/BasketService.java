package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Basket;
import com.sobi.sobi_backend.repository.BasketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BasketService {

    @Autowired
    private BasketRepository basketRepository;

    // 바구니 조회 (ID로)
    public Optional<Basket> getBasketById(Integer id) {
        return basketRepository.findById(id);
    }

    // 모든 바구니 조회
    public List<Basket> getAllBaskets() {
        return basketRepository.findAll();
    }

    // 바구니 사용 상태 토글
    public Basket toggleBasketUsable(Integer basketId) {
        Optional<Basket> basketOpt = basketRepository.findById(basketId);
        if (basketOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 바구니입니다: " + basketId);
        }

        Basket basket = basketOpt.get();
        basket.setUsable(!basket.getUsable()); // 토글
        return basketRepository.save(basket);
    }

    // 바구니 사용 시작 (고객이 바구니를 가져갈 때)
    public Basket startUsingBasket(Integer basketId) {
        Optional<Basket> basketOpt = basketRepository.findById(basketId);
        if (basketOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 바구니입니다: " + basketId);
        }

        Basket basket = basketOpt.get();
        if (!basket.getUsable()) {
            throw new IllegalArgumentException("사용할 수 없는 바구니입니다: " + basketId);
        }

        basket.setUsable(false); // 사용 중으로 변경
        return basketRepository.save(basket);
    }

    // 바구니 반납 (결제 완료 후)
    public Basket returnBasket(Integer basketId) {
        Optional<Basket> basketOpt = basketRepository.findById(basketId);
        if (basketOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 바구니입니다: " + basketId);
        }

        Basket basket = basketOpt.get();
        basket.setUsable(true); // 사용 가능으로 변경
        return basketRepository.save(basket);
    }
}