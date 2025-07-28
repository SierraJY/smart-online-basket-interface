#!/usr/bin/env python3
"""
YRM100 RFID reader class
Handles connection, reading, and data parsing for individual RFID readers.
"""

import logging
from typing import Optional, List, Any

from rfid_system.core.events import SensorEvent, SensorObserver
from rfid_system.config.constants import PollingMode
from rfid_system.models.tag_models import EPCTag
from rfid_system.sensors.connection_handler import ConnectionHandler
from rfid_system.sensors.frame_processor import FrameProcessor
from rfid_system.sensors.command_handler import CommandHandler
from rfid_system.sensors.reading_loop import ReadingLoopHandler


class RFIDReader:
    """YRM100 RFID reader class - Facade for all reader components"""

    def __init__(
        self, port: str, baudrate: int = 115200, reader_id: Optional[str] = None
    ):
        """
        Initialize YRM100 RFID reader

        Args:
            port (str): Serial port (e.g., '/dev/ttyUSB0')
            baudrate (int): Communication speed (default: 115200)
            reader_id (str): Reader identifier
        """
        # Basic properties
        self.port = port
        self.baudrate = baudrate
        self.reader_id = reader_id or port
        
        # Observer pattern implementation
        self.observers: List[SensorObserver] = []
        
        # Logger setup
        self.logger = logging.getLogger(f"RFIDReader-{self.reader_id}")
        # Don't add handlers - rely on the root logger configuration from main.py
        
        # Initialize components
        self.frame_processor = FrameProcessor(self.logger)
        self.connection_handler = ConnectionHandler(
            port=port,
            baudrate=baudrate,
            reader_id=self.reader_id,
            logger=self.logger,
            observer_notifier=self.notify_observers
        )
        self.command_handler = CommandHandler(
            connection_handler=self.connection_handler,
            frame_processor=self.frame_processor,
            logger=self.logger
        )
        self.reading_loop_handler = ReadingLoopHandler(
            connection_handler=self.connection_handler,
            command_handler=self.command_handler,
            frame_processor=self.frame_processor,
            reader_id=self.reader_id,
            logger=self.logger,
            observer_notifier=self.notify_observers
        )

    def connect(self) -> bool:
        """Establish serial connection (connection only)"""
        return self.connection_handler.connect()

    def disconnect(self) -> None:
        """Close serial connection"""
        self.connection_handler.disconnect()

    def add_observer(self, observer: SensorObserver) -> None:
        """Add observer"""
        if observer not in self.observers:
            self.observers.append(observer)
            self.logger.debug(f"Observer added: {type(observer).__name__}")

    def remove_observer(self, observer: SensorObserver) -> None:
        """Remove observer"""
        if observer in self.observers:
            self.observers.remove(observer)
            self.logger.debug(f"Observer removed: {type(observer).__name__}")

    def notify_observers(self, event_type: str, data: Any = None) -> None:
        """Notify all observers of an event"""
        for observer in self.observers:
            try:
                observer.on_sensor_event(event_type, self.reader_id, data)
            except Exception as e:
                self.logger.error(f"Observer notification error ({type(observer).__name__}): {e}")

    def set_polling_mode(
        self, mode: PollingMode = PollingMode.SINGLE, interval: float = 1.0
    ) -> None:
        """
        Set polling mode

        Args:
            mode (PollingMode): SINGLE or MULTIPLE
            interval (float): Polling interval (seconds)
        """
        self.command_handler.set_polling_mode(mode, interval)

    def initialize_reader(
        self, power_dbm: int = 26, enable_hopping: bool = True, region: str = "Korea"
    ) -> bool:
        """
        Initialize reader: Set transmitting power, frequency hopping, work area

        Args:
            power_dbm: Transmitting power (dBm)
            enable_hopping: Whether to enable frequency hopping
            region: Work area

        Returns:
            bool: Initialization success
        """
        return self.command_handler.initialize_reader(power_dbm, enable_hopping, region)

    # Delegate EPC-related methods to frame processor
    def parse_epc_structure(self, epc_hex: str) -> Optional[EPCTag]:
        """Parse 96-bit EPC into structured information"""
        return self.frame_processor.parse_epc_structure(epc_hex)

    def get_epc_summary(self, epc_hex: str) -> str:
        """Return summary information for an EPC"""
        return self.frame_processor.get_epc_summary(epc_hex)

    def is_same_product_batch(self, epc1: str, epc2: str) -> bool:
        """Check if two EPCs are from the same product batch"""
        return self.frame_processor.is_same_product_batch(epc1, epc2)

    def start_reading(
        self,
        polling_mode: str = "single",
        polling_interval: float = 1.0,
        count: int = 100,
    ) -> bool:
        """
        Start tag reading

        Args:
            polling_mode (str): 'single' or 'multiple'
            polling_interval (float): Polling interval (seconds, used only in single mode)
            count (int): Multi-polling count (used only in multiple mode)
        """
        return self.reading_loop_handler.start_reading(polling_mode, polling_interval, count)

    def stop_reading(self) -> None:
        """Stop tag reading"""
        self.reading_loop_handler.stop_reading()

    def stop_reading_and_cleanup(self) -> bool:
        """
        Complete resource cleanup - release threads, ports, and states

        Returns:
            bool: Cleanup success
        """
        return self.reading_loop_handler.stop_reading_and_cleanup()

    def __enter__(self) -> "RFIDReader":
        """Context manager entry"""
        if self.start_reading():
            return self
        else:
            raise RuntimeError(f"Failed to start RFID reader {self.reader_id}")

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> bool:
        """Context manager exit"""
        self.stop_reading_and_cleanup()
        return False  # Propagate exceptions 