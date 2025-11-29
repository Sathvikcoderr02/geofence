# Geofence Event Processing Service

A location-based service for tracking vehicles and detecting when they enter or exit geographic zones.

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

### Configuration

The service uses environment variables for configuration. You can:

1. **Use default values** (no configuration needed)
2. **Set environment variables** directly:
```bash
export PORT=5000
export ZONE1_NAME="City Center"
python app.py
```

3. **Create a `.env` file** (optional, requires python-dotenv):
```bash
cp config.example.env .env
# Edit .env with your values
```

Available configuration options (see `config.py` for all options):
- `HOST` - Server host (default: `0.0.0.0`)
- `PORT` - Server port (default: `5000`)
- `DEBUG` - Debug mode (default: `False`)
- `LOG_LEVEL` - Logging level (default: `INFO`)
- `ZONE1_ID`, `ZONE1_NAME`, `ZONE1_LAT`, `ZONE1_LON`, `ZONE1_RADIUS` - Zone 1 configuration
- `ZONE2_ID`, `ZONE2_NAME`, `ZONE2_LAT`, `ZONE2_LON`, `ZONE2_RADIUS` - Zone 2 configuration
- `ZONE3_ID`, `ZONE3_NAME`, `ZONE3_LAT`, `ZONE3_LON`, `ZONE3_RADIUS` - Zone 3 configuration
- `DEFAULT_MAP_CENTER_LAT`, `DEFAULT_MAP_CENTER_LON` - Map initial center
- `DEFAULT_MAP_ZOOM` - Map initial zoom level

### Running the Service

```bash
python app.py
```

The service will start on `http://localhost:5000` (or your configured port)

**Access the Web Interface:**
Open your browser and navigate to `http://localhost:5000` to use the interactive frontend with map visualization.

For detailed running instructions, see [RUN.md](RUN.md)

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status.

### Submit Location Event
```
POST /location
Content-Type: application/json

{
  "vehicle_id": "vehicle123",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "timestamp": "2024-01-15T10:30:00Z"  # Optional
}
```

Response:
```json
{
  "vehicle_id": "vehicle123",
  "current_zone": "zone1",
  "zone_name": "Downtown",
  "event": "enter"  // "enter", "exit", or null
}
```

### Get Vehicle Status
```
GET /vehicle/<vehicle_id>/status
```

Response:
```json
{
  "vehicle_id": "vehicle123",
  "current_zone": "zone1",
  "zone_name": "Downtown",
  "location_count": 42
}
```

### List Zones
```
GET /zones
```

Returns all configured geographic zones.

## Web Frontend

The service includes a modern web interface with:

- **Interactive Map**: Visual representation of zones and vehicle locations using Leaflet.js
- **Location Submission Form**: Easy-to-use form to submit vehicle location events
- **Vehicle Status Query**: Quick lookup of vehicle current zone and status
- **Real-time Event Log**: Live feed of zone entry/exit events
- **Zone Information Display**: List of all configured zones with details

The frontend is automatically served at the root URL (`http://localhost:5000`) when the service is running.

## Design Decisions

### Architecture
- **Flask**: Lightweight web framework suitable for REST APIs
- **In-memory storage**: Simple dictionary-based storage for rapid prototyping. In production, would use a database (PostgreSQL, Redis) for persistence and scalability.

### Zone Detection
- **Circular zones**: Using center point and radius for simplicity
- **Haversine formula**: Accurate distance calculation on Earth's surface
- **Real-time detection**: Processes events immediately as they arrive

### Error Handling
- Input validation for all endpoints
- Proper HTTP status codes (400 for bad requests, 404 for not found, 500 for server errors)
- Structured logging for debugging and monitoring

### Assumptions
1. GPS coordinates are in WGS84 format (standard latitude/longitude)
2. Zones are circular (center + radius)
3. Vehicle can only be in one zone at a time
4. Events are processed in order (no out-of-order handling)
5. Service runs in a single process (no distributed deployment)

## Future Improvements

Given more time, I would:

1. **Persistence**: Add database storage (PostgreSQL) for zones, events, and vehicle states
2. **Scalability**: 
   - Use message queue (RabbitMQ/Kafka) for event processing
   - Horizontal scaling with load balancer
   - Caching layer (Redis) for frequently accessed vehicle status
3. **Zone Types**: Support polygon zones, not just circles
4. **Event Ordering**: Handle out-of-order events with timestamps
5. **Monitoring**: 
   - Add metrics (Prometheus)
   - Health checks with dependencies
   - Alerting for errors
6. **Performance**:
   - Spatial indexing (R-tree) for faster zone lookups with many zones
   - Batch processing for high-volume events
7. **Testing**: Unit tests, integration tests, load testing
8. **Documentation**: OpenAPI/Swagger specification
9. **Security**: Authentication, rate limiting, input sanitization
10. **Configuration**: External config file for zones instead of hardcoded

## Tradeoffs

- **In-memory vs Database**: Chose in-memory for simplicity and speed in prototype. Production needs persistence.
- **Synchronous vs Async**: Synchronous processing is simpler but may bottleneck under high load. Async would help.
- **Circular vs Polygon zones**: Circles are simpler to implement and compute, but less flexible than polygons.

