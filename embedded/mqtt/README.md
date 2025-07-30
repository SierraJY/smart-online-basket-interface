# Smart Basket MQTT System

This repository contains code for the Smart Basket MQTT communication system.

## Setup

1. Install dependencies:
```bash
pip install paho-mqtt
```

2. Create a config.py file (copy from config.example.py):
```bash
cp config.example.py config.py
```

3. Edit config.py with your MQTT broker details:
```python
MQTT_HOST = "your.broker.ip"  # EC2 instance IP or hostname
MQTT_PORT = 1883
MQTT_TOPIC = "basket/unit0001"  # Default topic, can be overridden

# For anonymous brokers (no authentication required):
MQTT_USER = ""  # Leave empty for anonymous access
MQTT_PASS = ""  # Leave empty for anonymous access

# For authenticated brokers, set username and password:
# MQTT_USER = "youruser"
# MQTT_PASS = "yourpassword"
```

## Usage

### Sending Messages

Use the `mqtt_publisher.py` module to send messages:

```python
from mqtt_publisher import publish_message

# Basic usage
publish_message(message="Hello from Smart Basket!")

# Send to specific topic
publish_message(topic="basket/unit0001", message="Smart basket unit 1 is active")

# Send JSON data
import json
data = {"event": "add_item", "item_id": "product123"}
publish_message(topic="basket/unit0001", message=json.dumps(data))
```

### Receiving Messages

Run the subscriber to listen for messages:

```bash
python src/mqtt_subscriber.py
```

## Topic Naming Convention

Follow these guidelines for topic naming:

- Use `basket/unit{ID}` format for basket topics
- Example: `basket/unit0001`, `basket/unit0002`
- For store-specific topics: `basket/store{STORE_ID}/unit{ID}`

## Message Format

JSON is recommended for message payloads:

```json
{
  "basket_id": "unit0001",
  "event": "add_item",
  "item_id": "product123",
  "timestamp": 1687245871.123
}
```

## Examples

See `src/main.py` for complete usage examples.

## Documentation

For more details, see:
- [MQTT Architecture](docs/mqtt_architecture.md)
- [Smart Basket MQTT Guide](docs/sobi_mqtt_guide.md) 