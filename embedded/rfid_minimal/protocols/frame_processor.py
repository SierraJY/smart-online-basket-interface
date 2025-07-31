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
        if len(frame) < 4:  # Header + Type + Checksum + End
            return False
        
        # Extract data portion (between header and checksum)
        data = frame[1:-2]
        
        # Extract checksum from frame
        frame_checksum = frame[-2]
        
        # Calculate expected checksum
        expected_checksum = self.calculate_checksum(data)
        
        return frame_checksum == expected_checksum
    
    def parse_tag_data(self, frame: bytes) -> Optional[TagInfo]:
        """
        Parse tag data from frame
        
        Args:
            frame: Frame data
            
        Returns:
            TagInfo or None if parsing fails
        """
        try:
            # Verify frame format
            if len(frame) < 8:  # Minimum length for a valid tag notification
                self.logger.debug(f"Frame too short: {len(frame)} bytes")
                return None
            
            # Verify checksum
            if not self.verify_checksum(frame):
                self.logger.debug("Invalid checksum")
                return None
            
            # Check if it's a tag notification
            if frame[1] != FRAME_TYPE_NOTIFICATION or frame[3] != RESP_TAG_NOTIFICATION:
                return None
            
            # Extract parameters
            params = frame[4:-2]  # Parameters between command and checksum
            
            # Parse parameters
            if len(params) < 3:  # Minimum for antenna + data length
                return None
                
            # Extract data length
            data_length = params[1]
            
            # Extract RSSI (signed int)
            rssi = params[2]
            if rssi > 127:
                rssi = rssi - 256  # Convert to signed
            
            # Extract tag data
            tag_data = params[3:3+data_length]
            
            # Convert tag data to hex string
            tag_id = ''.join(f'{b:02X}' for b in tag_data)
            
            # Determine if it's a 96-bit EPC
            is_96bit_epc = len(tag_data) == 12
            
            # Create tag info object
            tag_info = TagInfo(
                raw_tag_id=tag_id,
                data_length=data_length,
                rssi=rssi,
                is_96bit_epc=is_96bit_epc
            )
            
            return tag_info
            
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