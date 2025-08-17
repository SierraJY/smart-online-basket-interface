"""
Parser module for RFID Minimal System

Provides functions for parsing tag IDs and extracting product information
"""

import logging
import json
from typing import Dict, Tuple, Optional, List
from collections import Counter

logger = logging.getLogger("rfid_minimal")

def parse_pid(tag_id: str) -> Dict[str, str]:
    """
    Parse Product ID (PID) from a tag ID
    
    The tag ID is expected to be in hexadecimal format.
    The first 4 characters of the decoded string represent the PID.
    
    Args:
        tag_id: The raw tag ID in hexadecimal format
        
    Returns:
        A dictionary containing the parsed information:
        - 'pid': The 4-character Product ID
        - 'raw': The original tag ID
        - 'decoded': The full decoded string
    """
    result = {
        'pid': '',
        'raw': tag_id,
        'decoded': ''
    }
    
    try:
        # Convert hexadecimal to bytes
        hex_bytes = bytes.fromhex(tag_id)
        
        # Decode bytes to ASCII characters, ignoring errors
        decoded = hex_bytes.decode('ascii', errors='replace')
        result['decoded'] = decoded
        
        # Extract the first 4 characters as PID
        if len(decoded) >= 4:
            result['pid'] = decoded[:4]
            logger.debug(f"Parsed PID '{result['pid']}' from tag ID '{tag_id}'")
        else:
            logger.warning(f"Tag ID '{tag_id}' decoded to '{decoded}', which is too short for a valid PID")
            
    except Exception as e:
        logger.error(f"Error parsing PID from tag ID '{tag_id}': {e}")
    
    return result

def extract_product_info(tag_id: str) -> Dict[str, str]:
    """
    Extract comprehensive product information from a tag ID
    
    This is an extended version of parse_pid that provides additional
    product-related information that might be encoded in the tag.
    
    Args:
        tag_id: The raw tag ID in hexadecimal format
        
    Returns:
        A dictionary containing product information
    """
    # Start with basic PID parsing
    info = parse_pid(tag_id)
    
    # Add additional fields as needed
    # This can be extended based on specific tag format requirements
    
    return info


def format_cart_for_mqtt(confirmed_items: List[str], basket_id: str = "basket0004") -> str:
    """
    Format cart contents for MQTT publishing
    
    Converts the list of confirmed items into a JSON string in the format:
    {"id": "basket0004", "list": {"MLON": 3, "WTMN": 4}}
    
    Args:
        confirmed_items: List of tag IDs in the cart
        basket_id: The ID of the shopping basket (default: "basket0004")
        
    Returns:
        JSON string formatted for MQTT publishing
    """
    # Parse PIDs from all confirmed items
    product_counts = Counter()
    
    for item in confirmed_items:
        try:
            parsed = parse_pid(item)
            pid = parsed.get('pid', '')
            
            # Only count items with valid PIDs (4 characters)
            if pid and len(pid) == 4:
                product_counts[pid] += 1
            else:
                logger.warning(f"Skipping item with invalid PID: {item}")
        except Exception as e:
            logger.error(f"Error processing item {item} for MQTT: {e}")
    
    # Create the MQTT message format
    mqtt_data = {
        "id": basket_id,
        "list": dict(product_counts)
    }
    
    # Convert to JSON string
    return json.dumps(mqtt_data)