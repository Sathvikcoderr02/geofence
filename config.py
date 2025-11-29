import os
from typing import List, Dict

class Config:
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    API_BASE_URL = os.getenv('API_BASE_URL', f'http://localhost:{PORT}')
    
    DEFAULT_MAP_CENTER_LAT = float(os.getenv('DEFAULT_MAP_CENTER_LAT', 37.7749))
    DEFAULT_MAP_CENTER_LON = float(os.getenv('DEFAULT_MAP_CENTER_LON', -122.4194))
    DEFAULT_MAP_ZOOM = int(os.getenv('DEFAULT_MAP_ZOOM', 12))
    
    ZONES = [
        {
            'id': os.getenv('ZONE1_ID', 'zone1'),
            'name': os.getenv('ZONE1_NAME', 'Downtown'),
            'center_lat': float(os.getenv('ZONE1_LAT', 37.7749)),
            'center_lon': float(os.getenv('ZONE1_LON', -122.4194)),
            'radius_meters': float(os.getenv('ZONE1_RADIUS', 1000))
        },
        {
            'id': os.getenv('ZONE2_ID', 'zone2'),
            'name': os.getenv('ZONE2_NAME', 'Airport'),
            'center_lat': float(os.getenv('ZONE2_LAT', 37.6213)),
            'center_lon': float(os.getenv('ZONE2_LON', -122.3790)),
            'radius_meters': float(os.getenv('ZONE2_RADIUS', 2000))
        },
        {
            'id': os.getenv('ZONE3_ID', 'zone3'),
            'name': os.getenv('ZONE3_NAME', 'Stadium'),
            'center_lat': float(os.getenv('ZONE3_LAT', 37.7786)),
            'center_lon': float(os.getenv('ZONE3_LON', -122.3893)),
            'radius_meters': float(os.getenv('ZONE3_RADIUS', 500))
        }
    ]

