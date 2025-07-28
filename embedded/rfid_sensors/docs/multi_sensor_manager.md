## 다중 RFID 센서 관리 및 신뢰도 분석 모듈

---

### 1. 개요

- **목적**: 다수의 YRM100 RFID 리더를 동시에 관리하고, 수집된 태그 데이터를 종합하여 신뢰도 기반의 재고 상태를 판별
- **핵심 기능**: 개별 태그의 감지 이력(History)을 추적하여 일시적인 미감지 오류를 보정하고, `확신(Confirmed)`, `의심(Suspected)`, `제거(Removed)` 상태로 분류
- **구조**: `RFIDReader` 모듈을 옵저버(Observer)로 활용하여 각 센서의 이벤트를 수신하고, 중앙 관리자(Manager)가 전체 폴링 사이클을 통제

---

### 2. 주요 기능

- **다중 센서 통합 관리**: 여러 개의 센서를 등록하고, 순차적으로 폴링을 실행하여 전파 간섭 최소화
- **신뢰도 기반 태그 상태 관리**:
    - **확신(Confirmed)**: 현재 사이클에서 유효하게 감지된 태그
    - **의심(Suspected)**: 과거에는 있었으나 최근 감지되지 않은 태그
    - **제거(Removed)**: 신뢰도 점수가 임계치 미만으로 하락하여 목록에서 완전히 제외된 태그
- **고급 신뢰도 점수 모델**:
    - **시간 가중치**: 최근 감지 데이터에 더 높은 가중치를 부여
    - **RSSI 점수화**: 감지 신호 강도(RSSI)를 점수로 변환하여 신뢰도 계산에 반영
- **상태 변경 관성(Inertia) 적용**: `consecutive_miss_threshold` 설정을 통해 태그가 몇 차례 연속으로 보이지 않을 때만 '의심' 상태로 변경하여, 상태 '깜빡임(flickering)' 현상 방지
- **구조화된 결과 제공**: 각 폴링 사이클의 결과를 `SmartCycleResult` 데이터 클래스로 정리하여 반환
- **메모리 최적화**: 관리하는 태그 히스토리의 최대 개수를 제한하여 장시간 운영 시 메모리 누수 방지

---

### 3. 핵심 로직 및 동작 원리

### 가. 폴링 사이클(Polling Cycle) 동작 순서

1. **사이클 시작**: `start_cycle` 메소드 호출.
2. **센서 순차 실행**:
    - 등록된 첫 번째 센서(`Sensor-1`)의 멀티폴링 시작.
    - `threading.Event`를 통해 `Sensor-1`의 폴링이 완료되거나 타임아웃될 때까지 대기.
    - `Sensor-1`의 리소스 정리.
    - 다음 센서에 대해 위 과정 반복.
3. **결과 종합**: 모든 센서의 폴링이 완료되면 `_compile_smart_cycle_results` 메소드 호출.
4. **히스토리 업데이트**: 각 태그의 감지 여부와 RSSI 값을 `TagHistory`에 업데이트하고 신뢰도 점수 재계산.
5. **상태 분류**: 재계산된 신뢰도 점수와 관성 규칙에 따라 모든 태그를 `확신`, `의심`, `제거`, `신규`로 분류.
6. **결과 반환**: 최종 분류된 정보를 담은 `SmartCycleResult` 객체를 반환.

### 나. 태그 상태 전이(State Transition) 규칙

- **신규 → 확신**:
    - RSSI 임계값을 통과한 태그가 처음 감지되면, 즉시 `확신(Confirmed)` 상태로 `tag_histories`에 등록됨.
- **확신 → 의심**:
    - `확신` 상태의 태그가 `consecutive_miss_threshold`(예: 3회) 만큼 연속으로 미감지될 경우 `의심(Suspected)` 상태로 전환됨.
- **의심 → 확신**:
    - `의심` 상태의 태그가 한 번이라도 다시 감지되면, 즉시 `확신` 상태로 복귀함 (빠른 복구).
