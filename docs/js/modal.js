// Modal module for flight details popup

const FlightModal = {
    modal: null,
    isLoading: false,

    /**
     * Initialize the modal
     */
    async init() {
        this.modal = document.getElementById('flight-modal');
        this.setupEventListeners();
        await AirportSearch.init();
    },

    /**
     * Setup event listeners for modal
     */
    setupEventListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    },

    /**
     * Open modal with flight data
     * @param {Object} flight - Flight data
     */
    async open(flight) {
        if (this.isLoading) return;
        this.isLoading = true;

        // Reset all content immediately before showing modal
        this.resetContent();

        // Show modal with loading state
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Update header
        this.updateHeader(flight);

        // Show loading state
        this.showLoading();

        try {
            // Search for airport coordinates using Nominatim API
            const airports = await AirportSearch.searchBothAirports(
                flight.departureCode,
                flight.arrivalCode
            );

            const departureAirport = airports.departure;
            const arrivalAirport = airports.arrival;

            // Initialize map if coordinates are available
            if (departureAirport && arrivalAirport) {
                // Small delay to ensure modal is rendered
                await new Promise(resolve => setTimeout(resolve, 100));

                FlightMap.init('flight-map');
                FlightMap.drawFlightPath(
                    {
                        lat: departureAirport.lat,
                        lng: departureAirport.lng,
                        code: flight.departureCode,
                        city: departureAirport.city
                    },
                    {
                        lat: arrivalAirport.lat,
                        lng: arrivalAirport.lng,
                        code: flight.arrivalCode,
                        city: arrivalAirport.city
                    }
                );
                document.getElementById('flight-map').classList.remove('no-data');
            } else {
                this.showMapError();
            }

            // Fetch Wikipedia summaries
            const departureCityName = AirportSearch.getCityNameForWikipedia(
                flight.departureCode,
                flight.departurePlace
            );
            const arrivalCityName = AirportSearch.getCityNameForWikipedia(
                flight.arrivalCode,
                flight.arrivalPlace
            );

            const summaries = await WikipediaAPI.fetchBothCities(
                departureCityName,
                arrivalCityName
            );

            // Update city info cards
            this.updateCityInfo('departure', {
                name: flight.departurePlace,
                code: flight.departureCode,
                country: departureAirport?.country || '',
                summary: summaries.departure
            });

            this.updateCityInfo('arrival', {
                name: flight.arrivalPlace,
                code: flight.arrivalCode,
                country: arrivalAirport?.country || '',
                summary: summaries.arrival
            });

        } catch (error) {
            console.error('Error loading flight details:', error);
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Update modal header with flight info
     * @param {Object} flight - Flight data
     */
    updateHeader(flight) {
        const flightName = this.modal.querySelector('.modal-flight-name');
        const airlineName = this.modal.querySelector('.modal-airline-name');

        if (flightName) flightName.textContent = `${flight.codeName}便`;
        if (airlineName) airlineName.textContent = flight.airlineName;
    },

    /**
     * Show loading state in city cards
     */
    showLoading() {
        const cards = this.modal.querySelectorAll('.city-card');
        cards.forEach(card => {
            const content = card.querySelector('.city-summary');
            if (content) {
                content.innerHTML = '<span class="loading-text">読み込み中...</span>';
            }
        });

        // Also show loading on map
        const mapContainer = document.getElementById('flight-map');
        mapContainer.innerHTML = `
            <div class="map-loading">
                <span class="loading-spinner"></span>
                <p>地図を読み込み中...</p>
            </div>
        `;
        mapContainer.classList.add('no-data');
    },

    /**
     * Show map error state
     */
    showMapError() {
        const mapContainer = document.getElementById('flight-map');
        mapContainer.classList.add('no-data');
        mapContainer.innerHTML = `
            <div class="map-no-data">
                <i class="material-icons">location_off</i>
                <p>位置情報がありません</p>
            </div>
        `;
    },

    /**
     * Update city info card
     * @param {string} type - 'departure' or 'arrival'
     * @param {Object} data - City data
     */
    updateCityInfo(type, data) {
        const card = this.modal.querySelector(`.city-card.${type}`);
        if (!card) return;

        const title = card.querySelector('.city-title');
        const summary = card.querySelector('.city-summary');

        if (title) {
            const label = type === 'departure' ? '出発' : '到着';
            title.innerHTML = `
                <span class="city-label">${label}</span>
                <span class="city-name">${data.name}</span>
                <span class="city-code">(${data.code})</span>
            `;
        }

        if (summary) {
            if (data.summary) {
                summary.textContent = WikipediaAPI.truncate(data.summary, 250);
            } else {
                summary.innerHTML = '<span class="no-summary">説明を取得できませんでした</span>';
            }
        }
    },

    /**
     * Reset all modal content to loading state
     */
    resetContent() {
        // Reset header
        const flightName = this.modal.querySelector('.modal-flight-name');
        const airlineName = this.modal.querySelector('.modal-airline-name');
        if (flightName) flightName.textContent = '';
        if (airlineName) airlineName.textContent = '';

        // Destroy previous map
        FlightMap.destroy();

        // Reset map container
        const mapContainer = document.getElementById('flight-map');
        if (mapContainer) {
            mapContainer.innerHTML = '';
            mapContainer.classList.remove('no-data');
        }

        // Reset city cards
        const cards = this.modal.querySelectorAll('.city-card');
        cards.forEach(card => {
            const title = card.querySelector('.city-title');
            const summary = card.querySelector('.city-summary');
            if (title) {
                const label = card.classList.contains('departure') ? '出発' : '到着';
                title.innerHTML = `<span class="city-label">${label}</span>`;
            }
            if (summary) {
                summary.innerHTML = '';
            }
        });
    },

    /**
     * Close the modal
     */
    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';

        // Destroy map to free resources
        FlightMap.destroy();

        // Reset content
        const mapContainer = document.getElementById('flight-map');
        if (mapContainer) {
            mapContainer.innerHTML = '';
            mapContainer.classList.remove('no-data');
        }
    }
};

// Export for use in other modules
window.FlightModal = FlightModal;
