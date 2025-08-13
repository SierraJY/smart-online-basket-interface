Examples for local testing (not used in production)

How to run (from repo root):

- MQTT subscriber smoke test:
  python examples/mqtt_subscriber.py

- MQTT publish examples:
  python examples/mqtt_publish_examples.py

- Direct RFID runner (bench/hardware testing):
  python examples/rfid_minimal_runner.py --help

Notes
- These scripts are provided for development/testing only.
- Production entrypoint is: python -m mqtt_controller
