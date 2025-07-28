#!/usr/bin/env python3
"""
다중 RFID 센서 폴링 매니저
여러 센서가 동시에 멀티폴링을 수행하고 결과를 종합합니다.
"""

import time
import threading
import logging
from typing import List, Dict, Set, Optional
from dataclasses import dataclass, field
from datetime import datetime
from rfid_reader import RFIDReader, SensorObserver, SensorEvent
from collections import deque
from enum import Enum


class TagStatus(str, Enum):
    """태그 상태 정의"""

    CONFIRMED = "confirmed"
    SUSPECTED = "suspected"
    REMOVED = "removed"


@dataclass
class TagHistory:
    """태그 신뢰도 히스토리 관리"""

    tag_id: str
    history_max_length: int = 10  # 최대 히스토리 길이, 기본 10
    removal_threshold: int = 4  # 제거 조건, 기본 4
    consecutive_miss_threshold: int = 3  # 연속 미감지 임계값 (확신->의심 변경 조건)
    status: str = TagStatus.CONFIRMED  # confirmed, suspected, removed
    detection_history: deque = field(init=False)
    rssi_history: deque = field(init=False)
    last_detection_cycle: int = 0
    first_detection_cycle: int = 0
    confidence_score: float = 1.0
    consecutive_misses: int = 0  # 연속 미감지 카운터 (관성 부여)

    def __post_init__(self):
        """초기화 후 히스토리 덱 설정"""
        self.detection_history = deque(maxlen=self.history_max_length)
        self.rssi_history = deque(maxlen=self.history_max_length)

    def update_detection(
        self, cycle_number: int, detected: bool, rssi: Optional[int] = None
    ):
        """감지 상태 업데이트 (관성 기반, RSSI 점수 반영)"""
        # 기존 boolean 히스토리는 호환성을 위해 유지
        self.detection_history.append(detected)

        if detected:
            # 감지된 경우: 연속 미감지 카운터 리셋
            self.consecutive_misses = 0
            self.last_detection_cycle = cycle_number
            if rssi is not None:
                self.rssi_history.append(rssi)
        else:
            # 미감지된 경우: 연속 미감지 카운터 증가
            self.consecutive_misses += 1
            # 미감지 시에도 RSSI 히스토리에 매우 낮은 값 추가 (시간 동기화)
            self.rssi_history.append(-100)  # 미감지 시 기본값

        # 개선된 신뢰도 점수 계산 (시간 가중 + RSSI 점수)
        self._calculate_enhanced_confidence()

    def _calculate_confidence(self):
        """신뢰도 점수 계산 (감지 비율 기반) - 호환성을 위해 유지"""
        if not self.detection_history:
            self.confidence_score = 0.0
            return

        self.confidence_score = sum(self.detection_history) / len(
            self.detection_history
        )

    def _calculate_enhanced_confidence(self):
        """개선된 신뢰도 점수 계산 (시간 가중 평균 + RSSI 점수 반영)"""
        if not self.detection_history:
            self.confidence_score = 0.0
            return

        # 1. RSSI 점수화 함수
        def rssi_to_score(rssi_value: int, detected: bool) -> float:
            """RSSI 값을 0.0~1.0 점수로 변환"""
            if not detected:
                return 0.0

            # RSSI 범위별 점수 매핑 (-100dBm ~ -30dBm)
            # -30dBm(매우 강함) = 1.0, -55dBm(양호) = 0.7, -70dBm(약함) = 0.3, -100dBm(매우 약함) = 0.1
            if rssi_value >= -30:
                return 1.0
            elif rssi_value >= -45:
                return 0.9
            elif rssi_value >= -55:
                return 0.7  # 기존 임계값
            elif rssi_value >= -65:
                return 0.5
            elif rssi_value >= -75:
                return 0.3
            elif rssi_value >= -85:
                return 0.2
            else:
                return 0.1  # 매우 약한 신호도 최소 점수

        # 2. 시간 가중치 계산 (최근일수록 높은 가중치)
        history_length = len(self.detection_history)
        time_weights = []

        # 지수적 가중치: 최신 = 1.0, 이전 = 0.8, 0.6, 0.4, 0.2...
        for i in range(history_length):
            age = history_length - 1 - i  # 0(최신) ~ n-1(오래됨)
            weight = 0.8**age  # 지수적 감소
            time_weights.append(weight)

        # 3. RSSI 점수와 시간 가중치를 결합한 신뢰도 계산
        weighted_sum = 0.0
        total_weight = 0.0

        for i, (detected, weight) in enumerate(
            zip(self.detection_history, time_weights)
        ):
            # RSSI 점수 계산
            rssi_value = -100  # 기본값
            if i < len(self.rssi_history):
                rssi_value = self.rssi_history[i]

            rssi_score = rssi_to_score(rssi_value, detected)

            # 가중 점수 누적
            weighted_sum += rssi_score * weight
            total_weight += weight

        # 최종 신뢰도 계산
        if total_weight > 0:
            self.confidence_score = weighted_sum / total_weight
        else:
            self.confidence_score = 0.0

        # 신뢰도 범위 제한 (0.0 ~ 1.0)
        self.confidence_score = max(0.0, min(1.0, self.confidence_score))

    def should_transition_to_suspected(self) -> bool:
        """확신 상태에서 의심 상태로 전환해야 하는지 확인 (관성 적용)"""
        return self.consecutive_misses >= self.consecutive_miss_threshold

    def should_be_removed(self) -> bool:
        """제거 조건 확인: 관성 로직과 일관된 개선된 신뢰도 기반 판단"""
        # 관성 로직과 일관성 유지: 의심 상태에서만 제거 고려
        if self.status != TagStatus.SUSPECTED:
            return False

        # 개선된 신뢰도 기반 제거 판단 (0.0~1.0 범위에서 낮은 임계값 사용)
        # 기존: removal_threshold(4) / history_max_length(10) = 0.4
        # 개선: 더 낮은 임계값으로 조정 (0.25 = 25%)
        enhanced_removal_threshold = 0.25

        return self.confidence_score < enhanced_removal_threshold


