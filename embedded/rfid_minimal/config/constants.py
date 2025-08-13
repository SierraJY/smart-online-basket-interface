"""
Constants for RFID Minimal
"""

from enum import Enum, auto

class PollingMode(Enum):
    """Polling mode enumeration"""
    MULTIPLE = auto()

class TagStatus(Enum):
    """Tag status enumeration"""
    DETECTED = auto()
    NOT_DETECTED = auto()

# YRM100 Constants
# Align with manager's default polling timeout (0.5s) so reader threads end naturally
NO_RESPONSE_TIMEOUT = 0.5  # Consider polling complete if no response for 0.5 seconds
THREAD_JOIN_TIMEOUT = 2.0  # Wait up to 2 seconds for thread to join
RECONNECT_DELAY = 1.0      # Wait 1 second before reconnection attempt

# Frame constants - YRM100 protocol
FRAME_HEADER = 0xBB  # Frame header byte
FRAME_END = 0x7E     # Frame end byte

# Frame types
FRAME_TYPE_COMMAND = 0x00
FRAME_TYPE_RESPONSE = 0x01
FRAME_TYPE_NOTIFICATION = 0x02

# Command codes
CMD_SINGLE_POLLING = 0x22
CMD_MULTIPLE_POLLING = 0x27
CMD_STOP_MULTIPLE_POLLING = 0x28
CMD_SET_TRANSMITTING_POWER = 0xB6  # Parameter: 2 bytes (power value)
CMD_SET_FREQUENCY_HOPPING = 0xAD   # Parameter: 1 byte (0xFF=enable, 0x00=disable)
CMD_SET_WORK_AREA = 0x07           # Parameter: 1 byte (region code)
CMD_SET_WORKING_CHANNEL = 0xAB     # Parameter: 1 byte (channel index)

# Response codes
RESP_MULTIPLE_POLLING = 0x28
RESP_TAG_NOTIFICATION = 0x29

# Protocol Constants
MIN_FRAME_LENGTH = 7
DEFAULT_MULTIPLE_POLLING_COUNT = 0x2710  # 10000 (decimal)
RESERVED_BYTE = 0x22