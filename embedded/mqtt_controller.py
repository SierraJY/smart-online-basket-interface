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
    try:
        # Import publisher once and reuse
        from mqtt.src.mqtt_publisher import publish_message as mqtt_publish_message
    except Exception:
        mqtt_publish_message = None
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
last_published_cart_data = None  # Store the last published cart data
lcd = None

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
    
    logger = logging.getLogger("mqtt_controller")
    logger.info("Starting RFID system thread")
    
    try:
        # Create sensor manager
        sensor_manager = MultiSensorManager(
            polling_count=15,
            rssi_threshold=-58
        )
        
        # Configure readers with default settings
        sensor_manager.configure_readers(work_area=6, freq_hopping=1, power_dbm=12, channel_index=1)
        
        # Create cart manager
        cart_manager = CartManager(
            presence_threshold=1,
            absence_threshold=2,
            rssi_threshold=-58
        )
        
        cycle = 0
        
        # Run until stop event is set
        while not stop_event.is_set():
            cycle += 1
            logger.info("=== Cycle #%d started ===", cycle)
            
            # Start cart tracking for this cycle
            cart_manager.start_cycle()
            
            # Run polling cycle
            results = sensor_manager.run_polling_cycle()  # 0.5 second timeout
            
            # Send results to CartManager for processing
            cart_manager.process_cycle_results(results, sensor_manager)
            
            # End cart tracking for this cycle
            cart_manager.end_cycle()
            
            # Calculate total tags
            total_tags = sum(len(tags) for tags in results.values())
            
            logger.info("=== Cycle #%d completed ===", cycle)
            logger.info("Total tags detected: %d", total_tags)
            
            # Get cart summary
            cart_summary = cart_manager.get_cart_summary()
            confirmed_items = cart_summary["confirmed_items"]
            logger.info("Confirmed items: %d, Removed items: %d", len(confirmed_items), len(cart_summary['removed_items']))
            
            # Format cart data for MQTT publishing
            cart_data = format_cart_for_mqtt(confirmed_items, BASKET_ID)
            
            # Only publish if cart data has changed
            global last_published_cart_data
            if cart_data != last_published_cart_data:
                try:
                    if mqtt_publish_message:
                        logger.info("Cart data changed - Publishing to MQTT: %s", cart_data)
                        publish_result = mqtt_publish_message(message=cart_data)
                    else:
                        logger.error("MQTT publisher unavailable; skipping publish")
                        publish_result = False

                    if publish_result:
                        logger.info("MQTT publish successful")
                        # Update the last published data only if publish was successful
                        last_published_cart_data = cart_data
                    else:
                        logger.error("MQTT publish failed")
                except Exception as e:
                    logger.error(f"Error publishing to MQTT: {e}")
            else:
                logger.debug("Cart data unchanged - skipping MQTT publish")
            
            # Short delay between cycles
            time.sleep(0.1)
            
    except Exception as e:
        logger.error(f"Error in RFID system: {e}", exc_info=True)
    finally:
        # Clean up resources
        if sensor_manager:
            sensor_manager.cleanup()
            logger.info("RFID resources cleaned up")

def start_rfid_system():
    """Start the RFID system in a separate thread"""
    global rfid_thread, stop_event, rfid_system_running, lcd
    
    logger = logging.getLogger("mqtt_controller")
    
    if rfid_system_running:
        logger.info("RFID system is already running")
        return
    
    # Reset the stop event
    stop_event.clear()
    
    # Create and start the thread
    rfid_thread = threading.Thread(target=run_rfid_system, args=(stop_event,))
    rfid_thread.daemon = True
    rfid_thread.start()
    
    # Initialize the LCD display
    if lcd is None:
        try:
            from embedded.lcd_indicator import LCDPanel
            lcd = LCDPanel(i2c_expander='PCF8574', 
                          address=0x27,
                          port=1, 
                          cols=16, 
                          rows=2, 
                          dotsize=8,
                          charmap='A00',
                          auto_linebreaks=True,
                          backlight_enabled=True)
            logger.info("LCD initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize LCD: {e}")
            lcd = None

    if lcd:
        try:
            lcd.backlight_enabled = True
            lcd.print_total_price(0)
        except Exception as e:
            logger.error("LCD 찐빠 발생 @@@@@@@@@@@@@@@@@")
    
    rfid_system_running = True
    logger.info("RFID system started")

def stop_rfid_system():
    """Stop the running RFID system"""
    global rfid_thread, stop_event, rfid_system_running, lcd
    
    logger = logging.getLogger("mqtt_controller")
    
    if not rfid_system_running:
        logger.info("RFID system is not running")
        return
    
    # Set the stop event to signal the thread to exit
    stop_event.set()
    
    # Wait for the thread to finish
    if rfid_thread and rfid_thread.is_alive():
        rfid_thread.join(timeout=1.0)  # Wait up to 10 seconds
    
    # Clean up the LCD display
    if lcd:
        try:
            lcd.backlight_enabled = False
            lcd.clear()
            # lcd.close(clear=True)
            logger.info("LCD display cleared and closed")
        except Exception as e:
            logger.error(f"Error clearing LCD display: {e}")
        finally:
            lcd = None

    rfid_system_running = False
    logger.info("RFID system stopped")

def display_total(payload: dict):
    """Display the total on LCD screen"""
    
    logger = logging.getLogger("mqtt_controller")
    
    # Check if payload contains totalprice
    if "totalprice" not in payload:
        logger.error("Payload does not contain 'totalprice'")
        return
    
    # Check if basketid is same as configured
    if "basketid" in payload and payload["basketid"] != BASKET_ID:
        logger.error(f"Basket ID mismatch: {payload['basketid']} != {BASKET_ID}")
        return
    
    # Check if lcd is initialized
    if lcd is None:
        logger.error("LCD is not initialized")
        return
    
    logger.info("Displaying total on LCD screen")
    total_price = payload["totalprice"]
    lcd.print_total_price(total_price)

def on_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker"""
    logger = logging.getLogger("mqtt_controller")
    logger.info(f"Connected to MQTT broker with result code {rc}")
    
    # Subscribe to control topic
    control_topic = mqtt_config.MQTT_TOPIC + "/status"
    client.subscribe(control_topic)
    logger.info(f"Subscribed to control topic: {control_topic}")

def on_message(client, userdata, msg):
    """Callback when message is received"""
    logger = logging.getLogger("mqtt_controller")
    
    topic = msg.topic
    message_str = msg.payload.decode().strip().lower()
    logger.info(f"Received message: {message_str} on topic: {topic}")
    
    # Try to parse as JSON
    try:
        message_json = json.loads(message_str)
        if "msg" in message_json:
            command = message_json["msg"].lower()
        else:
            command = message_str
    except json.JSONDecodeError:
        # If not JSON, use the raw message
        command = message_str
    
    # Process commands
    if command == "start":
        logger.info("Received START command")
        start_rfid_system()
    elif command == "end":
        logger.info("Received END command")
        stop_rfid_system()
    elif command == "total":
        logger.info("Received TOTAL command")
        payload = message_json.get("payload", {})
        display_total(payload)
    else:
        logger.warning(f"Unknown command: {command}")

def main():
    """Main function"""
    # Set up logging
    setup_logging("INFO")
    logger = logging.getLogger("mqtt_controller")
    
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
