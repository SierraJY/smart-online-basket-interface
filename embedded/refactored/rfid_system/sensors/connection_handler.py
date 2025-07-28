#!/usr/bin/env python3
"""
Serial connection handler for RFID readers
"""

import serial
import logging
from typing import Optional

from rfid_system.core.events import SensorEvent, SensorObserver
from rfid_system.config.constants import YRM100Constants


class ConnectionHandler:
    """Handles serial connection for RFID readers"""
    
    def __init__(
        self, 
        port: str, 
        baudrate: int, 
        reader_id: str,
        logger: logging.Logger,
        observer_notifier: callable
    ):
        """
        Initialize connection handler
        
        Args:
            port: Serial port path
            baudrate: Communication speed
            reader_id: Reader identifier
            logger: Logger instance
            observer_notifier: Function to notify observers
        """
        self.port = port
        self.baudrate = baudrate
        self.reader_id = reader_id
        self.logger = logger
        self.notify_observers = observer_notifier
        self.serial_conn: Optional[serial.Serial] = None
    
    def connect(self) -> bool:
        """Establish serial connection"""
        try:
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=YRM100Constants.NO_RESPONSE_TIMEOUT,
            )
            self.logger.info(f"Connected: {self.port}")
            self.notify_observers(SensorEvent.CONNECTION_RESTORED)
            return True

        except serial.SerialException as e:
            self.logger.error(f"Serial connection failed: {e}")
            self.notify_observers(SensorEvent.ERROR, str(e))
            return False
        except (OSError, ValueError) as e:
            self.logger.error(f"Connection setup error: {e}")
            self.notify_observers(SensorEvent.ERROR, str(e))
            return False
        except Exception as e:
            self.logger.error(f"Unexpected connection error: {e}")
            self.notify_observers(SensorEvent.ERROR, str(e))
            return False
    
    def disconnect(self) -> None:
        """Close serial connection"""
        try:
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.close()
                self.logger.info("Connection closed")
        except (serial.SerialException, OSError) as e:
            self.logger.error(f"Error during disconnection: {e}")
        except Exception as e:
            self.logger.error(f"Unexpected disconnection error: {e}")
    
    def is_connected(self) -> bool:
        """Check if serial connection is established and open"""
        return self.serial_conn is not None and self.serial_conn.is_open
    
    def read_data(self, size: Optional[int] = None) -> bytes:
        """
        Read data from serial connection
        
        Args:
            size: Number of bytes to read, or None to read all available
            
        Returns:
            bytes: Read data
        """
        if not self.is_connected():
            return b''
            
        try:
            if size is None:
                # Read all available data
                if self.serial_conn.in_waiting > 0:
                    return self.serial_conn.read(self.serial_conn.in_waiting)
                return b''
            else:
                # Read specific number of bytes
                return self.serial_conn.read(size)
        except Exception as e:
            self.logger.error(f"Error reading data: {e}")
            return b''
    
    def write_data(self, data: bytes) -> bool:
        """
        Write data to serial connection
        
        Args:
            data: Data to write
            
        Returns:
            bool: Success status
        """
        if not self.is_connected():
            return False
            
        try:
            self.serial_conn.write(data)
            return True
        except Exception as e:
            self.logger.error(f"Error writing data: {e}")
            return False
    
    def get_in_waiting(self) -> int:
        """Get number of bytes in the input buffer"""
        if not self.is_connected():
            return 0
            
        try:
            return self.serial_conn.in_waiting
        except Exception:
            return 0 