"""
Command handler for RFID readers
"""

import logging
import time
from typing import Optional

from rfid_minimal.config.constants import (
    FRAME_HEADER, FRAME_END,
    FRAME_TYPE_COMMAND,
    CMD_MULTIPLE_POLLING, CMD_STOP_MULTIPLE_POLLING,
    RESERVED_BYTE
)
from rfid_minimal.sensors.connection import ConnectionHandler
from rfid_minimal.protocols.frame_processor import FrameProcessor

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
            self.logger.debug(f"Sending multiple polling command: {command.hex()}")
            
            # Try to clear any pending data first
            time.sleep(0.1)
            
            # Send the command
            success = self.connection.write_data(command)
            
            if success:
                # Add a larger delay to ensure command is processed
                time.sleep(0.2)
                self.last_response_time = time.time()
                self.logger.info(f"Multiple polling command sent (count: {count})")
                
                # Debug check for any immediate response
                in_waiting = self.connection.get_in_waiting()
                if in_waiting > 0:
                    self.logger.debug(f"Immediate response detected: {in_waiting} bytes in buffer")
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
            self.logger.debug(f"Sending stop polling command: {command.hex()}")
            
            success = self.connection.write_data(command)
            
            if success:
                # Add a small delay to ensure command is processed
                time.sleep(0.1)
                self.logger.info("Stop polling command sent")
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
        # Default to empty parameters if none provided
        if parameters is None:
            parameters = bytes()
            
        # Calculate length (command + parameters)
        length = 1 + len(parameters)
        
        # Create frame data: Type(1) + Length(1) + Command(1) + Parameters(n)
        frame_data = bytes([FRAME_TYPE_COMMAND, length, command]) + parameters
        
        # Calculate checksum (XOR of all bytes in frame_data)
        checksum = 0
        for b in frame_data:
            checksum ^= b
            
        # Assemble complete frame: Header(1) + Data(n) + Checksum(1) + End(1)
        frame = bytes([FRAME_HEADER]) + frame_data + bytes([checksum, FRAME_END])
        
        return frame