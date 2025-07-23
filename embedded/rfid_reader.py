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
import struct


class RFIDReader:
    def __init__(self, port, baudrate=115200, reader_id=None):
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
        self.serial_conn = None
        self.is_running = False
        self.thread = None
        self.last_tag = None
        self.tag_callback = None
        self.polling_mode = "single"  # 'single' 또는 'multiple'
        self.polling_interval = 1.0  # 폴링 간격 (초)

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

    def connect(self):
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
        except Exception as e:
            self.logger.error(f"예상치 못한 연결 오류: {e}")
            return False

    def disconnect(self):
        """시리얼 연결 해제"""
        try:
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.close()
                self.logger.info("연결 해제됨")
        except Exception as e:
            self.logger.error(f"연결 해제 중 오류: {e}")

    def set_tag_callback(self, callback):
        """태그 감지 시 호출될 콜백 함수 설정"""
        self.tag_callback = callback

    def set_polling_mode(self, mode="single", interval=1.0):
        """
        폴링 모드 설정

        Args:
            mode (str): 'single' 또는 'multiple'
            interval (float): 폴링 간격 (초)
        """
        self.polling_mode = mode
        self.polling_interval = interval
        self.logger.info(f"폴링 모드: {mode}, 간격: {interval}초")

    def _calculate_checksum(self, data):
        """
        YRM100 체크섬 계산 (Type부터 Parameter까지의 합의 LSB)

        Args:
            data (bytes): 체크섬을 계산할 데이터

        Returns:
            int: 체크섬 값
        """
        return sum(data) & 0xFF

    def _create_command_frame(self, command, parameters=None):
        """
        YRM100 명령 프레임 생성

        Args:
            command (int): 명령 코드
            parameters (bytes): 매개변수 (선택사항)

        Returns:
            bytes: 완성된 명령 프레임
        """
        header = 0xBB
        frame_type = 0x00  # Command Frame

        if parameters is None:
            parameters = b""

        # 매개변수 길이 (MSB, LSB)
        param_len = len(parameters)
        pl_msb = (param_len >> 8) & 0xFF
        pl_lsb = param_len & 0xFF

        # 체크섬 계산을 위한 데이터 (Type부터 Parameter까지)
        checksum_data = bytes([frame_type, command, pl_msb, pl_lsb]) + parameters
        checksum = self._calculate_checksum(checksum_data)

        # 완성된 프레임
        frame = (
            bytes([header, frame_type, command, pl_msb, pl_lsb])
            + parameters
            + bytes([checksum, 0x7E])
        )

        return frame

    def _send_single_polling_command(self):
        """
        단일 폴링 명령 전송
        Header: BB, Type: 00, Command: 22, PL: 00 00, Checksum: 22, End: 7E
        """
        try:
            command_frame = self._create_command_frame(0x22)  # Single Polling
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.write(command_frame)
                self.logger.debug("단일 폴링 명령 전송")
                return True
        except Exception as e:
            self.logger.error(f"단일 폴링 명령 전송 오류: {e}")
        return False

    def _send_multiple_polling_command(self, count=0x2710):  # 기본값: 10000회
        """
        다중 폴링 명령 전송
        Header: BB, Type: 00, Command: 27, PL: 00 03, Reserved: 22, CNT: 27 10, Checksum: 83, End: 7E
        """
        try:
            # 매개변수: Reserved(1) + CNT(2)
            parameters = bytes([0x22, (count >> 8) & 0xFF, count & 0xFF])
            command_frame = self._create_command_frame(
                0x27, parameters
            )  # Multiple Polling
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.write(command_frame)
                self.logger.debug(f"다중 폴링 명령 전송 (카운트: {count})")
                return True
        except Exception as e:
            self.logger.error(f"다중 폴링 명령 전송 오류: {e}")
        return False

    def _send_stop_polling_command(self):
        """
        다중 폴링 중지 명령 전송
        Header: BB, Type: 00, Command: 28, PL: 00 00, Checksum: 28, End: 7E
        """
        try:
            command_frame = self._create_command_frame(0x28)  # Stop Multiple Polling
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.write(command_frame)
                self.logger.debug("다중 폴링 중지 명령 전송")
                return True
        except Exception as e:
            self.logger.error(f"폴링 중지 명령 전송 오류: {e}")
        return False

    def parse_epc_structure(self, epc_hex):
        """
        96비트 EPC를 구조화된 정보로 파싱

        Args:
            epc_hex (str): 24자리 HEX 문자열 (12바이트)

        Returns:
            dict: 파싱된 EPC 정보 또는 None
            {
                'product_code': str,      # 상품 분류 코드 (4바이트)
                'product_name': str,      # 상품명 (ASCII 변환)
                'timestamp_ms': int,      # 밀리초 타임스탬프 (6바이트)
                'sequence_num': int,      # 순차 번호 (2바이트)
                'readable_time': str,     # 사람이 읽기 쉬운 시간 형태
                'is_valid': bool          # EPC 유효성
            }
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

            return {
                "product_code": product_code,
                "product_name": product_name,
                "timestamp_ms": timestamp_ms,
                "sequence_num": sequence_num,
                "readable_time": readable_time,
                "is_valid": self._validate_epc_fields(
                    product_code, timestamp_ms, sequence_num
                ),
            }

        except Exception as e:
            self.logger.error(f"EPC 파싱 오류: {e}")
            return None

    def _validate_epc_fields(self, product_code, timestamp_ms, sequence_num):
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

    def get_epc_summary(self, epc_hex):
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
            f"Product Code: {epc_info['product_code']} | "
            f"Product Name: {epc_info['product_name']} | "
            f"Time: {epc_info['readable_time']} | "
            f"Seq: {epc_info['sequence_num']:05d} | "
            f"Valid: {epc_info['is_valid']}"
        )

    def is_same_product_batch(self, epc1, epc2):
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
                info1["product_code"] == info2["product_code"]
                and info1["timestamp_ms"] == info2["timestamp_ms"]
            )

        except Exception:
            return False

    def parse_tag_data(self, data):
        """
        YRM100에서 받은 데이터를 파싱하여 태그 정보 추출

        Args:
            data (bytes): 시리얼에서 받은 원시 데이터

        Returns:
            dict: 파싱된 태그 정보 또는 None
        """
        try:
            if not data or len(data) < 7:  # 최소 프레임 길이
                return None

            # YRM100 프레임 구조 확인
            if data[0] != 0xBB or data[-1] != 0x7E:
                self.logger.warning(f"잘못된 프레임 헤더/끝: {data.hex()}")
                return None

            frame_type = data[1]
            command = data[2]

            # Notification Frame (Type: 02, Command: 22) - 태그 감지
            if frame_type == 0x02 and command == 0x22:
                return self._parse_notification_frame(data)

            # Response Frame (Type: 01) - 명령 응답
            elif frame_type == 0x01:
                return self._parse_response_frame(data)

            # Command Frame은 무시 (우리가 보낸 명령)
            elif frame_type == 0x00:
                return None

            else:
                self.logger.warning(f"알 수 없는 프레임 타입: {frame_type:02X}")
                return None

        except Exception as e:
            self.logger.error(f"데이터 파싱 오류: {e}")
            return None

    def _parse_notification_frame(self, data):
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

            # 기본 태그 정보 구성
            tag_info = {
                "raw_tag_id": raw_tag_id,
                "epc_info": None,
                "data_length": epc_bytes,
                "is_96bit_epc": False,
                "rssi": rssi,
                "pc": (pc_msb << 8) | pc_lsb,
                "crc": crc,
            }

            # 96비트 EPC 검증 및 파싱 (12바이트 = 24자리 HEX)
            if len(raw_tag_id) == 24:
                tag_info["is_96bit_epc"] = True
                epc_info = self.parse_epc_structure(raw_tag_id)
                if epc_info:
                    tag_info["epc_info"] = epc_info
                    self.logger.info(
                        f"96비트 EPC 파싱 성공 - 상품코드: {epc_info['product_code']}, "
                        f"시간: {epc_info['readable_time']}, "
                        f"순번: {epc_info['sequence_num']}"
                    )
                else:
                    self.logger.warning(f"96비트 EPC 파싱 실패: {raw_tag_id}")
            else:
                # 96비트가 아닌 경우 정보
                self.logger.info(
                    f"비표준 태그 감지 (길이: {len(raw_tag_id)}자리): {raw_tag_id}"
                )

            return tag_info

        except Exception as e:
            self.logger.error(f"Notification frame 파싱 오류: {e}")
            return None

    def _parse_response_frame(self, data):
        """
        Response Frame 파싱 (명령 응답)
        """
        try:
            if len(data) < 7:
                return None

            command = data[2]
            pl_msb = data[3]
            pl_lsb = data[4]
            payload_len = (pl_msb << 8) | pl_lsb

            if payload_len > 0 and len(data) >= 6 + payload_len:
                parameter = data[5]

                # 오류 코드 확인
                if parameter != 0x00:
                    error_msg = self._get_error_message(parameter)
                    self.logger.warning(
                        f"명령 0x{command:02X} 응답 오류: 0x{parameter:02X} - {error_msg}"
                    )
                else:
                    self.logger.debug(f"명령 0x{command:02X} 성공")

            return None  # Response frame은 태그 정보가 아니므로 None 반환

        except Exception as e:
            self.logger.error(f"Response frame 파싱 오류: {e}")
            return None

    def _get_error_message(self, error_code):
        """YRM100 오류 코드를 메시지로 변환"""
        error_messages = {
            0x15: "CRC 오류 또는 태그 없음",
            0x16: "명령 매개변수 오류",
            0x17: "읽기/쓰기 오류",
            0x10: "태그 읽기 실패",
            0x00: "성공",
        }
        return error_messages.get(error_code, f"알 수 없는 오류: 0x{error_code:02X}")

    def read_loop(self):
        """YRM100 명령 기반 태그 읽기 루프"""
        self.logger.info(f"태그 읽기 루프 시작 (모드: {self.polling_mode})")

        # 다중 폴링 모드인 경우 초기 명령 전송
        if self.polling_mode == "multiple":
            self._send_multiple_polling_command()
            last_command_time = time.time()
        else:
            last_command_time = 0

        # 응답 데이터 버퍼
        response_buffer = bytearray()

        while self.is_running:
            try:
                if not self.serial_conn or not self.serial_conn.is_open:
                    self.logger.warning("시리얼 연결이 끊어짐. 재연결 시도...")
                    if not self.connect():
                        time.sleep(5)  # 재연결 실패 시 5초 대기
                        continue

                # 단일 폴링 모드에서 주기적 명령 전송
                current_time = time.time()
                if (
                    self.polling_mode == "single"
                    and (current_time - last_command_time) >= self.polling_interval
                ):
                    self._send_single_polling_command()
                    last_command_time = current_time

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

                time.sleep(0.05)  # CPU 사용량 조절 (더 빠른 응답을 위해 감소)

            except serial.SerialException as e:
                self.logger.error(f"시리얼 통신 오류: {e}")
                time.sleep(1)
            except Exception as e:
                self.logger.error(f"읽기 루프 오류: {e}")
                time.sleep(1)

        # 다중 폴링 모드인 경우 중지 명령 전송
        if self.polling_mode == "multiple":
            self._send_stop_polling_command()
            time.sleep(0.1)  # 중지 명령 처리 대기

        self.logger.info("태그 읽기 루프 종료")

    def _process_response_buffer(self, buffer):
        """
        응답 버퍼에서 완전한 프레임을 찾아 처리
        """
        while len(buffer) > 0:
            # 프레임 시작 찾기 (0xBB)
            start_idx = -1
            for i in range(len(buffer)):
                if buffer[i] == 0xBB:
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
            if len(buffer) < 7:  # 최소: BB + Type + Command + PL(2) + Checksum + 7E
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
            if frame[-1] != 0x7E:
                self.logger.warning(f"잘못된 프레임 끝: {frame.hex()}")
                continue

            # 체크섬 확인
            checksum_data = frame[1:-2]  # Type부터 Payload까지
            expected_checksum = self._calculate_checksum(checksum_data)
            actual_checksum = frame[-2]

            if expected_checksum != actual_checksum:
                self.logger.warning(
                    f"체크섬 오류 - 예상: {expected_checksum:02X}, 실제: {actual_checksum:02X}"
                )
                continue

            # 태그 정보 파싱 및 처리
            tag_info = self.parse_tag_data(frame)
            if tag_info and tag_info["raw_tag_id"] != self.last_tag:
                self.last_tag = tag_info["raw_tag_id"]

                # 콜백으로 전달할 완전한 태그 정보 구성
                callback_data = {
                    "reader_id": self.reader_id,
                    "raw_tag_id": tag_info["raw_tag_id"],
                    "timestamp": datetime.now().isoformat(),
                    "port": self.port,
                    "data_length": tag_info["data_length"],
                    "is_96bit_epc": tag_info["is_96bit_epc"],
                    "rssi": tag_info.get("rssi", 0),
                    "pc": tag_info.get("pc", 0),
                    "crc": tag_info.get("crc", 0),
                }

                # EPC 정보가 있으면 추가
                if tag_info["epc_info"]:
                    callback_data["epc_info"] = tag_info["epc_info"]
                    self.logger.info(
                        f"EPC 태그 감지: {tag_info['raw_tag_id']} "
                        f"(상품: {tag_info['epc_info']['product_code']}, "
                        f"상품명: {tag_info['epc_info']['product_name']}, "
                        f"순번: {tag_info['epc_info']['sequence_num']}, "
                        f"RSSI: {tag_info.get('rssi', 0)})"
                    )
                else:
                    self.logger.info(
                        f"일반 태그 감지: {tag_info['raw_tag_id']} "
                        f"(RSSI: {tag_info.get('rssi', 0)})"
                    )

                # 콜백 함수 호출 (안전하게)
                if self.tag_callback:
                    try:
                        self.tag_callback(callback_data)
                    except Exception as e:
                        self.logger.error(f"콜백 함수 실행 오류: {e}")

    def start_reading(self, polling_mode="single", polling_interval=1.0):
        """
        태그 읽기 시작

        Args:
            polling_mode (str): 'single' 또는 'multiple'
            polling_interval (float): 폴링 간격 (초, single 모드에서만 사용)
        """
        if self.is_running:
            self.logger.warning("이미 읽기가 진행 중입니다")
            return True

        if not self.connect():
            return False

        # 폴링 모드 설정
        self.set_polling_mode(polling_mode, polling_interval)

        self.is_running = True
        self.thread = threading.Thread(target=self.read_loop, daemon=True)
        self.thread.start()
        self.logger.info(f"태그 읽기 시작됨 (모드: {polling_mode})")
        return True

    def stop_reading(self):
        """태그 읽기 중지"""
        if not self.is_running:
            self.logger.warning("읽기가 진행 중이지 않습니다")
            return

        self.logger.info("태그 읽기 중지 중...")
        self.is_running = False

        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)  # 타임아웃 증가
            if self.thread.is_alive():
                self.logger.warning("스레드가 정상적으로 종료되지 않았습니다")

        self.disconnect()
        self.logger.info("태그 읽기 중지됨")

    def __enter__(self):
        """컨텍스트 매니저 진입"""
        if self.start_reading():
            return self
        else:
            raise RuntimeError(f"RFID 리더 {self.reader_id} 시작 실패")

    def __exit__(self, exc_type, exc_val, exc_tb):
        """컨텍스트 매니저 종료"""
        self.stop_reading()
        return False  # 예외를 전파
