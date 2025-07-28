#!/usr/bin/env python3
"""
Multi-sensor polling manager
Coordinates multiple sensors for simultaneous multi-polling and aggregates results.
"""

import time
import threading
import logging
import serial.tools.list_ports
from typing import List, Dict, Set, Optional
from datetime import datetime

from rfid_system.core.events import SensorEvent, SensorObserver
from rfid_system.config.constants import TagStatus
from rfid_system.sensors.rfid_reader import RFIDReader
from rfid_system.models.tag_models import TagHistory
from rfid_system.models.result_models import SensorResult, SmartCycleResult


class MultiSensorManager(SensorObserver):
    """Multi-sensor polling manager - Observer pattern implementation"""

    def __init__(
        self,
        polling_count: int,
        rssi_threshold: int,
        max_cycle_length: int = 10,
        removal_threshold: int = 4,
        consecutive_miss_threshold: int = 3,  # Consecutive miss threshold
        polling_timeout: float = 10.0,
    ):
        print("MultiSensorManager initialized")
        """
        Initialize multi-sensor manager

        Args:
            polling_count: Multi-polling count for each sensor
            rssi_threshold: RSSI threshold for reliable tags (default: -55dBm)
            max_cycle_length: Maximum cycle history length (default: 10)
            removal_threshold: Removal condition (default: 4)
            consecutive_miss_threshold: Consecutive miss threshold (confirmed->suspected, default: 3)
            polling_timeout: Polling timeout (seconds, default: 10.0)
        """
        self.sensor_ports: List[str] = []  # Sensor port list
        self.polling_count = polling_count
        self.rssi_threshold = rssi_threshold
        self.readers: List[RFIDReader] = []
        self.sensor_results: Dict[str, SensorResult] = {}  # Performance optimization: O(1) lookup
        self.cycle_number = 0
        self.is_running = False
        self.max_cycle_length = max_cycle_length  # Maximum cycle history length
        self.removal_threshold = removal_threshold  # Removal condition, default 4
        self.consecutive_miss_threshold = (
            consecutive_miss_threshold  # Consecutive miss threshold
        )
        self.polling_timeout = polling_timeout  # Polling timeout (seconds)

        # Confidence-based tag management
        self.tag_histories: Dict[str, TagHistory] = {}  # Tag-specific history
        self.cycle_qualified_tags: List[Set[str]] = []  # Recent cycle qualified tag records

        # Synchronization locks and events
        self.results_lock = threading.Lock()
        self.completion_events: Dict[str, threading.Event] = {}  # Sensor-specific completion events

        # Logger setup
        self.logger = logging.getLogger("MultiSensorManager")
        # Don't add handlers - rely on the root logger configuration from main.py

        # Initialize sensors
        self._initialize_sensors()

    def _initialize_sensors(self):
        """Initialize sensors"""
        self.readers.clear()
        self.sensor_results.clear()
        
        # Set up sensor ports
        # Check all available ports
        all_ports = serial.tools.list_ports.comports()
        
        # Select only ports with VID 11CA
        self.sensor_ports = [
            port.device for port in all_ports if port.vid == 0x11CA or port.vid == 0x10C4
        ]

        for i, port in enumerate(self.sensor_ports):
            # Create RFID reader
            reader_id = f"Sensor-{i+1}"
            reader = RFIDReader(port, reader_id=reader_id)

            # Register observer (event-based monitoring)
            reader.add_observer(self)

            self.readers.append(reader)

            # Create object for storing results - store in dictionary with sensor_id as key
            sensor_result = SensorResult(sensor_id=reader_id, port=port)
            self.sensor_results[reader_id] = sensor_result

        self.logger.info(f"{len(self.sensor_ports)} sensors initialized")

    def on_sensor_event(self, event_type: str, sensor_id: str, data=None) -> None:
        """Process sensor events (Observer pattern implementation)"""
        try:
            if event_type == SensorEvent.STARTED:
                self.logger.debug(f"{sensor_id} polling started")

            elif event_type == SensorEvent.COMPLETED:
                # Set completion event (event-based synchronization)
                if sensor_id in self.completion_events:
                    self.completion_events[sensor_id].set()

                if data:
                    total_tags = data.get("total_tags", 0)
                    reason = data.get("completion_reason", "unknown")
                    self.logger.info(
                        f"{sensor_id} polling completed - {total_tags} tags, reason: {reason}"
                    )

            elif event_type == SensorEvent.TAG_DETECTED:
                if data:
                    tag_id = data.get("tag_id", "unknown")
                    tag_count = data.get("tag_count", 0)
                    rssi = data.get("rssi", -100)  # Extract RSSI information

                    # Store tag in sensor's results - O(1) direct access
                    with self.results_lock:
                        if sensor_id in self.sensor_results:
                            result = self.sensor_results[sensor_id]
                            # Store all tags (including RSSI information)
                            result.detected_tags.add(tag_id)
                            result.tag_rssi_map[tag_id] = rssi
                            result.tag_count = len(result.detected_tags)

                            # Separately manage tags above RSSI threshold
                            if rssi >= self.rssi_threshold:
                                result.qualified_tags.add(tag_id)
                                result.qualified_count = len(result.qualified_tags)
                                self.logger.debug(
                                    f"{sensor_id}: Quality tag detected #{result.qualified_count} - {tag_id} (RSSI: {rssi})"
                                )
                            else:
                                self.logger.debug(
                                    f"{sensor_id}: Low quality tag detected - {tag_id} (RSSI: {rssi} < {self.rssi_threshold})"
                                )

                    self.logger.debug(
                        f"{sensor_id} real-time tag detection: #{tag_count} - {tag_id} (RSSI: {rssi})"
                    )

            elif event_type == SensorEvent.ERROR:
                error_msg = data if isinstance(data, str) else "Unknown error"
                self.logger.warning(f"{sensor_id} error: {error_msg}")

            elif event_type == SensorEvent.CONNECTION_LOST:
                self.logger.warning(f"{sensor_id} connection lost")

            elif event_type == SensorEvent.CONNECTION_RESTORED:
                self.logger.info(f"{sensor_id} connection restored")

        except KeyError as e:
            self.logger.error(f"Sensor ID error ({sensor_id}, {event_type}): {e}")
        except (AttributeError, TypeError) as e:
            self.logger.error(f"Data type error ({sensor_id}, {event_type}): {e}")
        except Exception as e:
            self.logger.error(
                f"Unexpected event processing error ({sensor_id}, {event_type}): {e}"
            )

    def start_cycle(self) -> SmartCycleResult:
        """Start one cycle of polling and return results"""
        with self.results_lock:
            if self.is_running:
                raise RuntimeError("Cycle already running")
            self.is_running = True
            self.cycle_number += 1

        cycle_start_time = datetime.now()

        # Reset sensor results
        for result in self.sensor_results.values():
            result.detected_tags.clear()
            result.tag_rssi_map.clear()
            result.qualified_tags.clear()
            result.tag_count = 0
            result.qualified_count = 0
            result.start_time = None
            result.end_time = None
            result.duration_ms = None
            result.status = "waiting"

        self.logger.info(
            f"=== Cycle #{self.cycle_number} started ({len(self.readers)} sensors, {self.polling_count} count) ==="
        )

        # Run sensors sequentially (prevent interference)
        for i, reader in enumerate(self.readers):
            reader_id = f"Sensor-{i+1}"
            self.logger.info(f"{reader_id} polling started...")
            self._run_sensor_polling(reader_id, reader)
            self.logger.info(f"{reader_id} polling completed")

        cycle_end_time = datetime.now()
        cycle_duration = (cycle_end_time - cycle_start_time).total_seconds() * 1000

        # Aggregate results (confidence-based)
        cycle_result = self._compile_smart_cycle_results(
            cycle_start_time, cycle_end_time, cycle_duration
        )

        with self.results_lock:
            self.is_running = False

        self.logger.info(f"=== Cycle #{self.cycle_number} completed ===")
        self._log_smart_cycle_summary(cycle_result)

        return cycle_result

    def _run_sensor_polling(self, sensor_id: str, reader: RFIDReader):
        """Run polling for an individual sensor (sequential execution)"""
        try:
            result = self.sensor_results[sensor_id]
            result.status = "running"
            result.start_time = datetime.now()

            # Prepare completion event (event-based synchronization)
            completion_event = threading.Event()
            self.completion_events[result.sensor_id] = completion_event

            # Start multi-polling
            success = reader.start_reading("multiple", count=self.polling_count)

            if not success:
                result.status = "error"
                self.logger.error(f"{result.sensor_id}: Failed to start polling")
                return

            # Event-based completion wait - No need to know Reader's thread implementation!
            completed = completion_event.wait(timeout=self.polling_timeout)

            if not completed:
                self.logger.warning(
                    f"{result.sensor_id}: {self.polling_timeout} second timeout - Force termination"
                )
                result.status = "timeout"
                return

            # Completion processing
            result.end_time = datetime.now()
            result.status = "completed"

            if result.start_time:
                duration = (result.end_time - result.start_time).total_seconds() * 1000
                result.duration_ms = duration

            self.logger.info(
                f"{result.sensor_id} completed: {result.tag_count} tags, "
                f"{result.duration_ms:.1f}ms"
            )

        except Exception as e:
            self.logger.error(f"{sensor_id}: Polling error - {e}")
            self.sensor_results[sensor_id].status = "error"
        finally:
            # Clean up completion event
            if sensor_id in self.completion_events:
                del self.completion_events[sensor_id]

            # Use encapsulated cleanup method - Simple and safe!
            cleanup_success = reader.stop_reading_and_cleanup()
            if not cleanup_success:
                self.logger.warning(f"{sensor_id} resource cleanup failed")

    def _compile_smart_cycle_results(
        self, start_time: datetime, end_time: datetime, duration: float
    ) -> SmartCycleResult:
        """Compile confidence-based cycle results"""

        # 1. Collect tags that meet RSSI quality in this cycle
        current_qualified_tags = set()
        all_unique_tags = set()

        for result in self.sensor_results.values():
            # All tags (regardless of quality)
            all_unique_tags.update(result.detected_tags)
            # Only quality tags
            current_qualified_tags.update(result.qualified_tags)

        # 2. Update cycle-specific quality tag records
        self.cycle_qualified_tags.append(current_qualified_tags.copy())
        # Maintain only up to max cycle history length
        if len(self.cycle_qualified_tags) > self.max_cycle_length:
            self.cycle_qualified_tags.pop(0)

        # 3. Update tag histories and classify status (inertia-based)
        confirmed_tags = set()
        suspected_tags = set()
        removed_tags = set()
        new_tags = set()

        # Update existing tag states (apply inertia logic)
        for tag_id, history in self.tag_histories.items():
            detected_this_cycle = tag_id in current_qualified_tags

            # Collect RSSI information
            rssi = None
            if detected_this_cycle:
                for result in self.sensor_results.values():
                    if tag_id in result.tag_rssi_map:
                        rssi = result.tag_rssi_map[tag_id]
                        break

            # Update history (including consecutive miss counter)
            history.update_detection(self.cycle_number, detected_this_cycle, rssi)

            # Inertia-based status classification
            if detected_this_cycle:
                # If detected: Immediately return to confirmed state (fast recovery)
                history.status = TagStatus.CONFIRMED
                confirmed_tags.add(tag_id)
            elif history.status == TagStatus.CONFIRMED:
                # If not detected from confirmed state: Check consecutive miss threshold (apply inertia)
                if history.should_transition_to_suspected():
                    history.status = TagStatus.SUSPECTED
                    suspected_tags.add(tag_id)
                else:
                    # Not yet reached threshold: Maintain confirmed state
                    confirmed_tags.add(tag_id)
            elif history.status == TagStatus.SUSPECTED:
                # If still not detected from suspected state: Confidence-based removal decision
                if history.should_be_removed():
                    history.status = TagStatus.REMOVED
                    removed_tags.add(tag_id)
                else:
                    # Maintain suspected state
                    suspected_tags.add(tag_id)

        # 4. Add new tags
        for tag_id in current_qualified_tags:
            if tag_id not in self.tag_histories:
                # New tag discovered
                rssi = None
                for result in self.sensor_results.values():
                    if tag_id in result.tag_rssi_map:
                        rssi = result.tag_rssi_map[tag_id]
                        break

                history = TagHistory(
                    tag_id=tag_id,
                    first_detection_cycle=self.cycle_number,
                    last_detection_cycle=self.cycle_number,
                    history_max_length=self.max_cycle_length,
                    removal_threshold=self.removal_threshold,
                    consecutive_miss_threshold=self.consecutive_miss_threshold,  # Add inertia setting
                )
                history.update_detection(self.cycle_number, True, rssi)
                self.tag_histories[tag_id] = history

                new_tags.add(tag_id)
                confirmed_tags.add(tag_id)

        # 5. Clean up removed tags and optimize memory
        for tag_id in removed_tags:
            if tag_id in self.tag_histories:
                del self.tag_histories[tag_id]

        # Limit tag history size (prevent memory leaks)
        max_histories = len(self.sensor_ports) * 100  # Maximum 100 tags per sensor
        if len(self.tag_histories) > max_histories:
            # Remove oldest tags
            oldest_tags = sorted(
                self.tag_histories.items(), key=lambda x: x[1].last_detection_cycle
            )[: len(self.tag_histories) - max_histories]

            for tag_id, _ in oldest_tags:
                del self.tag_histories[tag_id]
                self.logger.debug(
                    f"Memory optimization: Removed old tag history - {tag_id}"
                )

        # 6. Create result object
        smart_result = SmartCycleResult(
            cycle_number=self.cycle_number,
            sensor_results=list(self.sensor_results.values()),
            total_unique_tags=all_unique_tags,
            total_tag_count=len(all_unique_tags),
            confirmed_tags=confirmed_tags,
            suspected_tags=suspected_tags,
            removed_tags=removed_tags,
            new_tags=new_tags,
            rssi_filtered_tags=current_qualified_tags,
            total_rssi_qualified_count=len(current_qualified_tags),
            cycle_start_time=start_time,
            cycle_end_time=end_time,
            cycle_duration_ms=duration,
        )

        return smart_result

    def _log_smart_cycle_summary(self, cycle_result: SmartCycleResult):
        """Log confidence-based cycle result summary"""
        self.logger.info(f"Cycle #{cycle_result.cycle_number} results:")
        self.logger.info(f"  Total duration: {cycle_result.cycle_duration_ms:.1f}ms")
        self.logger.info(
            f"  Total tags: {cycle_result.total_tag_count} (Quality: {cycle_result.total_rssi_qualified_count})"
        )

        # Confidence-based classification results
        self.logger.info(f"  🟢 Confirmed tags: {len(cycle_result.confirmed_tags)}")
        self.logger.info(f"  🟡 Suspected tags: {len(cycle_result.suspected_tags)}")
        self.logger.info(f"  🆕 New tags: {len(cycle_result.new_tags)}")
        if cycle_result.removed_tags:
            self.logger.info(f"  🔴 Removed tags: {len(cycle_result.removed_tags)}")

        # Sensor-specific details
        for result in cycle_result.sensor_results:
            self.logger.info(
                f"  {result.sensor_id}: {result.qualified_count}/{result.tag_count} quality tags, "
                f"{result.duration_ms:.1f}ms, status: {result.status}"
            )

        # Confirmed tag details
        if cycle_result.confirmed_tags:
            self.logger.info(f"  🟢 Confirmed tag details:")
            for tag_id in sorted(list(cycle_result.confirmed_tags)):
                # Collect RSSI information for current cycle
                current_rssi = None
                for result in cycle_result.sensor_results:
                    if tag_id in result.tag_rssi_map:
                        current_rssi = result.tag_rssi_map[tag_id]
                        break

                # Get confidence information from tag history
                history = self.tag_histories.get(tag_id)
                confidence = history.confidence_score if history else 0.0

                # Display improved confidence information
                confidence_display = f"{confidence:.3f}"
                if history and len(history.rssi_history) > 0:
                    avg_rssi = sum(history.rssi_history) / len(history.rssi_history)
                    confidence_display += f" (Avg RSSI: {avg_rssi:.1f}dBm)"

                # Try parsing EPC information from all readers
                epc_parsed = False
                for reader in self.readers:
                    try:
                        epc_summary = reader.get_epc_summary(tag_id)
                        self.logger.info(
                            f"    📋 {tag_id} (RSSI: {current_rssi}dBm, Confidence: {confidence_display})"
                        )
                        self.logger.info(f"       {epc_summary}")
                        epc_parsed = True
                        break  # Stop if successful
                    except Exception:
                        continue  # Try next reader if failed

                # If parsing failed on all readers
                if not epc_parsed:
                    self.logger.info(
                        f"    📋 {tag_id} (RSSI: {current_rssi}dBm, Confidence: {confidence_display}) - EPC parsing failed"
                    )

        # Suspected tag details
        if cycle_result.suspected_tags:
            self.logger.info(f"  🟡 Suspected tag details:")
            for tag_id in sorted(list(cycle_result.suspected_tags)):
                # Get information from tag history
                history = self.tag_histories.get(tag_id)
                if history:
                    last_rssi = (
                        history.rssi_history[-1]
                        if history.rssi_history
                        else "Unknown"
                    )
                    confidence = history.confidence_score
                    last_cycle = history.last_detection_cycle
                    consecutive_misses = history.consecutive_misses

                    # Display improved confidence information
                    confidence_display = f"{confidence:.3f}"
                    if len(history.rssi_history) > 0:
                        avg_rssi = sum(history.rssi_history) / len(history.rssi_history)
                        confidence_display += f" (Avg RSSI: {avg_rssi:.1f}dBm)"

                    # Try parsing EPC information from all readers
                    epc_parsed = False
                    for reader in self.readers:
                        try:
                            epc_summary = reader.get_epc_summary(tag_id)
                            self.logger.info(
                                f"    ⚠️  {tag_id} (Last RSSI: {last_rssi}dBm, Confidence: {confidence_display}, "
                                f"Last detection: Cycle#{last_cycle}, Consecutive misses: {consecutive_misses})"
                            )
                            self.logger.info(f"       {epc_summary}")
                            epc_parsed = True
                            break  # Stop if successful
                        except Exception:
                            continue  # Try next reader if failed

                    # If parsing failed on all readers
                    if not epc_parsed:
                        self.logger.info(
                            f"    ⚠️  {tag_id} (Last RSSI: {last_rssi}dBm, Confidence: {confidence_display}, "
                            f"Last detection: Cycle#{last_cycle}, Consecutive misses: {consecutive_misses}) - EPC parsing failed"
                        )

        # Simply display new/removed tags
        if cycle_result.new_tags:
            new_tags_sorted = sorted(cycle_result.new_tags)
            self.logger.info(f"  🆕 New tags: {new_tags_sorted}")
        if cycle_result.removed_tags:
            removed_tags_sorted = sorted(cycle_result.removed_tags)
            self.logger.info(f"  🔴 Removed tags: {removed_tags_sorted}")

    def run_multiple_cycles(self, num_cycles: int) -> List[SmartCycleResult]:
        """Run multiple cycles consecutively"""
        results = []

        self.logger.info(
            f"Starting {num_cycles} total cycles (RSSI >= {self.rssi_threshold}dBm filtering)"
        )

        for cycle in range(num_cycles):
            try:
                result = self.start_cycle()
                results.append(result)

            except Exception as e:
                self.logger.error(f"Error during cycle {cycle + 1}: {e}")
                break

        self.logger.info(f"Total {len(results)} cycles completed")
        self._log_final_summary(results)
        return results

    def _log_final_summary(self, results: List[SmartCycleResult]):
        """Final overall result summary"""
        if not results:
            return

        total_confirmed = set()
        total_removed = set()

        for result in results:
            total_confirmed.update(result.confirmed_tags)
            total_removed.update(result.removed_tags)

        self.logger.info(f"\n=== Final Tag Status Summary ===")
        self.logger.info(f"Current active histories: {len(self.tag_histories)} tags")
        self.logger.info(f"Cumulative confirmed tags: {len(total_confirmed)}")
        self.logger.info(f"Cumulative removed tags: {len(total_removed)}")

        # Current status classification
        current_confirmed = set()
        current_suspected = set()

        for tag_id, history in self.tag_histories.items():
            if history.status == TagStatus.CONFIRMED:
                current_confirmed.add(tag_id)
            elif history.status == TagStatus.SUSPECTED:
                current_suspected.add(tag_id)

        self.logger.info(f"Current confirmed status: {len(current_confirmed)}")
        self.logger.info(f"Current suspected status: {len(current_suspected)}")

        if current_confirmed:
            self.logger.info(f"Confirmed tags: {sorted(list(current_confirmed))}")
        if current_suspected:
            self.logger.info(f"Suspected tags: {sorted(list(current_suspected))}")

    def get_sensor_status(self) -> Dict:
        """Return current sensor status"""
        with self.results_lock:
            is_running = self.is_running
            cycle_number = self.cycle_number

        status_list = [
            {
                "sensor_id": result.sensor_id,
                "port": result.port,
                "status": result.status,
                "tag_count": result.tag_count,
                "detected_tags": list(result.detected_tags),
            }
            for result in self.sensor_results.values()
        ]

        # Add overall status information
        return {
            "is_running": is_running,
            "cycle_number": cycle_number,
            "sensors": status_list,
        }

    def cleanup(self):
        """Resource cleanup - Properly release all sensor threads and ports"""
        self.logger.info("Multi-sensor manager cleanup starting...")

        for i, reader in enumerate(self.readers):
            try:
                # Use encapsulated cleanup method - Simple and safe!
                cleanup_success = reader.stop_reading_and_cleanup()
                if not cleanup_success:
                    self.logger.warning(f"Sensor {i} resource cleanup failed")
            except Exception as e:
                self.logger.error(f"Error during sensor {i} cleanup: {e}")

        # Additional safety wait (ensure complete port release)
        time.sleep(0.3)

        self.logger.info("Multi-sensor manager cleanup complete") 