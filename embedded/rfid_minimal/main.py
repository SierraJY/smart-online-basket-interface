"""
RFID Minimal - Main Application
"""

import logging
import argparse
import sys
import time
import importlib.util
from typing import Dict, Set, List, Any

from rfid_minimal.managers.sensor_manager import MultiSensorManager
from rfid_minimal.core.models import TagInfo
from rfid_minimal.managers.cart_manager import CartManager
from rfid_minimal.core.parser import parse_pid, format_cart_for_mqtt
from rfid_minimal.config.config import BASKET_ID, MQTT_ENABLED, MQTT_PUBLISH_CYCLE

# Try to import MQTT publisher
mqtt_available = False
try:
    mqtt_spec = importlib.util.find_spec('mqtt.src.mqtt_publisher')
    if mqtt_spec:
        from mqtt.src.mqtt_publisher import publish_message
        mqtt_available = True
except ImportError:
    pass

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
        default=30, 
        help="Number of polling cycles to run (default: 30)"
    )
    
    parser.add_argument(
        "--polling-count", 
        type=int, 
        default=15, 
        help="Multi-polling count for each sensor (default: 15)"
    )
    
    parser.add_argument(
        "--rssi-threshold", 
        type=int, 
        default=-70, 
        help="RSSI threshold for filtering tags in dBm (default: -70 filtering)"
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
    
    parser.add_argument(
        "--mqtt-enabled",
        action="store_true",
        help="Enable MQTT publishing (default: use config setting)"
    )
    
    parser.add_argument(
        "--mqtt-disabled",
        action="store_true",
        help="Disable MQTT publishing (default: use config setting)"
    )
    
    parser.add_argument(
        "--basket-id",
        type=str,
        help="Set the basket ID for MQTT publishing (default: from config)"
    )
    
    return parser.parse_args()

def run_rfid_system(
    cycles: int = 3,
    polling_count: int = 30,
    rssi_threshold: int = -60,
    presence_threshold: int = 2,
    absence_threshold: int = 2,
    timeout: float = 5.0,
    mqtt_enabled: bool = None,
    basket_id: str = None
) -> Dict[str, Any]:
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
            # Log the detection in debug mode if needed
            logger.debug(f"Tag detected during polling: {tag_info.raw_tag_id} (RSSI: {tag_info.rssi})")

        manager.set_tag_callback(tag_callback)
        
        # Run multiple polling cycles
        all_cycle_results: Dict[int, Dict[str, Set[str]]] = {}
        
        for cycle in range(1, cycles + 1):
            logger.info(f"=== Cycle #{cycle} started ===")
            
            # Start cart tracking for this cycle
            cart_manager.start_cycle()
            
            # Run polling cycle
            cycle_start_time = time.time()
            results = manager.run_polling_cycle(timeout) # results 딕셔너리 생성
            cycle_duration = time.time() - cycle_start_time

            # Send results to CartManager for processing
            cart_manager.process_cycle_results(results, manager)
            
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

            # print cart summary with tag details
            logger.info("Cart summary:")
            cart_summary = cart_manager.get_cart_summary()
            logger.info(f"Confirmed items: {len(cart_summary['confirmed_items'])}, Removed items: {len(cart_summary['removed_items'])}")
            logger.info("Confirmed items:")
            for item in cart_summary["confirmed_items"]:
                item_details = cart_manager.get_item_details(item)
                if item_details:
                    # Parse the tag ID to extract the PID
                    parsed_info = parse_pid(item)
                    pid = parsed_info.get('pid', 'Unknown')
                    logger.info(f"  - {item} (PID: {pid}, Avg RSSI: {item_details.avg_rssi:.1f}, Detections: {item_details.detection_count})")
            for item in cart_summary["removed_items"]:
                # Parse removed items as well
                parsed_info = parse_pid(item)
                pid = parsed_info.get('pid', 'Unknown')
                logger.info(f"  - {item} (PID: {pid}, Removed)")

            # Format cart data for potential MQTT publishing
            basket_id_to_use = basket_id if basket_id else BASKET_ID
            cart_data = format_cart_for_mqtt(
                cart_summary["confirmed_items"], 
                basket_id_to_use
            )
            logger.debug(f"Cart data formatted for potential MQTT: {cart_data}")
            
            # Publish cart data to MQTT if enabled
            if mqtt_available and (mqtt_enabled if mqtt_enabled is not None else MQTT_ENABLED):
                # Check if we should publish this cycle
                should_publish = (MQTT_PUBLISH_CYCLE == 0 or 
                                 cycle % MQTT_PUBLISH_CYCLE == 0 or 
                                 cycle == cycles)
                
                if should_publish:
                    try:
                        # Import MQTT publisher dynamically to avoid circular imports
                        import importlib.util
                        mqtt_spec = importlib.util.find_spec('mqtt.src.mqtt_publisher')
                        if mqtt_spec:
                            from mqtt.src.mqtt_publisher import publish_message
                            
                            # Publish to MQTT
                            logger.info(f"Publishing cart data to MQTT: {cart_data}")
                            publish_result = publish_message(message=cart_data)
                            
                            if publish_result:
                                logger.info("MQTT publish successful")
                            else:
                                logger.error("MQTT publish failed")
                    except Exception as e:
                        logger.error(f"Error publishing to MQTT: {e}")
            
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
                # Parse the tag ID to extract the PID
                parsed_info = parse_pid(item)
                pid = parsed_info.get('pid', 'Unknown')
                logger.info(f"  - {item} (PID: {pid}, Avg RSSI: {item_details.avg_rssi:.1f}, Detections: {item_details.detection_count})")
        
        logger.info(f"Items removed from cart: {len(removed_items)}")
        for item in removed_items:
            # Parse removed items as well
            parsed_info = parse_pid(item)
            pid = parsed_info.get('pid', 'Unknown')
            logger.info(f"  - {item} (PID: {pid})")
            
        # Format final cart data for potential MQTT publishing
        basket_id_to_use = basket_id if basket_id else BASKET_ID
        final_cart_data = format_cart_for_mqtt(
            confirmed_items, 
            basket_id_to_use
        )
        
        # Return the final results
        result = {
            "cart_summary": cart_summary,
            "confirmed_items": confirmed_items,
            "removed_items": removed_items,
            "final_cart_data": final_cart_data,
            "all_tags": list(all_tags),
            "all_cycle_results": all_cycle_results,
            "basket_id": basket_id_to_use
        }
        
        return result
        
    except KeyboardInterrupt:
        logger.info("User interrupted execution")
        return {"error": "User interrupted execution"}
    except Exception as e:
        logger.error(f"Error running RFID system: {e}", exc_info=True)
        return {"error": str(e)}
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
    result = run_rfid_system(
        cycles=args.cycles,
        polling_count=args.polling_count,
        rssi_threshold=args.rssi_threshold,
        presence_threshold=args.presence_threshold,
        absence_threshold=args.absence_threshold,
        timeout=args.timeout
    )
    
    # Print result summary
    if "error" not in result:
        print(f"RFID system completed successfully with {len(result['confirmed_items'])} items in cart")