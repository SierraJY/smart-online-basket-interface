#!/usr/bin/env python3
"""
YRM100 RFID 리더 클래스
개별 RFID 리더의 연결, 읽기, 데이터 파싱을 담당합니다.
"""

import serial
import threading
import time
import logging
from datetime import datetime
from dataclasses import dataclass
from enum import Enum, auto
from typing import Optional, Dict, Any, Callable
import struct


class YRM100Constants:
    """YRM100 프로토콜 상수"""

    FRAME_HEADER = 0xBB
    FRAME_END = 0x7E

    # Frame Types
    FRAME_TYPE_COMMAND = 0x00
    FRAME_TYPE_RESPONSE = 0x01
    FRAME_TYPE_NOTIFICATION = 0x02

    # Commands
    CMD_SINGLE_POLLING = 0x22
    CMD_MULTIPLE_POLLING = 0x27
    CMD_STOP_POLLING = 0x28

    # Error Codes
    ERROR_SUCCESS = 0x00
    ERROR_CRC_OR_NO_TAG = 0x15
    ERROR_COMMAND_PARAM = 0x16
    ERROR_READ_WRITE = 0x17
    ERROR_TAG_READ_FAIL = 0x10

    # Protocol Constants
    MIN_FRAME_LENGTH = 7
    DEFAULT_MULTIPLE_POLLING_COUNT = 0x2710  # 10000 (decimal)
    RESERVED_BYTE = 0x22

    # Timeout Constants
    NO_RESPONSE_TIMEOUT = 3.0  # 멀티폴링 완료 판단 시간 (초)
    RECONNECT_DELAY = 5.0  # 재연결 대기 시간 (초)
    THREAD_JOIN_TIMEOUT = 5.0  # 스레드 종료 대기 시간 (초)


class PollingMode(Enum):
    """폴링 모드"""

    SINGLE = auto()
    MULTIPLE = auto()


@dataclass
class EPCTag:
    """96비트 EPC 태그 데이터 구조"""

    product_code: str
    product_name: str
    timestamp_ms: int
    sequence_num: int
    readable_time: str
    is_valid: bool


@dataclass
class TagInfo:
    """태그 정보 데이터 구조"""

    raw_tag_id: str
    epc_info: Optional[EPCTag]
    data_length: int
    is_96bit_epc: bool
    rssi: int
    pc: int
    crc: int


@dataclass
class CallbackData:
    """콜백으로 전달되는 데이터 구조"""

    reader_id: str
    raw_tag_id: str
    timestamp: str
    port: str
    data_length: int
    is_96bit_epc: bool
    rssi: int
    pc: int
    crc: int
    epc_info: Optional[EPCTag] = None


