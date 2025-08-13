# 스마트 바구니 MQTT 시스템 아키텍처 및 연결 단계

## 1. 전체 아키텍처 개요

```

[ Raspberry Pi (바구니) ]
|
| (MQTT Publish, basket/unit0001 등)
v
[ AWS EC2 ]
├─ [ Mosquitto MQTT Broker ] ← (1883 포트)
└─ [ Spring Boot 서비스 ]    ← (MQTT Subscribe)

````

- **라즈베리파이**(각 바구니)는 EC2 브로커로 개별 토픽(`basket/unit0001` 등)에 메시지 전송
- **Mosquitto**(EC2 내): 모든 바구니의 메시지를 관리, 중계
- **Spring Boot**(EC2 내): 여러 바구니의 메시지를 한 번에 subscribe(`basket/#`), 필요시 가공/저장/알림 처리

---

## 2. 연결을 위한 단계별 절차

### 2.1. AWS EC2에 Mosquitto MQTT Broker 설치 및 설정

1. **Mosquitto 설치**
    ```bash
    sudo apt update
    sudo apt install mosquitto mosquitto-clients
    ```
2. **인증 설정**
    - 패스워드 파일 생성
      ```bash
      sudo mosquitto_passwd -c /etc/mosquitto/passwd youruser
      ```
    - `/etc/mosquitto/mosquitto.conf`에 아래 추가
      ```
      listener 1883
      allow_anonymous false
      password_file /etc/mosquitto/passwd
      ```
3. **보안그룹/방화벽에서 1883 포트 허용**  
    - 라즈베리파이의 공인IP만 허용 권장

4. **브로커 서비스 시작/자동실행**
    ```bash
    sudo systemctl enable mosquitto
    sudo systemctl start mosquitto
    ```

---

### 2.2. 라즈베리파이(MQTT Client) 설정 및 메시지 전송

1. **파이썬 환경 준비**
    ```bash
    pip install paho-mqtt
    ```
2. **파이썬 스크립트에서 브로커 정보 설정**
    - 호스트: EC2 IP
    - 포트: 1883
    - 사용자/비밀번호: 브로커에 등록한 값
    - 토픽: 바구니 고유 토픽(`basket/unit0001` 등)
3. **컨트롤러 엔트리포인트와 토픽**

   - 프로덕션 실행 엔트리포인트: `python -m mqtt_controller`
   - 기본 토픽(`MQTT_TOPIC` 예: `basket/1`) 하위에서 사용되는 서브토픽
     - 명령 수신: `${MQTT_TOPIC}/status` (메시지: `start`, `end`, 또는 `{"msg":"total","payload":{"basketid": <int>, "totalprice": <int>}}`)
     - 상태/장바구니 업데이트 발행: `${MQTT_TOPIC}/update`

4. **예시 코드 (퍼블리셔)**
    ```python
    import paho.mqtt.client as mqtt

    client = mqtt.Client()
    client.username_pw_set("youruser", "yourpassword")
    client.connect("EC2_PUBLIC_IP", 1883)
    # 컨트롤러가 수신하는 명령 토픽
    client.publish("basket/1/status", 'start')
    # 컨트롤러가 발행하는 업데이트 토픽 (예시 발행)
    client.publish("basket/1/update", '{"id":1, "list": {"MLON":2}}')
    client.disconnect()
    ```
4. **파이 부팅시 자동 실행 (systemd 등 활용)**

---

### 2.3. Spring Boot(MQTT Subscriber) 연동

1. **Eclipse Paho 또는 Spring Integration MQTT 라이브러리 추가**
    ```groovy
    implementation 'org.eclipse.paho:org.eclipse.paho.client.mqttv3:1.2.5'
    ```
2. **MQTT Subscribe 코드 작성**
    ```java
    MqttClient client = new MqttClient("tcp://localhost:1883", "spring-client");
    MqttConnectOptions options = new MqttConnectOptions();
    options.setUserName("youruser");
    options.setPassword("yourpassword".toCharArray());
    client.connect(options);

    client.subscribe("basket/#", (topic, msg) -> {
        System.out.println("Received: " + topic + " - " + new String(msg.getPayload()));
        // 메시지 처리 (DB 저장, 알림, 비즈니스 로직 등)
    });
    ```
3. **필요에 따라 메시지 핸들링, DB 저장, 알림 등 추가 구현**

---

## 3. 운영 및 보안 Best Practice

- Mosquitto는 **인증(비밀번호) 및 방화벽(IP 제한)** 적용
- 라즈베리파이와 Spring 모두 환경변수/설정파일로 비번 등 관리
- 로그, 장애 모니터링, 자동 재시작(systemd 등) 구현
- 바구니 토픽 네임 규칙은 DB와 1:1 매핑하여 관리

---

## 4. 요약 다이어그램

```
[ Raspberry Pi ] --(basket/unit0001, MQTT)--> [EC2: Mosquitto Broker] --(basket/#, MQTT)--> [EC2: Spring Boot 서비스]
```

추가 참고
- 예제 스크립트 위치: `examples/mqtt_subscriber.py`, `examples/mqtt_publish_examples.py`
- 프로덕션 엔트리포인트: `python -m mqtt_controller`
- 컨트롤러 토픽: `${MQTT_TOPIC}/status`(명령), `${MQTT_TOPIC}/update`(발행)
