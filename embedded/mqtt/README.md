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
MQTT_TOPIC = "basket/1"  # Base topic; controller listens on `${MQTT_TOPIC}/status` and publishes to `${MQTT_TOPIC}/update`

# For anonymous brokers (no authentication required):
MQTT_USER = ""  # Leave empty for anonymous access
MQTT_PASS = ""  # Leave empty for anonymous access

# For authenticated brokers, set username and password:
# MQTT_USER = "youruser"
# MQTT_PASS = "yourpassword"
```

## Usage

### Sending Messages

Use the publisher module directly or run the example script:

```python
from mqtt.src.mqtt_publisher import publish_message

# Basic usage (defaults to f"{MQTT_TOPIC}/update")
publish_message(message="Hello from Smart Basket!")

# Send to specific topic
publish_message(topic="basket/1/update", message="Smart basket unit 1 is active")

# Send JSON data
import json
data = {"event": "add_item", "item_id": "product123"}
publish_message(topic="basket/1/update", message=json.dumps(data))
```

Or:

```bash
python examples/mqtt_publish_examples.py
```

### Receiving Messages

Run the subscriber example to listen for messages:

```bash
python examples/mqtt_subscriber.py
```

## Topics

- Base topic: `MQTT_TOPIC` (e.g., `basket/1`)
- Controller command topic: `${MQTT_TOPIC}/status` (expects `start`, `end`, or JSON with `{ "msg": "total", "payload": { "basketid": <int>, "totalprice": <int> } }`)
- Update/publish topic: `${MQTT_TOPIC}/update`

For broader naming guidelines, see docs.

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

See `examples/mqtt_publish_examples.py` and `examples/mqtt_subscriber.py` for runnable samples.

## Documentation

For more details, see:
- [MQTT Architecture](docs/mqtt_architecture.md)
- [Smart Basket MQTT Guide](docs/sobi_mqtt_guide.md) 