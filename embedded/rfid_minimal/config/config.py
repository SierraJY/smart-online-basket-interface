"""
Configuration settings for RFID Minimal System
"""

# Basket identification
BASKET_ID = "1"  # Default basket ID

# MQTT Configuration
# These settings will be used when publishing to MQTT
# If you need to override these, create a local_config.py file
MQTT_ENABLED = True  # Set to False to disable MQTT publishing
MQTT_PUBLISH_CYCLE = 5  # Publish to MQTT every N cycles (set to 0 to publish every cycle)

# Import local config if it exists
try:
    from .local_config import *
except ImportError:
    try:
        # Try absolute import as fallback
        from rfid_minimal.config.local_config import *
    except ImportError:
        try:
            # Try absolute import from root as fallback
            import local_config
            # Copy all attributes from local_config to this module's namespace
            for attr in dir(local_config):
                if not attr.startswith('_'):
                    globals()[attr] = getattr(local_config, attr)
        except ImportError:
            pass  # Use default values