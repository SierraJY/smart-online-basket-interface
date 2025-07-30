"""
RFID Reader - Main class for RFID reading operations
"""

import logging
import threading
import time
from typing import Set, Dict, List, Optional, Callable, Any

from rfid_minimal.constants import NO_RESPONSE_TIMEOUT, THREAD_JOIN_TIMEOUT
from rfid_minimal.connection import ConnectionHandler
from rfid_minimal.command_handler import CommandHandler
from rfid_minimal.frame_processor import FrameProcessor, TagInfo

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
        
        # Return detected tags
        return set(self.processed_tags.keys())
    
    def get_tag_info(self, tag_id: str) -> Optional[TagInfo]:
        """
        Get information for a specific tag
        
        Args:
            tag_id: Tag ID
            
        Returns:
            TagInfo or None if tag not found
        """
        return self.processed_tags.get(tag_id)
    
    def get_all_tags(self) -> Dict[str, TagInfo]:
        """
        Get all detected tags
        
        Returns:
            Dictionary mapping tag IDs to TagInfo objects
        """
        return self.processed_tags.copy()
    
    def stop_reading(self, disconnect: bool = False) -> None:
        """
        Stop tag reading
        
        Args:
            disconnect: Whether to disconnect the serial port
        """
        if not self.is_running:
            return
        
        self.is_running = False
        
        # Send stop command
        if self.connection.is_connected():
            self.command_handler.send_stop_polling_command()
        
        # Wait for thread to terminate
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=THREAD_JOIN_TIMEOUT)
        
        # Only disconnect if requested
        if disconnect:
            self.connection.disconnect()
            
    def reset(self) -> None:
        """
        Reset reader state for a new polling cycle
        """
        # Stop reading but keep the connection open
        self.stop_reading(disconnect=False)
        
        # Clear processed tags
        self.processed_tags.clear()
        
        # Reset command handler state
        self.command_handler.last_response_time = None
    
    def _read_loop(self) -> None:
        """Tag reading loop"""
        self.logger.info(f"Tag reading loop started on {self.port}")
        
        response_buffer = bytearray()
        
        while self.is_running:
            try:
                if not self.connection.is_connected():
                    self.logger.warning("Connection lost. Attempting reconnection...")
                    
                    if not self.connection.connect():
                        time.sleep(1.0)
                        continue
                
                current_time = time.time()
                
                # Check response timeout
                if (
                    self.command_handler.last_response_time
                    and (current_time - self.command_handler.last_response_time)
                    > NO_RESPONSE_TIMEOUT
                ):
                    self.logger.info(
                        f"Multi-polling complete: No response for {NO_RESPONSE_TIMEOUT} seconds"
                    )
                    self.is_running = False
                    break
                
                # Read and process data
                if self.connection.is_connected() and self.connection.get_in_waiting() > 0:
                    new_data = self.connection.read_data()
                    response_buffer.extend(new_data)
                    self._process_data(response_buffer)
                
                time.sleep(0.01)  # Control CPU usage
                
            except Exception as e:
                self.logger.error(f"Reading loop error: {e}")
                time.sleep(0.5)
        
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
                
                if tag_info:
                    tag_id = tag_info.raw_tag_id
                    
                    # Store tag info
                    self.processed_tags[tag_id] = tag_info
                    
                    # Update response time
                    self.command_handler.last_response_time = time.time()
                    
                    # Log tag detection
                    self.logger.info(
                        f"Tag detected: {tag_id} (RSSI: {tag_info.rssi})"
                    )
                    
                    # Call tag callback if set
                    if self.tag_callback:
                        try:
                            self.tag_callback(self.reader_id, tag_info)
                        except Exception as e:
                            self.logger.error(f"Error in tag callback: {e}")
    
    def __enter__(self) -> "RFIDReader":
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> bool:
        """Context manager exit"""
        self.stop_reading()
        return False 