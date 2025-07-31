"""
Frame processor for RFID data
"""

import logging
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass

from rfid_minimal.config.constants import (
    FRAME_HEADER, FRAME_END,
    FRAME_TYPE_NOTIFICATION,
    RESP_TAG_NOTIFICATION
)
from rfid_minimal.core.models import TagInfo

class FrameProcessor:
    """Processes RFID data frames"""
    
    def __init__(self):
        """Initialize frame processor"""
        self.logger = logging.getLogger("rfid_minimal")
    
    def process_response_buffer(self, buffer: bytearray) -> List[Tuple[bytes, bool]]:
        """
        Process response buffer and extract frames
        
        Args:
            buffer: Data buffer
            
        Returns:
            List of tuples (frame_data, is_notification)
        """
        frames = []
        
        # Find frame headers and process frames
        i = 0
        while i < len(buffer):
            # Find frame header
            if buffer[i] == FRAME_HEADER:
                frame_start_idx = i
                
                # Search for frame end
                end_idx = -1
                for j in range(i + 1, len(buffer)):
                    if buffer[j] == FRAME_END:
                        end_idx = j
                        break
                
                if end_idx > 0:
                    # Extract complete frame
                    frame_data = bytes(buffer[frame_start_idx:end_idx + 1])
                    
                    # Check if it's a notification frame
                    is_notification = False
                    if len(frame_data) > 2 and frame_data[1] == FRAME_TYPE_NOTIFICATION:
                        is_notification = True
                    
                    frames.append((frame_data, is_notification))
                    
                    # Remove processed frame from buffer
                    del buffer[:end_idx + 1]
                    i = 0  # Reset index
                else:
                    # No complete frame yet
                    i += 1
            else:
                i += 1
        
        return frames
    
    def calculate_checksum(self, data: bytes) -> int:
        """
        Calculate YRM100 checksum (LSB of the sum from Type to Parameter)
        
        Args:
            data: Data to calculate checksum for
            
        Returns:
            int: Checksum value
        """
        return sum(data) & 0xFF
        
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
            expected_checksum = self.calculate_checksum(checksum_data)
            actual_checksum = frame[-2]
            return expected_checksum == actual_checksum
        except:
            return False
    
    def parse_tag_data(self, frame: bytes) -> Optional[TagInfo]:
        """
        Parse tag data from notification frame
        
        Args:
            frame: Frame data
            
        Returns:
            TagInfo or None if parsing failed
        """
        try:
            # Check if it's a valid notification frame
            if len(frame) < 7 or frame[1] != FRAME_TYPE_NOTIFICATION:
                return None
                
            # Debug: log the entire frame for analysis
            frame_hex = ' '.join(f'{b:02X}' for b in frame)
            self.logger.debug(f"Raw frame: {frame_hex}")
            
            # Log frame structure based on the image
            if len(frame) >= 8:
                self.logger.debug(f"Frame header: {frame[0]:02X}")
                self.logger.debug(f"Frame type: {frame[1]:02X}")
                self.logger.debug(f"Command: {frame[2]:02X}")
                self.logger.debug(f"Length: {frame[3]:02X} {frame[4]:02X}")
                self.logger.debug(f"RSSI: {frame[5]:02X}")
                self.logger.debug(f"PC: {frame[6]:02X} {frame[7]:02X}")
            
            # Verify checksum
            if not self.verify_checksum(frame):
                self.logger.warning("Invalid checksum in tag notification frame")
                return None
            
            # Extract payload length (2 bytes, MSB first)
            payload_len = (frame[3] << 8) | frame[4]
            
            # Check if we have enough data
            if len(frame) < 5 + payload_len + 2:  # Header(1) + Type(1) + Command(1) + Length(2) + Payload + Checksum(1) + End(1)
                return None
            
            # Based on the provided image, the notification frame structure is:
            # Header(1) + Type(1) + Command(1) + PL(MSB)(1) + PL(LSB)(1) + 
            # RSSI(1) + PC(MSB)(1) + PC(LSB)(1) + EPC(n) + CRC(2) + Checksum(1) + End(1)
            
            # Extract RSSI - at position 5
            rssi_pos = 5
            if rssi_pos < len(frame):
                rssi = frame[rssi_pos]
                if rssi > 127:
                    rssi = rssi - 256  # Convert to signed value
            else:
                rssi = 0
            
            # Extract PC (Protocol Control) - 2 bytes at positions 6-7
            pc_start = 6
            pc_data = frame[pc_start:pc_start+2]
            
            # The PC field contains information about the EPC length
            # EPC length in words (2 bytes per word) is in bits 10-14 of PC
            epc_words = (pc_data[0] >> 2) & 0x1F  # Extract bits 10-14
            epc_len = epc_words * 2  # Convert words to bytes
            
            # Extract EPC data - starts after PC
            epc_start = pc_start + 2
            epc_data = frame[epc_start:epc_start+epc_len]
            
            # Convert EPC data to hex string
            tag_id = ''.join(f'{b:02X}' for b in epc_data)
            
            # Check if it's a 96-bit EPC
            is_96bit_epc = epc_len == 12  # 12 bytes = 96 bits
            
            # Extract PC and CRC
            pc = ''.join(f'{b:02X}' for b in pc_data)
            
            # CRC is 2 bytes after the EPC data
            crc_idx = epc_start + epc_len
            if crc_idx + 2 <= len(frame) - 2:  # Ensure we have CRC data
                crc_data = frame[crc_idx:crc_idx+2]
                crc = ''.join(f'{b:02X}' for b in crc_data)
            else:
                crc = ""
                
            # Log parsed components
            self.logger.debug(f"Parsed components - RSSI: {rssi}, PC: {pc}, EPC: {tag_id}, CRC: {crc}")
            
            return TagInfo(
                raw_tag_id=tag_id[:epc_len],
                data_length=epc_len,
                rssi=rssi,
                is_96bit_epc=is_96bit_epc,
                pc=pc,
                crc=crc
            )
            
        except Exception as e:
            self.logger.error(f"Error parsing tag data: {e}")
            return None 
    
    def extract_tag_info(self, frame: bytes) -> Dict[str, Any]:
        """
        Extract detailed tag information from frame
        
        Args:
            frame: Frame data
            
        Returns:
            Dictionary with tag information
        """
        info = {
            'valid': False,
            'tag_id': None,
            'rssi': None,
            'data_length': None
        }
        
        tag_info = self.parse_tag_data(frame)
        if tag_info:
            info['valid'] = True
            info['tag_id'] = tag_info.raw_tag_id
            info['rssi'] = tag_info.rssi
            info['data_length'] = tag_info.data_length
            
        return info