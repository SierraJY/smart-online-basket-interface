#!/usr/bin/env python3
"""
RFID Minimal - Main Application

This is the entry point for the RFID Minimal system.
It runs the RFID system and handles MQTT communication.
"""

import sys
import logging
import importlib.util
from rfid_minimal.main import run_rfid_system, parse_arguments, setup_logging

# Import MQTT publisher
mqtt_available = False
try:
    mqtt_spec = importlib.util.find_spec('mqtt.src.mqtt_publisher')
    if mqtt_spec:
        from mqtt.src.mqtt_publisher import publish_message
        mqtt_available = True
except ImportError:
    pass

if __name__ == "__main__":
    # Parse command line arguments
    args = parse_arguments()
    
    # Set up logging with the level specified in command line arguments
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
    result = run_rfid_system(
        cycles=args.cycles,
        polling_count=args.polling_count,
        rssi_threshold=args.rssi_threshold,
        presence_threshold=args.presence_threshold,
        absence_threshold=args.absence_threshold,
        timeout=args.timeout,
        mqtt_enabled=mqtt_status,
        basket_id=args.basket_id
    )
    
    # Check for errors
    if "error" in result:
        logger.error(f"RFID system error: {result['error']}")
        sys.exit(1)
    
    # Handle MQTT publishing
    if mqtt_available:
        # Get the formatted cart data
        mqtt_message = result["final_cart_data"]
        basket_id = args.basket_id if args.basket_id else None
        
        # Determine if MQTT should be enabled
        mqtt_enabled = True
        if args.mqtt_disabled:
            mqtt_enabled = False
        elif args.mqtt_enabled:
            mqtt_enabled = True
        
        # Publish to MQTT if enabled
        if mqtt_enabled:
            try:
                logger.info(f"Publishing cart data to MQTT: {mqtt_message}")
                publish_result = publish_message(message=mqtt_message)
                
                if publish_result:
                    logger.info("MQTT publish successful")
                else:
                    logger.error("MQTT publish failed")
            except Exception as e:
                logger.error(f"Error publishing to MQTT: {e}")
    else:
        logger.warning("MQTT publisher not available. Cart data will not be published.")
    
    # Print summary
    logger.info(f"RFID system completed successfully with {len(result['confirmed_items'])} items in cart")