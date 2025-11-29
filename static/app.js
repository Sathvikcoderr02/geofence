let API_BASE_URL = 'http://localhost:5000';
let DEFAULT_MAP_CENTER = { lat: 37.7749, lon: -122.4194 };
let DEFAULT_MAP_ZOOM = 12;

let map;
let zones = [];
let vehicleMarkers = {};
let zoneCircles = {};

async function loadConfig() {
    try {
        const response = await fetch('/config');
        const config = await response.json();
        API_BASE_URL = config.api_base_url || API_BASE_URL;
        DEFAULT_MAP_CENTER = config.map_center || DEFAULT_MAP_CENTER;
        DEFAULT_MAP_ZOOM = config.map_zoom || DEFAULT_MAP_ZOOM;
    } catch (error) {
        console.warn('Could not load config, using defaults:', error);
    }
}

function initMap() {
    map = L.map('map').setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lon], DEFAULT_MAP_ZOOM);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    loadZones();
}

function loadZones() {
    fetch(`${API_BASE_URL}/zones`)
        .then(response => response.json())
        .then(data => {
            zones = data.zones;
            displayZones();
            drawZonesOnMap();
        })
        .catch(error => {
            console.error('Error loading zones:', error);
            showMessage('zonesList', 'Error loading zones', 'error');
        });
}

function displayZones() {
    const zonesList = document.getElementById('zonesList');
    zonesList.innerHTML = '';
    
    if (zones.length === 0) {
        zonesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-layer-group"></i>
                <p>No zones configured</p>
            </div>
        `;
        return;
    }
    
    zones.forEach(zone => {
        const zoneDiv = document.createElement('div');
        zoneDiv.className = 'zone-item';
        zoneDiv.innerHTML = `
            <h3>${zone.name}</h3>
            <p><strong>ID:</strong> ${zone.id}</p>
            <p><strong>Center:</strong> ${zone.center.lat.toFixed(4)}, ${zone.center.lon.toFixed(4)}</p>
            <p><strong>Radius:</strong> ${zone.radius_meters}m</p>
        `;
        zonesList.appendChild(zoneDiv);
    });
}

function drawZonesOnMap() {
    zones.forEach(zone => {
        const circle = L.circle([zone.center.lat, zone.center.lon], {
            color: '#2563eb',
            fillColor: '#2563eb',
            fillOpacity: 0.15,
            radius: zone.radius_meters,
            weight: 2
        }).addTo(map);
        
        circle.bindPopup(`
            <div style="padding: 8px;">
                <strong style="color: #2563eb; font-size: 14px;">${zone.name}</strong><br>
                <span style="color: #6b7280; font-size: 12px;">Radius: ${zone.radius_meters}m</span>
            </div>
        `);
        
        const icon = L.divIcon({
            className: 'zone-marker',
            html: `<div style="background: #2563eb; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
        
        L.marker([zone.center.lat, zone.center.lon], { icon: icon })
            .addTo(map)
            .bindPopup(`<strong>${zone.name}</strong>`);
        
        zoneCircles[zone.id] = circle;
    });
}

