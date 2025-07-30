"""
Command handler for RFID readers
"""

import logging
import time
from typing import Optional

from rfid_minimal.constants import (
    FRAME_HEADER, FRAME_END,
    FRAME_TYPE_COMMAND,
    CMD_MULTIPLE_POLLING, CMD_STOP_MULTIPLE_POLLING,
    RESERVED_BYTE
)
from rfid_minimal.connection import ConnectionHandler
from rfid_minimal.frame_processor import FrameProcessor

class CommandHandler:
    """Handles commands for RFID readers"""
    
    def __init__(self, connection_handler: ConnectionHandler, frame_processor: FrameProcessor):
        """
        Initialize command handler
        
        Args:
            connection_handler: Connection handler instance
            frame_processor: Frame processor instance
        """
        self.connection = connection_handler
        self.frame_processor = frame_processor
        self.logger = logging.getLogger("rfid_minimal")
        self.last_response_time: Optional[float] = None
    
    def send_multiple_polling_command(self, count: int = 30) -> bool:
        """
        Send multiple polling command
        
        Args:
            count: Number of polling iterations
            
        Returns:
            bool: Success status
        """
        try:
            # Parameters: Reserved(1) + Count(2)
            reserved = RESERVED_BYTE
            count_msb = (count >> 8) & 0xFF
            count_lsb = count & 0xFF
            parameters = bytes([reserved, count_msb, count_lsb])
            
            # Create and send command frame
            command = self.create_command_frame(CMD_MULTIPLE_POLLING, parameters)
            success = self.connection.write_data(command)
            
            if success:
                # Add a small delay to ensure command is processed
                time.sleep(0.1)
                self.last_response_time = time.time()
                self.logger.debug(f"Multiple polling command sent (count: {count})")
            else:
                self.logger.error("Failed to send multiple polling command")
            
            return success
            
        except Exception as e:
            self.logger.error(f"Error sending multiple polling command: {e}")
            return False
    
    def send_stop_polling_command(self) -> bool:
        """
        Send stop polling command
        
        Returns:
            bool: Success status
        """
        try:
            # Create and send command frame (no parameters)
            command = self.create_command_frame(CMD_STOP_MULTIPLE_POLLING)
            success = self.connection.write_data(command)
            
            if success:
                # Add a small delay to ensure command is processed
                time.sleep(0.1)
                self.logger.debug("Stop polling command sent")
            else:
                self.logger.error("Failed to send stop polling command")
            
            return success
            
        except Exception as e:
            self.logger.error(f"Error sending stop polling command: {e}")
            return False
    
    def create_command_frame(self, command: int, parameters: bytes = None) -> bytes:
        """
        Create a command frame with proper format and checksum
        
        Args:
            command: Command code
            parameters: Command parameters (optional)
            
        Returns:
            bytes: Complete command frame
        """
        # Frame type
        frame_type = FRAME_TYPE_COMMAND
        
        # Parameter length
        if parameters is None:
            parameters = b""
        param_len = len(parameters)
        pl_msb = (param_len >> 8) & 0xFF
        pl_lsb = param_len & 0xFF
        
        # Data for checksum calculation
        checksum_data = bytes([frame_type, command, pl_msb, pl_lsb]) + parameters
        checksum = self.frame_processor.calculate_checksum(checksum_data)
        
        # Complete command frame
        frame = bytes([FRAME_HEADER, frame_type, command, pl_msb, pl_lsb]) + parameters + bytes([checksum, FRAME_END])
        
        return frame 