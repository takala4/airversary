// Wikipedia API module for fetching city descriptions

const WikipediaAPI = {
    // Cache for storing fetched city info
    cache: new Map(),

    /**
     * Fetch city summary from Japanese Wikipedia
     * @param {string} cityName - City name in Japanese
     * @returns {Promise<string>} - City description or error message
     */
    async fetchCitySummary(cityName) {
        // Check cache first
        if (this.cache.has(cityName)) {
            return this.cache.get(cityName);
        }

        try {
            const url = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();
            const summary = data.extract || '';

            // Cache the result
            this.cache.set(cityName, summary);

            return summary;
        } catch (error) {
            console.error(`Wikipedia API error for ${cityName}:`, error);
            return null;
        }
    },

    /**
     * Fetch summaries for both departure and arrival cities
     * @param {string} departureCity - Departure city name
     * @param {string} arrivalCity - Arrival city name
     * @returns {Promise<{departure: string, arrival: string}>}
     */
    async fetchBothCities(departureCity, arrivalCity) {
        const [departure, arrival] = await Promise.all([
            this.fetchCitySummary(departureCity),
            this.fetchCitySummary(arrivalCity)
        ]);

        return { departure, arrival };
    },

    /**
     * Truncate text to specified length with ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} - Truncated text
     */
    truncate(text, maxLength = 200) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }
};

// Export for use in other modules
window.WikipediaAPI = WikipediaAPI;
