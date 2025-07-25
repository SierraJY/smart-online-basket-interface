#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
96비트 UHF RFID 태그 EPC 생성기
표준화된 규칙에 따른 고유 식별 번호 부여 시스템

EPC 구조 (총 12바이트 = 96비트):
- 상품 분류 코드: 4바이트 (제품 종류 식별)
- 타임스탬프: 6바이트 (Unix Timestamp, 밀리초 단위)
- 순차 번호: 2바이트 (동일 밀리초 내 발행 순서, 1~65535)

목적: 최고 속도 생산 라인에서도 EPC의 절대적인 고유성 보장
"""

import time
import threading
from typing import Dict, Any, Optional
from datetime import datetime


class StandardEPCGenerator:
    """
    표준화된 96비트 UHF RFID EPC 생성기

    특징:
    - 밀리초 단위 타임스탬프로 정밀한 시간 기록
    - 1밀리초당 최대 65,535개의 고유 EPC 생성 가능
    - 멀티스레드 환경에서 안전한 동작
    - 상품 분류 코드 기반 체계적인 관리
    """

    def __init__(self):
        """EPC 생성기 초기화"""
        self._last_timestamp_ms = 0  # 마지막 발행 시간(밀리초)
        self._last_counter = 0  # 마지막 카운터 값
        self._lock = threading.Lock()  # 스레드 안전성 보장

    def generate_epc(self, product_code: str) -> str:
        """
        표준 규칙에 따른 고유 EPC 생성

        Args:
            product_code (str): 상품 분류 코드 (4바이트로 변환)

        Returns:
            str: 24자리 16진수 EPC 코드 (예: "A1B2C3D40194A5C61DAB0001")

        Raises:
            ValueError: 상품 코드가 유효하지 않은 경우
        """
        if not product_code:
            raise ValueError("상품 분류 코드가 필요합니다")

        with self._lock:
            # 1. 현재 시간(밀리초) 가져오기
            current_timestamp_ms = int(time.time() * 1000)

            # 2. 순차 번호 관리
            if current_timestamp_ms != self._last_timestamp_ms:
                # 밀리초가 바뀐 경우: 카운터를 1로 초기화
                self._last_timestamp_ms = current_timestamp_ms
                self._last_counter = 1
            else:
                # 동일한 밀리초: 카운터를 1 증가
                self._last_counter += 1

                # 2바이트 범위 초과 시 순환 (1~65535)
                if self._last_counter > 0xFFFF:
                    self._last_counter = 1

            # 3. EPC 구성 요소 생성
            product_bytes = self._product_code_to_bytes(product_code)
            timestamp_bytes = self._timestamp_to_bytes(self._last_timestamp_ms)
            counter_bytes = self._last_counter.to_bytes(2, byteorder="big")

            # 4. 최종 EPC 조합
            epc_bytes = product_bytes + timestamp_bytes + counter_bytes
            epc_hex = epc_bytes.hex().upper()

            return epc_hex

    def _product_code_to_bytes(self, product_code: str) -> bytes:
        """
        상품 분류 코드를 4바이트로 변환

        Args:
            product_code (str): 상품 분류 코드

        Returns:
            bytes: 4바이트 상품 코드
        """
        # 16진수 형태인지 확인 (8자리 16진수)
        if len(product_code) == 8 and all(
            c in "0123456789ABCDEFabcdef" for c in product_code
        ):
            return bytes.fromhex(product_code)

        # 문자열을 UTF-8 바이트로 변환
        product_bytes = product_code.encode("utf-8")

        if len(product_bytes) >= 4:
            # 4바이트보다 크면 앞의 4바이트만 사용
            return product_bytes[:4]
        else:
            # 4바이트보다 작으면 오른쪽을 0으로 패딩
            return product_bytes.ljust(4, b"\x00")

    def _timestamp_to_bytes(self, timestamp_ms: int) -> bytes:
        """
        밀리초 타임스탬프를 6바이트로 변환

        Args:
            timestamp_ms (int): 밀리초 단위 유닉스 타임스탬프

        Returns:
            bytes: 6바이트 타임스탬프
        """
        # 6바이트는 최대 281,474,976,710,655까지 표현 가능
        # 현재 밀리초 타임스탬프는 약 1.7 * 10^12 정도이므로 충분
        return timestamp_ms.to_bytes(6, byteorder="big")

    def generate_batch(self, product_code: str, count: int) -> list:
        """
        동일한 상품 코드로 여러 EPC 일괄 생성

        Args:
            product_code (str): 상품 분류 코드
            count (int): 생성할 EPC 개수

        Returns:
            list: EPC 코드 리스트
        """
        if count <= 0:
            raise ValueError("생성 개수는 1 이상이어야 합니다")

        epc_list = []
        for i in range(count):
            epc = self.generate_epc(product_code)
            epc_list.append(epc)
        return epc_list

    def decode_epc(self, epc_hex: str) -> Dict[str, Any]:
        """
        EPC 코드를 분석하여 구성 요소 추출

        Args:
            epc_hex (str): 24자리 16진수 EPC 코드

        Returns:
            dict: 분석된 EPC 정보

        Raises:
            ValueError: EPC 형식이 올바르지 않은 경우
        """
        if len(epc_hex) != 24:
            raise ValueError("EPC 코드는 24자리 16진수여야 합니다")

        if not all(c in "0123456789ABCDEFabcdef" for c in epc_hex):
            raise ValueError("EPC 코드는 유효한 16진수여야 합니다")

        try:
            # EPC를 바이트로 변환
            epc_bytes = bytes.fromhex(epc_hex)

            # 구성 요소 분리
            product_bytes = epc_bytes[:4]  # 상품 분류 코드 (4바이트)
            timestamp_bytes = epc_bytes[4:10]  # 타임스탬프 (6바이트)
            counter_bytes = epc_bytes[10:12]  # 순차 번호 (2바이트)

            # 타임스탬프와 카운터 변환
            timestamp_ms = int.from_bytes(timestamp_bytes, byteorder="big")
            counter = int.from_bytes(counter_bytes, byteorder="big")

            # 상품 코드를 문자열로 복원 시도
            try:
                product_code = product_bytes.rstrip(b"\x00").decode("utf-8")

            except UnicodeDecodeError:
                # UTF-8 디코딩 실패 시 16진수로 표시
                product_code = product_bytes.hex().upper()

            # 시간 정보 변환
            timestamp_sec = timestamp_ms / 1000.0
            generation_time = datetime.fromtimestamp(timestamp_sec)

            return {
                "epc_code": epc_hex.upper(),
                "product_code": product_code,
                "product_bytes_hex": product_bytes.hex().upper(),
                "timestamp_ms": timestamp_ms,
                "timestamp_sec": timestamp_sec,
                "generation_time": generation_time.strftime("%Y-%m-%d %H:%M:%S.%f")[
                    :-3
                ],  # 밀리초까지 표시
                "generation_datetime": generation_time,
                "counter": counter,
                "sequence_in_millisecond": counter,
            }

        except Exception as e:
            raise ValueError(f"EPC 코드 분석 실패: {e}")

    def get_current_state(self) -> Dict[str, Any]:
        """
        현재 생성기 상태 반환

        Returns:
            dict: 현재 상태 정보
        """
        with self._lock:
            current_time = datetime.fromtimestamp(self._last_timestamp_ms / 1000.0)
            return {
                "last_timestamp_ms": self._last_timestamp_ms,
                "last_generation_time": (
                    current_time.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                    if self._last_timestamp_ms > 0
                    else None
                ),
                "last_counter": self._last_counter,
                "max_capacity_per_ms": 65535,
            }

    def reset_state(self):
        """
        생성기 상태를 초기화
        """
        with self._lock:
            self._last_timestamp_ms = 0
            self._last_counter = 0


def demo():
    """
    표준 EPC 생성기 사용 예시 및 테스트
    """
    print("=" * 60)
    print("96비트 UHF RFID 표준 EPC 생성기 데모")
    print("=" * 60)
    print()

    # EPC 생성기 인스턴스 생성
    generator = StandardEPCGenerator()

    # 1. 기본 EPC 생성
    print("1. 기본 EPC 생성")
    print("-" * 30)
    product_code = "A1B2"
    epc1 = generator.generate_epc(product_code)
    print(f"상품 분류 코드: {product_code}")
    print(f"생성된 EPC: {epc1}")
    print()

    # 2. 명세서 예시와 동일한 형태
    print("2. 명세서 예시 형태 (16진수 상품 코드)")
    print("-" * 40)
    hex_product_code = "A1B2C3D4"
    epc2 = generator.generate_epc(hex_product_code)
    decoded2 = generator.decode_epc(epc2)
    print(f"상품 분류 코드: {hex_product_code}")
    print(f"생성된 EPC: {epc2}")
    print(f"구조 분석:")
    print(f"  - 상품 코드: {decoded2['product_bytes_hex']}")
    print(f"  - 타임스탬프: {decoded2['timestamp_ms']} ms")
    print(f"  - 생성 시간: {decoded2['generation_time']}")
    print(f"  - 순차 번호: {decoded2['counter']}")
    print()

    # 3. 동일 밀리초 내 연속 생성 (카운터 증가 확인)
    print("3. 동일 밀리초 내 연속 생성 테스트")
    print("-" * 35)
    print("목표: 같은 밀리초에서 카운터가 순차적으로 증가하는지 확인")

    # 빠른 연속 생성으로 같은 밀리초에 여러 개 생성
    consecutive_epcs = []
    for i in range(5):
        epc = generator.generate_epc("TEST")
        consecutive_epcs.append(epc)

    print(f"\n연속 생성 결과:")
    prev_timestamp = None
    for i, epc in enumerate(consecutive_epcs, 1):
        decoded = generator.decode_epc(epc)
        timestamp_ms = decoded["timestamp_ms"]
        counter = decoded["counter"]

        same_ms = "✓" if timestamp_ms == prev_timestamp else " "
        print(f"  {i}. {epc} (시간: {timestamp_ms}, 카운터: {counter:2d}) {same_ms}")
        prev_timestamp = timestamp_ms
    print()

    # 4. 대량 생성 성능 및 고유성 테스트
    print("4. 대량 생성 성능 및 고유성 테스트")
    print("-" * 35)

    test_count = 10000
    print(f"테스트 개수: {test_count:,}개")

    start_time = time.time()
    batch_epcs = generator.generate_batch("BATCH001", test_count)
    end_time = time.time()

    # 고유성 검증
    unique_epcs = set(batch_epcs)
    generation_time = end_time - start_time
    speed = test_count / generation_time

    print(f"생성 시간: {generation_time:.4f}초")
    print(f"생성 속도: {speed:.0f}개/초")
    print(f"총 생성: {len(batch_epcs):,}개")
    print(f"고유 개수: {len(unique_epcs):,}개")
    print(f"중복 여부: {'없음 ✓' if len(batch_epcs) == len(unique_epcs) else '있음 ✗'}")
    print()

    # 5. 다양한 상품 코드 테스트
    print("5. 다양한 상품 코드 테스트")
    print("-" * 25)

    test_products = [
        "ABCD",  # 4자리 영문
        "1234",  # 4자리 숫자
        "한글",  # 한글 (2자리)
        "PRODUCT123",  # 긴 코드 (잘림)
        "AB",  # 짧은 코드 (패딩)
        "A1B2C3D4",  # 16진수 형태
    ]

    for product in test_products:
        epc = generator.generate_epc(product)
        decoded = generator.decode_epc(epc)
        print(f"입력: '{product}' -> 복원: '{decoded['product_code']}' -> EPC: {epc}")
    print()

    # 6. 현재 상태 확인
    print("6. 생성기 현재 상태")
    print("-" * 20)
    state = generator.get_current_state()
    print(f"마지막 타임스탬프: {state['last_timestamp_ms']} ms")
    print(f"마지막 생성 시간: {state['last_generation_time']}")
    print(f"마지막 카운터: {state['last_counter']}")
    print(f"밀리초당 최대 용량: {state['max_capacity_per_ms']:,}개")
    print()

    print("=" * 60)
    print("데모 완료")
    print("=" * 60)


def generate_single_epc():
    """
    사용자로부터 상품 코드를 입력받아 EPC 하나 생성
    """
    generator = StandardEPCGenerator()

    print("=" * 50)
    print("RFID EPC 생성기")
    print("=" * 50)

    try:
        # 상품 코드 입력받기
        product_code = input("상품 분류 코드를 입력하세요: ").strip()

        if not product_code:
            print("❌ 상품 코드를 입력해주세요.")
            return

        # EPC 생성
        epc = generator.generate_epc(product_code)

        # 결과 출력
        print("\n✅ EPC 생성 완료!")
        print(f"상품 코드: {product_code}")
        print(f"생성된 EPC: {epc}")
        # epc 두개씩 끊어서 출력
        formatted_epc = " ".join(epc[i : i + 2] for i in range(0, len(epc), 2))
        print(f"복사 붙여넣기 가능한 형태: {formatted_epc}")

        # EPC 분석 정보 출력
        decoded = generator.decode_epc(epc)
        print("\n📊 EPC 구조 분석:")
        print(
            f"  - 상품 코드 (4바이트): {decoded['product_bytes_hex']} ({decoded['product_code']})"
        )
        print(f"  - 타임스탬프 (6바이트): {decoded['timestamp_ms']} ms")
        print(f"  - 생성 시간: {decoded['generation_time']}")
        print(f"  - 순차 번호 (2바이트): {decoded['counter']}")

    except KeyboardInterrupt:
        print("\n\n👋 프로그램을 종료합니다.")
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")


if __name__ == "__main__":
    generate_single_epc()
