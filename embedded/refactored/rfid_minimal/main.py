#!/usr/bin/env python3
"""
RFID Minimal - Main Application
"""

import logging
import argparse
import sys
import time
from typing import Dict, Set

from rfid_minimal.sensor_manager import MultiSensorManager
from rfid_minimal.rfid_reader import TagInfo

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

def on_tag_detected(manager_id: str, reader_id: str, tag_info: TagInfo) -> None:
    """
    Handle tag detection callback
    
    Args:
        manager_id: Manager identifier
        reader_id: Reader identifier
        tag_info: Tag information
    """
    logger = logging.getLogger("rfid_minimal")
    logger.debug(
        f"Tag callback: {reader_id} detected {tag_info.raw_tag_id} "
        f"(RSSI: {tag_info.rssi})"
    )

def run_rfid_system(
    cycles: int = 3,
    polling_count: int = 30,
    rssi_threshold: int = None,
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
        
        # Set tag detection callback
        manager.set_tag_callback(on_tag_detected)
        
        # Run multiple polling cycles
        all_cycle_results: Dict[int, Dict[str, Set[str]]] = {}
        
        for cycle in range(1, cycles + 1):
            logger.info(f"=== Cycle #{cycle} started ===")
            
            # Run polling cycle
            cycle_start_time = time.time()
            results = manager.run_polling_cycle(timeout)
            cycle_duration = time.time() - cycle_start_time
            
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
        timeout=args.timeout
    ) 