document.getElementById('locationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const vehicleId = document.getElementById('vehicleId').value.trim();
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    
    if (!vehicleId) {
        showMessage('submitResult', 'Please enter a vehicle ID', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vehicle_id: vehicleId,
                latitude: latitude,
                longitude: longitude
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const zoneText = data.zone_name ? `Current zone: ${data.zone_name}` : 'No zone';
            showMessage('submitResult', `Location submitted successfully. ${zoneText}`, 'success');
            
            if (data.event) {
                addEventToLog(vehicleId, data.event, data.zone_name);
            }
            
            updateVehicleMarker(vehicleId, latitude, longitude, data.zone_name);
            
            document.getElementById('locationForm').reset();
        } else {
            showMessage('submitResult', `Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showMessage('submitResult', `Error: ${error.message}`, 'error');
    }
});

document.getElementById('statusForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const vehicleId = document.getElementById('statusVehicleId').value.trim();
    
    if (!vehicleId) {
        showMessage('statusResult', 'Please enter a vehicle ID', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/vehicle/${vehicleId}/status`);
        const data = await response.json();
        
        if (response.ok) {
            const statusDiv = document.getElementById('statusResult');
            statusDiv.className = 'result-message info';
            statusDiv.innerHTML = `
                <div class="status-display">
                    <h3>Vehicle: ${data.vehicle_id}</h3>
                    <p><strong>Current Zone:</strong> <span class="zone-badge ${data.current_zone ? '' : 'no-zone'}">${data.zone_name || 'No Zone'}</span></p>
                    <p><strong>Location Updates:</strong> ${data.location_count}</p>
                </div>
            `;
            statusDiv.style.display = 'block';
        } else {
            showMessage('statusResult', `Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showMessage('statusResult', `Error: ${error.message}`, 'error');
    }
});

function updateVehicleMarker(vehicleId, lat, lon, zoneName) {
    if (vehicleMarkers[vehicleId]) {
        vehicleMarkers[vehicleId].setLatLng([lat, lon]);
    } else {
        const icon = L.divIcon({
            className: 'vehicle-marker',
            html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">V</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        const marker = L.marker([lat, lon], { icon: icon }).addTo(map);
        
        marker.bindPopup(`
            <div style="padding: 8px;">
                <strong style="color: #111827; font-size: 14px;">Vehicle: ${vehicleId}</strong><br>
                <span style="color: #6b7280; font-size: 12px;">Zone: ${zoneName || 'None'}</span>
            </div>
        `);
        vehicleMarkers[vehicleId] = marker;
    }
    
    vehicleMarkers[vehicleId].setPopupContent(`
        <div style="padding: 8px;">
            <strong style="color: #111827; font-size: 14px;">Vehicle: ${vehicleId}</strong><br>
            <span style="color: #6b7280; font-size: 12px;">Zone: ${zoneName || 'None'}</span><br>
            <span style="color: #6b7280; font-size: 12px;">Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}</span>
        </div>
    `);
    map.setView([lat, lon], 13);
}

function addEventToLog(vehicleId, eventType, zoneName) {
    const eventsLog = document.getElementById('eventsLog');
    
    if (eventsLog.children.length === 0) {
        eventsLog.innerHTML = '';
    }
    
    const eventDiv = document.createElement('div');
    eventDiv.className = `event-item ${eventType}`;
    
    const eventIcon = eventType === 'enter' ? 'fa-sign-in-alt' : 'fa-sign-out-alt';
    const eventText = eventType === 'enter' ? 'Entered' : 'Exited';
    const eventColor = eventType === 'enter' ? 'var(--success-color)' : 'var(--warning-color)';
    
    eventDiv.innerHTML = `
        <strong>
            <i class="fas ${eventIcon}" style="color: ${eventColor}; margin-right: 6px;"></i>
            Vehicle ${vehicleId} ${eventText} Zone
        </strong>
        <div class="event-details">Zone: <strong>${zoneName || 'Unknown'}</strong></div>
        <div class="event-time">${new Date().toLocaleTimeString()}</div>
    `;
    
    eventsLog.insertBefore(eventDiv, eventsLog.firstChild);
    
    if (eventsLog.children.length > 10) {
        eventsLog.removeChild(eventsLog.lastChild);
    }
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `result-message ${type}`;
    element.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

document.getElementById('centerMap').addEventListener('click', () => {
    if (zones.length > 0) {
        const bounds = zones.map(zone => [zone.center.lat, zone.center.lon]);
        map.fitBounds(bounds, { padding: [50, 50] });
    } else if (Object.keys(vehicleMarkers).length > 0) {
        const bounds = Object.values(vehicleMarkers).map(marker => marker.getLatLng());
        map.fitBounds(bounds, { padding: [50, 50] });
    }
});

document.getElementById('clearMarkers').addEventListener('click', () => {
    Object.values(vehicleMarkers).forEach(marker => {
        map.removeLayer(marker);
    });
    vehicleMarkers = {};
    
    const eventsLog = document.getElementById('eventsLog');
    eventsLog.innerHTML = '<div class="empty-state"><i class="fas fa-list-alt"></i><p>No events yet</p></div>';
});

window.addEventListener('load', async () => {
    await loadConfig();
    initMap();
    
    const eventsLog = document.getElementById('eventsLog');
    eventsLog.innerHTML = '<div class="empty-state"><i class="fas fa-list-alt"></i><p>No events yet</p></div>';
});
