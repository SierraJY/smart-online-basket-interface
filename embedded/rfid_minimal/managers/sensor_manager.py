"""
Multi-sensor manager for RFID readers
"""

import logging
import time
import serial.tools.list_ports
from typing import List, Dict, Set, Optional, Callable

from rfid_minimal.sensors.rfid_reader import RFIDReader
from rfid_minimal.core.models import TagInfo

class MultiSensorManager:
    """Manages multiple RFID readers"""
    
    def __init__(self, polling_count: int = 30, rssi_threshold: Optional[int] = None):
        """
        Initialize multi-sensor manager
        
        Args:
            polling_count: Number of polling iterations per reader
            rssi_threshold: RSSI threshold for filtering tags (None for no filtering)
        """
        self.polling_count = polling_count
        self.rssi_threshold = rssi_threshold
        self.readers: List[RFIDReader] = []
        self.logger = logging.getLogger("rfid_minimal")
        
        # Tag detection callback
        self.tag_callback: Optional[Callable[[str, str, TagInfo], None]] = None
        
        # Initialize readers
        self._initialize_readers()
    
    def set_tag_callback(self, callback: Callable[[str, str, TagInfo], None]) -> None:
        """
        Set callback function for tag detection
        
        Args:
            callback: Function to call when a tag is detected
                     Function signature: callback(manager_id: str, reader_id: str, tag_info: TagInfo)
        """
        self.tag_callback = callback
        
        # Register callback with all readers
        for reader in self.readers:
            reader.set_tag_callback(lambda reader_id, tag_info: self._on_tag_detected(reader_id, tag_info))
    
    def _on_tag_detected(self, reader_id: str, tag_info: TagInfo) -> None:
        """
        Handle tag detection from a reader
        
        Args:
            reader_id: Reader identifier
            tag_info: Tag information
        """
        if self.tag_callback:
            # Filter by RSSI if threshold is set
            if self.rssi_threshold is None or tag_info.rssi >= self.rssi_threshold:
                self.tag_callback("MultiSensorManager", reader_id, tag_info)
    
    def _initialize_readers(self) -> None:
        """Initialize RFID readers from available ports"""
        self.readers.clear()
        
        # Find all available ports
        all_ports = serial.tools.list_ports.comports()
        
        # Select only ports with VID 11CA or 10C4 (common for RFID readers)
        sensor_ports = [
            port.device for port in all_ports if port.vid == 0x11CA or port.vid == 0x10C4
        ]
        
        # Create readers
        for i, port in enumerate(sensor_ports):
            reader_id = f"Sensor-{i+1}"
            reader = RFIDReader(port, reader_id=reader_id)
            reader.set_tag_callback(lambda reader_id, tag_info: self._on_tag_detected(reader_id, tag_info))
            self.readers.append(reader)
        
        self.logger.info(f"{len(self.readers)} sensors initialized")
    
    def run_polling_cycle(self, timeout: float = 5.0) -> Dict[str, Set[str]]:
        """
        Run one polling cycle on all readers
        
        Args:
            timeout: Maximum time to wait for tags (seconds)
            
        Returns:
            Dictionary mapping reader IDs to sets of detected tag IDs
        """
        results: Dict[str, Set[str]] = {}
        
        self.logger.info(f"Starting polling cycle with {len(self.readers)} readers")
        
        # Run readers sequentially to prevent interference
        for reader in self.readers:
            # Reset reader state before starting a new cycle
            reader.reset()
            
            # Check connection and reconnect if needed
            if not reader.connection.is_connected():
                self.logger.warning(f"{reader.reader_id} not connected, attempting to reconnect")
                reader.connection.connect()
                time.sleep(0.5)  # Give some time for connection to stabilize
            
            # Start polling with detailed logging
            self.logger.debug(f"Starting multiple polling for {reader.reader_id} with count={self.polling_count}")
            success = reader.start_multiple_polling(self.polling_count)
            
            if not success:
                self.logger.error(f"Failed to start polling for {reader.reader_id}")
                results[reader.reader_id] = set()
                continue
                
            self.logger.debug(f"Polling started for {reader.reader_id}, waiting up to {timeout} seconds")
            
            # Wait for polling to complete or timeout
            start_time = time.time()
            while reader.is_polling and time.time() - start_time < timeout:
                # Check if any data is available
                in_waiting = reader.connection.get_in_waiting()
                if in_waiting > 0:
                    self.logger.debug(f"{reader.reader_id} has {in_waiting} bytes waiting")
                time.sleep(0.1)  # Short sleep to prevent CPU hogging
            
            # Stop polling if still active
            if reader.is_polling:
                reader.stop_multiple_polling()
                self.logger.warning(f"Polling timed out for {reader.reader_id} after {timeout} seconds")
            
            # Store results
            detected_tags = set(reader.get_detected_tags())
            results[reader.reader_id] = detected_tags
            self.logger.info(f"{reader.reader_id}: {len(detected_tags)} tags")
        
        return results
    
    def get_all_tags(self) -> Dict[str, Dict[str, TagInfo]]:
        """
        Get all detected tags from all readers
        
        Returns:
            Dictionary mapping reader IDs to dictionaries of tag IDs and TagInfo objects
        """
        all_tags: Dict[str, Dict[str, TagInfo]] = {}
        
        for reader in self.readers:
            reader_tags = {}
            for tag_id in reader.get_detected_tags():
                tag_info = reader.get_tag_info(tag_id)
                if tag_info:
                    reader_tags[tag_id] = tag_info
            all_tags[reader.reader_id] = reader_tags
        
        return all_tags
    
    def cleanup(self) -> None:
        """Clean up resources"""
        for reader in self.readers:
            reader.close()
        self.readers.clear()