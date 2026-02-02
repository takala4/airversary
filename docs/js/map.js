// Map module using Leaflet.js for displaying flight routes

const FlightMap = {
    map: null,
    markers: [],
    polyline: null,

    /**
     * Initialize the Leaflet map
     * @param {string} containerId - ID of the map container element
     */
    init(containerId) {
        // Clean up existing map if any
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        // Create new map
        this.map = L.map(containerId, {
            center: [35, 135],
            zoom: 2,
            minZoom: 1,
            maxZoom: 10,
            worldCopyJump: true
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Reset markers and polyline arrays
        this.markers = [];
        this.polyline = null;
    },

    /**
     * Create a custom icon for airport markers
     * @param {string} type - 'departure' or 'arrival'
     * @returns {L.DivIcon}
     */
    createIcon(type) {
        const color = type === 'departure' ? '#059669' : '#dc2626';
        const icon = type === 'departure' ? 'flight_takeoff' : 'flight_land';

        return L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-icon ${type}">
                <i class="material-icons">${icon}</i>
            </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -18]
        });
    },

    /**
     * Add a marker to the map
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {string} type - 'departure' or 'arrival'
     * @param {string} label - Popup label
     */
    addMarker(lat, lng, type, label) {
        const marker = L.marker([lat, lng], {
            icon: this.createIcon(type)
        }).addTo(this.map);

        marker.bindPopup(`<strong>${label}</strong>`);
        this.markers.push(marker);
    },

    /**
     * Generate points for a great circle arc between two points
     * @param {Array} start - [lat, lng] of start point
     * @param {Array} end - [lat, lng] of end point
     * @param {number} numPoints - Number of points in the arc
     * @returns {Array} - Array of [lat, lng] points
     */
    generateArc(start, end, numPoints = 100) {
        const points = [];
        const lat1 = start[0] * Math.PI / 180;
        const lng1 = start[1] * Math.PI / 180;
        const lat2 = end[0] * Math.PI / 180;
        const lng2 = end[1] * Math.PI / 180;

        for (let i = 0; i <= numPoints; i++) {
            const f = i / numPoints;

            // Great circle interpolation
            const d = 2 * Math.asin(Math.sqrt(
                Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
                Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)
            ));

            if (d === 0) {
                points.push([start[0], start[1]]);
                continue;
            }

            const A = Math.sin((1 - f) * d) / Math.sin(d);
            const B = Math.sin(f * d) / Math.sin(d);

            const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
            const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
            const z = A * Math.sin(lat1) + B * Math.sin(lat2);

            const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
            let lng = Math.atan2(y, x) * 180 / Math.PI;

            points.push([lat, lng]);
        }

        return points;
    },

    /**
     * Handle antimeridian crossing for polyline
     * @param {Array} points - Array of [lat, lng] points
     * @returns {Array} - Array of polyline segments
     */
    handleAntimeridian(points) {
        const segments = [];
        let currentSegment = [];

        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            currentSegment.push(point);

            if (i < points.length - 1) {
                const nextPoint = points[i + 1];
                const lngDiff = Math.abs(point[1] - nextPoint[1]);

                // If crossing antimeridian (longitude jump > 180)
                if (lngDiff > 180) {
                    segments.push(currentSegment);
                    currentSegment = [];
                }
            }
        }

        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }

        return segments;
    },

    /**
     * Draw flight path between two airports
     * @param {Object} departure - {lat, lng, code, city}
     * @param {Object} arrival - {lat, lng, code, city}
     */
    drawFlightPath(departure, arrival) {
        // Add markers
        this.addMarker(
            departure.lat, departure.lng,
            'departure',
            `${departure.city} (${departure.code})`
        );
        this.addMarker(
            arrival.lat, arrival.lng,
            'arrival',
            `${arrival.city} (${arrival.code})`
        );

        // Generate arc points
        const arcPoints = this.generateArc(
            [departure.lat, departure.lng],
            [arrival.lat, arrival.lng]
        );

        // Handle antimeridian crossing
        const segments = this.handleAntimeridian(arcPoints);

        // Draw each segment
        segments.forEach(segment => {
            const polyline = L.polyline(segment, {
                color: '#e11d48',
                weight: 3,
                opacity: 0.8,
                dashArray: '10, 5'
            }).addTo(this.map);
        });

        // Fit bounds to show both points
        const bounds = L.latLngBounds([
            [departure.lat, departure.lng],
            [arrival.lat, arrival.lng]
        ]);

        this.map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 6
        });
    },

    /**
     * Clear all markers and polylines from the map
     */
    clear() {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];

        if (this.polyline) {
            this.polyline.remove();
            this.polyline = null;
        }
    },

    /**
     * Destroy the map instance
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.markers = [];
        this.polyline = null;
    }
};

// Export for use in other modules
window.FlightMap = FlightMap;
