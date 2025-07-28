#!/usr/bin/env python3
"""
Constants for RFID system configuration
"""

from enum import Enum, auto


class PollingMode(Enum):
    """Polling mode"""
    SINGLE = auto()
    MULTIPLE = auto()


class TagStatus(str, Enum):
    """Tag status definition"""
    CONFIRMED = "confirmed"
    SUSPECTED = "suspected"
    REMOVED = "removed"


class YRM100Constants:
    """YRM100 protocol constants"""

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
    CMD_SET_TRANSMITTING_POWER = 0xB6  # Set transmit power
    CMD_SET_FREQUENCY_HOPPING = 0xAD  # Set frequency hopping mode
    CMD_SET_WORK_AREA = 0x07  # Set work area

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
    NO_RESPONSE_TIMEOUT = 0.5  # Time to determine multi-polling completion (seconds)
    RECONNECT_DELAY = 5.0  # Reconnection wait time (seconds)
    THREAD_JOIN_TIMEOUT = 1.0  # Thread termination wait time (seconds)
    COMMAND_RESPONSE_TIMEOUT = 0.5  # Command response wait time (seconds) 