class YRM100Protocol:
    """YRM100 통신 프로토콜 처리 클래스"""

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def calculate_checksum(self, data: bytes) -> int:
        """
        YRM100 체크섬 계산 (Type부터 Parameter까지의 합의 LSB)

        Args:
            data (bytes): 체크섬을 계산할 데이터

        Returns:
            int: 체크섬 값
        """
        return sum(data) & 0xFF

    def create_command_frame(
        self, command: int, parameters: Optional[bytes] = None
    ) -> bytes:
        """
        YRM100 명령 프레임 생성

        Args:
            command (int): 명령 코드
            parameters (bytes): 매개변수 (선택사항)

        Returns:
            bytes: 완성된 명령 프레임
        """
        frame_type = YRM100Constants.FRAME_TYPE_COMMAND

        if parameters is None:
            parameters = b""

        # 매개변수 길이 (MSB, LSB)
        param_len = len(parameters)
        pl_msb = (param_len >> 8) & 0xFF
        pl_lsb = param_len & 0xFF

        # 체크섬 계산을 위한 데이터 (Type부터 Parameter까지)
        checksum_data = bytes([frame_type, command, pl_msb, pl_lsb]) + parameters
        checksum = self.calculate_checksum(checksum_data)

        # 완성된 프레임
        frame = (
            bytes([YRM100Constants.FRAME_HEADER, frame_type, command, pl_msb, pl_lsb])
            + parameters
            + bytes([checksum, YRM100Constants.FRAME_END])
        )

        return frame

    def create_single_polling_command(self) -> bytes:
        """
        단일 폴링 명령 프레임 생성
        Header: BB, Type: 00, Command: 22, PL: 00 00, Checksum: 22, End: 7E
        """
        return self.create_command_frame(YRM100Constants.CMD_SINGLE_POLLING)

    def create_multiple_polling_command(
        self, count: int = YRM100Constants.DEFAULT_MULTIPLE_POLLING_COUNT
    ) -> bytes:
        """
        다중 폴링 명령 프레임 생성
        Header: BB, Type: 00, Command: 27, PL: 00 03, Reserved: 22, CNT: 27 10, Checksum: 83, End: 7E
        """
        # 매개변수: Reserved(1) + CNT(2)
        parameters = bytes(
            [YRM100Constants.RESERVED_BYTE, (count >> 8) & 0xFF, count & 0xFF]
        )
        return self.create_command_frame(
            YRM100Constants.CMD_MULTIPLE_POLLING, parameters
        )

    def create_stop_polling_command(self) -> bytes:
        """
        다중 폴링 중지 명령 프레임 생성
        Header: BB, Type: 00, Command: 28, PL: 00 00, Checksum: 28, End: 7E
        """
        return self.create_command_frame(YRM100Constants.CMD_STOP_POLLING)

    def get_error_message(self, error_code: int) -> str:
        """YRM100 오류 코드를 메시지로 변환"""
        error_messages = {
            YRM100Constants.ERROR_SUCCESS: "성공",
            YRM100Constants.ERROR_CRC_OR_NO_TAG: "CRC 오류 또는 태그 없음",
            YRM100Constants.ERROR_COMMAND_PARAM: "명령 매개변수 오류",
            YRM100Constants.ERROR_READ_WRITE: "읽기/쓰기 오류",
            YRM100Constants.ERROR_TAG_READ_FAIL: "태그 읽기 실패",
        }
        return error_messages.get(error_code, f"알 수 없는 오류: 0x{error_code:02X}")

    def parse_notification_frame(self, data: bytes) -> Optional[TagInfo]:
        """
        Notification Frame 파싱 (태그 감지 알림)
        구조: BB 02 22 00 11 RSSI PC(2) EPC(12) CRC(2) Checksum 7E
        """
        try:
            if len(data) < 19:  # 최소 notification frame 길이
                self.logger.warning(
                    f"Notification frame이 너무 짧음: {len(data)} bytes"
                )
                return None

            # 길이 정보 추출
            pl_msb = data[3]
            pl_lsb = data[4]
            payload_len = (pl_msb << 8) | pl_lsb

            if len(data) < 7 + payload_len:
                self.logger.warning(f"불완전한 notification frame")
                return None

            # 데이터 추출
            rssi = data[5]  # RSSI
            pc_msb = data[6]  # PC MSB
            pc_lsb = data[7]  # PC LSB

            # PC에서 EPC 길이 계산 (PC의 상위 5비트가 EPC word 수)
            epc_words = (pc_msb >> 3) & 0x1F
            epc_bytes = epc_words * 2

            if len(data) < 8 + epc_bytes + 2:  # EPC + CRC
                self.logger.warning(f"EPC 데이터가 부족함")
                return None

            # EPC 데이터 추출
            epc_data = data[8 : 8 + epc_bytes]
            raw_tag_id = epc_data.hex().upper()

            # CRC 추출
            crc_msb = data[8 + epc_bytes]
            crc_lsb = data[8 + epc_bytes + 1]
            crc = (crc_msb << 8) | crc_lsb

            # TagInfo 객체 생성
            tag_info = TagInfo(
                raw_tag_id=raw_tag_id,
                epc_info=None,
                data_length=epc_bytes,
                is_96bit_epc=(len(raw_tag_id) == 24),
                rssi=rssi,
                pc=(pc_msb << 8) | pc_lsb,
                crc=crc,
            )

            return tag_info

        except Exception as e:
            self.logger.error(f"Notification frame 파싱 오류: {e}")
            return None

    def parse_response_frame(self, data: bytes) -> bool:
        """
        Response Frame 파싱 (명령 응답)

        Returns:
            bool: 응답이 성공인지 여부
        """
        try:
            if len(data) < YRM100Constants.MIN_FRAME_LENGTH:
                return False

            command = data[2]
            pl_msb = data[3]
            pl_lsb = data[4]
            payload_len = (pl_msb << 8) | pl_lsb

            if payload_len > 0 and len(data) >= 6 + payload_len:
                parameter = data[5]

                # 오류 코드 확인
                if parameter != YRM100Constants.ERROR_SUCCESS:
                    error_msg = self.get_error_message(parameter)
                    self.logger.warning(
                        f"명령 0x{command:02X} 응답 오류: 0x{parameter:02X} - {error_msg}"
                    )
                    return False
                else:
                    self.logger.debug(f"명령 0x{command:02X} 성공")
                    return True

            return True

        except Exception as e:
            self.logger.error(f"Response frame 파싱 오류: {e}")
            return False