@dataclass
class SmartCycleResult:
    """신뢰도 기반 사이클 결과"""

    cycle_number: int
    sensor_results: List["SensorResult"]

    # 기존 결과
    total_unique_tags: Set[str] = field(default_factory=set)
    total_tag_count: int = 0

    # 신뢰도 기반 분류
    confirmed_tags: Set[str] = field(default_factory=set)  # 이번에 감지된 확신 태그
    suspected_tags: Set[str] = field(
        default_factory=set
    )  # 이전에 있었으나 이번에 없는 의심 태그
    removed_tags: Set[str] = field(default_factory=set)  # 완전히 제거된 태그
    new_tags: Set[str] = field(default_factory=set)  # 처음 발견된 태그

    # 시간 정보
    cycle_start_time: Optional[datetime] = None
    cycle_end_time: Optional[datetime] = None
    cycle_duration_ms: Optional[float] = None

    # 품질 정보
    rssi_filtered_tags: Set[str] = field(default_factory=set)  # RSSI >= -55 태그만
    total_rssi_qualified_count: int = 0


@dataclass
class SensorResult:
    """개별 센서의 폴링 결과"""

    sensor_id: str
    port: str
    detected_tags: Set[str] = field(default_factory=set)
    tag_rssi_map: Dict[str, int] = field(default_factory=dict)  # 태그별 RSSI 정보
    qualified_tags: Set[str] = field(default_factory=set)  # RSSI >= -55 태그만
    tag_count: int = 0
    qualified_count: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    status: str = "waiting"  # waiting, running, completed, error, timeout


