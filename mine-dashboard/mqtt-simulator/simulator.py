import random
import time
import paho.mqtt.client as mqtt
import os

# ===== SCENARIO CONFIGURATION =====
# Change this to switch between scenarios easily
CURRENT_SCENARIO = 6  # 1=single, 2=two, 3=three on HS71; 4=Handover; 5=Walking; 6=Two walkers (Barcode); 7=Enhanced 2 Miners Continuous Walk

# Scenario definitions
SCENARIOS = {
    1: {
        "name": "Single Device on Hotspot 71",
        "hotspot_id": 71, # Integer ID
        "mac_addresses": ["ff163671"]
    },
    2: {
        "name": "Two Devices on Hotspot 71",
        "hotspot_id": 71, # Integer ID
        "mac_addresses": ["ff163671", "ff163672"]
    },
    3: { 
        "name": "Three Devices on Hotspot 5 (stable)",
        "hotspot_id": 5, # Integer ID
        "mac_addresses": ["ff163671", "ff163672", "ff163673"],
    },
    4: { # Refined Handover Scenario with Barcodes
        "name": "Handover MAC ff163674 between HS Barcodes (stable MACs on primary HS)",
        "stable_macs_on_primary": ["ff163671", "ff163672", "ff163673"], # These stay on primary hotspot
        "handover_mac": "ff163674",
        "handover_hotspots": ["454578789", "HOTSPOT-HANDOVER-B"], # Hotspot BARCODES for handover_mac
        "primary_hs_for_stable_macs": "454578789" # Barcode for stable MACs
    },
    5: {
        "name": "Walking Miner Only - Clean signal change between HS71 & HS74",
        "walking_mac": "ff163675",
        "walking_hotspots": [74, 71], # Hotspot TABLE IDs [HS74, HS71]
        "start_rx_hs74": -30,
        "start_rx_hs71": -100,
        "end_rx_hs74": -100,
        "end_rx_hs71": -30,
        "step_size": 5,
        "interval": 3
    },
    6: { # Modified to use Barcodes
        "name": "Two Opposite Walking Miners (Hotspot Barcodes) - ff163677 & ff163678",
        "walker_1": {
            "mac": "ff163677",
            "start_rx_hs74": -30,  # Strong signal from hotspot1 (TEST-HOTSPOT-001)
            "start_rx_hs71": -100, # Weak signal from hotspot2 (TEST-HOTSPOT-002)
            "end_rx_hs74": -100,   # Weak signal from hotspot1 (TEST-HOTSPOT-001)
            "end_rx_hs71": -30     # Strong signal from hotspot2 (TEST-HOTSPOT-002)
        },
        "walker_2": {
            "mac": "ff163678", 
            "start_rx_hs74": -100, # Weak signal from hotspot1 (TEST-HOTSPOT-001)
            "start_rx_hs71": -30,  # Strong signal from hotspot2 (TEST-HOTSPOT-002)
            "end_rx_hs74": -30,    # Strong signal from hotspot1 (TEST-HOTSPOT-001)
            "end_rx_hs71": -100    # Weak signal from hotspot2 (TEST-HOTSPOT-002)
        },
        "walking_hotspots": ["TEST-HOTSPOT-001", "TEST-HOTSPOT-002"], # Hotspot BARCODES [Real hotspot barcodes from database]
        "step_size": 10,  # 10dB change per step per signal
        "interval": 3     # 3 seconds per step for visibility
    },
    7: { # Enhanced continuous walking simulation
        "name": "Enhanced 2 Miners Continuous Walk with Smart Handover",
        "miner_1": {
            "mac": "ff163677",
            "name": "Miner-Alpha",
            "start_position": 0,  # Starting at hotspot A side
            "speed": 2  # Position units per step
        },
        "miner_2": {
            "mac": "ff163678", 
            "name": "Miner-Beta",
            "start_position": 50,  # Starting at middle
            "speed": 1.5  # Different speed for varied interaction
        },
        "hotspots": ["TEST-HOTSPOT-001", "TEST-HOTSPOT-002"], # Hotspot BARCODES
        "mine_length": 100,  # Total mine corridor length
        "signal_range": 60,   # Maximum signal detection range
        "max_signal": -25,    # Best possible signal strength
        "min_signal": -95,    # Weakest detectable signal
        "interval": 0.8,      # Faster updates for smooth movement
        "boundary_behavior": "bounce"  # Miners bounce off boundaries
    }
    # Scenario 7 removed as Scenario 6 now uses barcodes
}

