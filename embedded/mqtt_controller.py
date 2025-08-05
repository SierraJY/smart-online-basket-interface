#!/usr/bin/env python3
"""
MQTT Controller for RFID Minimal System

This script subscribes to MQTT messages and controls the RFID system based on commands:
- "start": Starts the RFID system
- "end": Stops the RFID system
- "total": Displays the total on LCD screen
"""

import sys
import os
import logging
import threading
import json
import time
import importlib.util
from typing import Dict, Any, Optional

# Set up path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Import MQTT subscriber
try:
    import mqtt.config as mqtt_config
    import paho.mqtt.client as mqtt
except ImportError:
    print("Error: MQTT module not found. Please ensure mqtt package is installed.")
    sys.exit(1)

# Import from rfid_minimal package
try:
    from rfid_minimal.managers.sensor_manager import MultiSensorManager
    from rfid_minimal.managers.cart_manager import CartManager
    from rfid_minimal.core.parser import format_cart_for_mqtt
    from rfid_minimal.config.config import BASKET_ID
except ImportError:
    print("Error: rfid_minimal package not found.")
    sys.exit(1)

# Global variables
rfid_thread = None
stop_event = threading.Event()
rfid_system_running = False
cart_manager = None
sensor_manager = None

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

def run_rfid_system(stop_event):
    """Run the RFID system in a separate thread"""
    global cart_manager, sensor_manager
    
    logger = logging.getLogger("rfid_controller")
    logger.info("Starting RFID system thread")
    
    try:
        # Create sensor manager
        sensor_manager = MultiSensorManager(
            polling_count=15,
            rssi_threshold=-70
        )
        
        # Configure readers with default settings
        sensor_manager.configure_readers(work_area=6, freq_hopping=1, power_dbm=26, channel_index=1)
        
        # Create cart manager
        cart_manager = CartManager(
            presence_threshold=2,
            absence_threshold=2,
            rssi_threshold=-70
        )
        
        cycle = 0
        
        # Run until stop event is set
        while not stop_event.is_set():
            cycle += 1
            logger.info(f"=== Cycle #{cycle} started ===")
            
            # Start cart tracking for this cycle
            cart_manager.start_cycle()
            
            # Run polling cycle
            results = sensor_manager.run_polling_cycle(5.0)  # 5 second timeout
            
            # Send results to CartManager for processing
            cart_manager.process_cycle_results(results, sensor_manager)
            
            # End cart tracking for this cycle
            cart_manager.end_cycle()
            
            # Calculate total tags
            total_tags = sum(len(tags) for tags in results.values())
            
            logger.info(f"=== Cycle #{cycle} completed ===")
            logger.info(f"Total tags detected: {total_tags}")
            
            # Get cart summary
            cart_summary = cart_manager.get_cart_summary()
            logger.info(f"Confirmed items: {len(cart_summary['confirmed_items'])}, Removed items: {len(cart_summary['removed_items'])}")
            
            # Short delay between cycles
            time.sleep(1.0)
            
    except Exception as e:
        logger.error(f"Error in RFID system: {e}", exc_info=True)
    finally:
        # Clean up resources
        if sensor_manager:
            sensor_manager.cleanup()
            logger.info("RFID resources cleaned up")

def start_rfid_system():
    """Start the RFID system in a separate thread"""
    global rfid_thread, stop_event, rfid_system_running
    
    logger = logging.getLogger("rfid_controller")
    
    if rfid_system_running:
        logger.info("RFID system is already running")
        return
    
    # Reset the stop event
    stop_event.clear()
    
    # Create and start the thread
    rfid_thread = threading.Thread(target=run_rfid_system, args=(stop_event,))
    rfid_thread.daemon = True
    rfid_thread.start()
    
    rfid_system_running = True
    logger.info("RFID system started")

