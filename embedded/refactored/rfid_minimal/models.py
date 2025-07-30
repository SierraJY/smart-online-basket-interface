"""
Data models for RFID Minimal System
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class TagInfo:
    """
    Represents information about a detected RFID tag
    """
    raw_tag_id: str
    data_length: int
    rssi: int
    is_96bit_epc: bool = False
    pc: str = ""
    crc: str = ""
    
    @property
    def tag_id(self) -> str:
        """
        Get cleaned tag ID (alias for raw_tag_id)
        """
        return self.raw_tag_id 