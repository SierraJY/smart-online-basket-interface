## YRM100 RFID 리더 제어 파이썬 모듈

---

### 1. 개요

- **목적**: YRM100 RFID 리더의 시리얼 통신 제어
- **특징**: 저수준 프로토콜 캡슐화, 고수준 API 제공
- **구조**: 스레드 기반 비동기 읽기 및 옵저버 패턴을 통한 이벤트 처리 지원

---

### 2. 주요 기능

- **프로토콜 추상화**: 프레임 생성, 체크섬 계산, 데이터 파싱 자동화
- **폴링 모드**: 단일(Single) 및 다중(Multiple) 폴링 모드 지원
- **데이터 파싱**:
    - 태그 기본 정보(ID, RSSI, PC, CRC) 추출
    - 96비트 EPC 태그 구조(상품코드, 타임스탬프, 시퀀스) 분석
- **비동기 처리**: 백그라운드 스레드를 통한 논블로킹(Non-blocking) 태그 읽기
- **이벤트 기반**: 옵저버 패턴을 이용한 실시간 이벤트(태그 감지, 오류 등) 전달
- **연결 관리**: 연결 실패 또는 끊김 발생 시 자동 재연결 시도
- **리소스 관리**: `with` 구문을 통한 안전한 리소스 자동 해제

---

### 3. 클래스 및 주요 메소드

### 가. `RFIDReader`

- **역할**: 리더 제어를 위한 메인 인터페이스 클래스
- **주요 메소드**:
    - `__init__(port, ...)`: 객체 초기화 (포트, 통신 속도 등 설정)
    - `connect()`: 시리얼 포트 연결 실행
    - `initialize_reader(...)`: 리더 작동 파라미터 설정 (송신 전력, 주파수, 지역)
    - `start_reading(...)`: 백그라운드 스레드에서 태그 읽기 시작
    - `stop_reading_and_cleanup()`: 읽기 중단 및 모든 리소스(스레드, 포트) 정리
    - `add_observer(observer)`: 이벤트 수신 옵저버 등록
    - `notify_observers(...)`: 등록된 옵저버에 이벤트 알림
    - `__enter__` / `__exit__`: `with` 구문 지원

### 나. `YRM100Protocol`

- **역할**: YRM100 저수준 통신 프로토콜 처리
- **주요 메소드**:
    - `create_..._command(...)`: 기능별(단일/다중 폴링 등) 명령 프레임 생성
    - `calculate_checksum(data)`: 프레임 체크섬 계산
    - `parse_notification_frame(data)`: 태그 감지 알림 프레임 파싱
    - `parse_response_frame(data)`: 명령 응답 프레임 파싱

### 다. `EPCHandler`

- **역할**: 96비트 EPC 태그 데이터 구조 분석
- **주요 메소드**:
    - `parse_epc_structure(epc_hex)`: 16진수 EPC 문자열을 구조화된 데이터(상품 코드, 타임스탬프, 시퀀스 번호)로 변환

### 라. 데이터 및 이벤트 클래스

- **`TagInfo`**: 파싱된 태그의 물리적 정보를 담는 데이터 클래스
- **`EPCTag`**: 파싱된 96비트 EPC의 논리적 정보를 담는 데이터 클래스
- **`SensorEvent`**: 이벤트 종류를 정의한 상수 클래스 (`TAG_DETECTED`, `COMPLETED` 등)
- **`SensorObserver`**: 이벤트 핸들러 구현을 위한 인터페이스(부모) 클래스

---

### 4. 기본 사용법

```python
import time
import logging
from yrm100_reader import RFIDReader, SensorObserver, SensorEvent

# 이벤트 핸들러 구현
class MyTagHandler(SensorObserver):
    def on_sensor_event(self, event_type: str, sensor_id: str, data: any) -> None:
        if event_type == SensorEvent.TAG_DETECTED:
            # 태그 감지 시 처리할 로직
            logging.info(f"태그 감지: {data.get('tag_id')}")
        elif event_type == SensorEvent.COMPLETED:
            logging.info("작업 완료")

# 로거 기본 설정
logging.basicConfig(level=logging.INFO)

# 리더기 인스턴스 생성 및 옵저버 등록
reader = RFIDReader(port='/dev/ttyUSB0')
reader.add_observer(MyTagHandler())

try:
    # 초기화 및 읽기 시작 (with 구문으로 자동 리소스 관리)
    with reader:
        if reader.initialize_reader():
             # 1초 간격으로 단일 폴링 시작
            reader.start_reading(polling_mode="single", polling_interval=1.0)
            print("10초간 태그를 읽습니다.")
            time.sleep(10)
    print("프로그램이 정상적으로 종료되었습니다.")
    
except Exception as e:
    print(f"오류 발생: {e}")
```

---

### 5. 설치 및 의존성

- **필수 라이브러리**: `pyserial`
- **설치 명령어**:Bash
    
    `pip install pyserial`