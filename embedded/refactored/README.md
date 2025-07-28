# RFID System

A modular RFID reader system for YRM100 devices with multi-sensor support.

## Features

- Support for multiple RFID readers
- Confidence-based tag tracking
- RSSI filtering for reliable tag detection
- Inertia-based tag status management
- Comprehensive logging
- Clean resource management

## Project Structure

```
rfid_system/
├── core/               # Core components
│   ├── events.py       # Event system
├── config/             # Configuration
│   ├── constants.py    # System constants
├── models/             # Data models
│   ├── tag_models.py   # Tag-related data models
│   └── result_models.py # Result data models
├── protocols/          # Protocol implementations
│   ├── yrm100_protocol.py # YRM100 protocol handler
├── utils/              # Utilities
│   ├── epc_handler.py  # EPC data processing
├── sensors/            # Sensor implementations
│   ├── rfid_reader.py  # Main facade class
│   ├── connection_handler.py # Connection management
│   ├── frame_processor.py # Frame processing
│   ├── command_handler.py # Command handling
│   └── reading_loop.py # Reading loop management
├── managers/           # Managers
│   ├── sensor_manager.py # Multi-sensor manager
├── docs/               # Documentation
│   ├── architecture.txt # ASCII architecture diagram
│   ├── diagram_viewer.html # Interactive diagram viewer
│   ├── simple_diagram.html # Simple diagram viewer
│   ├── mermaid_code.txt # Mermaid code for online editor
│   └── rfid_architecture.png # Architecture diagram
├── main.py             # Main application
```

## Architecture

The system follows a component-based architecture with clear separation of concerns:

![RFID System Architecture](rfid_system/docs/rfid_architecture.png)

### Components

1. **RFIDReader (Facade)**: Coordinates all components and provides a simplified API
2. **ConnectionHandler**: Manages serial connections and low-level I/O
3. **FrameProcessor**: Handles frame parsing, validation, and EPC data processing
4. **CommandHandler**: Manages RFID commands and protocol interactions
5. **ReadingLoopHandler**: Handles the reading loop and tag processing logic
6. **YRM100Protocol**: Implements the YRM100 protocol and frame handling
7. **EPCHandler**: Processes EPC tag data and provides summaries

### Viewing the Architecture Diagram

You can view and interact with the architecture diagram in several ways:

1. **Static PNG Image**: View the [rfid_architecture.png](rfid_system/docs/rfid_architecture.png) file

2. **Simple HTML Viewer**: Open the [simple_diagram.html](rfid_system/docs/simple_diagram.html) file in a browser for a basic diagram view

3. **Interactive HTML**: Open the [diagram_viewer.html](rfid_system/docs/diagram_viewer.html) file in a browser for an interactive diagram with zoom and download options

4. **Online Mermaid Editor**: Copy the contents of [mermaid_code.txt](rfid_system/docs/mermaid_code.txt) and paste it into the [Mermaid Live Editor](https://mermaid.live/)

5. **ASCII Diagram**: See the [architecture.txt](rfid_system/docs/architecture.txt) file for a text-based representation

6. **Render Updated Diagram**: Run `python rfid_system/docs/render_diagram.py` to generate a fresh diagram

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/rfid_system.git
   cd rfid_system
   ```

2. Install the package:
   ```
   pip install -e .
   ```

## Usage

### Basic Usage

```python
from rfid_system.sensors import RFIDReader

# Create a reader
reader = RFIDReader(port="COM3")

try:
    # Initialize reader with settings
    reader.initialize_reader(power_dbm=26, enable_hopping=True, region="Korea")
    
    # Start reading tags
    reader.start_reading(polling_mode="multiple", count=30)
    
    # Wait for some time
    import time
    time.sleep(10)
    
finally:
    # Clean up resources
    reader.stop_reading_and_cleanup()
```

### Using the Manager

```python
from rfid_system.managers.sensor_manager import MultiSensorManager

# Create sensor manager
manager = MultiSensorManager(
    polling_count=30,
    rssi_threshold=-55,
    max_cycle_length=10,
    removal_threshold=4,
    consecutive_miss_threshold=3,
    polling_timeout=12.0
)

try:
    # Run multiple polling cycles
    results = manager.run_multiple_cycles(5)
    
    # Process results
    for result in results:
        print(f"Cycle #{result.cycle_number}: {len(result.confirmed_tags)} confirmed tags")
        
finally:
    # Clean up resources
    manager.cleanup()
```

### Command Line

```
python -m rfid_system.main --cycles 5 --polling-count 30 --rssi-threshold -55 --log-level INFO
```

## Configuration

- `polling_count`: Number of polling operations per cycle
- `rssi_threshold`: RSSI threshold for reliable tags (in dBm)
- `max_cycle_length`: Maximum cycle history length
- `removal_threshold`: Removal condition threshold
- `consecutive_miss_threshold`: Consecutive miss threshold
- `polling_timeout`: Polling timeout in seconds

## License

MIT License 