class MultiSensorManager(SensorObserver):
    """다중 센서 폴링 매니저 - 옵저버 패턴 구현"""

    def __init__(
        self,
        sensor_ports: List[str],
        polling_count: int,
        rssi_threshold: int,
        max_cycle_length: int = 10,
        removal_threshold: int = 4,
        consecutive_miss_threshold: int = 3,  # 연속 미감지 임계값 추가
        polling_timeout: float = 10.0,
    ):
        """
        다중 센서 매니저 초기화

        Args:
            sensor_ports: 센서 포트 리스트 (예: ['/dev/ttyUSB0', '/dev/ttyUSB1', ...])
            polling_count: 각 센서의 멀티폴링 카운트
            rssi_threshold: 신뢰할 수 있는 RSSI 임계값 (기본: -55dBm)
            max_cycle_length: 최대 사이클 기록 길이 (기본: 10)
            removal_threshold: 제거 조건 (기본: 4)
            consecutive_miss_threshold: 연속 미감지 임계값 (확신->의심 변경, 기본: 3)
            polling_timeout: 폴링 타임아웃 (초, 기본: 10.0)
        """
        self.sensor_ports = sensor_ports
        self.polling_count = polling_count
        self.rssi_threshold = rssi_threshold
        self.readers: List[RFIDReader] = []
        self.sensor_results: Dict[str, SensorResult] = {}  # 성능 최적화: O(1) 조회
        self.cycle_number = 0
        self.is_running = False
        self.max_cycle_length = max_cycle_length  # 최대 사이클 기록 길이
        self.removal_threshold = removal_threshold  # 제거 조건, 기본 4
        self.consecutive_miss_threshold = (
            consecutive_miss_threshold  # 연속 미감지 임계값 추가
        )
        self.polling_timeout = polling_timeout  # 폴링 타임아웃 (초)

        # 신뢰도 기반 태그 관리
        self.tag_histories: Dict[str, TagHistory] = {}  # 태그별 히스토리
        self.cycle_qualified_tags: List[Set[str]] = []  # 최근 사이클별 유효 태그 기록

        # 동기화를 위한 락과 이벤트
        self.results_lock = threading.Lock()
        self.completion_events: Dict[str, threading.Event] = {}  # 센서별 완료 이벤트

        # 로거 설정
        self.logger = logging.getLogger("MultiSensorManager")
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

        # 센서 초기화
        self._initialize_sensors()

    def _initialize_sensors(self):
        """센서들을 초기화합니다"""
        self.readers.clear()
        self.sensor_results.clear()

        for i, port in enumerate(self.sensor_ports):
            # RFID 리더 생성
            reader_id = f"Sensor-{i+1}"
            reader = RFIDReader(port, reader_id=reader_id)

            # 옵저버 등록 (이벤트 기반 모니터링)
            reader.add_observer(self)

            self.readers.append(reader)

            # 결과 저장용 객체 생성 - 딕셔너리에 sensor_id를 키로 저장
            sensor_result = SensorResult(sensor_id=reader_id, port=port)
            self.sensor_results[reader_id] = sensor_result

        self.logger.info(f"{len(self.sensor_ports)}개 센서 초기화 완료")

    def on_sensor_event(self, event_type: str, sensor_id: str, data=None) -> None:
        """센서 이벤트 처리 (옵저버 패턴 구현)"""
        try:
            if event_type == SensorEvent.STARTED:
                self.logger.debug(f"{sensor_id} 폴링 시작됨")

            elif event_type == SensorEvent.COMPLETED:
                # 완료 이벤트 설정 (이벤트 기반 동기화)
                if sensor_id in self.completion_events:
                    self.completion_events[sensor_id].set()

                if data:
                    total_tags = data.get("total_tags", 0)
                    reason = data.get("completion_reason", "unknown")
                    self.logger.info(
                        f"{sensor_id} 폴링 완료 - {total_tags}개 태그, 원인: {reason}"
                    )

            elif event_type == SensorEvent.TAG_DETECTED:
                if data:
                    tag_id = data.get("tag_id", "unknown")
                    tag_count = data.get("tag_count", 0)
                    rssi = data.get("rssi", -100)  # RSSI 정보 추출

                    # 해당 센서의 결과에 태그 저장 - O(1) 직접 접근
                    with self.results_lock:
                        if sensor_id in self.sensor_results:
                            result = self.sensor_results[sensor_id]
                            # 모든 태그 저장 (RSSI 정보 포함)
                            result.detected_tags.add(tag_id)
                            result.tag_rssi_map[tag_id] = rssi
                            result.tag_count = len(result.detected_tags)

                            # RSSI 임계값 이상인 태그만 별도 관리
                            if rssi >= self.rssi_threshold:
                                result.qualified_tags.add(tag_id)
                                result.qualified_count = len(result.qualified_tags)
                                self.logger.debug(
                                    f"{sensor_id}: 품질 태그 감지 #{result.qualified_count} - {tag_id} (RSSI: {rssi})"
                                )
                            else:
                                self.logger.debug(
                                    f"{sensor_id}: 저품질 태그 감지 - {tag_id} (RSSI: {rssi} < {self.rssi_threshold})"
                                )

                    self.logger.debug(
                        f"{sensor_id} 실시간 태그 감지: #{tag_count} - {tag_id} (RSSI: {rssi})"
                    )

            elif event_type == SensorEvent.ERROR:
                error_msg = data if isinstance(data, str) else "알 수 없는 오류"
                self.logger.warning(f"{sensor_id} 오류 발생: {error_msg}")

            elif event_type == SensorEvent.CONNECTION_LOST:
                self.logger.warning(f"{sensor_id} 연결 끊어짐")

            elif event_type == SensorEvent.CONNECTION_RESTORED:
                self.logger.info(f"{sensor_id} 연결 복구됨")

        except KeyError as e:
            self.logger.error(f"센서 ID 오류 ({sensor_id}, {event_type}): {e}")
        except (AttributeError, TypeError) as e:
            self.logger.error(f"데이터 타입 오류 ({sensor_id}, {event_type}): {e}")
        except Exception as e:
            self.logger.error(
                f"예상치 못한 이벤트 처리 오류 ({sensor_id}, {event_type}): {e}"
            )

    def start_cycle(self) -> SmartCycleResult:
        """한 사이클의 폴링을 시작하고 결과를 반환합니다"""
        with self.results_lock:
            if self.is_running:
                raise RuntimeError("이미 사이클이 실행 중입니다")
            self.is_running = True
            self.cycle_number += 1

        cycle_start_time = datetime.now()

        # 센서 결과 초기화
        for result in self.sensor_results.values():
            result.detected_tags.clear()
            result.tag_rssi_map.clear()
            result.qualified_tags.clear()
            result.tag_count = 0
            result.qualified_count = 0
            result.start_time = None
            result.end_time = None
            result.duration_ms = None
            result.status = "waiting"

        self.logger.info(
            f"=== 사이클 #{self.cycle_number} 시작 ({len(self.readers)}개 센서, {self.polling_count} count) ==="
        )

        # 센서를 순차적으로 실행 (간섭 방지)
        for i, reader in enumerate(self.readers):
            reader_id = f"Sensor-{i+1}"
            self.logger.info(f"{reader_id} 폴링 시작...")
            self._run_sensor_polling(reader_id, reader)
            self.logger.info(f"{reader_id} 폴링 완료")

        cycle_end_time = datetime.now()
        cycle_duration = (cycle_end_time - cycle_start_time).total_seconds() * 1000

        # 결과 종합 (신뢰도 기반)
        cycle_result = self._compile_smart_cycle_results(
            cycle_start_time, cycle_end_time, cycle_duration
        )

        with self.results_lock:
            self.is_running = False

        self.logger.info(f"=== 사이클 #{self.cycle_number} 완료 ===")
        self._log_smart_cycle_summary(cycle_result)

        return cycle_result

    def _run_sensor_polling(self, sensor_id: str, reader: RFIDReader):
        """개별 센서의 폴링을 실행합니다 (순차 실행)"""
        try:
            result = self.sensor_results[sensor_id]
            result.status = "running"
            result.start_time = datetime.now()

            # 완료 이벤트 준비 (이벤트 기반 동기화)
            completion_event = threading.Event()
            self.completion_events[result.sensor_id] = completion_event

            # 멀티폴링 시작
            success = reader.start_reading("multiple", count=self.polling_count)

            if not success:
                result.status = "error"
                self.logger.error(f"{result.sensor_id}: 폴링 시작 실패")
                return

            # 이벤트 기반 완료 대기 - Reader의 스레드 구현을 몰라도 됨!
            completed = completion_event.wait(timeout=self.polling_timeout)

            if not completed:
                self.logger.warning(
                    f"{result.sensor_id}: {self.polling_timeout}초 타임아웃 - 강제 종료"
                )
                result.status = "timeout"
                return

            # 완료 처리
            result.end_time = datetime.now()
            result.status = "completed"

            if result.start_time:
                duration = (result.end_time - result.start_time).total_seconds() * 1000
                result.duration_ms = duration

            self.logger.info(
                f"{result.sensor_id} 완료: {result.tag_count}개 태그, "
                f"{result.duration_ms:.1f}ms"
            )

        except Exception as e:
            self.logger.error(f"{sensor_id}: 폴링 오류 - {e}")
            self.sensor_results[sensor_id].status = "error"
        finally:
            # 완료 이벤트 정리
            if sensor_id in self.completion_events:
                del self.completion_events[sensor_id]

            # 캡슐화된 정리 메서드 사용 - 간단하고 안전!
            cleanup_success = reader.stop_reading_and_cleanup()
            if not cleanup_success:
                self.logger.warning(f"{sensor_id} 리소스 정리 실패")

    def _compile_smart_cycle_results(
        self, start_time: datetime, end_time: datetime, duration: float
    ) -> SmartCycleResult:
        """신뢰도 기반 사이클 결과를 종합합니다"""

        # 1. 이번 사이클에서 RSSI 품질을 만족하는 태그들 수집
        current_qualified_tags = set()
        all_unique_tags = set()

        for result in self.sensor_results.values():
            # 모든 태그 (품질 무관)
            all_unique_tags.update(result.detected_tags)
            # 품질 좋은 태그만
            current_qualified_tags.update(result.qualified_tags)

        # 2. 사이클별 품질 태그 기록 업데이트
        self.cycle_qualified_tags.append(current_qualified_tags.copy())
        # 최대 사이클 기록 길이만큼 유지
        if len(self.cycle_qualified_tags) > self.max_cycle_length:
            self.cycle_qualified_tags.pop(0)

        # 3. 태그 히스토리 업데이트 및 상태 분류 (관성 기반)
        confirmed_tags = set()
        suspected_tags = set()
        removed_tags = set()
        new_tags = set()

        # 기존 태그들 상태 업데이트 (관성 로직 적용)
        for tag_id, history in self.tag_histories.items():
            detected_this_cycle = tag_id in current_qualified_tags

            # RSSI 정보 수집
            rssi = None
            if detected_this_cycle:
                for result in self.sensor_results.values():
                    if tag_id in result.tag_rssi_map:
                        rssi = result.tag_rssi_map[tag_id]
                        break

            # 히스토리 업데이트 (연속 미감지 카운터 포함)
            history.update_detection(self.cycle_number, detected_this_cycle, rssi)

            # 관성 기반 상태 분류
            if detected_this_cycle:
                # 감지된 경우: 확신 상태로 즉시 복귀 (빠른 복구)
                history.status = TagStatus.CONFIRMED
                confirmed_tags.add(tag_id)
            elif history.status == TagStatus.CONFIRMED:
                # 확신 상태에서 미감지: 연속 미감지 임계값 확인 (관성 적용)
                if history.should_transition_to_suspected():
                    history.status = TagStatus.SUSPECTED
                    suspected_tags.add(tag_id)
                else:
                    # 아직 임계값에 도달하지 않음: 확신 상태 유지
                    confirmed_tags.add(tag_id)
            elif history.status == TagStatus.SUSPECTED:
                # 의심 상태에서 계속 미감지: 신뢰도 기반 제거 판단
                if history.should_be_removed():
                    history.status = TagStatus.REMOVED
                    removed_tags.add(tag_id)
                else:
                    # 여전히 의심 상태 유지
                    suspected_tags.add(tag_id)

        # 4. 새로운 태그들 추가
        for tag_id in current_qualified_tags:
            if tag_id not in self.tag_histories:
                # 새 태그 발견
                rssi = None
                for result in self.sensor_results.values():
                    if tag_id in result.tag_rssi_map:
                        rssi = result.tag_rssi_map[tag_id]
                        break

                history = TagHistory(
                    tag_id=tag_id,
                    first_detection_cycle=self.cycle_number,
                    last_detection_cycle=self.cycle_number,
                    history_max_length=self.max_cycle_length,
                    removal_threshold=self.removal_threshold,
                    consecutive_miss_threshold=self.consecutive_miss_threshold,  # 관성 설정 추가
                )
                history.update_detection(self.cycle_number, True, rssi)
                self.tag_histories[tag_id] = history

                new_tags.add(tag_id)
                confirmed_tags.add(tag_id)

        # 5. 제거된 태그들 정리 및 메모리 최적화
        for tag_id in removed_tags:
            if tag_id in self.tag_histories:
                del self.tag_histories[tag_id]

        # 태그 히스토리 크기 제한 (메모리 누수 방지)
        max_histories = len(self.sensor_ports) * 100  # 센서당 최대 100개 태그
        if len(self.tag_histories) > max_histories:
            # 가장 오래된 태그들 제거
            oldest_tags = sorted(
                self.tag_histories.items(), key=lambda x: x[1].last_detection_cycle
            )[: len(self.tag_histories) - max_histories]

            for tag_id, _ in oldest_tags:
                del self.tag_histories[tag_id]
                self.logger.debug(
                    f"메모리 최적화: 오래된 태그 히스토리 제거 - {tag_id}"
                )

        # 6. 결과 객체 생성
        smart_result = SmartCycleResult(
            cycle_number=self.cycle_number,
            sensor_results=list(self.sensor_results.values()),
            total_unique_tags=all_unique_tags,
            total_tag_count=len(all_unique_tags),
            confirmed_tags=confirmed_tags,
            suspected_tags=suspected_tags,
            removed_tags=removed_tags,
            new_tags=new_tags,
            rssi_filtered_tags=current_qualified_tags,
            total_rssi_qualified_count=len(current_qualified_tags),
            cycle_start_time=start_time,
            cycle_end_time=end_time,
            cycle_duration_ms=duration,
        )

        return smart_result

    def _log_smart_cycle_summary(self, cycle_result: SmartCycleResult):
        """신뢰도 기반 사이클 결과 요약을 로그에 출력합니다"""
        self.logger.info(f"사이클 #{cycle_result.cycle_number} 결과:")
        self.logger.info(f"  전체 소요시간: {cycle_result.cycle_duration_ms:.1f}ms")
        self.logger.info(
            f"  전체 태그: {cycle_result.total_tag_count}개 (품질: {cycle_result.total_rssi_qualified_count}개)"
        )

        # 신뢰도 기반 분류 결과
        self.logger.info(f"  🟢 확신 태그: {len(cycle_result.confirmed_tags)}개")
        self.logger.info(f"  🟡 의심 태그: {len(cycle_result.suspected_tags)}개")
        self.logger.info(f"  🆕 신규 태그: {len(cycle_result.new_tags)}개")
        if cycle_result.removed_tags:
            self.logger.info(f"  🔴 제거 태그: {len(cycle_result.removed_tags)}개")

        # 센서별 상세 정보
        for result in cycle_result.sensor_results:
            self.logger.info(
                f"  {result.sensor_id}: {result.qualified_count}/{result.tag_count}개 품질태그, "
                f"{result.duration_ms:.1f}ms, 상태: {result.status}"
            )

        # 확신 태그 상세 정보
        if cycle_result.confirmed_tags:
            self.logger.info(f"  🟢 확신 태그 상세 정보:")
            for tag_id in sorted(list(cycle_result.confirmed_tags)):
                # 현재 사이클에서의 RSSI 정보 수집
                current_rssi = None
                for result in cycle_result.sensor_results:
                    if tag_id in result.tag_rssi_map:
                        current_rssi = result.tag_rssi_map[tag_id]
                        break

                # 태그 히스토리에서 신뢰도 정보 가져오기
                history = self.tag_histories.get(tag_id)
                confidence = history.confidence_score if history else 0.0

                # 개선된 신뢰도 정보 표시
                confidence_display = f"{confidence:.3f}"
                if history and len(history.rssi_history) > 0:
                    avg_rssi = sum(history.rssi_history) / len(history.rssi_history)
                    confidence_display += f" (평균RSSI: {avg_rssi:.1f}dBm)"

                # 모든 리더에서 EPC 정보 파싱 시도
                epc_parsed = False
                for reader in self.readers:
                    try:
                        epc_summary = reader.get_epc_summary(tag_id)
                        self.logger.info(
                            f"    📋 {tag_id} (RSSI: {current_rssi}dBm, 신뢰도: {confidence_display})"
                        )
                        self.logger.info(f"       {epc_summary}")
                        epc_parsed = True
                        break  # 성공하면 중단
                    except Exception:
                        continue  # 실패하면 다음 리더 시도

                # 모든 리더에서 파싱 실패한 경우
                if not epc_parsed:
                    self.logger.info(
                        f"    📋 {tag_id} (RSSI: {current_rssi}dBm, 신뢰도: {confidence_display}) - EPC 파싱 불가"
                    )

        # 의심 태그 상세 정보
        if cycle_result.suspected_tags:
            self.logger.info(f"  🟡 의심 태그 상세 정보:")
            for tag_id in sorted(list(cycle_result.suspected_tags)):
                # 태그 히스토리에서 정보 가져오기
                history = self.tag_histories.get(tag_id)
                if history:
                    last_rssi = (
                        history.rssi_history[-1]
                        if history.rssi_history
                        else "알 수 없음"
                    )
                    confidence = history.confidence_score
                    last_cycle = history.last_detection_cycle
                    consecutive_misses = history.consecutive_misses

                    # 개선된 신뢰도 정보 표시
                    confidence_display = f"{confidence:.3f}"
                    if len(history.rssi_history) > 0:
                        avg_rssi = sum(history.rssi_history) / len(history.rssi_history)
                        confidence_display += f" (평균RSSI: {avg_rssi:.1f}dBm)"

                    # 모든 리더에서 EPC 정보 파싱 시도
                    epc_parsed = False
                    for reader in self.readers:
                        try:
                            epc_summary = reader.get_epc_summary(tag_id)
                            self.logger.info(
                                f"    ⚠️  {tag_id} (마지막 RSSI: {last_rssi}dBm, 신뢰도: {confidence_display}, "
                                f"마지막 감지: 사이클#{last_cycle}, 연속 미감지: {consecutive_misses}회)"
                            )
                            self.logger.info(f"       {epc_summary}")
                            epc_parsed = True
                            break  # 성공하면 중단
                        except Exception:
                            continue  # 실패하면 다음 리더 시도

                    # 모든 리더에서 파싱 실패한 경우
                    if not epc_parsed:
                        self.logger.info(
                            f"    ⚠️  {tag_id} (마지막 RSSI: {last_rssi}dBm, 신뢰도: {confidence_display}, "
                            f"마지막 감지: 사이클#{last_cycle}, 연속 미감지: {consecutive_misses}회) - EPC 파싱 불가"
                        )

        # 신규/제거 태그는 간단히 표시
        if cycle_result.new_tags:
            new_tags_sorted = sorted(cycle_result.new_tags)
            self.logger.info(f"  🆕 신규 태그들: {new_tags_sorted}")
        if cycle_result.removed_tags:
            removed_tags_sorted = sorted(cycle_result.removed_tags)
            self.logger.info(f"  🔴 제거 태그들: {removed_tags_sorted}")

    def run_multiple_cycles(self, num_cycles: int) -> List[SmartCycleResult]:
        """여러 사이클을 연속으로 실행합니다"""
        results = []

        self.logger.info(
            f"총 {num_cycles}개 사이클 실행 시작 (RSSI >= {self.rssi_threshold}dBm 필터링)"
        )

        for cycle in range(num_cycles):
            try:
                result = self.start_cycle()
                results.append(result)

            except Exception as e:
                self.logger.error(f"사이클 {cycle + 1} 실행 중 오류: {e}")
                break

        self.logger.info(f"전체 {len(results)}개 사이클 완료")
        self._log_final_summary(results)
        return results

    def _log_final_summary(self, results: List[SmartCycleResult]):
        """최종 전체 결과 요약"""
        if not results:
            return

        total_confirmed = set()
        total_removed = set()

        for result in results:
            total_confirmed.update(result.confirmed_tags)
            total_removed.update(result.removed_tags)

        self.logger.info(f"\n=== 최종 태그 상태 요약 ===")
        self.logger.info(f"현재 활성 히스토리: {len(self.tag_histories)}개 태그")
        self.logger.info(f"누적 확신 태그: {len(total_confirmed)}개")
        self.logger.info(f"누적 제거 태그: {len(total_removed)}개")

        # 현재 상태별 태그 분류
        current_confirmed = set()
        current_suspected = set()

        for tag_id, history in self.tag_histories.items():
            if history.status == TagStatus.CONFIRMED:
                current_confirmed.add(tag_id)
            elif history.status == TagStatus.SUSPECTED:
                current_suspected.add(tag_id)

        self.logger.info(f"현재 확신 상태: {len(current_confirmed)}개")
        self.logger.info(f"현재 의심 상태: {len(current_suspected)}개")

        if current_confirmed:
            self.logger.info(f"확신 태그들: {sorted(list(current_confirmed))}")
        if current_suspected:
            self.logger.info(f"의심 태그들: {sorted(list(current_suspected))}")

    def get_sensor_status(self) -> Dict:
        """현재 센서 상태를 반환합니다"""
        with self.results_lock:
            is_running = self.is_running
            cycle_number = self.cycle_number

        status_list = [
            {
                "sensor_id": result.sensor_id,
                "port": result.port,
                "status": result.status,
                "tag_count": result.tag_count,
                "detected_tags": list(result.detected_tags),
            }
            for result in self.sensor_results.values()
        ]

        # 전체 상태 정보 추가
        return {
            "is_running": is_running,
            "cycle_number": cycle_number,
            "sensors": status_list,
        }

    def cleanup(self):
        """리소스 정리 - 모든 센서의 스레드와 포트를 확실히 해제"""
        self.logger.info("다중 센서 매니저 정리 시작...")

        for i, reader in enumerate(self.readers):
            try:
                # 캡슐화된 정리 메서드 사용 - 단순하고 안전!
                cleanup_success = reader.stop_reading_and_cleanup()
                if not cleanup_success:
                    self.logger.warning(f"센서 {i} 리소스 정리 실패")
            except Exception as e:
                self.logger.error(f"센서 {i} 정리 중 오류: {e}")

        # 추가 안전 대기 (포트 완전 해제 보장)
        time.sleep(0.3)

        self.logger.info("다중 센서 매니저 정리 완료")


