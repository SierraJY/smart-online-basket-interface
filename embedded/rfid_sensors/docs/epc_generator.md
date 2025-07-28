# 96-Bit Standard UHF RFID EPC Generator

## 개요

- **목적**: 표준화된 규칙에 따라 고유한 96비트 UHF RFID EPC(Electronic Product Code)를 생성하는 파이썬 라이브러리.
- **특징**: 밀리초 단위 타임스탬프와 순차 번호를 조합하여 초고속 생산 라인 환경에서도 EPC의 고유성 보장.
- **구현**: 멀티스레드 환경에서 안전하게 동작하도록 `threading.Lock`을 사용한 스레드 안전성 확보.

---

## 주요 기능

- **고유성 보장**
    - 6바이트 밀리초 타임스탬프와 2바이트 순차 번호(1~65,535) 조합.
    - 1밀리초당 최대 65,535개의 고유 EPC 생성 가능.
- **양방향 변환**
    - `generate_epc`: EPC 생성 기능.
    - `decode_epc`: 생성된 EPC를 원본 정보(상품 코드, 시간 등)로 분석하는 기능.
- **유연한 입력 처리**
    - 다양한 형태(16진수, 일반 문자열 등)의 상품 분류 코드를 자동으로 4바이트로 변환.
    - 문자열 길이에 따라 절삭 또는 패딩 자동 처리.
- **독립성**
    - 외부 라이브러리 설치 없이 파이썬 표준 라이브러리만으로 동작.

---

## EPC 구조

- **총 크기**: 12 바이트 (96 비트)
- **구성 요소**:
    - **상품 분류 코드**: 4 바이트 (32 비트)
        - 제품의 종류를 식별하는 코드.
    - **타임스탬프**: 6 바이트 (48 비트)
        - EPC 생성 시점의 Unix 타임스탬프 (밀리초 단위).
    - **순차 번호**: 2 바이트 (16 비트)
        - 동일 밀리초 내 발행 순서 (1 ~ 65,535).

---

## 설치 및 요구사항

- **요구사항**: Python 3.6 이상
- **설치**: 별도의 설치 과정 불필요.

---

## 사용 방법

### 1. 라이브러리로 사용

스크립트를 다른 파이썬 프로젝트에 임포트하여 EPC 생성 및 분석 기능을 사용할 수 있습니다.

```python
from epc_generator import StandardEPCGenerator

# 생성기 인스턴스 생성
generator = StandardEPCGenerator()

# EPC 생성
product_code = "PRODUCT-A"
epc = generator.generate_epc(product_code)
print(f"생성된 EPC: {epc}")

# EPC 분석
decoded_info = generator.decode_epc(epc)
print(f"분석된 정보: {decoded_info}")

# EPC 일괄 생성
epc_list = generator.generate_batch(product_code, 10)
print(f"일괄 생성된 EPC (10개): {epc_list}")
```

### 2. 명령줄 도구로 사용

스크립트를 직접 실행하여 상품 코드를 입력하고 단일 EPC를 생성할 수 있습니다.

Bash

`python epc_generator.py`

- 실행 후 터미널의 안내에 따라 상품 분류 코드를 입력합니다.
- 입력된 코드를 기반으로 생성된 EPC와 분석 정보가 출력됩니다.

### 3. 전체 기능 데모 실행

스크립트의 모든 기능을 테스트하는 데모 코드를 실행할 수 있습니다.

- `epc_generator.py` 파일의 마지막 부분을 다음과 같이 수정합니다.

```python
if __name__ == "__main__":
    # generate_single_epc() # 기존 코드 주석 처리
    demo() # 데모 함수 호출
```

- 수정 후 스크립트를 실행하면 대량 생성, 고유성 검증 등 전체 기능 테스트가 수행됩니다.

---

## API 참조

### `StandardEPCGenerator` 클래스

- `__init__()`
    - EPC 생성기를 초기화합니다.
- `generate_epc(product_code: str) -> str`
    - 주어진 상품 코드로 고유 EPC를 생성합니다.
- `generate_batch(product_code: str, count: int) -> list`
    - 주어진 상품 코드로 지정된 개수만큼 EPC를 일괄 생성합니다.
- `decode_epc(epc_hex: str) -> dict`
    - 24자리 16진수 EPC 코드를 분석하여 구성 정보를 담은 딕셔너리를 반환합니다.
- `get_current_state() -> dict`
    - 생성기의 현재 상태(마지막 타임스탬프, 카운터 등)를 반환합니다.
- `reset_state()`
    - 생성기의 내부 상태를 초기화합니다.