# Get current scenario config
if CURRENT_SCENARIO not in SCENARIOS:
    print(f"[MQTT SIMULATOR] ERROR: CURRENT_SCENARIO {CURRENT_SCENARIO} is not defined. Defaulting to 1.")
    CURRENT_SCENARIO = 1 # Fallback to a defined scenario
scenario_config = SCENARIOS[CURRENT_SCENARIO]

# Get MQTT broker configuration from environment or use defaults
MQTT_BROKER_HOST = os.getenv('MQTT_BROKER_HOST', 'localhost')
MQTT_BROKER_PORT = int(os.getenv('MQTT_BROKER_PORT', 1883))

# Initialize MQTT client with version compatibility
try:
    # Try new callback API version (paho-mqtt >= 2.0)
    mqtt_client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
except AttributeError:
    # Fallback for older versions (paho-mqtt < 2.0)
    mqtt_client = mqtt.Client()

# Connect to MQTT broker
mqtt_client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT)

print(f"[MQTT SIMULATOR] Starting Scenario {CURRENT_SCENARIO}: {scenario_config['name']}")
if CURRENT_SCENARIO <= 3:
    print(f"[MQTT SIMULATOR] Hotspot ID: {scenario_config['hotspot_id']}")
    print(f"[MQTT SIMULATOR] MAC Addresses: {scenario_config['mac_addresses']}")
    print(f"[MQTT SIMULATOR] Expected crowd_count (if all registered): {len(scenario_config['mac_addresses'])}")
elif CURRENT_SCENARIO == 4:
    print(f"[MQTT SIMULATOR] Stable MACs on Primary HS: {scenario_config['stable_macs_on_primary']}")
    print(f"[MQTT SIMULATOR] Handover MAC: {scenario_config['handover_mac']}")
    print(f"[MQTT SIMULATOR] Handover Hotspots: {scenario_config['handover_hotspots']}")
    print(f"[MQTT SIMULATOR] Primary HS for stable MACs: {scenario_config['primary_hs_for_stable_macs']}")
elif CURRENT_SCENARIO == 5:
    print(f"[MQTT SIMULATOR] Walking Miner Only - Clean signal change between HS71 & HS74")
    print(f"[MQTT SIMULATOR] Start RX HS74: {scenario_config['start_rx_hs74']}")
    print(f"[MQTT SIMULATOR] Start RX HS71: {scenario_config['start_rx_hs71']}")
    print(f"[MQTT SIMULATOR] End RX HS74: {scenario_config['end_rx_hs74']}")
    print(f"[MQTT SIMULATOR] End RX HS71: {scenario_config['end_rx_hs71']}")
    print(f"[MQTT SIMULATOR] Step Size: {scenario_config['step_size']}")
    print(f"[MQTT SIMULATOR] Interval: {scenario_config['interval']}")
elif CURRENT_SCENARIO == 6: # Was: or CURRENT_SCENARIO == 7
    print(f"[MQTT SIMULATOR] Scenario Type: {scenario_config['name']}")
    print(f"[MQTT SIMULATOR] Walker 1 MAC: {scenario_config['walker_1']['mac']}")
    print(f"[MQTT SIMULATOR] Walker 1 Start RX HS_A (e.g. 74 or its barcode): {scenario_config['walker_1']['start_rx_hs74']}")
    print(f"[MQTT SIMULATOR] Walker 1 Start RX HS_B (e.g. 71 or its barcode): {scenario_config['walker_1']['start_rx_hs71']}")
    print(f"[MQTT SIMULATOR] Walker 2 MAC: {scenario_config['walker_2']['mac']}")
    print(f"[MQTT SIMULATOR] Walker 2 Start RX HS_A: {scenario_config['walker_2']['start_rx_hs74']}")
    print(f"[MQTT SIMULATOR] Walker 2 Start RX HS_B: {scenario_config['walker_2']['start_rx_hs71']}")
    print(f"[MQTT SIMULATOR] Walking Hotspots (IDs or Barcodes): {scenario_config['walking_hotspots']}")
    print(f"[MQTT SIMULATOR] Step Size: {scenario_config['step_size']}")
    print(f"[MQTT SIMULATOR] Interval: {scenario_config['interval']}")