# 사용 예시
if __name__ == "__main__":
    # 센서 포트 설정 (실제 환경에 맞게 수정)
    sensor_ports = ["COM8", "COM10"]

    # 매니저 생성 (30 count 멀티폴링, RSSI >= -55dBm 필터링, 관성 적용)
    manager = MultiSensorManager(
        sensor_ports,
        polling_count=30,
        rssi_threshold=-55,
        max_cycle_length=10,
        removal_threshold=4,
        consecutive_miss_threshold=3,  # 연속 3회 미감지 시 의심 상태로 변경
        polling_timeout=12.0,  # 센서별 12초 타임아웃
    )

    try:
        # 여러 사이클 실행
        results = manager.run_multiple_cycles(15)

        print(f"\n=== 최종 결과 ===")
        for result in results:
            print(f"사이클 #{result.cycle_number}:")
            print(
                f"  전체 태그: {result.total_tag_count}개 (품질: {result.total_rssi_qualified_count}개)"
            )
            print(
                f"  확신: {len(result.confirmed_tags)}개, 의심: {len(result.suspected_tags)}개, 신규: {len(result.new_tags)}개"
            )
            print(f"  전체 소요시간: {result.cycle_duration_ms:.1f}ms")
            for sensor in result.sensor_results:
                print(
                    f"  {sensor.sensor_id}: {sensor.qualified_count}/{sensor.tag_count}개 품질태그, "
                    f"{sensor.duration_ms:.1f}ms, 상태: {sensor.status}"
                )
            print("-" * 50)

    except KeyboardInterrupt:
        print("\n사용자 중단")
    except Exception as e:
        print(f"오류 발생: {e}")
    finally:
        manager.cleanup()
