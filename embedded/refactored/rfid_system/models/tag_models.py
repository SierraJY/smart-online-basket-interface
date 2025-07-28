#!/usr/bin/env python3
"""
Data models for RFID tags
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Set
from datetime import datetime
from collections import deque

from rfid_system.config.constants import TagStatus


@dataclass
class EPCTag:
    """96-bit EPC tag data structure"""
    product_code: str
    product_name: str
    timestamp_ms: int
    sequence_num: int
    readable_time: str
    is_valid: bool


@dataclass
class TagInfo:
    """Tag information data structure"""
    raw_tag_id: str
    epc_info: Optional[EPCTag]
    data_length: int
    is_96bit_epc: bool
    rssi: int
    pc: int
    crc: int


@dataclass
class TagHistory:
    """Tag reliability history management"""
    tag_id: str
    history_max_length: int = 10  # Maximum history length, default 10
    removal_threshold: int = 4  # Removal condition, default 4
    consecutive_miss_threshold: int = 3  # Consecutive miss threshold (confirmed->suspected condition)
    status: str = TagStatus.CONFIRMED  # confirmed, suspected, removed
    detection_history: deque = field(init=False)
    rssi_history: deque = field(init=False)
    last_detection_cycle: int = 0
    first_detection_cycle: int = 0
    confidence_score: float = 1.0
    consecutive_misses: int = 0  # Consecutive miss counter (inertia)

    def __post_init__(self):
        """Initialize history deques after initialization"""
        self.detection_history = deque(maxlen=self.history_max_length)
        self.rssi_history = deque(maxlen=self.history_max_length)

    def update_detection(
        self, cycle_number: int, detected: bool, rssi: Optional[int] = None
    ):
        """Update detection status (inertia-based, RSSI score reflection)"""
        # Keep boolean history for compatibility
        self.detection_history.append(detected)

        if detected:
            # If detected: Reset consecutive miss counter
            self.consecutive_misses = 0
            self.last_detection_cycle = cycle_number
            if rssi is not None:
                self.rssi_history.append(rssi)
        else:
            # If not detected: Increment consecutive miss counter
            self.consecutive_misses += 1
            # Add very low value to RSSI history even when not detected (time sync)
            self.rssi_history.append(-100)  # Default value when not detected

        # Calculate improved confidence score (time-weighted + RSSI score)
        self._calculate_enhanced_confidence()

    def _calculate_confidence(self):
        """Calculate confidence score (detection ratio based) - kept for compatibility"""
        if not self.detection_history:
            self.confidence_score = 0.0
            return

        self.confidence_score = sum(self.detection_history) / len(
            self.detection_history
        )

    def _calculate_enhanced_confidence(self):
        """Calculate improved confidence score (time-weighted average + RSSI score reflection)"""
        if not self.detection_history:
            self.confidence_score = 0.0
            return

        # 1. RSSI score function
        def rssi_to_score(rssi_value: int, detected: bool) -> float:
            """Convert RSSI value to 0.0~1.0 score"""
            if not detected:
                return 0.0

            # RSSI range score mapping (-100dBm ~ -30dBm)
            # -30dBm(very strong) = 1.0, -55dBm(good) = 0.7, -70dBm(weak) = 0.3, -100dBm(very weak) = 0.1
            if rssi_value >= -30:
                return 1.0
            elif rssi_value >= -45:
                return 0.9
            elif rssi_value >= -55:
                return 0.7  # Existing threshold
            elif rssi_value >= -65:
                return 0.5
            elif rssi_value >= -75:
                return 0.3
            elif rssi_value >= -85:
                return 0.2
            else:
                return 0.1  # Minimum score even for very weak signals

        # 2. Calculate time weights (higher weight for more recent)
        history_length = len(self.detection_history)
        time_weights = []

        # Exponential weights: latest = 1.0, previous = 0.8, 0.6, 0.4, 0.2...
        for i in range(history_length):
            age = history_length - 1 - i  # 0(latest) ~ n-1(oldest)
            weight = 0.8**age  # Exponential decrease
            time_weights.append(weight)

        # 3. Combine RSSI scores and time weights for confidence calculation
        weighted_sum = 0.0
        total_weight = 0.0

        for i, (detected, weight) in enumerate(
            zip(self.detection_history, time_weights)
        ):
            # Calculate RSSI score
            rssi_value = -100  # Default value
            if i < len(self.rssi_history):
                rssi_value = self.rssi_history[i]

            rssi_score = rssi_to_score(rssi_value, detected)

            # Accumulate weighted score
            weighted_sum += rssi_score * weight
            total_weight += weight

        # Calculate final confidence
        if total_weight > 0:
            self.confidence_score = weighted_sum / total_weight
        else:
            self.confidence_score = 0.0

        # Limit confidence range (0.0 ~ 1.0)
        self.confidence_score = max(0.0, min(1.0, self.confidence_score))

    def should_transition_to_suspected(self) -> bool:
        """Check if should transition from confirmed to suspected state (apply inertia)"""
        return self.consecutive_misses >= self.consecutive_miss_threshold

    def should_be_removed(self) -> bool:
        """Check removal condition: improved confidence-based judgment consistent with inertia logic"""
        # Maintain consistency with inertia logic: only consider removal in suspected state
        if self.status != TagStatus.SUSPECTED:
            return False

        # Improved confidence-based removal judgment (use low threshold in 0.0~1.0 range)
        # Original: removal_threshold(4) / history_max_length(10) = 0.4
        # Improved: Adjusted to lower threshold (0.25 = 25%)
        enhanced_removal_threshold = 0.25

        return self.confidence_score < enhanced_removal_threshold 