elif CURRENT_SCENARIO == 7:
    print(f"[MQTT SIMULATOR] Scenario Type: {scenario_config['name']}")
    print(f"[MQTT SIMULATOR] Miner 1 MAC: {scenario_config['miner_1']['mac']}")
    print(f"[MQTT SIMULATOR] Miner 1 Name: {scenario_config['miner_1']['name']}")
    print(f"[MQTT SIMULATOR] Miner 1 Start Position: {scenario_config['miner_1']['start_position']}")
    print(f"[MQTT SIMULATOR] Miner 1 Speed: {scenario_config['miner_1']['speed']}")
    print(f"[MQTT SIMULATOR] Miner 2 MAC: {scenario_config['miner_2']['mac']}")
    print(f"[MQTT SIMULATOR] Miner 2 Name: {scenario_config['miner_2']['name']}")
    print(f"[MQTT SIMULATOR] Miner 2 Start Position: {scenario_config['miner_2']['start_position']}")
    print(f"[MQTT SIMULATOR] Miner 2 Speed: {scenario_config['miner_2']['speed']}")
    print(f"[MQTT SIMULATOR] Hotspots: {scenario_config['hotspots']}")
    print(f"[MQTT SIMULATOR] Mine Length: {scenario_config['mine_length']}")
    print(f"[MQTT SIMULATOR] Signal Range: {scenario_config['signal_range']}")
    print(f"[MQTT SIMULATOR] Max Signal: {scenario_config['max_signal']}")
    print(f"[MQTT SIMULATOR] Min Signal: {scenario_config['min_signal']}")
    print(f"[MQTT SIMULATOR] Interval: {scenario_config['interval']}")
    print(f"[MQTT SIMULATOR] Boundary Behavior: {scenario_config['boundary_behavior']}")
print("-" * 50)

message_count = 0
# For handover scenario state (Scenario 4)
handover_stronger_on_first_hotspot = True 
# For walking scenario state (Scenario 5)
walking_step_5 = 0 # Renamed to avoid clash
walking_direction_5 = 1  # Renamed

# For two opposite walkers scenario state (Scenario 6)
# These variables will be used by scenario 6.
walking_step_walkers = 0 
walking_direction_walkers = 1

