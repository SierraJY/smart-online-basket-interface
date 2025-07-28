#!/usr/bin/env python3
"""
Command handler for RFID readers
"""

import time
import logging
from typing import Optional

from rfid_system.config.constants import YRM100Constants, PollingMode
from rfid_system.protocols.yrm100_protocol import YRM100Protocol
from rfid_system.sensors.connection_handler import ConnectionHandler
from rfid_system.sensors.frame_processor import FrameProcessor


class CommandHandler:
    """Handles commands for RFID readers"""
    
    def __init__(
        self, 
        connection_handler: ConnectionHandler,
        frame_processor: FrameProcessor,
        logger: logging.Logger
    ):
        """
        Initialize command handler
        
        Args:
            connection_handler: Connection handler instance
            frame_processor: Frame processor instance
            logger: Logger instance
        """
        self.connection = connection_handler
        self.frame_processor = frame_processor
        self.logger = logger
        self.protocol = YRM100Protocol(logger)
        
        # Polling settings
        self.polling_mode = PollingMode.SINGLE
        self.polling_interval = 1.0
        self.multiple_polling_count = 0
        self.last_response_time = None
    
    def set_polling_mode(self, mode: PollingMode, interval: float = 1.0) -> None:
        """
        Set polling mode
        
        Args:
            mode: SINGLE or MULTIPLE
            interval: Polling interval (seconds)
        """
        self.polling_mode = mode
        self.polling_interval = interval
        self.logger.info(f"Polling mode: {mode.name}, interval: {interval} seconds")
    
    def _wait_for_response(
        self,
        expected_command: int,
        timeout: float = YRM100Constants.COMMAND_RESPONSE_TIMEOUT,
    ) -> Optional[bytes]:
        """
        Wait for response to a specific command
        
        Args:
            expected_command: Expected command code
            timeout: Wait time (seconds)
            
        Returns:
            bytes: Response frame or None
        """
        try:
            if not self.connection.is_connected():
                return None

            start_time = time.time()
            response_buffer = bytearray()

            while (time.time() - start_time) < timeout:
                # Read data
                if self.connection.get_in_waiting() > 0:
                    new_data = self.connection.read_data()
                    response_buffer.extend(new_data)

                    # Find complete response frame
                    frame = self.frame_processor.extract_complete_frame(
                        response_buffer, expected_command
                    )
                    if frame:
                        return frame

                time.sleep(0.01)  # Control CPU usage

            return None  # Timeout

        except Exception as e:
            self.logger.error(f"Error while waiting for response: {e}")
            return None
    
    def send_command_and_verify(
        self, command_bytes: bytes, command_code: int, command_name: str
    ) -> bool:
        """
        Send command and verify response
        
        Args:
            command_bytes: Command bytes to send
            command_code: Command code
            command_name: Command name (for logging)
            
        Returns:
            bool: Success status
        """
        try:
            if not self.connection.is_connected():
                self.logger.error(f"{command_name}: No connection")
                return False

            # Send command
            success = self.connection.write_data(command_bytes)
            if not success:
                self.logger.error(f"{command_name}: Failed to send command")
                return False
                
            self.logger.debug(
                f"{command_name} command sent: {command_bytes.hex().upper()}"
            )

            # Wait for response
            response = self._wait_for_response(command_code)
            if not response:
                self.logger.error(f"{command_name}: Response timeout")
                return False

            # Verify response
            success = self.protocol.parse_response_frame(response)
            if success:
                self.logger.info(f"{command_name} successful")
                return True
            else:
                self.logger.error(f"{command_name} failed - Error response")
                return False

        except Exception as e:
            self.logger.error(f"Unexpected error during {command_name}: {e}")
            return False
    
    def initialize_reader(
        self, power_dbm: int = 26, enable_hopping: bool = True, region: str = "Korea"
    ) -> bool:
        """
        Initialize reader settings
        
        Args:
            power_dbm: Transmitting power (dBm)
            enable_hopping: Whether to enable frequency hopping
            region: Work area
            
        Returns:
            bool: Initialization success
        """
        try:
            if not self.connection.is_connected():
                self.logger.error("No connection for initialization")
                return False

            self.logger.info(
                f"Starting reader initialization (Power: {power_dbm}dBm, Hopping: {enable_hopping}, Region: {region})"
            )

            # 1. Set transmitting power
            power_cmd = self.protocol.create_set_transmitting_power_command(power_dbm)
            if not self.send_command_and_verify(
                power_cmd,
                YRM100Constants.CMD_SET_TRANSMITTING_POWER,
                f"Set transmitting power {power_dbm}dBm",
            ):
                return False

            # 2. Set frequency hopping mode
            hopping_cmd = self.protocol.create_set_frequency_hopping_command(
                enable_hopping
            )
            hopping_status = "enabled" if enable_hopping else "disabled"
            if not self.send_command_and_verify(
                hopping_cmd,
                YRM100Constants.CMD_SET_FREQUENCY_HOPPING,
                f"Frequency hopping {hopping_status}",
            ):
                return False

            # 3. Set work area
            region_cmd = self.protocol.create_set_work_area_command(region)
            if not self.send_command_and_verify(
                region_cmd,
                YRM100Constants.CMD_SET_WORK_AREA,
                f"Set work area {region}",
            ):
                return False

            self.logger.info(
                f"Reader initialization complete ({power_dbm}dBm, hopping {hopping_status}, {region} region)"
            )
            return True

        except Exception as e:
            self.logger.error(f"Unexpected error during reader initialization: {e}")
            return False
    
    def send_single_polling_command(self) -> bool:
        """
        Send single polling command
        
        Returns:
            bool: Success status
        """
        try:
            command_frame = self.protocol.create_single_polling_command()
            if self.connection.is_connected():
                success = self.connection.write_data(command_frame)
                if success:
                    self.logger.debug("Single polling command sent")
                return success
            return False
        except Exception as e:
            self.logger.error(f"Single polling command error: {e}")
            return False
    
    def send_multiple_polling_command(
        self, count: int = YRM100Constants.DEFAULT_MULTIPLE_POLLING_COUNT
    ) -> bool:
        """
        Send multiple polling command
        
        Args:
            count: Polling count
            
        Returns:
            bool: Success status
        """
        try:
            command_frame = self.protocol.create_multiple_polling_command(count)
            if self.connection.is_connected():
                success = self.connection.write_data(command_frame)
                if success:
                    self.multiple_polling_count = count
                    self.last_response_time = time.time()
                    self.logger.debug(f"Multiple polling command sent (count: {count})")
                return success
            return False
        except Exception as e:
            self.logger.error(f"Multiple polling command error: {e}")
            return False
    
    def send_stop_polling_command(self) -> bool:
        """
        Send stop polling command
        
        Returns:
            bool: Success status
        """
        try:
            command_frame = self.protocol.create_stop_polling_command()
            if self.connection.is_connected():
                success = self.connection.write_data(command_frame)
                if success:
                    self.logger.debug("Stop polling command sent")
                return success
            return False
        except Exception as e:
            self.logger.error(f"Stop polling command error: {e}")
            return False 