class EPCHandler:
    """EPC 데이터 처리 클래스"""

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def parse_epc_structure(self, epc_hex: str) -> Optional[EPCTag]:
        """
        96비트 EPC를 구조화된 정보로 파싱

        Args:
            epc_hex (str): 24자리 HEX 문자열 (12바이트)

        Returns:
            EPCTag: 파싱된 EPC 정보 또는 None
        """
        try:
            # EPC 길이 검증 (24자리 HEX = 12바이트)
            if len(epc_hex) != 24:
                self.logger.warning(
                    f"잘못된 EPC 길이: {len(epc_hex)}자리 (24자리 필요)"
                )
                return None

            # 각 필드 추출
            product_code = epc_hex[0:8]  # 처음 4바이트 (8자리 HEX)
            timestamp_hex = epc_hex[8:20]  # 다음 6바이트 (12자리 HEX)
            sequence_hex = epc_hex[20:24]  # 마지막 2바이트 (4자리 HEX)

            # 타임스탬프를 정수로 변환 (밀리초)
            timestamp_ms = int(timestamp_hex, 16)

            # 순차 번호를 정수로 변환
            sequence_num = int(sequence_hex, 16)

            # 타임스탬프를 사람이 읽기 쉬운 형태로 변환
            try:
                timestamp_sec = timestamp_ms / 1000
                readable_time = datetime.fromtimestamp(timestamp_sec).strftime(
                    "%Y-%m-%d %H:%M:%S.%f"
                )[:-3]
            except (ValueError, OSError) as e:
                self.logger.warning(f"타임스탬프 변환 오류: {e}")
                readable_time = "Invalid timestamp"

            # 상품 코드를 ASCII로 변환하여 상품명 생성
            try:
                product_name = bytes.fromhex(product_code).decode(
                    "ascii", errors="ignore"
                )
            except ValueError:
                product_name = product_code  # 변환 실패 시 원본 코드 사용

            return EPCTag(
                product_code=product_code,
                product_name=product_name,
                timestamp_ms=timestamp_ms,
                sequence_num=sequence_num,
                readable_time=readable_time,
                is_valid=self._validate_epc_fields(
                    product_code, timestamp_ms, sequence_num
                ),
            )

        except Exception as e:
            self.logger.error(f"EPC 파싱 오류: {e}")
            return None

    def _validate_epc_fields(
        self, product_code: str, timestamp_ms: int, sequence_num: int
    ) -> bool:
        """
        EPC 필드들의 유효성 검증

        Args:
            product_code (str): 상품 코드
            timestamp_ms (int): 밀리초 타임스탬프
            sequence_num (int): 순차 번호

        Returns:
            bool: 유효성 여부
        """
        try:
            # 상품 코드 검증 (8자리 HEX)
            if len(product_code) != 8:
                return False

            # 타임스탬프 범위 검증 (1970년~2100년 정도)
            min_timestamp = 0  # 1970-01-01
            max_timestamp = 4102444800000  # 2100-01-01 (ms)
            if not (min_timestamp <= timestamp_ms <= max_timestamp):
                self.logger.warning(f"타임스탬프 범위 초과: {timestamp_ms}")
                return False

            # 순차 번호 범위 검증 (0~65535)
            if not (0 <= sequence_num <= 65535):
                return False

            return True

        except Exception:
            return False

    def get_epc_summary(self, epc_hex: str) -> str:
        """
        EPC에 대한 요약 정보 반환

        Args:
            epc_hex (str): 24자리 HEX 문자열

        Returns:
            str: EPC 요약 정보
        """
        epc_info = self.parse_epc_structure(epc_hex)
        if not epc_info:
            return f"Invalid EPC: {epc_hex}"

        return (
            f"Product Code: {epc_info.product_code} | "
            f"Product Name: {epc_info.product_name} | "
            f"Time: {epc_info.readable_time} | "
            f"Seq: {epc_info.sequence_num:05d} | "
            f"Valid: {epc_info.is_valid}"
        )

    def is_same_product_batch(self, epc1: str, epc2: str) -> bool:
        """
        두 EPC가 같은 상품 배치(동일 밀리초)인지 확인

        Args:
            epc1, epc2 (str): 비교할 EPC HEX 문자열들

        Returns:
            bool: 같은 배치 여부
        """
        try:
            info1 = self.parse_epc_structure(epc1)
            info2 = self.parse_epc_structure(epc2)

            if not (info1 and info2):
                return False

            return (
                info1.product_code == info2.product_code
                and info1.timestamp_ms == info2.timestamp_ms
            )

        except Exception:
            return False


