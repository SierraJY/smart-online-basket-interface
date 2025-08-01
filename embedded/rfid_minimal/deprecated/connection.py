"""
Serial connection handler for RFID readers
"""

import logging
import serial
from typing import Optional

from rfid_minimal.constants import NO_RESPONSE_TIMEOUT

class ConnectionHandler:
    """Handles serial connection for RFID readers"""
    
    def __init__(self, port: str, baudrate: int = 115200, reader_id: str = None):
        """
        Initialize connection handler
        
        Args:
            port: Serial port path
            baudrate: Communication speed
            reader_id: Reader identifier
        """
        self.port = port
        self.baudrate = baudrate
        self.reader_id = reader_id or port
        self.logger = logging.getLogger("rfid_minimal")
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
                timeout=NO_RESPONSE_TIMEOUT,
            )
            self.logger.info(f"Connected to {self.port}")
            return True

        except serial.SerialException as e:
            self.logger.error(f"Serial connection failed: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected connection error: {e}")
            return False
    
    def disconnect(self) -> None:
        """Close serial connection"""
        try:
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.close()
                self.logger.info(f"Connection to {self.port} closed")
        except Exception as e:
            self.logger.error(f"Error during disconnection: {e}")
    
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