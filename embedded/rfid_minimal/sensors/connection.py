"""
Serial connection handler for RFID readers
"""

import logging
import serial
from typing import Optional

from rfid_minimal.config.constants import NO_RESPONSE_TIMEOUT

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
            # Close existing connection if open
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.close()
                self.logger.debug(f"{self.reader_id}: Closed existing connection before reconnecting")
                time.sleep(0.5)  # Give port time to close properly
            
            # Try different settings if needed
            try:
                self.logger.debug(f"{self.reader_id}: Attempting connection to {self.port} at {self.baudrate} baud")
                self.serial_conn = serial.Serial(
                    port=self.port,
                    baudrate=self.baudrate,
                    bytesize=serial.EIGHTBITS,
                    parity=serial.PARITY_NONE,
                    stopbits=serial.STOPBITS_ONE,
                    timeout=NO_RESPONSE_TIMEOUT,
                    write_timeout=1.0,  # Add write timeout
                    dsrdtr=False,       # Disable hardware flow control
                    rtscts=False,       # Disable hardware flow control
                    xonxoff=False       # Disable software flow control
                )
                
                # Set RTS and DTR lines - some devices need this
                self.serial_conn.setRTS(True)
                self.serial_conn.setDTR(True)
                
                # Clear buffers
                self.serial_conn.reset_input_buffer()
                self.serial_conn.reset_output_buffer()
                
                self.logger.info(f"Connected to {self.port}")
                return True
            except Exception as first_attempt_error:
                # If first attempt fails, try with different settings
                self.logger.warning(f"{self.reader_id}: First connection attempt failed: {first_attempt_error}")
                self.logger.debug(f"{self.reader_id}: Trying alternative settings...")
                
                # Try with different flow control settings
                self.serial_conn = serial.Serial(
                    port=self.port,
                    baudrate=self.baudrate,
                    bytesize=serial.EIGHTBITS,
                    parity=serial.PARITY_NONE,
                    stopbits=serial.STOPBITS_ONE,
                    timeout=NO_RESPONSE_TIMEOUT,
                    dsrdtr=True,        # Enable hardware flow control
                    rtscts=True         # Enable hardware flow control
                )
                
                self.logger.info(f"Connected to {self.port} with alternative settings")
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
            self.logger.debug(f"{self.reader_id}: Not connected, cannot read data")
            return b''
            
        try:
            if size is None:
                # Read all available data
                in_waiting = self.serial_conn.in_waiting
                if in_waiting > 0:
                    self.logger.debug(f"{self.reader_id}: Reading {in_waiting} bytes from buffer")
                    return self.serial_conn.read(in_waiting)
                return b''
            else:
                # Read specific number of bytes
                self.logger.debug(f"{self.reader_id}: Reading {size} bytes")
                return self.serial_conn.read(size)
        except Exception as e:
            self.logger.error(f"{self.reader_id}: Error reading data: {e}")
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
            self.logger.warning(f"{self.reader_id}: Not connected, cannot write data")
            return False
            
        try:
            self.logger.debug(f"{self.reader_id}: Writing {len(data)} bytes: {data.hex()}")
            # Match the old implementation - just call write() without checking return value
            self.serial_conn.write(data)
            # Flush to ensure data is sent immediately - this is critical
            self.serial_conn.flush()
            # Reset the input buffer to clear any pending data
            self.serial_conn.reset_input_buffer()
            return True
        except Exception as e:
            self.logger.error(f"{self.reader_id}: Error writing data: {e}")
            return False
    
    def get_in_waiting(self) -> int:
        """
        Get number of bytes in the input buffer
        
        Returns:
            int: Number of bytes
        """
        if not self.is_connected():
            return 0
            
        try:
            return self.serial_conn.in_waiting
        except Exception:
            return 0