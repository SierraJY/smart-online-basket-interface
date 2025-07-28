#!/usr/bin/env python3
"""
Frame processor for RFID readers
"""

import logging
from typing import Optional, Tuple, List

from rfid_system.config.constants import YRM100Constants
from rfid_system.protocols.yrm100_protocol import YRM100Protocol
from rfid_system.models.tag_models import TagInfo, EPCTag
from rfid_system.utils.epc_handler import EPCHandler


class FrameProcessor:
    """Processes frames for RFID readers"""
    
    def __init__(self, logger: logging.Logger):
        """
        Initialize frame processor
        
        Args:
            logger: Logger instance
        """
        self.logger = logger
        self.protocol = YRM100Protocol(logger)
        self.epc_handler = EPCHandler(logger)
    
    def verify_checksum(self, frame: bytes) -> bool:
        """
        Verify frame checksum
        
        Args:
            frame: Frame data
            
        Returns:
            bool: Whether checksum is valid
        """
        try:
            checksum_data = frame[1:-2]  # From Type to Payload
            expected_checksum = self.protocol.calculate_checksum(checksum_data)
            actual_checksum = frame[-2]
            return expected_checksum == actual_checksum
        except:
            return False
    
    def extract_complete_frame(
        self, buffer: bytearray, expected_command: int
    ) -> Optional[bytes]:
        """
        Extract complete response frame from buffer
        
        Args:
            buffer: Response data buffer
            expected_command: Expected command code
            
        Returns:
            bytes: Complete response frame or None
        """
        try:
            if len(buffer) < YRM100Constants.MIN_FRAME_LENGTH:
                return None

            # Find frame header efficiently
            start_idx = buffer.find(YRM100Constants.FRAME_HEADER)

            if start_idx == -1:
                buffer.clear()  # Clear entire buffer if no header
                return None

            # Remove data before frame start
            if start_idx > 0:
                del buffer[:start_idx]

            if len(buffer) < YRM100Constants.MIN_FRAME_LENGTH:
                return None

            # Check frame type and command
            frame_type = buffer[1]
            command = buffer[2]

            # Check if it's a Response Frame and the expected command
            if (
                frame_type == YRM100Constants.FRAME_TYPE_RESPONSE
                and command == expected_command
            ):
                # Extract payload length
                pl_msb = buffer[3]
                pl_lsb = buffer[4]
                payload_len = (pl_msb << 8) | pl_lsb

                # Calculate total frame length
                frame_len = 5 + payload_len + 2

                if len(buffer) >= frame_len:
                    # Extract complete frame
                    frame = bytes(buffer[:frame_len])
                    del buffer[:frame_len]

                    # Check frame end and checksum
                    if frame[-1] == YRM100Constants.FRAME_END and self.verify_checksum(frame):
                        return frame

            # If not the expected frame or incomplete, remove only the first byte
            if len(buffer) > 0:
                del buffer[0]

            return None

        except Exception as e:
            self.logger.error(f"Error extracting frame: {e}")
            return None
    
    def process_response_buffer(self, buffer: bytearray) -> List[Tuple[bytes, bool]]:
        """
        Process response buffer and extract complete frames
        
        Args:
            buffer: Response buffer
            
        Returns:
            List[Tuple[bytes, bool]]: List of (frame, is_notification) tuples
        """
        frames = []
        
        while len(buffer) > 0:
            # Find frame start
            start_idx = -1
            for i in range(len(buffer)):
                if buffer[i] == YRM100Constants.FRAME_HEADER:
                    start_idx = i
                    break

            if start_idx == -1:
                # Clear buffer if no frame start found
                buffer.clear()
                break

            # Remove data before frame start
            if start_idx > 0:
                del buffer[:start_idx]

            # Check minimum frame length
            if len(buffer) < YRM100Constants.MIN_FRAME_LENGTH:
                break

            # Extract payload length
            pl_msb = buffer[3]
            pl_lsb = buffer[4]
            payload_len = (pl_msb << 8) | pl_lsb

            # Calculate total frame length
            frame_len = (
                5 + payload_len + 2
            )  # Header + Type + Command + PL(2) + Payload + Checksum + End

            if len(buffer) < frame_len:
                # Incomplete frame
                break

            # Extract complete frame
            frame = bytes(buffer[:frame_len])
            del buffer[:frame_len]

            # Check frame end
            if frame[-1] != YRM100Constants.FRAME_END:
                self.logger.warning(f"Invalid frame end: {frame.hex()}")
                continue

            # Check checksum
            if not self.verify_checksum(frame):
                expected_checksum = self.protocol.calculate_checksum(frame[1:-2])
                actual_checksum = frame[-2]
                self.logger.warning(
                    f"Checksum error - Expected: {expected_checksum:02X}, Actual: {actual_checksum:02X}"
                )
                continue
                
            # Determine frame type
            is_notification = (frame[1] == YRM100Constants.FRAME_TYPE_NOTIFICATION)
            frames.append((frame, is_notification))
            
        return frames
    
    def parse_tag_data(self, data: bytes) -> Optional[TagInfo]:
        """
        Parse data received from YRM100 to extract tag information
        
        Args:
            data: Raw data from serial
            
        Returns:
            TagInfo: Parsed tag information or None
        """
        try:
            if not data or len(data) < YRM100Constants.MIN_FRAME_LENGTH:
                return None

            # Check YRM100 frame structure
            if (
                data[0] != YRM100Constants.FRAME_HEADER
                or data[-1] != YRM100Constants.FRAME_END
            ):
                self.logger.warning(f"Invalid frame header/end: {data.hex()}")
                return None

            frame_type = data[1]
            command = data[2]

            # Notification Frame (Type: 02, Command: 22) - Tag detection
            if (
                frame_type == YRM100Constants.FRAME_TYPE_NOTIFICATION
                and command == YRM100Constants.CMD_SINGLE_POLLING
            ):
                tag_info = self.protocol.parse_notification_frame(data)

                # Parse EPC information for 96-bit EPC
                if tag_info and tag_info.is_96bit_epc:
                    epc_info = self.epc_handler.parse_epc_structure(tag_info.raw_tag_id)
                    if epc_info:
                        tag_info.epc_info = epc_info

                return tag_info

            # Response Frame (Type: 01) - Command response
            elif frame_type == YRM100Constants.FRAME_TYPE_RESPONSE:
                self.protocol.parse_response_frame(data)
                return None

            # Ignore Command Frame (sent by us)
            elif frame_type == YRM100Constants.FRAME_TYPE_COMMAND:
                return None

            else:
                self.logger.warning(f"Unknown frame type: {frame_type:02X}")
                return None

        except Exception as e:
            self.logger.error(f"Data parsing error: {e}")
            return None
    
    # Delegate EPC-related methods to EPCHandler
    def parse_epc_structure(self, epc_hex: str) -> Optional[EPCTag]:
        """Parse 96-bit EPC into structured information"""
        return self.epc_handler.parse_epc_structure(epc_hex)

    def get_epc_summary(self, epc_hex: str) -> str:
        """Return summary information for an EPC"""
        return self.epc_handler.get_epc_summary(epc_hex)

    def is_same_product_batch(self, epc1: str, epc2: str) -> bool:
        """Check if two EPCs are from the same product batch"""
        return self.epc_handler.is_same_product_batch(epc1, epc2) 