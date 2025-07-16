/**
 * CityService - Complete CRUD operations for cities
 * Handles all city-related database operations with full field editing
 */

export class CityService {
    constructor(databaseService) {
        this.db = databaseService;
    }

    // =====================================================
    // READ OPERATIONS
    // =====================================================

    /**
     * Get all cities with country information
     */
    async getAllCities() {
        const sql = `
            SELECT 
                c.*,
                co.name as country_name,
                co.name_es as country_name_es,
                COUNT(u.id) as university_count
            FROM cities c
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN universities u ON u.city_id = c.id
            GROUP BY c.id
            ORDER BY c.name
        `;
        
        return await this.db.query(sql);
    }

    /**
     * Get a single city by ID with country information
     */
    async getCityById(cityId) {
        const sql = `
            SELECT 
                c.*,
                co.name as country_name,
                co.name_es as country_name_es
            FROM cities c
            JOIN countries co ON c.country_id = co.id
            WHERE c.id = ?
        `;
        
        return await this.db.queryOne(sql, [cityId]);
    }

    /**
     * Get city by name and country
     */
    async getCityByNameAndCountry(cityName, countryName) {
        const sql = `
            SELECT 
                c.*,
                co.name as country_name,
                co.name_es as country_name_es
            FROM cities c
            JOIN countries co ON c.country_id = co.id
            WHERE c.name = ? AND (co.name = ? OR co.name_es = ?)
        `;
        
        return await this.db.queryOne(sql, [cityName, countryName, countryName]);
    }

    /**
     * Get cities in a specific country
     */
    async getCitiesByCountry(countryId) {
        const sql = `
            SELECT 
                c.*,
                co.name as country_name,
                co.name_es as country_name_es,
                COUNT(u.id) as university_count
            FROM cities c
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN universities u ON u.city_id = c.id
            WHERE c.country_id = ?
            GROUP BY c.id
            ORDER BY c.name
        `;
        
        return await this.db.query(sql, [countryId]);
    }

    /**
     * Get city with all universities and programs
     */
    async getCityWithUniversities(cityId) {
        const city = await this.getCityById(cityId);
        if (!city) return null;

        const universitiesSQL = `
            SELECT 
                u.*,
                COUNT(p.id) as program_count
            FROM universities u
            LEFT JOIN programs p ON p.university_id = u.id
            WHERE u.city_id = ?
            GROUP BY u.id
            ORDER BY u.name
        `;
        
        const universities = await this.db.query(universitiesSQL, [cityId]);
        
        return {
            ...city,
            universities: universities
        };
    }

    /**
     * Search cities by name
     */
    async searchCities(searchText) {
        if (!searchText || searchText.trim() === '') {
            return await this.getAllCities();
        }

        const searchTerm = `%${searchText.toLowerCase()}%`;
        const sql = `
            SELECT 
                c.*,
                co.name as country_name,
                co.name_es as country_name_es,
                COUNT(u.id) as university_count
            FROM cities c
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN universities u ON u.city_id = c.id
            WHERE 
                LOWER(c.name) LIKE ? OR
                LOWER(c.city_summary) LIKE ?
            GROUP BY c.id
            ORDER BY c.name
        `;
        
        return await this.db.query(sql, [searchTerm, searchTerm]);
    }

    /**
     * Get cities with coordinates for mapping
     */
    async getCitiesForMap() {
        const sql = `
            SELECT 
                c.id,
                c.name,
                c.latitude,
                c.longitude,
                c.madrid_distance_km,
                co.name_es as country_name,
                COUNT(u.id) as university_count
            FROM cities c
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN universities u ON u.city_id = c.id
            WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
            GROUP BY c.id
            ORDER BY c.name
        `;
        
        return await this.db.query(sql);
    }

    // =====================================================
    // CREATE OPERATIONS
    // =====================================================

