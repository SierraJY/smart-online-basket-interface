"""
Multi-sensor manager for RFID readers
"""

import logging
import time
import serial.tools.list_ports
from typing import List, Dict, Set, Optional, Callable

from rfid_minimal.sensors.rfid_reader import RFIDReader
from rfid_minimal.core.models import TagInfo
from rfid_minimal.utils.frequency_calculator import get_frequency_info

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
        
        sensor_ports = self._get_available_sensor_ports()
        
        # Create readers
        for i, port in enumerate(sensor_ports):
            reader_id = f"Sensor-{i+1}"
            reader = RFIDReader(port, reader_id=reader_id)
            reader.set_tag_callback(lambda reader_id, tag_info: self._on_tag_detected(reader_id, tag_info))
            self.readers.append(reader)
        
        self.logger.info(f"{len(self.readers)} sensors initialized")
        
        # Configure all readers
        self.configure_readers()

    def _get_available_sensor_ports(self) -> List[str]:
        """Return a list of device paths for connected RFID readers by VID."""
        all_ports = serial.tools.list_ports.comports()
        sensor_ports = []
        for port in all_ports:
            try:
                if port.vid in (0x11CA, 0x10C4):
                    sensor_ports.append(port.device)
            except Exception:
                # Some platforms may not expose VID
                continue
        return sensor_ports

    def refresh_readers(self) -> None:
        """Rescan available ports and update readers accordingly (add/remove)."""
        current_ports = set(self._get_available_sensor_ports())
        existing_ports = set(reader.port for reader in self.readers) if self.readers else set()

        # Remove readers whose ports disappeared
        if existing_ports - current_ports:
            for reader in list(self.readers):
                if reader.port not in current_ports:
                    try:
                        reader.close()
                    except Exception:
                        pass
                    self.readers.remove(reader)
            self.logger.warning(f"Removed readers for disconnected ports: {sorted(existing_ports - current_ports)}")

        # Add readers for new ports
        new_ports = current_ports - existing_ports
        for port in new_ports:
            try:
                reader_id = f"Sensor-{len(self.readers)+1}"
                reader = RFIDReader(port, reader_id=reader_id)
                reader.set_tag_callback(lambda reader_id, tag_info: self._on_tag_detected(reader_id, tag_info))
                self.readers.append(reader)
                self.logger.info(f"Added reader for new port: {port}")
            except Exception as e:
                self.logger.error(f"Failed to add reader for port {port}: {e}")
        
        # Reconfigure if the set changed
        if new_ports or (existing_ports - current_ports):
            self.configure_readers()
        
    def configure_readers(self, work_area: int = 6, freq_hopping: int = 1, power_dbm: int = 26, channel_index: int = 1) -> None:
        """
        Configure all readers with the specified settings
        
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
        """
        # Get frequency information using the utility function
        freq_info = get_frequency_info(work_area, channel_index)
        region_name = freq_info["region_name"]
        
        # Format frequency information for logging
        channel_info = ""
        if "frequency_str" in freq_info and not freq_hopping:
            channel_info = f", channel={channel_index}, freq={freq_info['frequency_str']}"
            
        self.logger.info(f"Configuring {len(self.readers)} readers: region={region_name}, freq_hopping={'enabled' if freq_hopping else 'disabled'}, power={power_dbm}dBm{channel_info}")
        
        for reader in self.readers:
            try:
                if not reader.connection.is_connected():
                    reader.connection.connect()
                
                success = reader.configure_reader(work_area, freq_hopping, power_dbm, channel_index)
                if success:
                    self.logger.info(f"{reader.reader_id}: Configuration successful")
                else:
                    self.logger.warning(f"{reader.reader_id}: Configuration failed")
            except Exception as e:
                self.logger.error(f"Error configuring reader {reader.reader_id}: {e}")
                
        # Wait a moment for all readers to apply settings
        time.sleep(0.5)
    
    def run_polling_cycle(self, timeout: float = 0.5) -> Dict[str, Set[str]]:
        """
        Run one polling cycle on all readers
        
        Args:
            timeout: Maximum time to wait for tags (seconds)
            
        Returns:
            Dictionary mapping reader IDs to sets of detected tag IDs
        """
        results: Dict[str, Set[str]] = {}
        
        self.logger.info(f"Starting polling cycle with {len(self.readers)} readers")
        
        # Refresh readers before starting the cycle to reflect hotplug changes
        try:
            self.refresh_readers()
        except Exception as e:
            self.logger.debug(f"Reader refresh skipped/failed: {e}")

        # Start all readers simultaneously for faster operation
        active_readers = []
        for reader in self.readers:
            # Check connection and reconnect if needed
            if not reader.connection.is_connected():
                self.logger.warning(f"{reader.reader_id} not connected, attempting to reconnect")
                reader.connection.connect()
                time.sleep(0.1)  # Give some time for connection to stabilize
                
            # We'll skip the explicit reset() call here since start_multiple_polling will handle it
            
            # Start polling with detailed logging
            self.logger.debug(f"Starting multiple polling for {reader.reader_id} with count={self.polling_count}")
            success = reader.start_multiple_polling(self.polling_count)
            
            if not success:
                self.logger.error(f"Failed to start polling for {reader.reader_id}")
                results[reader.reader_id] = set()
                continue
                
            self.logger.debug(f"Polling started for {reader.reader_id}")
            active_readers.append(reader)
        
        # Now wait for all readers to complete in parallel
        if active_readers:
            self.logger.debug(f"Waiting for {len(active_readers)} readers to complete polling (timeout: {timeout}s)")
            
            start_time = time.time()
            check_interval = 0.2  # Check status more frequently
            
            # Continue until all readers are done or timeout
            while active_readers and time.time() - start_time < timeout:
                # Check each active reader
                for reader in list(active_readers):  # Use a copy of the list for safe removal
                    # Check if reader is still polling
                    if not reader.is_polling():
                        self.logger.debug(f"{reader.reader_id} polling completed naturally")
                        active_readers.remove(reader)
                        continue
                    
                    # Check for data in buffer
                    in_waiting = reader.connection.get_in_waiting()
                    if in_waiting > 0:
                        self.logger.debug(f"{reader.reader_id} has {in_waiting} bytes in buffer")
                
                # Short sleep between checks
                time.sleep(0.05)  # Reduced sleep time for faster response
            
            # Stop any readers that are still active
            for reader in active_readers:
                try:
                    self.logger.warning(f"Polling timed out for {reader.reader_id} after {timeout} seconds")
                    reader.stop_multiple_polling()
                except Exception as e:
                    self.logger.debug(f"Error stopping {reader.reader_id}: {e}")
        
        # Collect results from all readers and build best TagInfo map
        best_tag_info_map: Dict[str, TagInfo] = {}
        for reader in self.readers:
            detected_tags = set(reader.get_detected_tags())
            results[reader.reader_id] = detected_tags

            # Log per-reader counts at INFO, per-tag details at DEBUG
            if detected_tags:
                self.logger.info("%s: %d tags detected", reader.reader_id, len(detected_tags))
                for tag_id in detected_tags:
                    tag_info = reader.get_tag_info(tag_id)
                    if tag_info:
                        # Keep strongest RSSI per tag across readers
                        prev = best_tag_info_map.get(tag_id)
                        if prev is None or tag_info.rssi > prev.rssi:
                            best_tag_info_map[tag_id] = tag_info
                        self.logger.debug("  - Tag: %s (RSSI: %s)", tag_id, tag_info.rssi)
            else:
                self.logger.info("%s: No tags detected", reader.reader_id)

        # Expose last cycle's best tag map for downstream consumers (e.g., CartManager)
        try:
            self.last_tag_info_map = best_tag_info_map  # type: ignore[attr-defined]
        except Exception:
            pass
        
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