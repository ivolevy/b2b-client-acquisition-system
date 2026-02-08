
import json

def test_bbox_parsing(bbox_str):
    print(f"Testing bbox: {bbox_str}")
    google_bbox = None
    if bbox_str and isinstance(bbox_str, str):
        try:
            partes = bbox_str.split(',')
            if len(partes) == 4:
                google_bbox = {
                    "south": float(partes[0]),
                    "west": float(partes[1]),
                    "north": float(partes[2]),
                    "east": float(partes[3])
                }
        except Exception as e:
            print(f"Error parsing: {e}")
    
    print(f"Result: {google_bbox}")
    return google_bbox

# Test cases
test_bbox_parsing("-34.6,-58.4,-34.5,-58.3")
test_bbox_parsing(None)
test_bbox_parsing("invalid")
test_bbox_parsing("1,2,3")