    /**
     * Create a new city
     */
    async createCity(cityData) {
        const sql = `
            INSERT INTO cities (
                name, country_id, latitude, longitude, madrid_distance_km,
                cost_effectiveness, medical_services, transportation, air_quality, weather,
                city_summary, ai_cost_of_living, ai_medical_quality, ai_transport_quality, ai_air_quality,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            cityData.name,
            cityData.country_id,
            cityData.latitude || null,
            cityData.longitude || null,
            cityData.madrid_distance_km || null,
            cityData.cost_effectiveness || 0,
            cityData.medical_services || 0,
            cityData.transportation || 0,
            cityData.air_quality || 0,
            cityData.weather || 0,
            cityData.city_summary || null,
            cityData.ai_cost_of_living || null,
            cityData.ai_medical_quality || null,
            cityData.ai_transport_quality || null,
            cityData.ai_air_quality || null,
            new Date().toISOString(),
            new Date().toISOString()
        ];
        
        const result = await this.db.execute(sql, params);
        return result.lastInsertId;
    }

    /**
     * Create city with country lookup by name
     */
    async createCityWithCountryName(cityData, countryName) {
        // First, find the country ID
        const countrySQL = `
            SELECT id FROM countries WHERE name = ? OR name_es = ?
        `;
        
        const countryResult = await this.db.queryOne(countrySQL, [countryName, countryName]);
        if (!countryResult) {
            throw new Error(`Country '${countryName}' not found`);
        }

        return await this.createCity({
            ...cityData,
            country_id: countryResult.id
        });
    }

    // =====================================================
    // UPDATE OPERATIONS - ALL FIELDS EDITABLE
    // =====================================================

    /**
     * Update any city field
     */
    async updateCity(cityId, changes) {
        const updateFields = [];
        const params = [];
        
        // Build dynamic UPDATE query
        Object.keys(changes).forEach(field => {
            updateFields.push(`${field} = ?`);
            params.push(changes[field]);
        });
        
        // Always update the timestamp
        updateFields.push('updated_at = ?');
        params.push(new Date().toISOString());
        
        params.push(cityId); // For WHERE clause
        
        const sql = `
            UPDATE cities 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `;
        
        const result = await this.db.execute(sql, params);
        return result.changes > 0;
    }

    /**
     * Update city name (with uniqueness validation within country)
     */
    async updateCityName(cityId, newName) {
        // Check if name already exists in the same country
        const existingSQL = `
            SELECT id FROM cities 
            WHERE name = ? AND country_id = (SELECT country_id FROM cities WHERE id = ?) AND id != ?
        `;
        
        const existing = await this.db.queryOne(existingSQL, [newName, cityId, cityId]);
        if (existing) {
            throw new Error(`City '${newName}' already exists in this country`);
        }

        return await this.updateCity(cityId, { name: newName });
    }

    /**
     * Update coordinates with validation
     */
    async updateCoordinates(cityId, latitude, longitude) {
        if (latitude !== null && (latitude < -90 || latitude > 90)) {
            throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90`);
        }
        
        if (longitude !== null && (longitude < -180 || longitude > 180)) {
            throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180`);
        }

        return await this.updateCity(cityId, { 
            latitude: latitude, 
            longitude: longitude 
        });
    }

    /**
     * Update Madrid distance with validation
     */
    async updateDistance(cityId, distance) {
        if (distance !== null && (distance < 0 || distance > 20000)) {
            throw new Error(`Invalid distance: ${distance}. Must be between 0 and 20000 km`);
        }

        return await this.updateCity(cityId, { madrid_distance_km: distance });
    }

    /**
     * Update city criteria (user ratings 0-5)
     */
    async updateCityCriteria(cityId, criteria) {
        const changes = {};
        const validFields = ['cost_effectiveness', 'medical_services', 'transportation', 'air_quality', 'weather'];
        
        validFields.forEach(field => {
            if (criteria[field] !== undefined) {
                const value = criteria[field];
                if (value < 0 || value > 5) {
                    throw new Error(`Invalid ${field}: ${value}. Must be between 0 and 5`);
                }
                changes[field] = value;
            }
        });
        
        return await this.updateCity(cityId, changes);
    }

    /**
     * Update AI city metrics (AI ratings 0-10)
     */
    async updateCityAIMetrics(cityId, metrics) {
        const changes = {};
        const validFields = ['ai_cost_of_living', 'ai_medical_quality', 'ai_transport_quality', 'ai_air_quality'];
        
        validFields.forEach(field => {
            if (metrics[field] !== undefined) {
                const value = metrics[field];
                if (value !== null && (value < 0 || value > 10)) {
                    throw new Error(`Invalid ${field}: ${value}. Must be between 0 and 10`);
                }
                changes[field] = value;
            }
        });
        
        return await this.updateCity(cityId, changes);
    }

    /**
     * Update city summary
     */
    async updateCitySummary(cityId, summary) {
        return await this.updateCity(cityId, { city_summary: summary });
    }

    /**
     * Update city country
     */
    async updateCityCountry(cityId, countryId) {
        // Verify country exists
        const countryExists = await this.db.queryScalar('SELECT 1 FROM countries WHERE id = ?', [countryId]);
        if (!countryExists) {
            throw new Error(`Country with ID ${countryId} not found`);
        }

        return await this.updateCity(cityId, { country_id: countryId });
    }

    // =====================================================
    // DELETE OPERATIONS
    // =====================================================

    /**
     * Delete a city (will cascade to universities and programs)
     */
    async deleteCity(cityId) {
        // Check if city has universities
        const universityCount = await this.db.queryScalar(
            'SELECT COUNT(*) FROM universities WHERE city_id = ?', 
            [cityId]
        );

        if (universityCount > 0) {
            throw new Error(`Cannot delete city: ${universityCount} universities are located in it. Delete universities first.`);
        }

        const sql = 'DELETE FROM cities WHERE id = ?';
        const result = await this.db.execute(sql, [cityId]);
        return result.changes > 0;
    }

    /**
     * Delete city with cascade (force delete with all universities and programs)
     */
    async deleteCityWithCascade(cityId) {
        const queries = [
            { sql: 'DELETE FROM programs WHERE university_id IN (SELECT id FROM universities WHERE city_id = ?)', params: [cityId] },
            { sql: 'DELETE FROM universities WHERE city_id = ?', params: [cityId] },
            { sql: 'DELETE FROM cities WHERE id = ?', params: [cityId] }
        ];

        const results = await this.db.transaction(queries);
        return results[2].changes > 0;
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Get unique city names for autocomplete
     */
    async getUniqueCityNames() {
        const sql = 'SELECT DISTINCT name FROM cities ORDER BY name';
        const results = await this.db.query(sql);
        return results.map(row => row.name);
    }

    /**
     * Get cities grouped by country
     */
    async getCitiesGroupedByCountry() {
        const sql = `
            SELECT 
                co.name_es as country_name,
                c.id,
                c.name,
                c.latitude,
                c.longitude,
                COUNT(u.id) as university_count
            FROM cities c
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN universities u ON u.city_id = c.id
            GROUP BY c.id
            ORDER BY co.name_es, c.name
        `;
        
        const results = await this.db.query(sql);
        
        // Group by country
        const grouped = {};
        results.forEach(row => {
            const countryName = row.country_name;
            if (!grouped[countryName]) {
                grouped[countryName] = [];
            }
            grouped[countryName].push({
                id: row.id,
                name: row.name,
                latitude: row.latitude,
                longitude: row.longitude,
                university_count: row.university_count
            });
        });
        
        return grouped;
    }

    /**
     * Get city statistics
     */
    async getCityStatistics() {
        const sql = `
            SELECT 
                COUNT(*) as total_cities,
                COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coordinates,
                COUNT(CASE WHEN madrid_distance_km IS NOT NULL THEN 1 END) as with_madrid_distance,
                COUNT(CASE WHEN city_summary IS NOT NULL THEN 1 END) as with_summary,
                AVG(CASE WHEN madrid_distance_km IS NOT NULL THEN madrid_distance_km END) as avg_madrid_distance,
                MIN(madrid_distance_km) as min_madrid_distance,
                MAX(madrid_distance_km) as max_madrid_distance
            FROM cities
        `;
        
        return await this.db.queryOne(sql);
    }

    /**
     * Calculate distance between two cities (if both have coordinates)
     */
    async calculateDistance(cityId1, cityId2) {
        const sql = `
            SELECT 
                c1.name as city1_name, c1.latitude as lat1, c1.longitude as lon1,
                c2.name as city2_name, c2.latitude as lat2, c2.longitude as lon2
            FROM cities c1, cities c2
            WHERE c1.id = ? AND c2.id = ?
        `;
        
        const result = await this.db.queryOne(sql, [cityId1, cityId2]);
        if (!result || !result.lat1 || !result.lon1 || !result.lat2 || !result.lon2) {
            throw new Error('Cities must have coordinates to calculate distance');
        }

        // Haversine formula
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(result.lat2 - result.lat1);
        const dLon = this.toRadians(result.lon2 - result.lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRadians(result.lat1)) * Math.cos(this.toRadians(result.lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        return {
            city1: result.city1_name,
            city2: result.city2_name,
            distance_km: Math.round(distance)
        };
    }

    /**
     * Check if city name is unique in country
     */
    async isNameUniqueInCountry(cityName, countryId, excludeId = null) {
        let sql = 'SELECT id FROM cities WHERE name = ? AND country_id = ?';
        const params = [cityName, countryId];
        
        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }
        
        const result = await this.db.queryOne(sql, params);
        return !result;
    }

    /**
     * Convert degrees to radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get cities near a specific location
     */
    async getCitiesNearLocation(latitude, longitude, radiusKm = 100) {
        // This is a simplified distance calculation - for production use PostGIS or similar
        const sql = `
            SELECT 
                c.*,
                co.name_es as country_name,
                COUNT(u.id) as university_count,
                (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance_km
            FROM cities c
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN universities u ON u.city_id = c.id
            WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
            GROUP BY c.id
            HAVING distance_km <= ?
            ORDER BY distance_km
        `;
        
        return await this.db.query(sql, [latitude, longitude, latitude, radiusKm]);
    }
}