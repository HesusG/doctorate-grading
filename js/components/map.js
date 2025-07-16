export class MapComponent {
    constructor(dataUtils) {
        this.dataUtils = dataUtils; // Now SQLDataUtils with async methods
        this.map = null;
        this.markers = [];
        this.markerCluster = null;
        this.isInitialized = false;
    }

    async initialize(containerId = 'map') {
        try {
            console.log('🗺️ Initializing map component...');
            
            // Initialize Leaflet map
            this.map = L.map(containerId).setView([40.4168, -3.7038], 6);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // Initialize marker cluster group
            this.markerCluster = L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 50
            });

            // Add university markers (now async)
            await this.addUniversityMarkers();

            // Add marker cluster to map
            this.map.addLayer(this.markerCluster);

            this.isInitialized = true;
            console.log('✅ Map component initialized with', this.markers.length, 'markers');
            
            return this.map;
        } catch (error) {
            console.error('❌ Failed to initialize map component:', error);
            throw error;
        }
    }

    async addUniversityMarkers() {
        try {
            // Get university groups from SQLite (optimized query)
            const universityGroups = await this.dataUtils.getUniversityGroups();
            
            console.log('📍 Adding', universityGroups.length, 'university markers');
            
            universityGroups.forEach(group => {
                const marker = this.createUniversityMarker(group);
                if (marker) {
                    this.markers.push(marker);
                    this.markerCluster.addLayer(marker);
                }
            });
            
            console.log('✅ Added', this.markers.length, 'markers to map');
        } catch (error) {
            console.error('❌ Failed to add university markers:', error);
            throw error;
        }
    }

    createUniversityMarker(group) {
        if (!group.lat || !group.lon) {
            console.warn('⚠️ Skipping marker for', group.university.name, '- missing coordinates');
            return null;
        }

        // Create custom marker icon based on number of programs
        const programCount = group.programs.length;
        let markerColor = 'blue';
        
        if (programCount >= 5) markerColor = 'red';
        else if (programCount >= 3) markerColor = 'orange';
        else if (programCount >= 2) markerColor = 'green';

        // Create marker
        const marker = L.marker([group.lat, group.lon], {
            title: `${group.university.name} - ${group.city.name}`
        });

        // Create popup content
        const popupContent = this.createPopupContent(group);
        marker.bindPopup(popupContent, {
            maxWidth: 400,
            className: 'university-popup'
        });

        return marker;
    }

    createPopupContent(group) {
        const { university, city, programs } = group;
        
        // Translate country names to Spanish
        const countryInSpanish = city.country === 'Spain' ? 'España' : city.country === 'Portugal' ? 'Portugal' : city.country;
        
        let html = `
            <div class="university-popup-content">
                <h3>🏛️ ${university.name}</h3>
                <p><strong>📍 ${city.name}, ${countryInSpanish}</strong></p>
                <hr>
                <h4>📚 Programas de Doctorado (${programs.length})</h4>
                <div class="programs-list">
        `;

        programs.forEach((program, index) => {
            const rating = program.rating?.overall || 0;
            const status = program.status || 'pending';
            const statusEmoji = this.getStatusEmoji(status);
            const statusText = this.getStatusText(status);
            const ratingStars = rating > 0 ? '★'.repeat(rating) : '';
            const isFavorite = program.is_favorite || false;
            const favoriteClass = isFavorite ? 'is-favorite' : '';
            const favoriteIcon = isFavorite ? 'fas fa-heart' : 'far fa-heart';
            
            const ratingDisplay = rating > 0 ? 
                `<div class="popup-rating">
                    <span class="popup-stars">${ratingStars}</span>
                    <span class="popup-rating-number">${rating}/5</span>
                </div>` : 
                `<div class="popup-rating">
                    <span class="popup-no-rating">Sin calificar</span>
                </div>`;
            
            html += `
                <div class="program-card">
                    <div class="program-card-header">
                        <div class="program-card-left" onclick="window.doctorateApp.showProgramDetails('${university.name}', ${index})">
                            <h5 class="program-title">${program.name}</h5>
                            <span class="program-status-badge status-${status}">${statusEmoji} ${statusText}</span>
                        </div>
                        <div class="program-card-right">
                            <button class="popup-favorite-btn ${favoriteClass}" 
                                    onclick="event.stopPropagation(); window.doctorateApp.toggleFavoriteFromMap('${university.name}', ${index})" 
                                    title="Marcar como favorito">
                                <i class="${favoriteIcon}"></i>
                            </button>
                        </div>
                    </div>
                    ${ratingDisplay}
                </div>
            `;
        });

        html += `
                </div>
                <button class="view-details-btn" onclick="window.doctorateApp.showUniversityDetails('${university.name}')">
                    Ver Detalles Completos
                </button>
            </div>
        `;

        return html;
    }

    getStatusEmoji(status) {
        const statusEmojis = {
            'pending': '⏳',
            'considering': '🤔',
            'interested': '😍',
            'applying': '📝',
            'discarded': '❌'
        };
        return statusEmojis[status] || '❓';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendiente',
            'considering': 'Considerando',
            'interested': 'Interesado',
            'applying': 'Aplicando',
            'discarded': 'Descartado'
        };
        return statusMap[status] || this.capitalize(status);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Method to filter markers based on criteria (now async)
    async filterMarkers(filters) {
        try {
            if (!this.isInitialized) {
                console.warn('Map not initialized yet');
                return [];
            }

            // Clear existing markers
            this.markerCluster.clearLayers();
            
            // Get filtered coordinates from SQLite
            const filteredCoordinates = await this.dataUtils.getFilteredCoordinates(filters);
            
            // Group by university
            const universityGroups = this.groupCoordinatesByUniversity(filteredCoordinates);
            const newMarkers = [];
            
            universityGroups.forEach(group => {
                const marker = this.createUniversityMarker(group);
                if (marker) {
                    newMarkers.push(marker);
                    this.markerCluster.addLayer(marker);
                }
            });
            
            console.log(`🔍 Filtered map showing ${newMarkers.length} universities`);
            return newMarkers;
        } catch (error) {
            console.error('❌ Failed to filter markers:', error);
            return [];
        }
    }

    groupCoordinatesByUniversity(coordinates) {
        const groups = new Map();

        coordinates.forEach(item => {
            const key = `${item.university.name}_${item.city.name}`;
            
            if (!groups.has(key)) {
                groups.set(key, {
                    university: item.university,
                    city: item.city,
                    lat: item.lat,
                    lon: item.lon,
                    programs: []
                });
            }
            
            groups.get(key).programs.push(item.program);
        });

        return Array.from(groups.values());
    }

    // Method to get map instance
    getMap() {
        return this.map;
    }

    // Method to get markers
    getMarkers() {
        return this.markers;
    }
}