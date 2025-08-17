"""
Cart Manager for RFID Minimal System

Handles tracking of products in the cart across multiple polling cycles
"""

import logging
from typing import Dict, Set, List, Optional, Callable, Any
from dataclasses import dataclass, field
from datetime import datetime
from collections import deque
from typing import Deque

from rfid_minimal.core.models import TagInfo


@dataclass
class CartItem:
    """Represents an item in the cart with its detection history"""
    tag_id: str
    first_seen: datetime
    last_seen: datetime
    detection_count: int
    rssi_values: Deque[int] = field(default_factory=lambda: deque(maxlen=10))  # 최근 10개만 저장
    
    @property
    def avg_rssi(self) -> float:
        """Calculate average RSSI value"""
        if not self.rssi_values:
            return 0
        return sum(self.rssi_values) / len(self.rssi_values)
    
    @property
    def max_rssi(self) -> int:
        """Get maximum RSSI value"""
        if not self.rssi_values:
            return 0
        return max(self.rssi_values)
    
    @property
    def min_rssi(self) -> int:
        """Get minimum RSSI value"""
        if not self.rssi_values:
            return 0
        return min(self.rssi_values)


class CartManager:
    """
    Manages the state of the shopping cart across multiple polling cycles
    
    Tracks which products are in the cart, which have been removed,
    and which are new additions.
    """
    
    def __init__(
        self,
        presence_threshold: int = 1,
        absence_threshold: int = 2,
        rssi_threshold: Optional[int] = None
    ):
        """
        Initialize cart manager
        
        Args:
            presence_threshold: Number of consecutive detections to confirm item presence
            absence_threshold: Number of consecutive missed detections to confirm item removal
            rssi_threshold: RSSI threshold for considering a tag as present
        """
        self.logger = logging.getLogger("rfid_minimal")
        self.presence_threshold = presence_threshold
        self.absence_threshold = absence_threshold
        self.rssi_threshold = rssi_threshold
        
        # Track items across cycles
        self.cart_items: Dict[str, CartItem] = {}
        self.confirmed_items: Set[str] = set()
        self.removed_items: Set[str] = set()
        self.current_cycle_tags: Set[str] = set()
        self.missed_detections: Dict[str, int] = {}
        
        # Track changes for MQTT publishing
        self.items_added_this_cycle: Set[str] = set()
        self.items_removed_this_cycle: Set[str] = set()
        self.items_returned_this_cycle: Set[str] = set()
        self.cart_changed = False
        
        # Callback for cart changes
        self.cart_change_callback: Optional[Callable[[Dict[str, Any]], None]] = None
        
        # Cycle counter
        self.cycle_count = 0
        
    def set_cart_change_callback(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """
        Set callback function to be called when cart contents change
        
        Args:
            callback: Function to call when cart changes
                     Function signature: callback(cart_data: Dict[str, Any])
        """
        self.cart_change_callback = callback
    
    def start_cycle(self) -> None:
        """Start a new polling cycle"""
        self.cycle_count += 1
        self.current_cycle_tags.clear()
        
        # Reset change tracking for this cycle
        self.items_added_this_cycle.clear()
        self.items_removed_this_cycle.clear()
        self.items_returned_this_cycle.clear()
        self.cart_changed = False
    
    def process_cycle_results(self, cycle_results: Dict[str, Set[str]], sensor_manager: Any) -> None:
        """
        Process the results of a polling cycle.
        
        Args:
            cycle_results: Dictionary mapping reader IDs to sets of detected tag IDs.
            sensor_manager: The MultiSensorManager instance to get detailed tag info.
        """
        # 1. 이번 사이클에서 감지된 모든 고유 태그를 집계합니다.
        all_tags_in_cycle = set()
        for reader_tags in cycle_results.values():
            all_tags_in_cycle.update(reader_tags)
        
        # 2. 태그 상세 정보 매핑 최적화: 센서 매니저가 제공하는 best TagInfo 맵을 우선 사용
        best_info_map = getattr(sensor_manager, 'last_tag_info_map', None)
        if isinstance(best_info_map, dict) and best_info_map:
            for tag_id in all_tags_in_cycle:
                tag_info = best_info_map.get(tag_id)
                if tag_info:
                    self._register_detected_tag(tag_id, tag_info)
        else:
            for tag_id in all_tags_in_cycle:
                tag_info = None
                # 여러 리더에서 동일 태그가 감지되었을 경우, 가장 신호가 강한(RSSI가 높은) 정보 사용
                for reader in sensor_manager.readers:
                    info = reader.get_tag_info(tag_id)
                    if info and (tag_info is None or info.rssi > tag_info.rssi):
                        tag_info = info
                if tag_info:
                    # 3. 태그를 등록합니다.
                    self._register_detected_tag(tag_id, tag_info)
    
    def _register_detected_tag(self, tag_id: str, tag_info: TagInfo) -> None:
        """
        Register a tag detected in the current cycle. This is now an internal method.
        """
        
        now = datetime.now()
        
        # Apply RSSI threshold
        if self.rssi_threshold is not None and tag_info.rssi < self.rssi_threshold:
            self.logger.debug(f"Tag {tag_id} ignored due to low RSSI: {tag_info.rssi} < {self.rssi_threshold}")
            return
            
        self.current_cycle_tags.add(tag_id)
        
        # Update or create cart item
        if tag_id in self.cart_items:
            item = self.cart_items[tag_id]
            item.last_seen = now
            item.detection_count += 1 # 이제 detection_count는 사이클 단위로 증가합니다.
            item.rssi_values.append(tag_info.rssi)
        else:
            self.cart_items[tag_id] = CartItem(
                tag_id=tag_id,
                first_seen=now,
                last_seen=now,
                detection_count=1,
                rssi_values=[tag_info.rssi]
            )
            
        # Reset missed detection counter
        if tag_id in self.missed_detections:
            del self.missed_detections[tag_id]
        
        # Check if item should be confirmed
        if (tag_id not in self.confirmed_items and 
            self.cart_items[tag_id].detection_count >= self.presence_threshold):
            self.confirmed_items.add(tag_id)
            self.items_added_this_cycle.add(tag_id)
            self.cart_changed = True
            self.logger.info(f"🆕 New item confirmed in cart: {tag_id}")
            
        # If item was previously removed, add it back
        if tag_id in self.removed_items:
            self.removed_items.remove(tag_id)
            self.items_returned_this_cycle.add(tag_id)
            self.cart_changed = True
            self.logger.info(f"🔄 Item returned to cart: {tag_id}")
    
    def end_cycle(self) -> None:
        """
        End the current polling cycle and update item statuses
        """
        # Check for missed detections
        for tag_id in self.confirmed_items.copy():
            if tag_id not in self.current_cycle_tags:
                # Increment missed detection counter
                self.missed_detections[tag_id] = self.missed_detections.get(tag_id, 0) + 1
                
                # Check if item should be marked as removed
                if self.missed_detections[tag_id] >= self.absence_threshold:
                    self.confirmed_items.remove(tag_id)
                    self.removed_items.add(tag_id)
                    self.items_removed_this_cycle.add(tag_id)
                    self.cart_changed = True
                    self.logger.info(f"❌ Item removed from cart: {tag_id}")
        
        # Trigger callback if cart has changed
        if self.cart_changed and self.cart_change_callback:
            cart_data = self.get_cart_data_for_mqtt()
            self.cart_change_callback(cart_data)
    
    def get_cart_summary(self) -> Dict[str, List[str]]:
        """
        Get summary of cart contents
        
        Returns:
            Dictionary with lists of confirmed, new, and removed items
        """
        return {
            "confirmed_items": list(self.confirmed_items),
            "removed_items": list(self.removed_items)
        }
        
    def get_cart_data_for_mqtt(self) -> Dict[str, Any]:
        """
        Get cart data formatted for MQTT publishing
        
        Returns:
            Dictionary with cart data and change information
        """
        from rfid_minimal.core.parser import parse_pid
        from rfid_minimal.config.config import BASKET_ID
        import json
        from collections import Counter
        
        # Parse PIDs from all confirmed items (similar to format_cart_for_mqtt but returning a dict)
        product_counts = Counter()
        
        for item in self.confirmed_items:
            try:
                parsed = parse_pid(item)
                pid = parsed.get('pid', '')
                
                # Only count items with valid PIDs (4 characters)
                if pid and len(pid) == 4:
                    product_counts[pid] += 1
                else:
                    self.logger.warning(f"Skipping item with invalid PID: {item}")
            except Exception as e:
                self.logger.error(f"Error processing item {item} for MQTT: {e}")
        
        # Create the MQTT message format as a dictionary (not a string)
        cart_data = {
            "id": BASKET_ID,
            "list": dict(product_counts),
            # "changes": {
            #     "added": [tag_id for tag_id in self.items_added_this_cycle],
            #     "removed": [tag_id for tag_id in self.items_removed_this_cycle],
            #     "returned": [tag_id for tag_id in self.items_returned_this_cycle]
            # }
        }
        
        return cart_data
    
    def get_item_details(self, tag_id: str) -> Optional[CartItem]:
        """
        Get detailed information about a specific item
        
        Args:
            tag_id: Tag identifier
            
        Returns:
            CartItem object or None if not found
        """
        return self.cart_items.get(tag_id)
