# MQTT Controller for RFID Minimal System

This script provides MQTT-based control for the RFID Minimal system, allowing remote start/stop and displaying totals.

## Features

- Subscribe to MQTT commands to control the RFID system
- Start/stop RFID scanning via MQTT commands
- Display cart totals on LCD screen (simulated in console for now)
- Runs as a continuous service waiting for commands

## Commands

The controller listens for the following commands on the MQTT topic `{MQTT_TOPIC}/control`:

- `start` - Start the RFID scanning system
- `end` - Stop the RFID scanning system
- `total` - Display the total items on the LCD screen

## Setup

1. Ensure the MQTT configuration is set up correctly in `mqtt/config.py`
2. Make sure the RFID minimal system is properly configured

## Usage

Run the controller:

```bash
python mqtt_controller.py
```

Send commands via MQTT to control the system:

```bash
# Using mosquitto_pub to send commands (example)
mosquitto_pub -h <broker_ip> -t <topic>/control -m "start"
mosquitto_pub -h <broker_ip> -t <topic>/control -m "end"
mosquitto_pub -h <broker_ip> -t <topic>/control -m "total"
```

## System Workflow

1. The controller subscribes to MQTT messages on the control topic
2. When a "start" command is received, it starts the RFID system in a separate thread
3. The RFID system continuously scans for tags and updates the cart manager
4. When an "end" command is received, it stops the RFID scanning thread
5. When a "total" command is received, it displays the current cart total

## Integration with LCD Display

To integrate with an actual LCD display, modify the `display_total()` function to communicate with your LCD hardware.