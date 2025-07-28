#!/usr/bin/env python3
"""
YRM100 communication protocol handler
"""

import logging
from typing import Optional, Dict, Any

from rfid_system.config.constants import YRM100Constants
from rfid_system.models.tag_models import TagInfo


class YRM100Protocol:
    """YRM100 communication protocol handler class"""

    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def calculate_checksum(self, data: bytes) -> int:
        """
        Calculate YRM100 checksum (LSB of the sum from Type to Parameter)

        Args:
            data (bytes): Data to calculate checksum for

        Returns:
            int: Checksum value
        """
        return sum(data) & 0xFF

    def create_command_frame(
        self, command: int, parameters: Optional[bytes] = None
    ) -> bytes:
        """
        Create YRM100 command frame

        Args:
            command (int): Command code
            parameters (bytes): Parameters (optional)

        Returns:
            bytes: Completed command frame
        """
        frame_type = YRM100Constants.FRAME_TYPE_COMMAND

        if parameters is None:
            parameters = b""

        # Parameter length (MSB, LSB)
        param_len = len(parameters)
        pl_msb = (param_len >> 8) & 0xFF
        pl_lsb = param_len & 0xFF

        # Data for checksum calculation (from Type to Parameter)
        checksum_data = bytes([frame_type, command, pl_msb, pl_lsb]) + parameters
        checksum = self.calculate_checksum(checksum_data)

        # Completed frame
        frame = (
            bytes([YRM100Constants.FRAME_HEADER, frame_type, command, pl_msb, pl_lsb])
            + parameters
            + bytes([checksum, YRM100Constants.FRAME_END])
        )

        return frame

    def create_single_polling_command(self) -> bytes:
        """
        Create single polling command frame
        Header: BB, Type: 00, Command: 22, PL: 00 00, Checksum: 22, End: 7E
        """
        return self.create_command_frame(YRM100Constants.CMD_SINGLE_POLLING)

    def create_multiple_polling_command(
        self, count: int = YRM100Constants.DEFAULT_MULTIPLE_POLLING_COUNT
    ) -> bytes:
        """
        Create multiple polling command frame
        Header: BB, Type: 00, Command: 27, PL: 00 03, Reserved: 22, CNT: 27 10, Checksum: 83, End: 7E
        """
        # Parameters: Reserved(1) + CNT(2)
        parameters = bytes(
            [YRM100Constants.RESERVED_BYTE, (count >> 8) & 0xFF, count & 0xFF]
        )
        return self.create_command_frame(
            YRM100Constants.CMD_MULTIPLE_POLLING, parameters
        )

    def create_stop_polling_command(self) -> bytes:
        """
        Create stop polling command frame
        Header: BB, Type: 00, Command: 28, PL: 00 00, Checksum: 28, End: 7E
        """
        return self.create_command_frame(YRM100Constants.CMD_STOP_POLLING)

    def create_set_transmitting_power_command(self, power_dbm: int = 26) -> bytes:
        """
        Create set transmitting power command frame
        Header: BB, Type: 00, Command: B6, PL: 00 02, POW_MSB: 07, POW_LSB: D0, Checksum: 8F, End: 7E

        Args:
            power_dbm: Transmitting power (dBm) - default 26dBm = 0x07D0
        """
        # 26dBm = 0x07D0 (2000 in decimal, 0x07D0 = 2000 = 20dBm)
        # According to manual, 0x07D0 = 2000 = 20dBm, so 26dBm needs a higher value
        power_value = 2000 + (power_dbm - 20) * 100  # Approximate calculation
        power_msb = (power_value >> 8) & 0xFF
        power_lsb = power_value & 0xFF

        parameters = bytes([power_msb, power_lsb])
        return self.create_command_frame(
            YRM100Constants.CMD_SET_TRANSMITTING_POWER, parameters
        )

    def create_set_frequency_hopping_command(self, enable: bool = True) -> bytes:
        """
        Create frequency hopping mode setting command frame
        Header: BB, Type: 00, Command: AD, PL: 00 01, Parameter: FF, Checksum: AD, End: 7E

        Args:
            enable: True=Enable(FF), False=Disable(00)
        """
        parameter = 0xFF if enable else 0x00
        parameters = bytes([parameter])
        return self.create_command_frame(
            YRM100Constants.CMD_SET_FREQUENCY_HOPPING, parameters
        )

    def create_set_work_area_command(self, region: str = "Korea") -> bytes:
        """
        Create work area setting command frame
        Header: BB, Type: 00, Command: 07, PL: 00 01, Region: 06, Checksum: 09, End: 7E

        Args:
            region: Region setting ("Korea", "China_900MHz", "China_800MHz", "US", "EU")
        """
        region_codes = {
            "China_900MHz": 0x01,
            "China_800MHz": 0x04,
            "US": 0x02,
            "EU": 0x03,
            "Korea": 0x06,
        }

        region_code = region_codes.get(region, 0x06)  # Default: Korea
        parameters = bytes([region_code])
        return self.create_command_frame(YRM100Constants.CMD_SET_WORK_AREA, parameters)

    def get_error_message(self, error_code: int) -> str:
        """Convert YRM100 error code to message"""
        error_messages = {
            YRM100Constants.ERROR_SUCCESS: "Success",
            YRM100Constants.ERROR_CRC_OR_NO_TAG: "CRC error or no tag",
            YRM100Constants.ERROR_COMMAND_PARAM: "Command parameter error",
            YRM100Constants.ERROR_READ_WRITE: "Read/write error",
            YRM100Constants.ERROR_TAG_READ_FAIL: "Tag read failure",
        }
        return error_messages.get(error_code, f"Unknown error: 0x{error_code:02X}")

    def parse_notification_frame(self, data: bytes) -> Optional[TagInfo]:
        """
        Parse Notification Frame (tag detection notification)
        Structure: BB 02 22 00 11 RSSI PC(2) EPC(12) CRC(2) Checksum 7E
        """
        try:
            if len(data) < 19:  # Minimum notification frame length
                self.logger.warning(
                    f"Notification frame too short: {len(data)} bytes"
                )
                return None

            # Extract length information
            pl_msb = data[3]
            pl_lsb = data[4]
            payload_len = (pl_msb << 8) | pl_lsb

            if len(data) < 7 + payload_len:
                self.logger.warning(f"Incomplete notification frame")
                return None

            # Extract data
            rssi = data[5]  # RSSI
            pc_msb = data[6]  # PC MSB
            pc_lsb = data[7]  # PC LSB

            # Calculate EPC length from PC (upper 5 bits of PC is EPC word count)
            epc_words = (pc_msb >> 3) & 0x1F
            epc_bytes = epc_words * 2

            if len(data) < 8 + epc_bytes + 2:  # EPC + CRC
                self.logger.warning(f"Insufficient EPC data")
                return None

            # Extract EPC data
            epc_data = data[8 : 8 + epc_bytes]
            raw_tag_id = epc_data.hex().upper()

            # Extract CRC
            crc_msb = data[8 + epc_bytes]
            crc_lsb = data[8 + epc_bytes + 1]
            crc = (crc_msb << 8) | crc_lsb

            # Create TagInfo object
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
            self.logger.error(f"Notification frame parsing error: {e}")
            return None

    def parse_response_frame(self, data: bytes) -> bool:
        """
        Parse Response Frame (command response)

        Returns:
            bool: Whether the response is successful
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

                # Check error code
                if parameter != YRM100Constants.ERROR_SUCCESS:
                    error_msg = self.get_error_message(parameter)
                    self.logger.warning(
                        f"Command 0x{command:02X} response error: 0x{parameter:02X} - {error_msg}"
                    )
                    return False
                else:
                    self.logger.debug(f"Command 0x{command:02X} successful")
                    return True

            return True

        except Exception as e:
            self.logger.error(f"Response frame parsing error: {e}")
            return False 