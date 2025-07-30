#!/usr/bin/env python3
"""
RFID Minimal - Main Application
"""

import logging
import argparse
import sys
import time
from typing import Dict, Set, List

from rfid_minimal.sensor_manager import MultiSensorManager
from rfid_minimal.models import TagInfo
from rfid_minimal.cart_manager import CartManager

def setup_logging(level: str = "INFO") -> None:
    """Set up logging configuration"""
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="RFID Minimal System")
    
    parser.add_argument(
        "--cycles", 
        type=int, 
        default=3, 
        help="Number of polling cycles to run (default: 3)"
    )
    
    parser.add_argument(
        "--polling-count", 
        type=int, 
        default=30, 
        help="Multi-polling count for each sensor (default: 30)"
    )
    
    parser.add_argument(
        "--rssi-threshold", 
        type=int, 
        default=None, 
        help="RSSI threshold for filtering tags in dBm (default: None, no filtering)"
    )
    
    parser.add_argument(
        "--presence-threshold", 
        type=int, 
        default=2, 
        help="Number of consecutive detections to confirm item presence (default: 2)"
    )
    
    parser.add_argument(
        "--absence-threshold", 
        type=int, 
        default=2, 
        help="Number of consecutive missed detections to confirm item removal (default: 2)"
    )
    
    parser.add_argument(
        "--log-level", 
        type=str, 
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        default="INFO", 
        help="Logging level (default: INFO)"
    )
    
    parser.add_argument(
        "--timeout", 
        type=float, 
        default=5.0, 
        help="Polling timeout in seconds (default: 5.0)"
    )
    
    return parser.parse_args()

# Removed on_tag_detected function as it's now defined inline in run_rfid_system

def run_rfid_system(
    cycles: int = 3,
    polling_count: int = 30,
    rssi_threshold: int = None,
    presence_threshold: int = 2,
    absence_threshold: int = 2,
    timeout: float = 5.0
) -> None:
    """Run the RFID system with specified parameters"""
    logger = logging.getLogger("rfid_minimal")
    logger.info(f"Starting RFID system with {cycles} cycles")
    
    try:
        # Create sensor manager
        manager = MultiSensorManager(
            polling_count=polling_count,
            rssi_threshold=rssi_threshold
        )
        
        # Create cart manager
        cart_manager = CartManager(
            presence_threshold=presence_threshold,
            absence_threshold=absence_threshold,
            rssi_threshold=rssi_threshold
        )
        
        # Set tag detection callback
        def tag_callback(manager_id: str, reader_id: str, tag_info: TagInfo) -> None:
            # Log the detection
            logger.debug(f"Tag callback: {reader_id} detected {tag_info.raw_tag_id} (RSSI: {tag_info.rssi})")
            
            # Register tag with cart manager
            cart_manager.register_tag(tag_info.raw_tag_id, tag_info)
            
            # Log detection
            logger.info(f"Tag detected: {tag_info.raw_tag_id} (RSSI: {tag_info.rssi})")
        
        manager.set_tag_callback(tag_callback)
        
        # Run multiple polling cycles
        all_cycle_results: Dict[int, Dict[str, Set[str]]] = {}
        
        for cycle in range(1, cycles + 1):
            logger.info(f"=== Cycle #{cycle} started ===")
            
            # Start cart tracking for this cycle
            cart_manager.start_cycle()
            
            # Run polling cycle
            cycle_start_time = time.time()
            results = manager.run_polling_cycle(timeout)
            cycle_duration = time.time() - cycle_start_time
            
            # End cart tracking for this cycle
            cart_manager.end_cycle()
            
            # Store results
            all_cycle_results[cycle] = results
            
            # Calculate total tags
            total_tags = sum(len(tags) for tags in results.values())
            
            logger.info(f"=== Cycle #{cycle} completed ===")
            logger.info(f"Cycle duration: {cycle_duration:.1f} seconds")
            logger.info(f"Total tags detected: {total_tags}")
            
            # Display results for each reader
            for reader_id, tags in results.items():
                logger.info(f"{reader_id}: {len(tags)} tags")
                if logger.level <= logging.DEBUG:
                    for tag_id in sorted(tags):
                        tag_info = manager.readers[0].get_tag_info(tag_id)
                        rssi = tag_info.rssi if tag_info else "Unknown"
                        logger.debug(f"  - {tag_id} (RSSI: {rssi})")
            
            # Wait between cycles
            if cycle < cycles:
                time.sleep(1.0)
        
        # Display final summary
        logger.info("\n=== Final Summary ===")
        logger.info(f"Completed {cycles} polling cycles")
        
        # Calculate unique tags across all cycles
        all_tags = set()
        for cycle_results in all_cycle_results.values():
            for reader_tags in cycle_results.values():
                all_tags.update(reader_tags)
        
        logger.info(f"Total unique tags detected: {len(all_tags)}")
        
        # Display cart status
        cart_summary = cart_manager.get_cart_summary()
        confirmed_items = cart_summary["confirmed_items"]
        removed_items = cart_summary["removed_items"]
        
        logger.info("\n=== Cart Status ===")
        logger.info(f"Items currently in cart: {len(confirmed_items)}")
        for item in confirmed_items:
            item_details = cart_manager.get_item_details(item)
            if item_details:
                logger.info(f"  - {item} (Avg RSSI: {item_details.avg_rssi:.1f}, Detections: {item_details.detection_count})")
        
        logger.info(f"Items removed from cart: {len(removed_items)}")
        for item in removed_items:
            logger.info(f"  - {item}")
        
    except KeyboardInterrupt:
        logger.info("User interrupted execution")
    except Exception as e:
        logger.error(f"Error running RFID system: {e}", exc_info=True)
    finally:
        # Clean up resources
        if 'manager' in locals():
            manager.cleanup()
            logger.info("Resources cleaned up")

if __name__ == "__main__":
    # Parse command line arguments
    args = parse_arguments()
    
    # Set up logging
    setup_logging(args.log_level)
    
    # Run the RFID system
    run_rfid_system(
        cycles=args.cycles,
        polling_count=args.polling_count,
        rssi_threshold=args.rssi_threshold,
        presence_threshold=args.presence_threshold,
        absence_threshold=args.absence_threshold,
        timeout=args.timeout
    ) 