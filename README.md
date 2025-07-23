# AIoT 스마트 바스켓

마트 환경에서 RFID 기술을 활용한 스마트 쇼핑 솔루션입니다. 장바구니에 부착된 AIoT 디바이스를 통해 실시간 가격 합산, 상품 추천, 셀프 결제 기능을 제공합니다.

## 주요 기능

- 실시간 장바구니 관리: RFID 태그 자동 인식 및 총액 계산
- 상품 정보 제공: 웹/앱을 통한 상품 정보 및 위치 검색
- 개인화 추천: 장바구니 내역 기반 연관 상품 추천
- 간편 결제: 모바일 결제 및 셀프 계산대 연동

## 기술 스택

### 하드웨어
- IoT 디바이스: Raspberry Pi 5 / Jetson Orin Nano
- RFID 리더: YRM1001 + 원형 편파 안테나
- 디스플레이: LCD 패널

### 소프트웨어
- IoT 펌웨어: Python
- 백엔드: Spring Framework (Java)
- 프론트엔드: React, React Native
- 데이터베이스: PostgreSQL
- 인프라: AWS (EC2, ECS, RDS, S3, IoT Core)

### 통신
- 디바이스 → 서버: MQTT
- 서버 → 클라이언트: WebSocket
- 클라이언트 ↔ 서버: HTTP/s

## 시스템 구성도

[시스템 구성도 이미지 추가 예정]

## 프로젝트 구조
```
├── ai/ # 상품 추천 모델
├── backend/ # Spring 백엔드 서버
├── embedded/ # IoT 디바이스 펌웨어
├── frontend/ # React 웹/앱 클라이언트
└── nginx/ # 웹 서버 설정
```

## 실행 방법

### 백엔드 서버
```bash
cd backend
./gradlew bootRun
```

### 프론트엔드
```bash
cd frontend
npm install
npm start
```

### IoT 디바이스
```bash
cd embedded
python main.py
```

## 팀 정보
[팀원 정보 추가 예정]

## 라이선스
[라이선스 정보 추가 예정]
