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
    CMD_SET_FREQUENCY_HOPPING, CMD_SET_WORK_AREA, CMD_SET_TRANSMITTING_POWER,
    CMD_SET_WORKING_CHANNEL,
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
            
            # Create command frame
            command = self.create_command_frame(CMD_MULTIPLE_POLLING, parameters)
            
            # Clear buffers before sending
            if self.connection.is_connected():
                self.connection.serial_conn.reset_input_buffer()
                self.connection.serial_conn.reset_output_buffer()
            
            # Send command via connection handler
            success = self.connection.write_data(command)
            
            if success:
                # Add a small delay to allow the reader to process the command
                time.sleep(0.1)
                self.last_response_time = time.time()
                self.logger.info(f"Multiple polling command sent (count: {count})")
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
            # Create command frame (no parameters)
            command = self.create_command_frame(CMD_STOP_MULTIPLE_POLLING)
            
            # Send command via connection handler
            success = self.connection.write_data(command)
            
            if success:
                # Add a small delay
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
            
        # Parameter length
        param_len = len(parameters)
        pl_msb = (param_len >> 8) & 0xFF
        pl_lsb = param_len & 0xFF
        
        # Data for checksum calculation (from Type to Parameter)
        checksum_data = bytes([FRAME_TYPE_COMMAND, command, pl_msb, pl_lsb]) + parameters
        checksum = self.frame_processor.calculate_checksum(checksum_data)
        
        # Complete command frame
        frame = bytes([FRAME_HEADER, FRAME_TYPE_COMMAND, command, pl_msb, pl_lsb]) + parameters + bytes([checksum, FRAME_END])
        
        return frame
        
    def send_set_frequency_hopping_command(self, freq_hopping: int = 1) -> bool:
        """
        Send command to set frequency hopping mode
        
        Args:
            freq_hopping: Frequency hopping mode (0: disable, 1: enable)
            
        Returns:
            bool: Success status
        """
        try:
            # Create parameter bytes - 0xFF for enable, 0x00 for disable
            parameter = 0xFF if freq_hopping else 0x00
            parameters = bytes([parameter])
            
            # Create command frame
            command = self.create_command_frame(CMD_SET_FREQUENCY_HOPPING, parameters)
            
            # Send command
            success = self.connection.write_data(command)
            
            if success:
                time.sleep(0.1)
                self.logger.info(f"Set frequency hopping command sent (mode: {'enabled' if freq_hopping else 'disabled'})")
            else:
                self.logger.error("Failed to send frequency hopping command")
                
            return success
            
        except Exception as e:
            self.logger.error(f"Error sending frequency hopping command: {e}")
            return False
    
    def send_set_work_area_command(self, area_code: int = 6) -> bool:
        """
        Send command to set work area (frequency band)
        
        Args:
            area_code: Work area code
                - 1: China 900MHz (CH_Index * 0.25MHz + 920.125MHz)
                - 2: US (CH_Index * 0.5MHz + 902.25MHz)
                - 3: EU (CH_Index * 0.2MHz + 865.1MHz)
                - 4: China 800MHz (CH_Index * 0.25MHz + 840.125MHz)
                - 6: Korea (CH_Index * 0.2MHz + 917.1MHz)
            
        Returns:
            bool: Success status
        """
        try:
            # Map region names to codes for better readability
            region_map = {
                1: "China 900MHz",
                2: "US",
                3: "EU",
                4: "China 800MHz",
                6: "Korea"
            }
            
            # Create parameter bytes
            parameters = bytes([area_code])
            
            # Create command frame
            command = self.create_command_frame(CMD_SET_WORK_AREA, parameters)
            
            # Send command
            success = self.connection.write_data(command)
            
            if success:
                time.sleep(0.1)
                region_name = region_map.get(area_code, f"Unknown({area_code})")
                self.logger.info(f"Set work area command sent (region: {region_name})")
            else:
                self.logger.error("Failed to send work area command")
                
            return success
            
        except Exception as e:
            self.logger.error(f"Error sending work area command: {e}")
            return False
            
    def send_set_transmitting_power_command(self, power_dbm: int = 26) -> bool:
        """
        Send command to set transmitting power
        
        Args:
            power_dbm: Transmitting power in dBm (typically 0-30)
                According to manual: 0x07D0 (2000 decimal) = 20dBm
                Each 1dBm increase requires approximately 100 units
            
        Returns:
            bool: Success status
        """
        try:
            # Convert dBm to the device's power value
            # 20dBm = 0x07D0 (2000 decimal)
            # Each 1dBm requires approximately 100 units
            power_value = 2000 + (power_dbm - 20) * 100
            
            # Ensure power value is within reasonable limits
            if power_value < 0:
                power_value = 0
                self.logger.warning(f"Power value too low, setting to minimum")
            elif power_value > 3000:
                power_value = 3000
                self.logger.warning(f"Power value too high, setting to maximum")
            
            # Convert to bytes (2 bytes)
            power_msb = (power_value >> 8) & 0xFF
            power_lsb = power_value & 0xFF
            parameters = bytes([power_msb, power_lsb])
            
            # Create command frame
            command = self.create_command_frame(CMD_SET_TRANSMITTING_POWER, parameters)
            
            # Send command
            success = self.connection.write_data(command)
            
            if success:
                time.sleep(0.1)
                self.logger.info(f"Set transmitting power command sent ({power_dbm} dBm, value: 0x{power_msb:02X}{power_lsb:02X})")
            else:
                self.logger.error("Failed to send transmitting power command")
                
            return success
            
        except Exception as e:
            self.logger.error(f"Error sending transmitting power command: {e}")
            return False
            
    def send_set_working_channel_command(self, channel_index: int = 1) -> bool:
        """
        Send command to set working channel
        
        Command Frame:
        Header: BB, Type: 00, Command: AB, PL(MSB): 00, PL(LSB): 01, CH Index: 01, Checksum: AC, End: 7E
        
        Args:
            channel_index: Channel index (typically 1-50)
                Korea: CH_Index * 0.2MHz + 917.1MHz
                China 900MHz: CH_Index * 0.25MHz + 920.125MHz
                US: CH_Index * 0.5MHz + 902.25MHz
                EU: CH_Index * 0.2MHz + 865.1MHz
                China 800MHz: CH_Index * 0.25MHz + 840.125MHz
            
        Returns:
            bool: Success status
        """
        try:
            # Ensure channel index is within reasonable limits
            if channel_index < 1:
                channel_index = 1
                self.logger.warning(f"Channel index too low, setting to minimum (1)")
            elif channel_index > 50:
                channel_index = 50
                self.logger.warning(f"Channel index too high, setting to maximum (50)")
            
            # Create parameter bytes (1 byte)
            parameters = bytes([channel_index])
            
            # Create command frame
            command = self.create_command_frame(CMD_SET_WORKING_CHANNEL, parameters)
            
            # Send command
            success = self.connection.write_data(command)
            
            if success:
                time.sleep(0.1)
                self.logger.info(f"Set working channel command sent (channel index: {channel_index})")
            else:
                self.logger.error("Failed to send working channel command")
                
            return success
            
        except Exception as e:
            self.logger.error(f"Error sending working channel command: {e}")
            return False