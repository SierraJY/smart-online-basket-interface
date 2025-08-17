# DEV-ONLY SAMPLE SCRIPT
# Purpose: MQTT subscriber smoke test (prints received messages)
# Not used by production runtime (`python -m mqtt_controller`).
# Intended for local testing/smoke checks only.

import paho.mqtt.client as mqtt
from mqtt import config

def on_connect(client, userdata, flags, rc):
    print("[INFO] Connected with result code", rc)
    client.subscribe(config.MQTT_TOPIC)

def on_message(client, userdata, msg):
    print(f"[RECV] Topic: {msg.topic} / Message: {msg.payload.decode()}")

def main():
    client = mqtt.Client()
    # client.username_pw_set(config.MQTT_USER, config.MQTT_PASS)    # 인증 필요시
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(config.MQTT_HOST, config.MQTT_PORT, 60)
    print(f"[INFO] Subscribing to '{config.MQTT_TOPIC}' on {config.MQTT_HOST}:{config.MQTT_PORT} ...")
    client.loop_forever()

if __name__ == "__main__":
    main()