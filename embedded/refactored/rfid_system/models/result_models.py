#!/usr/bin/env python3
"""
Data models for sensor results
"""

from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional
from datetime import datetime


@dataclass
class SensorResult:
    """Individual sensor polling result"""
    sensor_id: str
    port: str
    detected_tags: Set[str] = field(default_factory=set)
    tag_rssi_map: Dict[str, int] = field(default_factory=dict)  # Tag-specific RSSI information
    qualified_tags: Set[str] = field(default_factory=set)  # Only tags with RSSI >= threshold
    tag_count: int = 0
    qualified_count: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    status: str = "waiting"  # waiting, running, completed, error, timeout


@dataclass
class SmartCycleResult:
    """Confidence-based cycle result"""
    cycle_number: int
    sensor_results: List[SensorResult]

    # Original results
    total_unique_tags: Set[str] = field(default_factory=set)
    total_tag_count: int = 0

    # Confidence-based classification
    confirmed_tags: Set[str] = field(default_factory=set)  # Confirmed tags detected this time
    suspected_tags: Set[str] = field(default_factory=set)  # Suspected tags from before but not detected this time
    removed_tags: Set[str] = field(default_factory=set)  # Completely removed tags
    new_tags: Set[str] = field(default_factory=set)  # Newly discovered tags

    # Time information
    cycle_start_time: Optional[datetime] = None
    cycle_end_time: Optional[datetime] = None
    cycle_duration_ms: Optional[float] = None

    # Quality information
    rssi_filtered_tags: Set[str] = field(default_factory=set)  # Only tags with RSSI >= threshold
    total_rssi_qualified_count: int = 0 