class RFIDReader:
    def __init__(
        self, port: str, baudrate: int = 115200, reader_id: Optional[str] = None
    ):
        """
        YRM100 RFID 리더 클래스

        Args:
            port (str): 시리얼 포트 (예: '/dev/ttyUSB0')
            baudrate (int): 통신 속도 (기본값: 115200)
            reader_id (str): 리더 식별자
        """
        self.port = port
        self.baudrate = baudrate
        self.reader_id = reader_id or port
        self.serial_conn: Optional[serial.Serial] = None
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.processed_tags: set[str] = set()  # 세션 동안 처리된 고유 태그들
        self.tag_callback: Optional[Callable[[CallbackData], None]] = None
        self.polling_mode = PollingMode.SINGLE
        self.polling_interval = 1.0  # 폴링 간격 (초)

        # 멀티폴링 관련 추가 변수
        self.multiple_polling_count = 0  # 멀티폴링 예상 개수
        self.last_response_time = None  # 마지막 응답 시간

        # 로거 설정
        self.logger = logging.getLogger(f"RFIDReader-{self.reader_id}")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

        # 프로토콜 및 EPC 핸들러 초기화
        self.protocol = YRM100Protocol(self.logger)
        self.epc_handler = EPCHandler(self.logger)

    def connect(self) -> bool:
        """시리얼 연결 설정"""
        try:
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=1,
            )
            self.logger.info(f"연결됨: {self.port}")
            return True
        except serial.SerialException as e:
            self.logger.error(f"시리얼 연결 실패: {e}")
            return False
        except (OSError, ValueError) as e:
            self.logger.error(f"연결 설정 오류: {e}")
            return False
        except Exception as e:
            self.logger.error(f"예상치 못한 연결 오류: {e}")
            return False

    def disconnect(self) -> None:
        """시리얼 연결 해제"""
        try:
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.close()
                self.logger.info("연결 해제됨")
        except (serial.SerialException, OSError) as e:
            self.logger.error(f"연결 해제 중 오류: {e}")
        except Exception as e:
            self.logger.error(f"예상치 못한 연결 해제 오류: {e}")

    def set_tag_callback(self, callback: Callable[[CallbackData], None]) -> None:
        """태그 감지 시 호출될 콜백 함수 설정"""
        self.tag_callback = callback

    def set_polling_mode(
        self, mode: PollingMode = PollingMode.SINGLE, interval: float = 1.0
    ) -> None:
        """
        폴링 모드 설정

        Args:
            mode (PollingMode): SINGLE 또는 MULTIPLE
            interval (float): 폴링 간격 (초)
        """
        self.polling_mode = mode
        self.polling_interval = interval
        self.logger.info(f"폴링 모드: {mode.name}, 간격: {interval}초")

    def _send_single_polling_command(self) -> bool:
        """단일 폴링 명령 전송"""
        try:
            command_frame = self.protocol.create_single_polling_command()
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.write(command_frame)
                self.logger.debug("단일 폴링 명령 전송")
                return True
        except (serial.SerialException, OSError) as e:
            self.logger.error(f"단일 폴링 명령 전송 오류: {e}")
        except Exception as e:
            self.logger.error(f"예상치 못한 단일 폴링 오류: {e}")
        return False

    def _send_multiple_polling_command(
        self, count: int = YRM100Constants.DEFAULT_MULTIPLE_POLLING_COUNT
    ) -> bool:
        """다중 폴링 명령 전송"""
        try:
            command_frame = self.protocol.create_multiple_polling_command(count)
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.write(command_frame)
                self.multiple_polling_count = count  # 예상 개수 저장
                self.last_response_time = time.time()  # 응답 시간 초기화
                self.logger.debug(f"다중 폴링 명령 전송 (카운트: {count})")
                return True
        except (serial.SerialException, OSError) as e:
            self.logger.error(f"다중 폴링 명령 전송 오류: {e}")
        except Exception as e:
            self.logger.error(f"예상치 못한 다중 폴링 오류: {e}")
        return False

    def _send_stop_polling_command(self) -> bool:
        """다중 폴링 중지 명령 전송"""
        try:
            command_frame = self.protocol.create_stop_polling_command()
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.write(command_frame)
                self.logger.debug("다중 폴링 중지 명령 전송")
                return True
        except (serial.SerialException, OSError) as e:
            self.logger.error(f"폴링 중지 명령 전송 오류: {e}")
        except Exception as e:
            self.logger.error(f"예상치 못한 폴링 중지 오류: {e}")
        return False

    # EPC 관련 메서드들을 EPCHandler로 위임 (편의성을 위한 래퍼)
    def parse_epc_structure(self, epc_hex: str) -> Optional[EPCTag]:
        """96비트 EPC를 구조화된 정보로 파싱 (EPCHandler 위임)"""
        return self.epc_handler.parse_epc_structure(epc_hex)

    def get_epc_summary(self, epc_hex: str) -> str:
        """EPC에 대한 요약 정보 반환 (EPCHandler 위임)"""
        return self.epc_handler.get_epc_summary(epc_hex)

    def is_same_product_batch(self, epc1: str, epc2: str) -> bool:
        """두 EPC가 같은 상품 배치(동일 밀리초)인지 확인 (EPCHandler 위임)"""
        return self.epc_handler.is_same_product_batch(epc1, epc2)

    def get_processed_tag_count(self) -> int:
        """현재 세션에서 처리된 고유 태그 개수 반환"""
        return len(self.processed_tags)

    def get_processed_tags(self) -> set[str]:
        """현재 세션에서 처리된 고유 태그 목록 반환 (복사본)"""
        return self.processed_tags.copy()

    def clear_processed_tags(self) -> None:
        """처리된 태그 목록 수동 초기화 (디버깅용)"""
        self.processed_tags.clear()
        self.logger.info("처리된 태그 목록이 수동으로 초기화되었습니다")

    def parse_tag_data(self, data: bytes) -> Optional[TagInfo]:
        """
        YRM100에서 받은 데이터를 파싱하여 태그 정보 추출

        Args:
            data (bytes): 시리얼에서 받은 원시 데이터

        Returns:
            TagInfo: 파싱된 태그 정보 또는 None
        """
        try:
            if not data or len(data) < YRM100Constants.MIN_FRAME_LENGTH:
                return None

            # YRM100 프레임 구조 확인
            if (
                data[0] != YRM100Constants.FRAME_HEADER
                or data[-1] != YRM100Constants.FRAME_END
            ):
                self.logger.warning(f"잘못된 프레임 헤더/끝: {data.hex()}")
                return None

            frame_type = data[1]
            command = data[2]

            # Notification Frame (Type: 02, Command: 22) - 태그 감지
            if (
                frame_type == YRM100Constants.FRAME_TYPE_NOTIFICATION
                and command == YRM100Constants.CMD_SINGLE_POLLING
            ):
                tag_info = self.protocol.parse_notification_frame(data)

                # 96비트 EPC인 경우 EPC 정보 파싱
                if tag_info and tag_info.is_96bit_epc:
                    epc_info = self.epc_handler.parse_epc_structure(tag_info.raw_tag_id)
                    if epc_info:
                        tag_info.epc_info = epc_info

                return tag_info

            # Response Frame (Type: 01) - 명령 응답
            elif frame_type == YRM100Constants.FRAME_TYPE_RESPONSE:
                self.protocol.parse_response_frame(data)
                return None

            # Command Frame은 무시 (우리가 보낸 명령)
            elif frame_type == YRM100Constants.FRAME_TYPE_COMMAND:
                return None

            else:
                self.logger.warning(f"알 수 없는 프레임 타입: {frame_type:02X}")
                return None

        except Exception as e:
            self.logger.error(f"데이터 파싱 오류: {e}")
            return None

    def read_loop(self) -> None:
        """YRM100 명령 기반 태그 읽기 루프"""
        self.logger.info(f"태그 읽기 루프 시작 (모드: {self.polling_mode.name})")

        last_command_time = 0

        # 응답 데이터 버퍼
        response_buffer = bytearray()

        while self.is_running:
            try:
                if not self.serial_conn or not self.serial_conn.is_open:
                    self.logger.warning("시리얼 연결이 끊어짐. 재연결 시도...")
                    if not self.connect():
                        time.sleep(
                            YRM100Constants.RECONNECT_DELAY
                        )  # 재연결 실패 시 대기
                        continue

                current_time = time.time()

                # 단일 폴링 모드에서 주기적 명령 전송
                if (
                    self.polling_mode == PollingMode.SINGLE
                    and (current_time - last_command_time) >= self.polling_interval
                ):
                    self._send_single_polling_command()
                    last_command_time = current_time

                # 멀티폴링 모드에서 응답 타임아웃 체크
                elif self.polling_mode == PollingMode.MULTIPLE:
                    # 일정 시간 동안 응답이 없으면 폴링 완료로 간주하고 종료
                    if (
                        self.last_response_time
                        and (current_time - self.last_response_time)
                        > YRM100Constants.NO_RESPONSE_TIMEOUT
                    ):
                        self.logger.info(
                            f"멀티폴링 완료: {YRM100Constants.NO_RESPONSE_TIMEOUT}초 동안 응답 없음"
                        )
                        self.is_running = False
                        break

                # 데이터 읽기
                if (
                    self.serial_conn
                    and self.serial_conn.is_open
                    and self.serial_conn.in_waiting > 0
                ):
                    new_data = self.serial_conn.read(self.serial_conn.in_waiting)
                    response_buffer.extend(new_data)

                    # 완전한 프레임 찾기 및 처리
                    self._process_response_buffer(response_buffer)

                time.sleep(0.01)  # CPU 사용량 조절

            except serial.SerialException as e:
                self.logger.error(f"시리얼 통신 오류: {e}")
                time.sleep(1)
            except Exception as e:
                self.logger.error(f"읽기 루프 오류: {e}")
                time.sleep(1)

        # 다중 폴링 모드인 경우 중지 명령 전송
        if self.polling_mode == PollingMode.MULTIPLE:
            self._send_stop_polling_command()
            time.sleep(0.1)  # 중지 명령 처리 대기

        self.logger.info("태그 읽기 루프 종료")

    def _process_response_buffer(self, buffer: bytearray) -> None:
        """
        응답 버퍼에서 완전한 프레임을 찾아 처리
        """
        while len(buffer) > 0:
            # 프레임 시작 찾기
            start_idx = -1
            for i in range(len(buffer)):
                if buffer[i] == YRM100Constants.FRAME_HEADER:
                    start_idx = i
                    break

            if start_idx == -1:
                # 프레임 시작이 없으면 버퍼 클리어
                buffer.clear()
                break

            # 프레임 시작 전의 데이터 제거
            if start_idx > 0:
                del buffer[:start_idx]

            # 최소 프레임 길이 확인
            if len(buffer) < YRM100Constants.MIN_FRAME_LENGTH:
                break

            # 페이로드 길이 추출
            pl_msb = buffer[3]
            pl_lsb = buffer[4]
            payload_len = (pl_msb << 8) | pl_lsb

            # 전체 프레임 길이 계산
            frame_len = (
                5 + payload_len + 2
            )  # Header + Type + Command + PL(2) + Payload + Checksum + End

            if len(buffer) < frame_len:
                # 프레임이 완전하지 않음
                break

            # 완전한 프레임 추출
            frame = bytes(buffer[:frame_len])
            del buffer[:frame_len]

            # 프레임 끝 확인
            if frame[-1] != YRM100Constants.FRAME_END:
                self.logger.warning(f"잘못된 프레임 끝: {frame.hex()}")
                continue

            # 체크섬 확인
            checksum_data = frame[1:-2]  # Type부터 Payload까지
            expected_checksum = self.protocol.calculate_checksum(checksum_data)
            actual_checksum = frame[-2]

            if expected_checksum != actual_checksum:
                self.logger.warning(
                    f"체크섬 오류 - 예상: {expected_checksum:02X}, 실제: {actual_checksum:02X}"
                )
                continue

            # 태그 정보 파싱 및 처리
            tag_info = self.parse_tag_data(frame)
            if tag_info and tag_info.raw_tag_id not in self.processed_tags:
                # 새로운 고유 태그 발견 - set에 추가
                self.processed_tags.add(tag_info.raw_tag_id)

                # 멀티폴링 모드에서 응답 시간 업데이트
                if self.polling_mode == PollingMode.MULTIPLE:
                    self.last_response_time = time.time()

                # 콜백으로 전달할 완전한 태그 정보 구성
                callback_data = CallbackData(
                    reader_id=self.reader_id,
                    raw_tag_id=tag_info.raw_tag_id,
                    timestamp=datetime.now().isoformat(),
                    port=self.port,
                    data_length=tag_info.data_length,
                    is_96bit_epc=tag_info.is_96bit_epc,
                    rssi=tag_info.rssi,
                    pc=tag_info.pc,
                    crc=tag_info.crc,
                    epc_info=tag_info.epc_info,
                )

                # 로그 출력
                if tag_info.epc_info:
                    self.logger.info(
                        f"새로운 EPC 태그 감지 #{len(self.processed_tags)}: {tag_info.raw_tag_id} "
                        f"(상품: {tag_info.epc_info.product_code}, "
                        f"상품명: {tag_info.epc_info.product_name}, "
                        f"순번: {tag_info.epc_info.sequence_num}, "
                        f"RSSI: {tag_info.rssi})"
                    )
                else:
                    self.logger.info(
                        f"새로운 일반 태그 감지 #{len(self.processed_tags)}: {tag_info.raw_tag_id} "
                        f"(RSSI: {tag_info.rssi})"
                    )

                # 콜백 함수 호출 (안전하게)
                if self.tag_callback:
                    try:
                        self.tag_callback(callback_data)
                    except Exception as e:
                        self.logger.error(f"콜백 함수 실행 오류: {e}")

    def start_reading(
        self,
        polling_mode: str = "single",
        polling_interval: float = 1.0,
        count: int = 100,
    ) -> bool:
        """
        태그 읽기 시작

        Args:
            polling_mode (str): 'single' 또는 'multiple'
            polling_interval (float): 폴링 간격 (초, single 모드에서만 사용)
            count (int): 멀티폴링 카운트 (multiple 모드에서만 사용)
        """
        if self.is_running:
            self.logger.warning("이미 읽기가 진행 중입니다")
            return True

        if not self.connect():
            return False

        # 새로운 읽기 세션 시작 - 처리된 태그 목록 초기화
        self.processed_tags.clear()

        # 폴링 모드 설정 (문자열을 Enum으로 변환)
        mode_enum = (
            PollingMode.SINGLE
            if polling_mode.lower() == "single"
            else PollingMode.MULTIPLE
        )
        self.set_polling_mode(mode_enum, polling_interval)

        # 멀티폴링 모드인 경우 count 설정
        if mode_enum == PollingMode.MULTIPLE:
            self.multiple_polling_count = count

        self.is_running = True
        self.thread = threading.Thread(target=self.read_loop, daemon=True)
        self.thread.start()

        # 멀티폴링 모드인 경우 명령 전송
        if mode_enum == PollingMode.MULTIPLE:
            return self._send_multiple_polling_command(count)

        return True

    def stop_reading(self) -> None:
        """태그 읽기 중지"""
        if not self.is_running:
            self.logger.warning("읽기가 진행 중이지 않습니다")
            return

        self.is_running = False

        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=YRM100Constants.THREAD_JOIN_TIMEOUT)
            if self.thread.is_alive():
                self.logger.warning("스레드가 정상적으로 종료되지 않았습니다")

        # 읽기 세션 종료 - 처리된 태그 목록 정리
        self.processed_tags.clear()

        self.disconnect()

    def __enter__(self) -> "RFIDReader":
        """컨텍스트 매니저 진입"""
        if self.start_reading():
            return self
        else:
            raise RuntimeError(f"RFID 리더 {self.reader_id} 시작 실패")

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> bool:
        """컨텍스트 매니저 종료"""
        self.stop_reading()
        return False  # 예외를 전파
