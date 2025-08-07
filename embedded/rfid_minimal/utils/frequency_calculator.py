"""
Frequency calculation utilities for RFID readers
"""

from typing import Dict, Tuple, Optional, Union

# Region code to name mapping
REGION_MAP: Dict[int, str] = {
    1: "China 900MHz",
    2: "US",
    3: "EU",
    4: "China 800MHz",
    6: "Korea"
}

# Region frequency parameters (base_freq, step_size)
REGION_FREQ_PARAMS: Dict[int, Tuple[float, float]] = {
    1: (920.125, 0.25),  # China 900MHz: CH_Index * 0.25MHz + 920.125MHz
    2: (902.25, 0.5),    # US: CH_Index * 0.5MHz + 902.25MHz
    3: (865.1, 0.2),     # EU: CH_Index * 0.2MHz + 865.1MHz
    4: (840.125, 0.25),  # China 800MHz: CH_Index * 0.25MHz + 840.125MHz
    6: (917.1, 0.2)      # Korea: CH_Index * 0.2MHz + 917.1MHz
}

def get_region_name(region_code: int) -> str:
    """
    Get region name from region code
    
    Args:
        region_code: Region code
        
    Returns:
        Region name
    """
    return REGION_MAP.get(region_code, f"Unknown({region_code})")

def calculate_frequency(region_code: int, channel_index: int) -> Optional[float]:
    """
    Calculate frequency based on region and channel index
    
    Args:
        region_code: Region code
        channel_index: Channel index
        
    Returns:
        Frequency in MHz or None if region is unknown
    """
    if region_code not in REGION_FREQ_PARAMS:
        return None
        
    base_freq, step_size = REGION_FREQ_PARAMS[region_code]
    return base_freq + (channel_index * step_size)

def get_frequency_info(region_code: int, channel_index: int) -> Dict[str, Union[str, float, int]]:
    """
    Get frequency information for a region and channel
    
    Args:
        region_code: Region code
        channel_index: Channel index
        
    Returns:
        Dictionary with region_name, frequency, base_freq, step_size
    """
    region_name = get_region_name(region_code)
    frequency = calculate_frequency(region_code, channel_index)
    
    result = {
        "region_code": region_code,
        "region_name": region_name,
        "channel_index": channel_index
    }
    
    if frequency is not None:
        base_freq, step_size = REGION_FREQ_PARAMS[region_code]
        result.update({
            "frequency": frequency,
            "base_freq": base_freq,
            "step_size": step_size,
            "frequency_str": f"{frequency:.3f}MHz"
        })
        
    return result