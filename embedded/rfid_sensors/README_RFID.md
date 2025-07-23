# 라즈베리파이 5 - YRM100 RFID 다중 리더 시스템

라즈베리파이 5에서 YRM100 RFID 모듈 4개를 USB로 연결하여 RFID 태그를 읽는 시스템입니다.

## 필요한 하드웨어

- 라즈베리파이 5
- YRM100 RFID 모듈 (최대 4개)
- USB 케이블
- RFID 태그/카드

## 설치 방법

### 1. 의존성 패키지 설치

```bash
# 패키지 설치
pip install -r requirements.txt

# 또는 개별 설치
pip install pyserial
```

### 2. USB 권한 설정

```bash
# 현재 사용자를 dialout 그룹에 추가
sudo usermod -a -G dialout $USER

# 재부팅 또는 로그아웃 후 다시 로그인
sudo reboot
```

### 3. USB 포트 확인

```bash
# 연결된 USB 디바이스 확인
lsusb

# 시리얼 포트 확인
ls /dev/ttyUSB*
```

## 사용 방법

### 기본 실행

```bash
python tag_write.py
```

### 실행 예시

```
=== 라즈베리파이 5 - YRM100 RFID 다중 리더 시스템 ===
감지된 USB 포트: /dev/ttyUSB0 - USB Serial
감지된 USB 포트: /dev/ttyUSB1 - USB Serial
감지된 USB 포트: /dev/ttyUSB2 - USB Serial
감지된 USB 포트: /dev/ttyUSB3 - USB Serial
✅ 리더 추가됨: RFID_Reader_1 (/dev/ttyUSB0)
✅ 리더 추가됨: RFID_Reader_2 (/dev/ttyUSB1)
✅ 리더 추가됨: RFID_Reader_3 (/dev/ttyUSB2)
✅ 리더 추가됨: RFID_Reader_4 (/dev/ttyUSB3)

🚀 RFID 리더들을 시작합니다...
[RFID_Reader_1] 연결됨: /dev/ttyUSB0
[RFID_Reader_2] 연결됨: /dev/ttyUSB1
[RFID_Reader_3] 연결됨: /dev/ttyUSB2
[RFID_Reader_4] 연결됨: /dev/ttyUSB3

📖 RFID 태그를 리더 근처에 대보세요. (Ctrl+C로 종료)

🏷️  태그 감지됨!
   리더: RFID_Reader_1
   태그 ID: 1234567890ABCDEF
   시간: 2025-07-18T10:30:45.123456
   포트: /dev/ttyUSB0
```

## 주요 기능

- **다중 리더 지원**: 최대 4개의 YRM100 모듈 동시 사용
- **자동 포트 감지**: USB에 연결된 RFID 모듈 자동 인식
- **실시간 모니터링**: 태그 감지 시 즉시 알림
- **로그 기능**: JSON 형태로 태그 감지 기록 저장
- **통계 기능**: 리더별 태그 감지 통계 제공
- **안전한 종료**: Ctrl+C로 안전하게 프로그램 종료

## 파일 구조

```
rfid_sensor_test/
├── tag_write.py          # 메인 프로그램
├── config.py            # 설정 파일
├── requirements.txt     # 의존성 패키지
├── rfid_log.json       # 태그 감지 로그 (자동 생성)
└── README.md           # 이 파일
```

## 설정 변경

`config.py` 파일에서 다음 설정을 변경할 수 있습니다:

- `BAUDRATE`: 시리얼 통신 속도 (기본값: 115200)
- `MAX_READERS`: 최대 리더 수 (기본값: 4)
- `READ_INTERVAL`: 읽기 간격 (기본값: 0.1초)
- `TAG_DUPLICATE_TIMEOUT`: 태그 중복 방지 시간 (기본값: 2초)

## 문제 해결

### 1. USB 포트가 감지되지 않는 경우

```bash
# USB 드라이버 확인
sudo dmesg | grep USB

# 권한 확인
ls -l /dev/ttyUSB*
```

### 2. 연결 오류가 발생하는 경우

- YRM100 모듈의 전원이 켜져 있는지 확인
- USB 케이블이 올바르게 연결되어 있는지 확인
- 다른 프로그램에서 같은 포트를 사용하고 있지 않은지 확인

### 3. 태그가 인식되지 않는 경우

- 태그가 YRM100과 호환되는지 확인 (일반적으로 125kHz 또는 13.56MHz)
- 태그를 리더에 충분히 가까이 대보세요
- 태그가 손상되지 않았는지 확인

## 확장 기능

이 템플릿을 기반으로 다음과 같은 기능을 추가할 수 있습니다:

- 웹 인터페이스 (Flask/Django)
- 데이터베이스 연동 (SQLite/PostgreSQL)
- 실시간 알림 (이메일/SMS)
- REST API 제공
- 태그 등록/관리 시스템
- 접근 제어 시스템

## 라이선스

MIT License
