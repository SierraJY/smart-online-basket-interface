#!/usr/bin/env python3
"""
EPC data processing utility
"""

import logging
from typing import Optional
from datetime import datetime

from rfid_system.models.tag_models import EPCTag


class EPCHandler:
    """EPC data processing class"""

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def parse_epc_structure(self, epc_hex: str) -> Optional[EPCTag]:
        """
        Parse 96-bit EPC into structured information

        Args:
            epc_hex (str): 24-character HEX string (12 bytes)

        Returns:
            EPCTag: Parsed EPC information or None
        """
        try:
            # Validate EPC length (24 characters HEX = 12 bytes)
            if len(epc_hex) != 24:
                self.logger.warning(
                    f"Invalid EPC length: {len(epc_hex)} characters (24 required)"
                )
                return None

            # Extract each field
            product_code = epc_hex[0:8]  # First 4 bytes (8 HEX characters)
            timestamp_hex = epc_hex[8:20]  # Next 6 bytes (12 HEX characters)
            sequence_hex = epc_hex[20:24]  # Last 2 bytes (4 HEX characters)

            # Convert timestamp to integer (milliseconds)
            timestamp_ms = int(timestamp_hex, 16)

            # Convert sequence number to integer
            sequence_num = int(sequence_hex, 16)

            # Convert timestamp to human-readable form
            try:
                timestamp_sec = timestamp_ms / 1000
                readable_time = datetime.fromtimestamp(timestamp_sec).strftime(
                    "%Y-%m-%d %H:%M:%S.%f"
                )[:-3]
            except (ValueError, OSError) as e:
                self.logger.warning(f"Timestamp conversion error: {e}")
                readable_time = "Invalid timestamp"

            # Convert product code to ASCII to generate product name
            try:
                product_name = bytes.fromhex(product_code).decode(
                    "ascii", errors="ignore"
                )
            except ValueError:
                product_name = product_code  # Use original code if conversion fails

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
            self.logger.error(f"EPC parsing error: {e}")
            return None

    def _validate_epc_fields(
        self, product_code: str, timestamp_ms: int, sequence_num: int
    ) -> bool:
        """
        Validate EPC fields

        Args:
            product_code (str): Product code
            timestamp_ms (int): Millisecond timestamp
            sequence_num (int): Sequence number

        Returns:
            bool: Validity
        """
        try:
            # Validate product code (8 HEX characters)
            if len(product_code) != 8:
                return False

            # Validate timestamp range (around 1970~2100)
            min_timestamp = 0  # 1970-01-01
            max_timestamp = 4102444800000  # 2100-01-01 (ms)
            if not (min_timestamp <= timestamp_ms <= max_timestamp):
                self.logger.warning(f"Timestamp out of range: {timestamp_ms}")
                return False

            # Validate sequence number range (0~65535)
            if not (0 <= sequence_num <= 65535):
                return False

            return True

        except Exception:
            return False

    def get_epc_summary(self, epc_hex: str) -> str:
        """
        Return summary information for an EPC

        Args:
            epc_hex (str): 24-character HEX string

        Returns:
            str: EPC summary information
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
        Check if two EPCs are from the same product batch (same millisecond)

        Args:
            epc1, epc2 (str): EPC HEX strings to compare

        Returns:
            bool: Whether they are the same batch
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