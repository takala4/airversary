// Airport Search module using OpenStreetMap Nominatim API

const AirportSearch = {
    // Cache for storing fetched airport coordinates
    cache: new Map(),

    // City name mapping for Wikipedia (from airports.json data)
    cityNames: {},

    /**
     * Initialize by loading city name mappings
     */
    async init() {
        try {
            const response = await fetch('data/airports.json');
            this.cityNames = await response.json();
        } catch (error) {
            console.error('Failed to load city names:', error);
            this.cityNames = {};
        }
    },

    /**
     * Search for airport coordinates using Nominatim API
     * @param {string} code - Airport IATA/ICAO code (e.g., "HND", "LAX")
     * @returns {Promise<{lat: number, lng: number, city: string, country: string} | null>}
     */
    async searchAirport(code) {
        if (!code) return null;

        const codeUpper = code.toUpperCase().trim();

        // Check cache first
        if (this.cache.has(codeUpper)) {
            return this.cache.get(codeUpper);
        }

        try {
            // Search with "[code] airport" query
            const query = `${codeUpper} airport`;
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Airversary/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];

                // Get city name from local data if available
                const localData = this.cityNames[codeUpper];

                const airportInfo = {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    city: localData?.city || this.extractCityFromDisplay(result.display_name),
                    cityEn: localData?.cityEn || '',
                    country: localData?.country || this.extractCountryFromDisplay(result.display_name)
                };

                // Cache the result
                this.cache.set(codeUpper, airportInfo);

                return airportInfo;
            }

            // If not found, return null
            this.cache.set(codeUpper, null);
            return null;

        } catch (error) {
            console.error(`Airport search error for ${codeUpper}:`, error);
            return null;
        }
    },

    /**
     * Extract city name from Nominatim display_name
     * @param {string} displayName - Full display name from Nominatim
     * @returns {string}
     */
    extractCityFromDisplay(displayName) {
        if (!displayName) return '';
        // Display name format: "Airport Name, City, Region, Country"
        const parts = displayName.split(', ');
        // Usually the second part is the city
        return parts.length > 1 ? parts[1] : parts[0];
    },

    /**
     * Extract country from Nominatim display_name
     * @param {string} displayName - Full display name from Nominatim
     * @returns {string}
     */
    extractCountryFromDisplay(displayName) {
        if (!displayName) return '';
        const parts = displayName.split(', ');
        // Last part is usually the country
        return parts.length > 0 ? parts[parts.length - 1] : '';
    },

    /**
     * Search for both departure and arrival airports
     * @param {string} departureCode - Departure airport code
     * @param {string} arrivalCode - Arrival airport code
     * @returns {Promise<{departure: object|null, arrival: object|null}>}
     */
    async searchBothAirports(departureCode, arrivalCode) {
        // Add small delay between requests to respect Nominatim rate limits
        const departure = await this.searchAirport(departureCode);

        // Small delay to avoid rate limiting (Nominatim requests max 1/second)
        await new Promise(resolve => setTimeout(resolve, 300));

        const arrival = await this.searchAirport(arrivalCode);

        return { departure, arrival };
    },

    /**
     * Get city name for Wikipedia search
     * @param {string} code - Airport code
     * @param {string} fallbackPlace - Fallback place name from flight data
     * @returns {string}
     */
    getCityNameForWikipedia(code, fallbackPlace) {
        const codeUpper = code?.toUpperCase().trim();
        const localData = this.cityNames[codeUpper];

        if (localData?.city) {
            return localData.city;
        }

        // Use cached search result
        const cached = this.cache.get(codeUpper);
        if (cached?.city) {
            return cached.city;
        }

        return fallbackPlace;
    }
};

// Export for use in other modules
window.AirportSearch = AirportSearch;
