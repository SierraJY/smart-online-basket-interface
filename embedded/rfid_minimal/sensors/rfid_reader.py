"""
RFID Reader - Main class for RFID reading operations
"""

import logging
import threading
import time
from typing import Set, Dict, List, Optional, Callable, Any

from rfid_minimal.config.constants import NO_RESPONSE_TIMEOUT, THREAD_JOIN_TIMEOUT
from rfid_minimal.sensors.connection import ConnectionHandler
from rfid_minimal.protocols.command_handler import CommandHandler
from rfid_minimal.protocols.frame_processor import FrameProcessor
from rfid_minimal.core.models import TagInfo

class RFIDReader:
    """RFID Reader class for multi-polling operations"""
    
    def __init__(self, port: str, baudrate: int = 115200, reader_id: Optional[str] = None):
        """
        Initialize RFID reader
        
        Args:
            port: Serial port (e.g., '/dev/ttyUSB0')
            baudrate: Communication speed
            reader_id: Reader identifier
        """
        self.port = port
        self.baudrate = baudrate
        self.reader_id = reader_id or f"Reader-{port}"
        
        # Set up logger
        self.logger = logging.getLogger("rfid_minimal")
        
        # Initialize components
        self.frame_processor = FrameProcessor()
        self.connection = ConnectionHandler(port, baudrate, self.reader_id)
        self.command_handler = CommandHandler(self.connection, self.frame_processor)
        
        # Reading state
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.processed_tags: Dict[str, TagInfo] = {}
        
        # Callback for tag detection
        self.tag_callback: Optional[Callable[[str, TagInfo], None]] = None
    
    def set_tag_callback(self, callback: Callable[[str, TagInfo], None]) -> None:
        """
        Set callback function for tag detection
        
        Args:
            callback: Function to call when a tag is detected
                     Function signature: callback(reader_id: str, tag_info: TagInfo)
        """
        self.tag_callback = callback
    
    def start_reading(self, polling_count: int = 30, timeout: float = 5.0) -> Set[str]:
        """
        Start tag reading with multi-polling
        
        Args:
            polling_count: Number of polling iterations
            timeout: Maximum time to wait for tags (seconds)
            
        Returns:
            Set of detected tag IDs
        """
        if self.is_running:
            self.logger.warning("Reading already in progress")
            return set(self.processed_tags.keys())
        
        # Clear processed tags for new session
        self.processed_tags.clear()
        
        # Connect to reader
        if not self.connection.is_connected() and not self.connection.connect():
            self.logger.error(f"Failed to connect to {self.port}")
            return set()
        
        # Start reading thread
        self.is_running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()
        
        # Send multi-polling command
        success = self.command_handler.send_multiple_polling_command(polling_count)
        if not success:
            self.is_running = False
            self.connection.disconnect()
            return set()
        
        # Wait for timeout or completion
        start_time = time.time()
        while self.is_running and (time.time() - start_time) < timeout:
            time.sleep(0.1)
        
        # Stop reading if still running
        if self.is_running:
            self.stop_reading()
        
        return set(self.processed_tags.keys())
    
    def get_detected_tags(self) -> List[str]:
        """
        Get list of detected tag IDs
        
        Returns:
            List of tag IDs
        """
        return list(self.processed_tags.keys())
    
    def get_tag_info(self, tag_id: str) -> Optional[TagInfo]:
        """
        Get information for a specific tag
        
        Args:
            tag_id: Tag identifier
            
        Returns:
            TagInfo object or None if not found
        """
        return self.processed_tags.get(tag_id)
    
    def get_all_tags(self) -> Dict[str, TagInfo]:
        """
        Get all detected tags with their information
        
        Returns:
            Dictionary mapping tag IDs to TagInfo objects
        """
        return self.processed_tags.copy()
    
    def stop_reading(self, disconnect: bool = False) -> None:
        """
        Stop tag reading
        
        Args:
            disconnect: Whether to disconnect from the reader
        """
        if not self.is_running:
            return
            
        # Set flag to stop reading loop
        self.is_running = False
        
        # Send stop command
        self.command_handler.send_stop_polling_command()
        
        # Wait for thread to finish
        if self.thread and self.thread.is_alive():
            self.thread.join(THREAD_JOIN_TIMEOUT)
            
        # Disconnect if requested
        if disconnect and self.connection.is_connected():
            self.connection.disconnect()
    
    def close(self) -> None:
        """Close connection and clean up resources"""
        self.stop_reading(disconnect=True)
    
    def is_polling(self) -> bool:
        """Check if polling is in progress"""
        # Check both the running flag and if there's an active thread
        is_active = self.is_running and self.thread is not None and self.thread.is_alive()
        return is_active
    
    def reset(self) -> None:
        """Reset reader state"""
        # Stop any active reading
        if self.is_running:
            self.stop_reading()
        
        # Clear processed tags
        self.processed_tags.clear()
        
        # Reconnect if needed
        if not self.connection.is_connected():
            self.connection.connect()
            
        # Add a small delay after connecting to ensure device is ready
        time.sleep(0.1)
        
    def configure_reader(self, work_area: int = 6, freq_hopping: int = 1, power_dbm: int = 26, channel_index: int = 1) -> bool:
        """
        Configure reader settings (work area, frequency hopping, transmitting power, working channel)
        
        Args:
            work_area: Work area code
                - 1: China 900MHz (CH_Index * 0.25MHz + 920.125MHz)
                - 2: US (CH_Index * 0.5MHz + 902.25MHz)
                - 3: EU (CH_Index * 0.2MHz + 865.1MHz)
                - 4: China 800MHz (CH_Index * 0.25MHz + 840.125MHz)
                - 6: Korea (CH_Index * 0.2MHz + 917.1MHz)
            freq_hopping: Frequency hopping mode (0: disable, 1: enable)
            power_dbm: Transmitting power in dBm (typically 0-30)
            channel_index: Working channel index (1-50)
                If freq_hopping is enabled, this parameter is ignored
            
        Returns:
            bool: Success status
        """
        # Map region codes to names for better logging
        region_map = {
            1: "China 900MHz",
            2: "US",
            3: "EU",
            4: "China 800MHz",
            6: "Korea"
        }
        region_name = region_map.get(work_area, f"Unknown({work_area})")
        
        # Calculate frequency based on region and channel index
        freq_info = ""
        if work_area == 1:  # China 900MHz
            freq = 920.125 + (channel_index * 0.25)
            freq_info = f", freq={freq:.3f}MHz"
        elif work_area == 2:  # US
            freq = 902.25 + (channel_index * 0.5)
            freq_info = f", freq={freq:.3f}MHz"
        elif work_area == 3:  # EU
            freq = 865.1 + (channel_index * 0.2)
            freq_info = f", freq={freq:.3f}MHz"
        elif work_area == 4:  # China 800MHz
            freq = 840.125 + (channel_index * 0.25)
            freq_info = f", freq={freq:.3f}MHz"
        elif work_area == 6:  # Korea
            freq = 917.1 + (channel_index * 0.2)
            freq_info = f", freq={freq:.3f}MHz"
        
        self.logger.info(f"{self.reader_id}: Configuring reader (region={region_name}, freq_hopping={'enabled' if freq_hopping else 'disabled'}, power={power_dbm}dBm, channel={channel_index}{freq_info})")
        
        # Make sure we're connected
        if not self.connection.is_connected():
            success = self.connection.connect()
            if not success:
                self.logger.error(f"{self.reader_id}: Failed to connect for configuration")
                return False
                
        # Set work area (frequency band)
        success = self.command_handler.send_set_work_area_command(work_area)
        if not success:
            self.logger.error(f"{self.reader_id}: Failed to set work area")
            return False
            
        # Small delay between commands
        time.sleep(0.2)
        
        # Set frequency hopping
        success = self.command_handler.send_set_frequency_hopping_command(freq_hopping)
        if not success:
            self.logger.error(f"{self.reader_id}: Failed to set frequency hopping")
            return False
            
        # Small delay between commands
        time.sleep(0.2)
        
        # Set working channel if frequency hopping is disabled
        if not freq_hopping:
            success = self.command_handler.send_set_working_channel_command(channel_index)
            if not success:
                self.logger.error(f"{self.reader_id}: Failed to set working channel")
                return False
                
            # Small delay between commands
            time.sleep(0.2)
        
        # Set transmitting power
        success = self.command_handler.send_set_transmitting_power_command(power_dbm)
        if not success:
            self.logger.error(f"{self.reader_id}: Failed to set transmitting power")
            return False
            
        self.logger.info(f"{self.reader_id}: Reader configuration completed successfully")
        return True
        
        # Only send a stop command if we're not already in a clean state
        # This prevents sending unnecessary stop commands that might disrupt the connection
        if self.connection.get_in_waiting() > 0:
            try:
                self.logger.debug(f"{self.reader_id}: Sending initial stop command to reset device state")
                self.command_handler.send_stop_polling_command()
                time.sleep(0.1)  # Give device time to reset
            except Exception as e:
                self.logger.warning(f"{self.reader_id}: Error sending reset command: {e}")
    
    def start_multiple_polling(self, count: int = 30) -> bool:
        """
        Start multiple polling
        
        Args:
            count: Number of polling iterations
            
        Returns:
            bool: Success status
        """
        self.reset()
        self.logger.debug(f"{self.reader_id}: Starting multiple polling with count={count}")
        
        # Start the reading thread first
        self.is_running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()
        
        # Give the thread a moment to start
        time.sleep(0.2)  # Increased delay to ensure thread is ready
        
        # Send the polling command - this is critical
        # The order of operations is important here
        self.logger.debug(f"{self.reader_id}: Sending polling command...")
        result = self.command_handler.send_multiple_polling_command(count)
        
        if not result:
            self.logger.error(f"{self.reader_id}: Failed to send multiple polling command")
            self.is_running = False
            return False
        
        # Give some time for the command to be processed by the device
        time.sleep(0.2)  # Added delay after sending command
        
        self.logger.debug(f"{self.reader_id}: Polling started successfully")
        return result
    
    def stop_multiple_polling(self) -> bool:
        """
        Stop multiple polling
        
        Returns:
            bool: Success status
        """
        result = self.command_handler.send_stop_polling_command()
        self.is_running = False
        return result
    
    def _read_loop(self) -> None:
        """Background thread for reading data from the reader"""
        buffer = bytearray()
        last_data_time = time.time()
        polling_start_time = time.time()
        
        self.logger.debug(f"{self.reader_id}: Read loop started")
        
        while self.is_running:
            try:
                # Check if connection is still active
                if not self.connection.is_connected():
                    self.logger.error(f"{self.reader_id}: Connection lost")
                    self.is_running = False
                    break
                
                # Explicitly check in_waiting before reading
                in_waiting = self.connection.get_in_waiting()
                if in_waiting > 0:
                    self.logger.debug(f"{self.reader_id}: {in_waiting} bytes waiting in buffer")
                
                # Read available data
                try:
                    data = self.connection.read_data()
                    if data:
                        # Update last data time
                        last_data_time = time.time()
                        
                        # Add to buffer
                        buffer.extend(data)
                        
                        # Log raw data for debugging
                        self.logger.debug(f"{self.reader_id}: Raw data received: {data.hex()}")
                        
                        # Process buffer
                        self._process_data(buffer)
                except Exception as e:
                    self.logger.error(f"{self.reader_id}: Error in read loop while reading data: {e}")
                    # Short pause to avoid tight loop if there are persistent errors
                    time.sleep(0.1)
                else:
                    # Check for timeout
                    elapsed_time = time.time() - last_data_time
                    total_time = time.time() - polling_start_time
                    
                    # Log polling status periodically
                    if int(total_time) % 2 == 0 and total_time > 0:  # Log every 2 seconds
                        self.logger.debug(f"{self.reader_id}: Polling active for {total_time:.1f}s, last data {elapsed_time:.1f}s ago")
                    
                    if elapsed_time > NO_RESPONSE_TIMEOUT:
                        # No data received for a while, assume polling is complete
                        self.logger.debug(f"{self.reader_id}: No response timeout after {elapsed_time:.1f}s")
                        self.is_running = False
                        break
                
                # Short sleep to prevent CPU hogging
                time.sleep(0.01)
                
            except Exception as e:
                self.logger.error(f"Error in read loop for {self.reader_id}: {e}")
                self.is_running = False
                break
                
        self.logger.debug(f"{self.reader_id}: Read loop ended")
    
    def _process_data(self, buffer: bytearray) -> None:
        """
        Process data from the buffer
        
        Args:
            buffer: Data buffer
        """
        # Extract frames from buffer
        frames = self.frame_processor.process_response_buffer(buffer)
        
        if frames:
            self.logger.debug(f"{self.reader_id}: Extracted {len(frames)} frames from buffer")
        
        # Process each frame
        for frame, is_notification in frames:
            self.logger.debug(f"{self.reader_id}: Processing frame: {frame.hex()}, is_notification: {is_notification}")
            
            if is_notification:
                # Parse tag data
                tag_info = self.frame_processor.parse_tag_data(frame)
                
                if tag_info:
                    # Store tag info
                    self.processed_tags[tag_info.raw_tag_id] = tag_info
                    self.logger.info(f"{self.reader_id}: TAG DETECTED! ID: {tag_info.raw_tag_id} (RSSI: {tag_info.rssi})")
                    
                    # Call callback if set
                    if self.tag_callback:
                        try:
                            self.tag_callback(self.reader_id, tag_info)
                        except Exception as e:
                            self.logger.error(f"Error in tag callback: {e}")
                else:
                    self.logger.debug(f"Failed to parse tag data from notification frame")
    
    def __enter__(self) -> "RFIDReader":
        """Context manager entry"""
        if not self.connection.is_connected():
            self.connection.connect()
        return self
    
    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> bool:
        """Context manager exit"""
        self.close()
        return False