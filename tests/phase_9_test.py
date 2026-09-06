import subprocess
import time
import json
import sys
import re

print("--- Phase 9 Test: Verifying Device Lock Stability (via redis-cli) ---")
print("Target: Device ID should latch to Hardware (len 12, no dashes) and REJECT 'ORDER-MODE-002'")

start_time = time.time()
duration = 15
sample_count = 0
hardware_count = 0
software_count = 0
last_device = None
flips = 0

def get_redis_data():
    try:
        # Run docker exec command
        result = subprocess.check_output(
            ["docker", "compose", "exec", "redis", "redis-cli", "get", "factory/monitor"],
            stderr=subprocess.DEVNULL
        )
        return result.decode('utf-8').strip()
    except subprocess.CalledProcessError:
        return None

while time.time() - start_time < duration:
    data_str = get_redis_data()
    
    # Redis-cli might return quoted string
    if data_str and data_str.startswith('"') and data_str.endswith('"'):
        # Primitive unquote simple json string if doubly quoted
        try:
             # If redis-cli returns literal quoted string like "{\"foo\":...}"
             raw_json = json.loads(data_str) 
             # Now raw_json is the actual dictionary string? No wait.
             # If redis returns "{\"a\":1}", json.loads gives '{"a":1}' (string).
             # We need to parse AGAIN if it's string-in-string.
             if isinstance(raw_json, str):
                 data = json.loads(raw_json)
             else:
                 data = raw_json
        except:
             # Fallback parse
             data = None
    elif data_str:
        try:
            data = json.loads(data_str)
        except:
            data = None
    else:
        data = None

    if data:
        device_id = data.get("deviceId", "UNKNOWN")
        speed = data.get("speed", 0)
        di1 = data.get("di1", 0)
        
        # Check ID Type (Hardware = 12 chars, no dashes)
        is_hardware = len(device_id) == 12 and "-" not in device_id
        
        if is_hardware:
            hardware_count += 1
        else:
            software_count += 1
            
        if last_device and device_id != last_device:
             # Ignore the very first sample set
             if sample_count > 0:
                print(f"\n[FLIP] Device changed: {last_device} -> {device_id}")
                flips += 1
        
        last_device = device_id
        
        sys.stdout.write(f"\rTime: {int(time.time()-start_time)}s | Dev: {device_id} (HW:{str(is_hardware)[0]}) | Spd: {speed} | DI1: {di1} | HW%: {int(hardware_count/(sample_count+1)*100)}%")
        sys.stdout.flush()
    else:
        sys.stdout.write(".")
        sys.stdout.flush()
    
    time.sleep(0.5)
    sample_count += 1

print("\n\n--- Test Results ---")
print(f"Total Samples: {sample_count}")
print(f"Hardware Samples: {hardware_count}")
print(f"Software Samples: {software_count}")
print(f"Device Flips: {flips}")

if hardware_count > 0 and flips == 0:
    print("\n[PASS] Stable Hardware Lock Verified.")
elif software_count > 0:
    print("\n[FAIL] Software Device (Simulator) is still active.")
else:
    print("\n[INCONCLUSIVE] No data?")
