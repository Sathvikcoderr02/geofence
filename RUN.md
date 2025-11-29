# How to Run the Geofence Service

## Quick Start

### 1. Install Dependencies

```bash
cd geofence_service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the Service

```bash
python app.py
```

The service will start on `http://localhost:5000`

### 3. Access the Frontend

Open your web browser and navigate to:
```
http://localhost:5000
```

## Features

### Frontend Interface

The web interface provides:

1. **Submit Location Events**
   - Enter vehicle ID, latitude, and longitude
   - Submit to track vehicle movement
   - See real-time zone entry/exit events

2. **Query Vehicle Status**
   - Enter a vehicle ID to check its current zone
   - View location update count

3. **Interactive Map**
   - Visual representation of all zones
   - Real-time vehicle markers
   - Zone boundaries displayed as circles

4. **Event Log**
   - Real-time log of zone entry/exit events
   - Color-coded by event type

5. **Zone Information**
   - List of all configured zones
   - Zone details (center, radius)

## Testing the Service

### Using the Frontend

1. **Submit a location inside a zone:**
   - Vehicle ID: `taxi001`
   - Latitude: `37.7749`
   - Longitude: `-122.4194`
   - Click "Submit Location"
   - You should see an "enter" event for Downtown zone

2. **Submit a location outside zones:**
   - Vehicle ID: `taxi001`
   - Latitude: `37.5`
   - Longitude: `-122.3`
   - Click "Submit Location"
   - You should see an "exit" event

3. **Query vehicle status:**
   - Enter `taxi001` in the status form
   - Click "Get Status"
   - See current zone and location count

### Using cURL (Command Line)

**Submit location event:**
```bash
curl -X POST http://localhost:5000/location \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "taxi001",
    "latitude": 37.7749,
    "longitude": -122.4194
  }'
```

**Get vehicle status:**
```bash
curl http://localhost:5000/vehicle/taxi001/status
```

**List zones:**
```bash
curl http://localhost:5000/zones
```

**Health check:**
```bash
curl http://localhost:5000/health
```

## Default Zones

The service comes with 3 pre-configured zones:

1. **Downtown** (zone1)
   - Center: 37.7749, -122.4194
   - Radius: 1000m

2. **Airport** (zone2)
   - Center: 37.6213, -122.3790
   - Radius: 2000m

3. **Stadium** (zone3)
   - Center: 37.7786, -122.3893
   - Radius: 500m

## Troubleshooting

### Port Already in Use

If port 5000 is already in use, you can change it in `app.py`:
```python
app.run(host='0.0.0.0', port=5001, debug=False)
```

### CORS Issues

The service includes CORS support. If you encounter CORS errors, ensure `flask-cors` is installed:
```bash
pip install flask-cors
```

### Map Not Loading

The frontend uses OpenStreetMap tiles. If the map doesn't load:
- Check your internet connection
- Check browser console for errors
- Ensure Leaflet.js is loading correctly

## Development Mode

To run in debug mode (auto-reload on code changes):
```python
app.run(host='0.0.0.0', port=5000, debug=True)
```

**Note:** Debug mode should not be used in production.

