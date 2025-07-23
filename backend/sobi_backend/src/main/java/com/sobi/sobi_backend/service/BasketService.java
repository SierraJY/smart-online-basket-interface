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

    // 바구니 등록 (새 바구니 추가)
    public Basket createBasket(String boardMac) {
        // 중복 MAC 주소 체크
        if (basketRepository.findByBoardMac(boardMac).isPresent()) {
            throw new IllegalArgumentException("이미 등록된 바구니입니다: " + boardMac);
        }

        Basket basket = new Basket();
        basket.setBoardMac(boardMac);
        basket.setUsable(true);

        return basketRepository.save(basket);
    }

    // 바구니 조회 (MAC 주소로)
    public Optional<Basket> getBasketByMac(String boardMac) {
        return basketRepository.findByBoardMac(boardMac);
    }

    // 모든 바구니 조회
    public List<Basket> getAllBaskets() {
        return basketRepository.findAll();
    }

    // 바구니 사용 상태 토글 (사용중/사용가능)
    public Basket toggleBasketUsable(String boardMac) {
        Optional<Basket> basketOpt = basketRepository.findByBoardMac(boardMac);
        if (basketOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 바구니입니다: " + boardMac);
        }

        Basket basket = basketOpt.get();
        basket.setUsable(!basket.getUsable()); // 토글
        return basketRepository.save(basket);
    }

    // 바구니 사용 시작 (고객이 바구니를 가져갈 때)
    public Basket startUsingBasket(String boardMac) {
        Optional<Basket> basketOpt = basketRepository.findByBoardMac(boardMac);
        if (basketOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 바구니입니다: " + boardMac);
        }

        Basket basket = basketOpt.get();
        if (!basket.getUsable()) {
            throw new IllegalArgumentException("사용할 수 없는 바구니입니다: " + boardMac);
        }

        basket.setUsable(false); // 사용 중으로 변경
        return basketRepository.save(basket);
    }

    // 바구니 반납 (결제 완료 후)
    public Basket returnBasket(String boardMac) {
        Optional<Basket> basketOpt = basketRepository.findByBoardMac(boardMac);
        if (basketOpt.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 바구니입니다: " + boardMac);
        }

        Basket basket = basketOpt.get();
        basket.setUsable(true); // 사용 가능으로 변경
        return basketRepository.save(basket);
    }
}