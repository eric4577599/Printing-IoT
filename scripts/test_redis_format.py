import redis
import json

try:
    r = redis.Redis(host='localhost', port=6380, decode_responses=True)
    # Note: Port 6380 is mapped in docker-compose for host access
    data = r.get("factory/monitor")
    if data:
        print(f"RAW DATA: {data}")
        parsed = json.loads(data)
        print(f"KEYS: {list(parsed.keys())}")
    else:
        print("No data in factory/monitor")
except Exception as e:
    print(f"Error: {e}")