- **의심 → 제거**:
    - `의심` 상태에서 계속 미감지되어 신뢰도 점수가 특정 임계값(`enhanced_removal_threshold`) 미만으로 떨어지면, `제거(Removed)` 상태가 되어 `tag_histories`에서 삭제됨.

---

### 4. 클래스 및 주요 메소드

### 가. `MultiSensorManager`

- **역할**: 다중 센서 폴링 사이클을 총괄하고, 태그 상태를 관리하는 메인 클래스.
- **주요 메소드**:
    - `__init__(...)`: 센서 포트, 폴링 횟수, 신뢰도 임계값 등 매니저의 작동 규칙을 초기화.
    - `on_sensor_event(...)`: `RFIDReader`로부터 태그 감지, 완료, 오류 등의 이벤트를 수신.
    - `start_cycle()`: 단일 폴링 사이클을 시작하고 `SmartCycleResult`를 반환.
    - `_compile_smart_cycle_results(...)`: 모든 센서의 결과를 취합하고, 태그 히스토리를 기반으로 상태를 분류하는 핵심 로직.
    - `run_multiple_cycles(num_cycles)`: 지정된 횟수만큼 사이클을 연속으로 실행.
    - `cleanup()`: 모든 센서의 스레드와 시리얼 포트 리소스를 안전하게 해제.

### 나. `TagHistory`

- **역할**: 개별 태그의 감지 이력과 상태를 관리하는 데이터 클래스.
- **주요 메소드**:
    - `update_detection(cycle_number, detected, rssi)`: 해당 사이클의 감지 상태를 히스토리에 추가하고, 연속 미감지 횟수를 갱신.
    - `_calculate_enhanced_confidence()`: 시간 가중치와 RSSI 점수를 반영하여 새로운 신뢰도 점수를 계산하는 내부 로직.
    - `should_transition_to_suspected()`: '확신'에서 '의심' 상태로 변경될 조건을 확인.
    - `should_be_removed()`: '의심'에서 '제거' 상태로 변경될 조건을 확인.

### 다. 데이터 및 상태 클래스

- **`TagStatus`**: 태그의 상태(`CONFIRMED`, `SUSPECTED`, `REMOVED`)를 정의한 열거형(Enum).
- **`SensorResult`**: 단일 센서의 한 사이클 동안의 결과를 저장하는 데이터 클래스.
- **`SmartCycleResult`**: 전체 센서의 결과를 종합하고, 신뢰도 기반으로 분류된 태그 목록을 포함하는 최종 결과 데이터 클래스.

---

### 5. 기본 사용법

```python
import logging
from multi_sensor_manager import MultiSensorManager

# 로그 기본 설정
logging.basicConfig(level=logging.INFO)

# 사용할 센서 포트 목록
sensor_ports = ["COM8", "COM10"]  # 실제 환경에 맞게 수정

# 매니저 객체 생성
# - polling_count: 센서당 멀티폴링 횟수
# - rssi_threshold: 유효 태그로 판단할 최소 RSSI 값
# - consecutive_miss_threshold: 확신 -> 의심 상태로 전환되기까지의 연속 미감지 횟수
manager = MultiSensorManager(
    sensor_ports=sensor_ports,
    polling_count=30,
    rssi_threshold=-55,
    consecutive_miss_threshold=3,
    polling_timeout=12.0
)

try:
    # 15개의 폴링 사이클을 연속으로 실행
    manager.run_multiple_cycles(15)

except KeyboardInterrupt:
    print("\n사용자에 의해 프로그램이 중단되었습니다.")
except Exception as e:
    print(f"실행 중 오류 발생: {e}")
finally:
    # 프로그램 종료 시 모든 리소스 정리
    manager.cleanup()`
```

---

### 6. 설치 및 의존성

- **`pyserial`**: 시리얼 통신을 위한 라이브러리

```bash
pip install pyserial
```

- **`rfid_reader.py`**: 이전 단계에서 작성한 단일 RFID 리더 제어 모듈이 동일한 프로젝트 폴더 내에 있어야 함.