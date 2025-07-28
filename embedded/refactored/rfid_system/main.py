#!/usr/bin/env python3
"""
RFID System Main Application
Demonstrates the usage of the refactored RFID system
"""

import logging
import time
import argparse
import sys
from typing import Optional

from rfid_system.managers.sensor_manager import MultiSensorManager


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
    parser = argparse.ArgumentParser(description="RFID System")
    
    parser.add_argument(
        "--cycles", 
        type=int, 
        default=5, 
        help="Number of polling cycles to run (default: 5)"
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
        default=-55, 
        help="RSSI threshold for reliable tags in dBm (default: -55)"
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
        default=12.0, 
        help="Polling timeout in seconds (default: 12.0)"
    )
    
    return parser.parse_args()


def run_rfid_system(
    cycles: int = 5,
    polling_count: int = 30,
    rssi_threshold: int = -55,
    polling_timeout: float = 12.0
) -> None:
    """Run the RFID system with specified parameters"""
    logger = logging.getLogger("main")
    logger.info(f"Starting RFID system with {cycles} cycles")
    
    try:
        # Create sensor manager with specified parameters
        manager = MultiSensorManager(
            polling_count=polling_count,
            rssi_threshold=rssi_threshold,
            max_cycle_length=10,
            removal_threshold=4,
            consecutive_miss_threshold=3,
            polling_timeout=polling_timeout
        )
        
        # Run multiple polling cycles
        results = manager.run_multiple_cycles(cycles)
        
        # Display summary
        logger.info(f"Completed {len(results)} polling cycles")
        
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
        polling_timeout=args.timeout
    ) 