package com.sobi.sobi_backend.service;

import com.sobi.sobi_backend.entity.Basket;
import com.sobi.sobi_backend.repository.BasketRepository;
import org.junit.jupiter.api.Test;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest
@MockitoSettings(strictness = Strictness.LENIENT)
class BasketServiceTest {

    @Autowired
    private BasketService basketService;

    @MockitoBean
    private BasketRepository basketRepository;

    @Test
    void testCreateBasket_Success() {
        // Given
        when(basketRepository.findByBoardMac("AA:BB:CC:DD:EE:01")).thenReturn(Optional.empty());

        Basket savedBasket = new Basket();
        savedBasket.setId(1);
        savedBasket.setBoardMac("AA:BB:CC:DD:EE:01");
        savedBasket.setUsable(true);

        when(basketRepository.save(any(Basket.class))).thenReturn(savedBasket);

        // When
        Basket result = basketService.createBasket("AA:BB:CC:DD:EE:01");

        // Then
        assertThat(result.getId()).isEqualTo(1);
        assertThat(result.getBoardMac()).isEqualTo("AA:BB:CC:DD:EE:01");
        assertThat(result.getUsable()).isTrue();
    }

    @Test
    void testCreateBasket_DuplicateMac() {
        // Given
        Basket existingBasket = new Basket();
        when(basketRepository.findByBoardMac("AA:BB:CC:DD:EE:01")).thenReturn(Optional.of(existingBasket));

        // When & Then
        assertThatThrownBy(() -> basketService.createBasket("AA:BB:CC:DD:EE:01"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("이미 등록된 바구니입니다: AA:BB:CC:DD:EE:01");
    }

    @Test
    void testStartUsingBasket_Success() {
        // Given
        Basket basket = new Basket();
        basket.setId(1);
        basket.setBoardMac("AA:BB:CC:DD:EE:01");
        basket.setUsable(true);

        Basket updatedBasket = new Basket();
        updatedBasket.setId(1);
        updatedBasket.setBoardMac("AA:BB:CC:DD:EE:01");
        updatedBasket.setUsable(false);

        when(basketRepository.findByBoardMac("AA:BB:CC:DD:EE:01")).thenReturn(Optional.of(basket));
        when(basketRepository.save(any(Basket.class))).thenReturn(updatedBasket);

        // When
        Basket result = basketService.startUsingBasket("AA:BB:CC:DD:EE:01");

        // Then
        assertThat(result.getUsable()).isFalse();
    }

    @Test
    void testStartUsingBasket_NotUsable() {
        // Given
        Basket basket = new Basket();
        basket.setBoardMac("AA:BB:CC:DD:EE:01");
        basket.setUsable(false);

        when(basketRepository.findByBoardMac("AA:BB:CC:DD:EE:01")).thenReturn(Optional.of(basket));

        // When & Then
        assertThatThrownBy(() -> basketService.startUsingBasket("AA:BB:CC:DD:EE:01"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("사용할 수 없는 바구니입니다: AA:BB:CC:DD:EE:01");
    }

    @Test
    void testReturnBasket_Success() {
        // Given
        Basket basket = new Basket();
        basket.setId(1);
        basket.setBoardMac("AA:BB:CC:DD:EE:01");
        basket.setUsable(false);

        Basket returnedBasket = new Basket();
        returnedBasket.setId(1);
        returnedBasket.setBoardMac("AA:BB:CC:DD:EE:01");
        returnedBasket.setUsable(true);

        when(basketRepository.findByBoardMac("AA:BB:CC:DD:EE:01")).thenReturn(Optional.of(basket));
        when(basketRepository.save(any(Basket.class))).thenReturn(returnedBasket);

        // When
        Basket result = basketService.returnBasket("AA:BB:CC:DD:EE:01");

        // Then
        assertThat(result.getUsable()).isTrue();
    }

    @Test
    void testToggleBasketUsable() {
        // Given
        Basket basket = new Basket();
        basket.setBoardMac("AA:BB:CC:DD:EE:01");
        basket.setUsable(true);

        Basket toggledBasket = new Basket();
        toggledBasket.setBoardMac("AA:BB:CC:DD:EE:01");
        toggledBasket.setUsable(false);

        when(basketRepository.findByBoardMac("AA:BB:CC:DD:EE:01")).thenReturn(Optional.of(basket));
        when(basketRepository.save(any(Basket.class))).thenReturn(toggledBasket);

        // When
        Basket result = basketService.toggleBasketUsable("AA:BB:CC:DD:EE:01");

        // Then
        assertThat(result.getUsable()).isFalse();
    }
}