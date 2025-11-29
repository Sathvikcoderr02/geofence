from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import math
from config import Config

logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

@dataclass
class Point:
    lat: float
    lon: float

@dataclass
class Zone:
    id: str
    name: str
    center: Point
    radius_meters: float

@dataclass
class LocationEvent:
    vehicle_id: str
    latitude: float
    longitude: float
    timestamp: datetime

class GeofenceService:
    def __init__(self):
        self.zones: Dict[str, Zone] = {}
        self.vehicle_zones: Dict[str, Optional[str]] = {}
        self.location_history: Dict[str, List[LocationEvent]] = {}
        
    def add_zone(self, zone: Zone):
        self.zones[zone.id] = zone
        logger.info(f"Added zone: {zone.id} ({zone.name})")
        
    def distance_meters(self, p1: Point, p2: Point) -> float:
        R = 6371000
        lat1_rad = math.radians(p1.lat)
        lat2_rad = math.radians(p2.lat)
        delta_lat = math.radians(p2.lat - p1.lat)
        delta_lon = math.radians(p2.lon - p1.lon)
        
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def is_point_in_zone(self, point: Point, zone: Zone) -> bool:
        distance = self.distance_meters(point, zone.center)
        return distance <= zone.radius_meters
    
    def find_current_zone(self, point: Point) -> Optional[str]:
        for zone_id, zone in self.zones.items():
            if self.is_point_in_zone(point, zone):
                return zone_id
        return None
    
    def process_location_event(self, event: LocationEvent) -> Dict:
        vehicle_id = event.vehicle_id
        point = Point(event.latitude, event.longitude)
        
        if vehicle_id not in self.location_history:
            self.location_history[vehicle_id] = []
            self.vehicle_zones[vehicle_id] = None
        
        previous_zone = self.vehicle_zones[vehicle_id]
        current_zone_id = self.find_current_zone(point)
        
        result = {
            "vehicle_id": vehicle_id,
            "current_zone": current_zone_id,
            "zone_name": self.zones[current_zone_id].name if current_zone_id else None,
            "event": None
        }
        
        if previous_zone != current_zone_id:
            if current_zone_id:
                result["event"] = "enter"
                logger.info(f"Vehicle {vehicle_id} entered zone {current_zone_id}")
            elif previous_zone:
                result["event"] = "exit"
                logger.info(f"Vehicle {vehicle_id} exited zone {previous_zone}")
            
            self.vehicle_zones[vehicle_id] = current_zone_id
        
        self.location_history[vehicle_id].append(event)
        
        return result
    
    def get_vehicle_status(self, vehicle_id: str) -> Optional[Dict]:
        if vehicle_id not in self.vehicle_zones:
            return None
        
        current_zone_id = self.vehicle_zones[vehicle_id]
        return {
            "vehicle_id": vehicle_id,
            "current_zone": current_zone_id,
            "zone_name": self.zones[current_zone_id].name if current_zone_id else None,
            "location_count": len(self.location_history.get(vehicle_id, []))
        }

geofence_service = GeofenceService()

for zone_config in Config.ZONES:
    geofence_service.add_zone(Zone(
        id=zone_config['id'],
        name=zone_config['name'],
        center=Point(lat=zone_config['center_lat'], lon=zone_config['center_lon']),
        radius_meters=zone_config['radius_meters']
    ))

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route('/location', methods=['POST'])
def receive_location():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        required_fields = ['vehicle_id', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        vehicle_id = str(data['vehicle_id'])
        try:
            latitude = float(data['latitude'])
            longitude = float(data['longitude'])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid latitude or longitude"}), 400
        
        if not (-90 <= latitude <= 90):
            return jsonify({"error": "Latitude must be between -90 and 90"}), 400
        if not (-180 <= longitude <= 180):
            return jsonify({"error": "Longitude must be between -180 and 180"}), 400
        
        timestamp = datetime.now()
        if 'timestamp' in data:
            try:
                timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                logger.warning(f"Invalid timestamp format, using current time")
        
        event = LocationEvent(
            vehicle_id=vehicle_id,
            latitude=latitude,
            longitude=longitude,
            timestamp=timestamp
        )
        
        result = geofence_service.process_location_event(event)
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error processing location event: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/vehicle/<vehicle_id>/status', methods=['GET'])
def get_vehicle_status(vehicle_id):
    try:
        status = geofence_service.get_vehicle_status(vehicle_id)
        
        if status is None:
            return jsonify({"error": "Vehicle not found"}), 404
        
        return jsonify(status), 200
        
    except Exception as e:
        logger.error(f"Error getting vehicle status: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/zones', methods=['GET'])
def list_zones():
    try:
        zones = []
        for zone_id, zone in geofence_service.zones.items():
            zones.append({
                "id": zone_id,
                "name": zone.name,
                "center": {"lat": zone.center.lat, "lon": zone.center.lon},
                "radius_meters": zone.radius_meters
            })
        return jsonify({"zones": zones}), 200
    except Exception as e:
        logger.error(f"Error listing zones: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/config')
def get_config():
    return jsonify({
        'api_base_url': Config.API_BASE_URL,
        'map_center': {
            'lat': Config.DEFAULT_MAP_CENTER_LAT,
            'lon': Config.DEFAULT_MAP_CENTER_LON
        },
        'map_zoom': Config.DEFAULT_MAP_ZOOM
    }), 200

if __name__ == '__main__':
    logger.info("Starting Geofence Service")
    logger.info(f"Frontend available at {Config.API_BASE_URL}")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)

