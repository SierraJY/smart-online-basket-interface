#!/usr/bin/env python3
"""
Reading loop handler for RFID readers
"""

import time
import threading
import logging
from typing import Optional, Set, Dict, Any
from datetime import datetime

from rfid_system.core.events import SensorEvent
from rfid_system.config.constants import YRM100Constants, PollingMode
from rfid_system.sensors.connection_handler import ConnectionHandler
from rfid_system.sensors.command_handler import CommandHandler
from rfid_system.sensors.frame_processor import FrameProcessor


class ReadingLoopHandler:
    """Handles reading loop for RFID readers"""
    
    def __init__(
        self,
        connection_handler: ConnectionHandler,
        command_handler: CommandHandler,
        frame_processor: FrameProcessor,
        reader_id: str,
        logger: logging.Logger,
        observer_notifier: callable
    ):
        """
        Initialize reading loop handler
        
        Args:
            connection_handler: Connection handler instance
            command_handler: Command handler instance
            frame_processor: Frame processor instance
            reader_id: Reader identifier
            logger: Logger instance
            observer_notifier: Function to notify observers
        """
        self.connection = connection_handler
        self.command_handler = command_handler
        self.frame_processor = frame_processor
        self.reader_id = reader_id
        self.logger = logger
        self.notify_observers = observer_notifier
        
        # Reading state
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.processed_tags: Set[str] = set()
    
    def start_reading(
        self,
        polling_mode: str = "single",
        polling_interval: float = 1.0,
        count: int = 100,
    ) -> bool:
        """
        Start tag reading
        
        Args:
            polling_mode: 'single' or 'multiple'
            polling_interval: Polling interval (seconds, for single mode)
            count: Polling count (for multiple mode)
            
        Returns:
            bool: Success status
        """
        if self.is_running:
            self.logger.warning("Reading already in progress")
            return True

        if not self.connection.is_connected() and not self.connection.connect():
            return False

        # Clear processed tags for new session
        self.processed_tags.clear()

        # Set polling mode
        mode_enum = (
            PollingMode.SINGLE
            if polling_mode.lower() == "single"
            else PollingMode.MULTIPLE
        )
        self.command_handler.set_polling_mode(mode_enum, polling_interval)

        # Start reading thread
        self.is_running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()

        # Send command for multiple polling mode
        if mode_enum == PollingMode.MULTIPLE:
            return self.command_handler.send_multiple_polling_command(count)

        return True
    
    def stop_reading(self) -> None:
        """Stop tag reading"""
        if not self.is_running:
            self.logger.warning("Reading not in progress")
            return

        self.is_running = False

        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=YRM100Constants.THREAD_JOIN_TIMEOUT)
            if self.thread.is_alive():
                self.logger.warning("Thread did not terminate normally")

        # Clear processed tags
        self.processed_tags.clear()

        self.connection.disconnect()
    
    def stop_reading_and_cleanup(self) -> bool:
        """
        Complete resource cleanup
        
        Returns:
            bool: Cleanup success
        """
        try:
            self.logger.debug(f"{self.reader_id} complete resource cleanup starting...")

            # 1. Stop reading signal
            if self.is_running:
                self.is_running = False

                # Send stop command if in multiple polling mode
                if (
                    self.command_handler.polling_mode == PollingMode.MULTIPLE
                    and self.connection.is_connected()
                ):
                    try:
                        self.command_handler.send_stop_polling_command()
                        time.sleep(0.1)  # Wait for stop command processing
                    except Exception as e:
                        self.logger.warning(f"Stop polling command error: {e}")

            # 2. Wait for thread termination
            if self.thread and self.thread.is_alive():
                self.thread.join(timeout=3.0)  # Provide sufficient time

                if self.thread.is_alive():
                    self.logger.warning(
                        f"Thread still alive - will be cleaned up when program exits (daemon)"
                    )

            # 3. Close connection
            self.connection.disconnect()

            # 4. Clean up state variables
            self.is_running = False
            self.thread = None
            self.processed_tags.clear()
            self.command_handler.last_response_time = None

            # 5. Wait to ensure port release
            time.sleep(0.1)

            self.logger.debug(f"{self.reader_id} complete resource cleanup finished")
            self.notify_observers(
                SensorEvent.COMPLETED,
                {
                    "total_tags": len(self.processed_tags),
                    "completion_reason": "cleanup",
                },
            )
            return True

        except Exception as e:
            self.logger.error(f"Unexpected error during resource cleanup: {e}")
            self.notify_observers(SensorEvent.ERROR, str(e))
            return False
    
    def _read_loop(self) -> None:
        """Tag reading loop"""
        self.logger.info(f"Tag reading loop started (mode: {self.command_handler.polling_mode.name})")
        self.notify_observers(SensorEvent.STARTED)

        last_command_time = 0
        response_buffer = bytearray()

        while self.is_running:
            try:
                if not self.connection.is_connected():
                    self.logger.warning("Connection lost. Attempting reconnection...")
                    self.notify_observers(SensorEvent.CONNECTION_LOST)

                    if not self.connection.connect():
                        time.sleep(YRM100Constants.RECONNECT_DELAY)
                        continue

                current_time = time.time()

                # Send periodic commands in single polling mode
                if (
                    self.command_handler.polling_mode == PollingMode.SINGLE
                    and (current_time - last_command_time) >= self.command_handler.polling_interval
                ):
                    self.command_handler.send_single_polling_command()
                    last_command_time = current_time

                # Check response timeout in multiple polling mode
                elif self.command_handler.polling_mode == PollingMode.MULTIPLE:
                    # Consider polling complete if no response for a certain time
                    if (
                        self.command_handler.last_response_time
                        and (current_time - self.command_handler.last_response_time)
                        > YRM100Constants.NO_RESPONSE_TIMEOUT
                    ):
                        self.logger.info(
                            f"Multiple polling complete: No response for {YRM100Constants.NO_RESPONSE_TIMEOUT} seconds"
                        )
                        self.is_running = False
                        self.notify_observers(
                            SensorEvent.COMPLETED,
                            {
                                "total_tags": len(self.processed_tags),
                                "completion_reason": "timeout",
                            },
                        )
                        break

                # Read and process data
                if self.connection.is_connected() and self.connection.get_in_waiting() > 0:
                    new_data = self.connection.read_data()
                    response_buffer.extend(new_data)
                    self._process_data(response_buffer)

                time.sleep(0.01)  # Control CPU usage

            except Exception as e:
                self.logger.error(f"Reading loop error: {e}")
                self.notify_observers(SensorEvent.ERROR, str(e))
                time.sleep(1)

        # Send stop command if in multiple polling mode
        if self.command_handler.polling_mode == PollingMode.MULTIPLE:
            self.command_handler.send_stop_polling_command()
            time.sleep(0.1)  # Wait for stop command processing

        self.logger.info("Tag reading loop ended")
    
    def _process_data(self, buffer: bytearray) -> None:
        """
        Process data from buffer
        
        Args:
            buffer: Data buffer
        """
        # Process frames in buffer
        frames = self.frame_processor.process_response_buffer(buffer)
        
        for frame, is_notification in frames:
            if is_notification:
                # Process notification frame (tag detection)
                tag_info = self.frame_processor.parse_tag_data(frame)
                
                if tag_info and tag_info.raw_tag_id not in self.processed_tags:
                    # New unique tag found
                    self.processed_tags.add(tag_info.raw_tag_id)
                    
                    # Update response time in multiple polling mode
                    if self.command_handler.polling_mode == PollingMode.MULTIPLE:
                        self.command_handler.last_response_time = time.time()
                    
                    # Log tag detection
                    if tag_info.epc_info:
                        self.logger.info(
                            f"New EPC tag detected #{len(self.processed_tags)}: {tag_info.raw_tag_id} "
                            f"(Product: {tag_info.epc_info.product_code}, "
                            f"Name: {tag_info.epc_info.product_name}, "
                            f"Seq: {tag_info.epc_info.sequence_num}, "
                            f"RSSI: {tag_info.rssi})"
                        )
                    else:
                        self.logger.info(
                            f"New general tag detected #{len(self.processed_tags)}: {tag_info.raw_tag_id} "
                            f"(RSSI: {tag_info.rssi})"
                        )
                    
                    # Notify observers
                    self.notify_observers(
                        SensorEvent.TAG_DETECTED,
                        {
                            "tag_id": tag_info.raw_tag_id,
                            "tag_count": len(self.processed_tags),
                            "rssi": tag_info.rssi,
                            "epc_info": tag_info.epc_info,
                            "reader_id": self.reader_id,
                            "timestamp": datetime.now().isoformat(),
                            "port": self.connection.port,
                            "data_length": tag_info.data_length,
                            "is_96bit_epc": tag_info.is_96bit_epc,
                            "pc": tag_info.pc,
                            "crc": tag_info.crc,
                        },
                    ) 