while True:
    if CURRENT_SCENARIO <= 3: # Scenarios 1, 2, 3 (Scenario 3 is now just stable MACs on HS71)
        HOTSPOT_ID = scenario_config['hotspot_id']
        MAC_ADDRESSES = scenario_config['mac_addresses']
        for mac_addr in MAC_ADDRESSES:
            message_count += 1
            rx_primary = -random.randint(45,65)
            battery_level = random.randint(20,100)
            data = f"""
            rxpower: {rx_primary};
            macaddr: {mac_addr};
            hotspotid: {HOTSPOT_ID};;
            battery: {battery_level};;
            """
            print(f"[SCN {CURRENT_SCENARIO}] Msg #{message_count}: MAC {mac_addr} -> HS {HOTSPOT_ID} (RX: {rx_primary}, Bat: {battery_level})")
            mqtt_client.publish("mine/gallery/raw", data)
            time.sleep(1) # Short delay between messages from different devices in the same cycle
        
        print(f"[SCN {CURRENT_SCENARIO}] Cycle complete. Waiting 5 seconds...")
        time.sleep(5) # Shorter wait for these simpler scenarios

    elif CURRENT_SCENARIO == 4: # Refined Handover Scenario
        stable_macs = scenario_config['stable_macs_on_primary']
        primary_hs_stable = scenario_config['primary_hs_for_stable_macs']
        handover_mac = scenario_config['handover_mac']
        hs1_handover, hs2_handover = scenario_config['handover_hotspots']
        
        # Publish for stable MACs on Hotspot 71
        for mac_addr in stable_macs:
            message_count += 1
            rx_val = -random.randint(45,65)
            bat_val = random.randint(20,100)
            data_stable = f"""
            rxpower: {rx_val};
            macaddr: {mac_addr};
            hotspotid: {primary_hs_stable};;
            battery: {bat_val};;
            """
            print(f"[SCN 4 - Stable] Msg #{message_count}: MAC {mac_addr} -> HS {primary_hs_stable} (RX: {rx_val}, Bat: {bat_val})")
            mqtt_client.publish("mine/gallery/raw", data_stable)
            time.sleep(0.5)

        # Determine rxpower for handover MAC
        # Example: HS71 gets -56, HS74 gets -100 OR HS71 gets -100, HS74 gets -50
        rx_strong_handover = -random.randint(50, 60)  # e.g., -56 dBm
        rx_weak_handover = -random.randint(90, 100) # e.g., -100 dBm
        handover_battery = random.randint(20,100)

        hs_for_strong_signal = hs1_handover if handover_stronger_on_first_hotspot else hs2_handover
        hs_for_weak_signal = hs2_handover if handover_stronger_on_first_hotspot else hs1_handover

        # Handover MAC - Signal to first designated hotspot for this cycle part
        message_count += 1
        data_ho_1 = f"""
        rxpower: {rx_strong_handover if hs_for_strong_signal == hs1_handover else rx_weak_handover};
        macaddr: {handover_mac};
        hotspotid: {hs1_handover};;
        battery: {handover_battery};;
        """
        rx_actual_hs1 = data_ho_1.split("rxpower: ")[1].split(";")[0]
        print(f"[SCN 4 - Handover] Msg #{message_count}: MAC {handover_mac} -> HS {hs1_handover} (RX: {rx_actual_hs1}, Bat: {handover_battery})")
        mqtt_client.publish("mine/gallery/raw", data_ho_1)
        time.sleep(0.2) # Very short delay

        # Handover MAC - Signal to second designated hotspot for this cycle part
        message_count += 1
        data_ho_2 = f"""
        rxpower: {rx_strong_handover if hs_for_strong_signal == hs2_handover else rx_weak_handover};
        macaddr: {handover_mac};
        hotspotid: {hs2_handover};;
        battery: {handover_battery};;
        """
        rx_actual_hs2 = data_ho_2.split("rxpower: ")[1].split(";")[0]
        print(f"[SCN 4 - Handover] Msg #{message_count}: MAC {handover_mac} -> HS {hs2_handover} (RX: {rx_actual_hs2}, Bat: {handover_battery})")
        mqtt_client.publish("mine/gallery/raw", data_ho_2)

        # Toggle for next cycle's strong signal target
        handover_stronger_on_first_hotspot = not handover_stronger_on_first_hotspot
        
        next_strong_hs = hs1_handover if handover_stronger_on_first_hotspot else hs2_handover
        print(f"[SCN 4] Cycle complete. Next strong signal for {handover_mac} will be on HS {next_strong_hs}. Waiting 7 seconds...")
        time.sleep(7) 

    elif CURRENT_SCENARIO == 5: # Walking Miner Scenario
        walking_mac = scenario_config['walking_mac']
        hs_A, hs_B = scenario_config['walking_hotspots']
        start_rx_hs_A = scenario_config['start_rx_hs74']
        start_rx_hs_B = scenario_config['start_rx_hs71']
        end_rx_hs_A = scenario_config['end_rx_hs74']
        end_rx_hs_B = scenario_config['end_rx_hs71']
        step_size = scenario_config['step_size']
        interval = scenario_config['interval']
        
        total_steps = abs(end_rx_hs_A - start_rx_hs_A) // step_size
        
        if walking_direction_5 == 1:
            current_rx_hs_A = start_rx_hs_A - (walking_step_5 * step_size)
            current_rx_hs_B = start_rx_hs_B + (walking_step_5 * step_size)
        else:
            current_rx_hs_A = end_rx_hs_A + (walking_step_5 * step_size)
            current_rx_hs_B = end_rx_hs_B - (walking_step_5 * step_size)
        
        battery_level = random.randint(20, 100)
        
        message_count += 1
        data_hs_A = f"""
        rxpower: {current_rx_hs_A};
        macaddr: {walking_mac};
        hotspotid: {hs_A};;
        battery: {battery_level};;
        """
        print(f"[SCN 5 - Walking] Msg #{message_count}: MAC {walking_mac} -> HS {hs_A} (RX: {current_rx_hs_A}, Step: {walking_step_5}, Dir: {walking_direction_5})")
        mqtt_client.publish("mine/gallery/raw", data_hs_A)
        
        time.sleep(0.2)
        
        message_count += 1
        data_hs_B = f"""
        rxpower: {current_rx_hs_B};
        macaddr: {walking_mac};
        hotspotid: {hs_B};;
        battery: {battery_level};;
        """
        print(f"[SCN 5 - Walking] Msg #{message_count}: MAC {walking_mac} -> HS {hs_B} (RX: {current_rx_hs_B}, Step: {walking_step_5}, Dir: {walking_direction_5})")
        mqtt_client.publish("mine/gallery/raw", data_hs_B)
        
        walking_step_5 += 1
        
        if walking_step_5 > total_steps:
            walking_direction_5 *= -1
            walking_step_5 = 0
            print(f"[SCN 5] Direction changed! Now walking direction: {walking_direction_5}")
        
        print(f"[SCN 5] Step {walking_step_5}/{total_steps}, Direction: {walking_direction_5}. Waiting {interval} second...")
        time.sleep(interval) 

    elif CURRENT_SCENARIO == 6: # Was: or CURRENT_SCENARIO == 7. Now only Scenario 6 uses this logic.
        walker_1_config = scenario_config['walker_1']
        walker_2_config = scenario_config['walker_2']
        # hs_A will be "454578789", hs_B will be "12354678" for Scenario 6
        hs_A, hs_B = scenario_config['walking_hotspots'] 
        step_size = scenario_config['step_size']
        interval = scenario_config['interval']
        
        total_steps = abs(walker_1_config['end_rx_hs74'] - walker_1_config['start_rx_hs74']) // step_size
        
        # Calculate current signal strengths for Walker 1
        if walking_direction_walkers == 1:
            walker_1_rx_hs_A = walker_1_config['start_rx_hs74'] - (walking_step_walkers * step_size)
            walker_1_rx_hs_B = walker_1_config['start_rx_hs71'] + (walking_step_walkers * step_size)
        else:
            walker_1_rx_hs_A = walker_1_config['end_rx_hs74'] + (walking_step_walkers * step_size)
            walker_1_rx_hs_B = walker_1_config['end_rx_hs71'] - (walking_step_walkers * step_size)
        
        # Calculate current signal strengths for Walker 2 (OPPOSITE direction of Walker 1's reference points)
        if walking_direction_walkers == 1:
            walker_2_rx_hs_A = walker_2_config['start_rx_hs74'] + (walking_step_walkers * step_size) # Starts far from hs_A, moves towards it
            walker_2_rx_hs_B = walker_2_config['start_rx_hs71'] - (walking_step_walkers * step_size) # Starts near hs_B, moves away
        else:
            walker_2_rx_hs_A = walker_2_config['end_rx_hs74'] - (walking_step_walkers * step_size)
            walker_2_rx_hs_B = walker_2_config['end_rx_hs71'] + (walking_step_walkers * step_size)
        
        battery_1 = random.randint(20, 100)
        battery_2 = random.randint(20, 100)
        
        # Send signals for Walker 1
        message_count += 1
        data_hs_A_w1 = f"""
        rxpower: {walker_1_rx_hs_A};
        macaddr: {walker_1_config['mac']};
        hotspotid: {hs_A};;
        battery: {battery_1};;
        """
        print(f"[SCN {CURRENT_SCENARIO} - W1] Msg #{message_count}: MAC {walker_1_config['mac']} -> HS_A ({hs_A}) (RX: {walker_1_rx_hs_A}, Step: {walking_step_walkers}, Dir: {walking_direction_walkers})")
        mqtt_client.publish("mine/gallery/raw", data_hs_A_w1)
        
        time.sleep(0.1)
        
        message_count += 1
        data_hs_B_w1 = f"""
        rxpower: {walker_1_rx_hs_B};
        macaddr: {walker_1_config['mac']};
        hotspotid: {hs_B};;
        battery: {battery_1};;
        """
        print(f"[SCN {CURRENT_SCENARIO} - W1] Msg #{message_count}: MAC {walker_1_config['mac']} -> HS_B ({hs_B}) (RX: {walker_1_rx_hs_B}, Step: {walking_step_walkers}, Dir: {walking_direction_walkers})")
        mqtt_client.publish("mine/gallery/raw", data_hs_B_w1)
        
        time.sleep(0.1)
        
        # Send signals for Walker 2
        message_count += 1
        data_hs_A_w2 = f"""
        rxpower: {walker_2_rx_hs_A};
        macaddr: {walker_2_config['mac']};
        hotspotid: {hs_A};;
        battery: {battery_2};;
        """
        print(f"[SCN {CURRENT_SCENARIO} - W2] Msg #{message_count}: MAC {walker_2_config['mac']} -> HS_A ({hs_A}) (RX: {walker_2_rx_hs_A}, Step: {walking_step_walkers}, Dir: {walking_direction_walkers})")
        mqtt_client.publish("mine/gallery/raw", data_hs_A_w2)
        
        time.sleep(0.1)
        
        message_count += 1
        data_hs_B_w2 = f"""
        rxpower: {walker_2_rx_hs_B};
        macaddr: {walker_2_config['mac']};
        hotspotid: {hs_B};;
        battery: {battery_2};;
        """
        print(f"[SCN {CURRENT_SCENARIO} - W2] Msg #{message_count}: MAC {walker_2_config['mac']} -> HS_B ({hs_B}) (RX: {walker_2_rx_hs_B}, Step: {walking_step_walkers}, Dir: {walking_direction_walkers})")
        mqtt_client.publish("mine/gallery/raw", data_hs_B_w2)
        
        walking_step_walkers += 1
        
        if walking_step_walkers > total_steps:
            walking_direction_walkers *= -1
            walking_step_walkers = 0
            print(f"[SCN {CURRENT_SCENARIO}] Direction changed for walkers! Now walking direction: {walking_direction_walkers}")
        
        print(f"[SCN {CURRENT_SCENARIO}] Step {walking_step_walkers}/{total_steps}, Direction: {walking_direction_walkers}. Waiting {interval} seconds...")
        time.sleep(interval) 

    elif CURRENT_SCENARIO == 7: # Enhanced continuous walking simulation
        miner_1 = scenario_config['miner_1']
        miner_2 = scenario_config['miner_2']
        hotspots = scenario_config['hotspots']
        mine_length = scenario_config['mine_length']
        signal_range = scenario_config['signal_range']
        max_signal = scenario_config['max_signal']
        min_signal = scenario_config['min_signal']
        interval = scenario_config['interval']
        boundary_behavior = scenario_config['boundary_behavior']
        
        # Initialize positions and directions if not already set
        if 'current_position' not in miner_1:
            miner_1['current_position'] = miner_1['start_position']
            miner_1['current_speed'] = miner_1['speed']
        if 'current_position' not in miner_2:
            miner_2['current_position'] = miner_2['start_position']
            miner_2['current_speed'] = miner_2['speed']
        
        # Simulate miner movement and signal strength
        for miner in [miner_1, miner_2]:
            position = miner['current_position']
            speed = miner['current_speed']
            
            # Handle boundary behavior
            if boundary_behavior == "bounce":
                if position <= 0 or position >= mine_length:
                    speed *= -1
                    miner['current_speed'] = speed
                position += speed
                position = max(0, min(mine_length, position))  # Clamp to boundaries
            else:
                position = (position + speed) % mine_length
            
            miner['current_position'] = position
            
            # Calculate signal strength to each hotspot based on distance
            hotspot_a_pos = 0
            hotspot_b_pos = mine_length
            
            distance_to_a = abs(position - hotspot_a_pos)
            distance_to_b = abs(position - hotspot_b_pos)
            
            # Signal strength decreases with distance
            signal_to_a = max_signal - (distance_to_a / signal_range) * (max_signal - min_signal)
            signal_to_b = max_signal - (distance_to_b / signal_range) * (max_signal - min_signal)
            
            # Clamp signals to valid range
            signal_to_a = max(min_signal, min(max_signal, signal_to_a))
            signal_to_b = max(min_signal, min(max_signal, signal_to_b))
            
            battery_level = random.randint(20, 100)
            
            # Send signal to both hotspots
            message_count += 1
            data_a = f"""
            rxpower: {int(signal_to_a)};
            macaddr: {miner['mac']};
            hotspotid: {hotspots[0]};;
            battery: {battery_level};;
            """
            print(f"[SCN {CURRENT_SCENARIO} - {miner['name']}] Msg #{message_count}: MAC {miner['mac']} -> HS {hotspots[0]} (RX: {int(signal_to_a)}, Pos: {position:.1f})")
            mqtt_client.publish("mine/gallery/raw", data_a)
            time.sleep(0.1)
            
            message_count += 1
            data_b = f"""
            rxpower: {int(signal_to_b)};
            macaddr: {miner['mac']};
            hotspotid: {hotspots[1]};;
            battery: {battery_level};;
            """
            print(f"[SCN {CURRENT_SCENARIO} - {miner['name']}] Msg #{message_count}: MAC {miner['mac']} -> HS {hotspots[1]} (RX: {int(signal_to_b)}, Pos: {position:.1f})")
            mqtt_client.publish("mine/gallery/raw", data_b)
            time.sleep(0.1)
        
        print(f"[SCN {CURRENT_SCENARIO}] Cycle complete. Waiting {interval} seconds...")
        time.sleep(interval) 