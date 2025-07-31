package com.sobi.sobi_backend.config;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.core.MessageProducer;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.core.MqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;

/**
 * MQTT 설정 클래스
 *
 * 기능:
 * 1. Eclipse Mosquitto 브로커 연결
 * 2. 바구니 업데이트 토픽 구독
 * 3. 메시지를 Spring Integration Channel로 라우팅
 *
 * MQTT 토픽 구조:
 * - Topic: basket/{basketId}/update
 * - 예: basket/1/update
 *
 * 페이로드 구조 (JSON):
 * {
 *   "action": "set",
 *   {"id": 1, "list": {"PEAC": 3, "BLUE": 1, "APPL": 2}},
 *   "timestamp": 1640995200000
 * }
 */
@Configuration
public class MqttConfig {

    // application.properties에서 MQTT 설정 값들 주입
    @Value("${app.mqtt.broker-url}")
    private String mqttBrokerUrl;

    @Value("${app.mqtt.client-id}")
    private String clientId;

    @Value("${app.mqtt.topic-pattern}")
    private String basketTopicPattern;

    /**
     * MQTT 클라이언트 팩토리 생성
     *
     * 역할:
     * - MQTT 브로커와의 연결 관리
     * - 연결 옵션 설정 (자동 재연결, 타임아웃 등)
     *
     * @return MqttPahoClientFactory MQTT 클라이언트 팩토리
     */
    @Bean
    public MqttPahoClientFactory mqttClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();

        MqttConnectOptions options = new MqttConnectOptions();

        // MQTT 브로커 주소 설정 (properties에서 가져옴)
        options.setServerURIs(new String[] { mqttBrokerUrl });

        // 자동 재연결 활성화 (네트워크 끊김 시 자동 복구)
        options.setAutomaticReconnect(true);

        // Clean Session 설정 (true: 세션 정보 삭제, false: 유지)
        options.setCleanSession(true);

        // Keep Alive 간격 (초) - 브로커와 연결 유지를 위한 핑 간격
        options.setKeepAliveInterval(60);

        // 연결 타임아웃 (초)
        options.setConnectionTimeout(30);

        factory.setConnectionOptions(options);

        System.out.println("MQTT 클라이언트 팩토리 설정 완료: " + mqttBrokerUrl);

        return factory;
    }

    /**
     * MQTT 메시지를 받을 Spring Integration 채널 생성
     *
     * 역할:
     * - MQTT 메시지를 Spring 애플리케이션 내부로 전달하는 통로
     * - DirectChannel: 동기 처리 (메시지 순서 보장)
     *
     * @return MessageChannel MQTT 입력 채널
     */
    @Bean
    public MessageChannel mqttInputChannel() {
        DirectChannel channel = new DirectChannel();

        System.out.println("MQTT 입력 채널 생성 완료");

        return channel;
    }

    /**
     * MQTT 메시지 수신 어댑터 생성
     *
     * 역할:
     * - MQTT 브로커에서 메시지 수신
     * - 지정된 토픽 패턴 구독
     * - 받은 메시지를 Spring Integration 채널로 전달
     *
     * @return MessageProducer MQTT 메시지 수신 어댑터
     */
    @Bean
    public MessageProducer mqttInbound() {
        MqttPahoMessageDrivenChannelAdapter adapter =
                new MqttPahoMessageDrivenChannelAdapter(
                        clientId + "_inbound",   // 인바운드 어댑터용 클라이언트 ID
                        mqttClientFactory(),     // 위에서 생성한 클라이언트 팩토리
                        basketTopicPattern       // 구독할 토픽 패턴 (properties에서 가져옴)
                );

        // QoS (Quality of Service) 설정
        // 0: At most once (최대 1번, 메시지 손실 가능)
        // 1: At least once (최소 1번, 중복 가능) 권장
        // 2: Exactly once (정확히 1번, 가장 안전하지만 느림)
        adapter.setQos(1);

        // 메시지 변환기 설정 (MQTT 바이트 → 문자열)
        adapter.setConverter(new DefaultPahoMessageConverter());

        // 메시지 처리 타임아웃 (밀리초)
        adapter.setCompletionTimeout(5000);

        // 출력 채널 설정 (받은 메시지를 어디로 보낼지)
        adapter.setOutputChannel(mqttInputChannel());

        // 어댑터 시작 시 자동으로 토픽 구독
        adapter.setAutoStartup(true);

        System.out.println("MQTT 인바운드 어댑터 설정 완료 - 구독 토픽: " + basketTopicPattern);

        return adapter;
    }
}