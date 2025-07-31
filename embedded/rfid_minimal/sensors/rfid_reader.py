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
        return self.is_running
    
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
    
    def start_multiple_polling(self, count: int = 30) -> bool:
        """
        Start multiple polling
        
        Args:
            count: Number of polling iterations
            
        Returns:
            bool: Success status
        """
        self.reset()
        self.is_running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()
        return self.command_handler.send_multiple_polling_command(count)
    
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
        
        while self.is_running:
            try:
                # Check if connection is still active
                if not self.connection.is_connected():
                    self.logger.error("Connection lost")
                    self.is_running = False
                    break
                
                # Read available data
                data = self.connection.read_data()
                if data:
                    # Update last data time
                    last_data_time = time.time()
                    
                    # Add to buffer
                    buffer.extend(data)
                    
                    # Process buffer
                    self._process_data(buffer)
                else:
                    # Check for timeout
                    if time.time() - last_data_time > NO_RESPONSE_TIMEOUT:
                        # No data received for a while, assume polling is complete
                        self.logger.debug("No response timeout")
                        self.is_running = False
                        break
                
                # Short sleep to prevent CPU hogging
                time.sleep(0.01)
                
            except Exception as e:
                self.logger.error(f"Error in read loop: {e}")
                self.is_running = False
                break
    
    def _process_data(self, buffer: bytearray) -> None:
        """
        Process data from the buffer
        
        Args:
            buffer: Data buffer
        """
        # Extract frames from buffer
        frames = self.frame_processor.process_response_buffer(buffer)
        
        # Process each frame
        for frame, is_notification in frames:
            if is_notification:
                # Parse tag data
                tag_info = self.frame_processor.parse_tag_data(frame)
                
                if tag_info:
                    # Store tag info
                    self.processed_tags[tag_info.raw_tag_id] = tag_info
                    
                    # Call callback if set
                    if self.tag_callback:
                        try:
                            self.tag_callback(self.reader_id, tag_info)
                        except Exception as e:
                            self.logger.error(f"Error in tag callback: {e}")
    
    def __enter__(self) -> "RFIDReader":
        """Context manager entry"""
        if not self.connection.is_connected():
            self.connection.connect()
        return self
    
    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> bool:
        """Context manager exit"""
        self.close()
        return False