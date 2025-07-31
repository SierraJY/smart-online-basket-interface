#!/usr/bin/env python3
"""
RFID Minimal - Main Application

This is the entry point for the RFID Minimal system.
It runs the RFID system and handles MQTT communication.
"""

import sys
import logging
from rfid_minimal.main import run_rfid_system, parse_arguments, setup_logging

if __name__ == "__main__":
    # Parse command line arguments
    args = parse_arguments()
    
    # Set up logging
    setup_logging(args.log_level)
    
    logger = logging.getLogger("rfid_minimal")
    logger.info("Starting RFID Minimal System from root directory")
    
    # Determine MQTT status
    mqtt_status = None
    if args.mqtt_enabled:
        mqtt_status = True
    elif args.mqtt_disabled:
        mqtt_status = False
    
    # Run the RFID system
    run_rfid_system(
        cycles=args.cycles,
        polling_count=args.polling_count,
        rssi_threshold=args.rssi_threshold,
        presence_threshold=args.presence_threshold,
        absence_threshold=args.absence_threshold,
        timeout=args.timeout,
        mqtt_enabled=mqtt_status,
        basket_id=args.basket_id
    )