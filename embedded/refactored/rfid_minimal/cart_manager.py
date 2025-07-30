"""
Cart Manager for RFID Minimal System

Handles tracking of products in the cart across multiple polling cycles
"""

import logging
from typing import Dict, Set, List, Optional
from dataclasses import dataclass
from datetime import datetime

from rfid_minimal.models import TagInfo


@dataclass
class CartItem:
    """Represents an item in the cart with its detection history"""
    tag_id: str
    first_seen: datetime
    last_seen: datetime
    detection_count: int
    rssi_values: List[int]
    
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
        presence_threshold: int = 2,
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
        
        # Cycle counter
        self.cycle_count = 0
    
    def start_cycle(self) -> None:
        """Start a new polling cycle"""
        self.cycle_count += 1
        self.current_cycle_tags.clear()
        self.logger.debug(f"Starting cart tracking for cycle #{self.cycle_count}")
    
    def register_tag(self, tag_id: str, tag_info: TagInfo) -> None:
        """
        Register a tag detected in the current cycle
        
        Args:
            tag_id: Tag identifier
            tag_info: Tag information
        """
        self.current_cycle_tags.add(tag_id)
        
        now = datetime.now()
        
        # Apply RSSI threshold if set
        if self.rssi_threshold is not None and tag_info.rssi < self.rssi_threshold:
            self.logger.debug(f"Tag {tag_id} ignored due to low RSSI: {tag_info.rssi} < {self.rssi_threshold}")
            return
        
        # Update or create cart item
        if tag_id in self.cart_items:
            item = self.cart_items[tag_id]
            item.last_seen = now
            item.detection_count += 1
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
        
        # Check if item should be confirmed as present
        if (tag_id not in self.confirmed_items and 
            self.cart_items[tag_id].detection_count >= self.presence_threshold):
            self.confirmed_items.add(tag_id)
            self.logger.info(f"🆕 New item confirmed in cart: {tag_id}")
            
        # If item was previously removed, add it back
        if tag_id in self.removed_items:
            self.removed_items.remove(tag_id)
            self.logger.info(f"🔄 Item returned to cart: {tag_id}")
    
    def end_cycle(self) -> None:
        """
        End the current polling cycle and update item statuses
        """
        self.logger.debug(f"Ending cart tracking for cycle #{self.cycle_count}")
        
        # Check for missed detections
        for tag_id in self.confirmed_items.copy():
            if tag_id not in self.current_cycle_tags:
                # Increment missed detection counter
                self.missed_detections[tag_id] = self.missed_detections.get(tag_id, 0) + 1
                
                # Check if item should be marked as removed
                if self.missed_detections[tag_id] >= self.absence_threshold:
                    self.confirmed_items.remove(tag_id)
                    self.removed_items.add(tag_id)
                    self.logger.info(f"❌ Item removed from cart: {tag_id}")
    
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
    
    def get_item_details(self, tag_id: str) -> Optional[CartItem]:
        """
        Get detailed information about a specific item
        
        Args:
            tag_id: Tag identifier
            
        Returns:
            CartItem object or None if not found
        """
        return self.cart_items.get(tag_id) 