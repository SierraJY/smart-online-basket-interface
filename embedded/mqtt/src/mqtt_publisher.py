import paho.mqtt.client as mqtt
import logging
import threading
from mqtt import config

# Maintain a persistent client for faster repeated publishes
_client_lock = threading.Lock()
_client = None  # type: ignore[var-annotated]


def _get_client():
    global _client
    with _client_lock:
        try:
            if _client is not None:
                # Reuse existing client if connected
                try:
                    if _client.is_connected():  # type: ignore[attr-defined]
                        return _client
                except Exception:
                    pass
            # Create new client
            client = mqtt.Client()
            if hasattr(config, 'MQTT_USER') and hasattr(config, 'MQTT_PASS'):
                if getattr(config, 'MQTT_USER', None) and getattr(config, 'MQTT_PASS', None):
                    client.username_pw_set(config.MQTT_USER, config.MQTT_PASS)
            # Connect and start background network loop
            client.connect(config.MQTT_HOST, config.MQTT_PORT, 60)
            client.loop_start()
            _client = client
            return _client
        except Exception as e:
            logger = logging.getLogger("rfid_minimal")
            logger.error(f"[MQTT] Failed to establish client: {e}")
            _client = None
            return None


def publish_message(topic=None, message=None, qos=0, retain=False):
    """
    Publish a message to the MQTT broker using a persistent client.
    
    Args:
        topic (str): Topic to publish to. If None, uses config.MQTT_TOPIC + "/update"
        message (str): Message to publish
        qos (int): Quality of Service (0, 1, or 2)
        retain (bool): Whether to retain the message on the broker
        
    Returns:
        bool: True if successful, False otherwise
    """
    if topic is None:
        topic = config.MQTT_TOPIC + "/update"
    if message is None:
        return False

    logger = logging.getLogger("rfid_minimal")
    try:
        client = _get_client()
        if client is None:
            return False

        result = client.publish(topic, message, qos=qos, retain=retain)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info("[MQTT] SENT Topic: %s / Message: %s", topic, message)
            return True
        else:
            logger.error("[MQTT] Failed to publish message. Return code: %s", result.rc)
            return False
    except Exception as e:
        logger.error("[MQTT] Exception while publishing: %s", str(e))
        # Attempt one reconnect on failure
        with _client_lock:
            try:
                if _client is not None:
                    try:
                        _client.loop_stop()
                    except Exception:
                        pass
                    try:
                        _client.disconnect()
                    except Exception:
                        pass
                    globals()['_client'] = None
            except Exception:
                pass
        return False

if __name__ == "__main__":
    # Set up basic logging for standalone usage
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    logger = logging.getLogger("rfid_minimal")
    
    # Example usage
    logger.info("Testing MQTT Publisher...")
    result = publish_message(message="Hello from MQTT Publisher!")
    logger.info(f"Publish result: {result}") 