def stop_rfid_system():
    """Stop the running RFID system"""
    global rfid_thread, stop_event, rfid_system_running
    
    logger = logging.getLogger("rfid_controller")
    
    if not rfid_system_running:
        logger.info("RFID system is not running")
        return
    
    # Set the stop event to signal the thread to exit
    stop_event.set()
    
    # Wait for the thread to finish
    if rfid_thread and rfid_thread.is_alive():
        rfid_thread.join(timeout=10.0)  # Wait up to 10 seconds
        
    rfid_system_running = False
    logger.info("RFID system stopped")

def display_total():
    """Display the total on LCD screen"""
    global cart_manager
    
    logger = logging.getLogger("rfid_controller")
    
    if not cart_manager:
        logger.warning("Cart manager not available, cannot display total")
        return
    
    # Get cart summary
    cart_summary = cart_manager.get_cart_summary()
    confirmed_items = cart_summary["confirmed_items"]
    
    # Format cart data
    cart_data = format_cart_for_mqtt(confirmed_items, BASKET_ID)
    
    # In a real implementation, you would send this to an LCD display
    # For now, we'll just log it
    logger.info(f"TOTAL DISPLAY: {len(confirmed_items)} items in cart")
    logger.info(f"Cart data: {cart_data}")
    
    # TODO: Add actual LCD display code here
    print(f"\n=== LCD DISPLAY ===")
    print(f"Total items: {len(confirmed_items)}")
    print(f"=================\n")

def on_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker"""
    logger = logging.getLogger("rfid_controller")
    logger.info(f"Connected to MQTT broker with result code {rc}")
    
    # Subscribe to control topic
    control_topic = mqtt_config.MQTT_TOPIC + "/status"
    client.subscribe(control_topic)
    logger.info(f"Subscribed to control topic: {control_topic}")

def on_message(client, userdata, msg):
    """Callback when message is received"""
    logger = logging.getLogger("rfid_controller")
    
    topic = msg.topic
    payload = msg.payload.decode().strip().lower()
    
    logger.info(f"Received message: {payload} on topic: {topic}")
    
    # Process commands
    if payload == "start":
        logger.info("Received START command")
        start_rfid_system()
    elif payload == "end":
        logger.info("Received END command")
        stop_rfid_system()
    elif payload == "total":
        logger.info("Received TOTAL command")
        display_total()
    else:
        logger.warning(f"Unknown command: {payload}")

def main():
    """Main function"""
    # Set up logging
    setup_logging("INFO")
    logger = logging.getLogger("rfid_controller")
    
    # Initialize the stop event
    global stop_event
    stop_event = threading.Event()
    
    # Create MQTT client
    client = mqtt.Client()
    
    # Set callbacks
    client.on_connect = on_connect
    client.on_message = on_message
    
    # Set username/password if configured
    if hasattr(mqtt_config, 'MQTT_USER') and mqtt_config.MQTT_USER:
        client.username_pw_set(mqtt_config.MQTT_USER, mqtt_config.MQTT_PASS)
    
    # Connect to broker
    try:
        logger.info(f"Connecting to MQTT broker at {mqtt_config.MQTT_HOST}:{mqtt_config.MQTT_PORT}")
        client.connect(mqtt_config.MQTT_HOST, mqtt_config.MQTT_PORT, 60)
    except Exception as e:
        logger.error(f"Failed to connect to MQTT broker: {e}")
        sys.exit(1)
    
    # Start the MQTT loop
    try:
        logger.info("Starting MQTT controller. Use Ctrl+C to exit.")
        logger.info("Waiting for commands: 'start', 'end', or 'total' on topic " + 
                   f"{mqtt_config.MQTT_TOPIC}/status")
        client.loop_forever()
    except KeyboardInterrupt:
        logger.info("User interrupted. Exiting...")
        # Make sure to stop the RFID system if it's running
        stop_rfid_system()
    except Exception as e:
        logger.error(f"Error in main loop: {e}", exc_info=True)
    finally:
        # Clean up
        client.disconnect()

if __name__ == "__main__":
    main()