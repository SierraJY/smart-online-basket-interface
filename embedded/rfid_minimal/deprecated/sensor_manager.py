"""
Multi-sensor manager for RFID readers
"""

import logging
import time
import serial.tools.list_ports
from typing import List, Dict, Set, Optional, Callable

from rfid_minimal.rfid_reader import RFIDReader, TagInfo

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
            
            # Make sure connection is established
            if not reader.connection.is_connected():
                reader.connection.connect()
                # Give the connection time to stabilize
                time.sleep(0.2)
            
            self.logger.info(f"Polling {reader.reader_id} ({reader.port})...")
            
            # Start reading
            detected_tags = reader.start_reading(self.polling_count, timeout)
            
            # Store results
            results[reader.reader_id] = detected_tags
            
            # Filter by RSSI if threshold is set
            if self.rssi_threshold is not None:
                filtered_tags = {
                    tag_id for tag_id in detected_tags
                    if reader.get_tag_info(tag_id) and reader.get_tag_info(tag_id).rssi >= self.rssi_threshold
                }
                
                self.logger.info(
                    f"{reader.reader_id} detected {len(detected_tags)} tags, "
                    f"{len(filtered_tags)} above RSSI threshold {self.rssi_threshold}"
                )
            else:
                self.logger.info(f"{reader.reader_id} detected {len(detected_tags)} tags")
        
        return results
    
    def get_all_tags(self) -> Dict[str, Dict[str, TagInfo]]:
        """
        Get all detected tags from all readers
        
        Returns:
            Dictionary mapping reader IDs to dictionaries of tag IDs and TagInfo objects
        """
        results = {}
        
        for reader in self.readers:
            results[reader.reader_id] = reader.get_all_tags()
        
        return results
    
    def cleanup(self) -> None:
        """Clean up resources"""
        for reader in self.readers:
            # Make sure to disconnect when cleaning up
            reader.stop_reading(disconnect=True)
        
        self.logger.info("All readers stopped") 