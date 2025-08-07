#!/usr/bin/env python3
"""
Example main.py showing how to use the MQTT publisher
Works with both anonymous and authenticated brokers
"""
import time
import json
from .mqtt_publisher import publish_message

def main():
    # Example 1: Basic message publishing
    publish_message(message="Hello from Smart Basket!")
    
    # Example 2: Publishing to a specific topic
    publish_message(topic="basket/unit0001", message="Smart basket unit 1 is active")
    
    # Example 3: Publishing JSON data
    basket_data = {
        "basket_id": "unit0001",
        "event": "add_item",
        "item_id": "product123",
        "timestamp": time.time()
    }
    publish_message(
        topic="basket/unit0001", 
        message=json.dumps(basket_data)
    )
    
    # Example 4: Publishing with QoS and retain flag
    status_data = {
        "status": "online",
        "battery": 85,
        "timestamp": time.time()
    }
    publish_message(
        topic="test/topic",
        message=json.dumps(status_data),
        qos=1,  # Ensure at least once delivery
        retain=True  # Retain the message on the broker
    )

if __name__ == "__main__":
    main() 