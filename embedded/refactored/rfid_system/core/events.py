#!/usr/bin/env python3
"""
Core event system for RFID sensors
Defines event types and observer pattern interfaces
"""

from typing import Any, Protocol


class SensorEvent:
    """Sensor event type constants"""
    STARTED = "started"
    COMPLETED = "completed"
    ERROR = "error"
    TIMEOUT = "timeout"
    TAG_DETECTED = "tag_detected"
    CONNECTION_LOST = "connection_lost"
    CONNECTION_RESTORED = "connection_restored"


class SensorObserver(Protocol):
    """Sensor event observer interface"""
    
    def on_sensor_event(self, event_type: str, sensor_id: str, data: Any = None) -> None:
        """
        Called when a sensor event occurs

        Args:
            event_type: Event type (SensorEvent constant)
            sensor_id: Sensor identifier
            data: Event related data (optional)
        """
        ... 