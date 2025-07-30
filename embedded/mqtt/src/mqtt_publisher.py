import paho.mqtt.client as mqtt
import config

def publish_message(topic=None, message=None, qos=0, retain=False):
    """
    Publish a message to the MQTT broker
    
    Args:
        topic (str): Topic to publish to. If None, uses config.MQTT_TOPIC
        message (str): Message to publish
        qos (int): Quality of Service (0, 1, or 2)
        retain (bool): Whether to retain the message on the broker
        
    Returns:
        bool: True if successful, False otherwise
    """
    if topic is None:
        topic = config.MQTT_TOPIC
        
    if message is None:
        return False
        
    try:
        # Create client
        client = mqtt.Client()
        
        # Set credentials if needed
        if hasattr(config, 'MQTT_USER') and hasattr(config, 'MQTT_PASS'):
            if config.MQTT_USER and config.MQTT_PASS:
                client.username_pw_set(config.MQTT_USER, config.MQTT_PASS)
        
        # Connect to broker
        client.connect(config.MQTT_HOST, config.MQTT_PORT, 60)
        
        # Publish message
        result = client.publish(topic, message, qos=qos, retain=retain)
        
        # Check if publish was successful
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print(f"[SENT] Topic: {topic} / Message: {message}")
            success = True
        else:
            print(f"[ERROR] Failed to publish message. Return code: {result.rc}")
            success = False
            
        # Disconnect
        client.disconnect()
        return success
        
    except Exception as e:
        print(f"[ERROR] Exception while publishing: {str(e)}")
        return False

if __name__ == "__main__":
    # Example usage
    publish_message(message="Hello from MQTT Publisher!") 