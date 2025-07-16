/**
 * CountryService - Complete CRUD operations for countries
 * Handles all country-related database operations with full field editing
 */

export class CountryService {
    constructor(databaseService) {
        this.db = databaseService;
    }

    // =====================================================
    // READ OPERATIONS
    // =====================================================

    /**
     * Get all countries with statistics
     */
    async getAllCountries() {
        const sql = `
            SELECT 
                c.*,
                COUNT(DISTINCT ci.id) as city_count,
                COUNT(DISTINCT u.id) as university_count,
                COUNT(DISTINCT p.id) as program_count
            FROM countries c
            LEFT JOIN cities ci ON ci.country_id = c.id
            LEFT JOIN universities u ON u.city_id = ci.id
            LEFT JOIN programs p ON p.university_id = u.id
            GROUP BY c.id
            ORDER BY c.name_es
        `;
        
        return await this.db.query(sql);
    }

    /**
     * Get a single country by ID
     */
    async getCountryById(countryId) {
        const sql = `
            SELECT 
                c.*,
                COUNT(DISTINCT ci.id) as city_count,
                COUNT(DISTINCT u.id) as university_count,
                COUNT(DISTINCT p.id) as program_count
            FROM countries c
            LEFT JOIN cities ci ON ci.country_id = c.id
            LEFT JOIN universities u ON u.city_id = ci.id
            LEFT JOIN programs p ON p.university_id = u.id
            WHERE c.id = ?
            GROUP BY c.id
        `;
        
        return await this.db.queryOne(sql, [countryId]);
    }

    /**
     * Get country by name (English or Spanish)
     */
    async getCountryByName(countryName) {
        const sql = `
            SELECT 
                c.*,
                COUNT(DISTINCT ci.id) as city_count,
                COUNT(DISTINCT u.id) as university_count,
                COUNT(DISTINCT p.id) as program_count
            FROM countries c
            LEFT JOIN cities ci ON ci.country_id = c.id
            LEFT JOIN universities u ON u.city_id = ci.id
            LEFT JOIN programs p ON p.university_id = u.id
            WHERE c.name = ? OR c.name_es = ?
            GROUP BY c.id
        `;
        
        return await this.db.queryOne(sql, [countryName, countryName]);
    }

    /**
     * Get country with all cities and their details
     */
    async getCountryWithCities(countryId) {
        const country = await this.getCountryById(countryId);
        if (!country) return null;

        const citiesSQL = `
            SELECT 
                ci.*,
                COUNT(DISTINCT u.id) as university_count,
                COUNT(DISTINCT p.id) as program_count
            FROM cities ci
            LEFT JOIN universities u ON u.city_id = ci.id
            LEFT JOIN programs p ON p.university_id = u.id
            WHERE ci.country_id = ?
            GROUP BY ci.id
            ORDER BY ci.name
        `;
        
        const cities = await this.db.query(citiesSQL, [countryId]);
        
        return {
            ...country,
            cities: cities
        };
    }

    /**
     * Search countries by name
     */
    async searchCountries(searchText) {
        if (!searchText || searchText.trim() === '') {
            return await this.getAllCountries();
        }

        const searchTerm = `%${searchText.toLowerCase()}%`;
        const sql = `
            SELECT 
                c.*,
                COUNT(DISTINCT ci.id) as city_count,
                COUNT(DISTINCT u.id) as university_count,
                COUNT(DISTINCT p.id) as program_count
            FROM countries c
            LEFT JOIN cities ci ON ci.country_id = c.id
            LEFT JOIN universities u ON u.city_id = ci.id
            LEFT JOIN programs p ON p.university_id = u.id
            WHERE 
                LOWER(c.name) LIKE ? OR
                LOWER(c.name_es) LIKE ?
            GROUP BY c.id
            ORDER BY c.name_es
        `;
        
        return await this.db.query(sql, [searchTerm, searchTerm]);
    }

    // =====================================================
    // CREATE OPERATIONS
    // =====================================================

    /**
     * Create a new country
     */
    async createCountry(countryData) {
        // Check if country already exists
        const existing = await this.getCountryByName(countryData.name);
        if (existing) {
            throw new Error(`Country '${countryData.name}' already exists`);
        }

        const sql = `
            INSERT INTO countries (
                name, name_es, created_at, updated_at
            ) VALUES (?, ?, ?, ?)
        `;
        
        const params = [
            countryData.name,
            countryData.name_es || countryData.name,
            new Date().toISOString(),
            new Date().toISOString()
        ];
        
        const result = await this.db.execute(sql, params);
        return result.lastInsertId;
    }

    // =====================================================
    // UPDATE OPERATIONS - ALL FIELDS EDITABLE
    // =====================================================

    /**
     * Update any country field
     */
    async updateCountry(countryId, changes) {
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
        
        params.push(countryId); // For WHERE clause
        
        const sql = `
            UPDATE countries 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `;
        
        const result = await this.db.execute(sql, params);
        return result.changes > 0;
    }

    /**
     * Update country English name (with uniqueness validation)
     */
    async updateCountryName(countryId, newName) {
        // Check if name already exists for another country
        const existingSQL = `
            SELECT id FROM countries WHERE name = ? AND id != ?
        `;
        
        const existing = await this.db.queryOne(existingSQL, [newName, countryId]);
        if (existing) {
            throw new Error(`Country '${newName}' already exists`);
        }

        return await this.updateCountry(countryId, { name: newName });
    }

    /**
     * Update country Spanish name (with uniqueness validation)
     */
    async updateCountryNameEs(countryId, newNameEs) {
        // Check if Spanish name already exists for another country
        const existingSQL = `
            SELECT id FROM countries WHERE name_es = ? AND id != ?
        `;
        
        const existing = await this.db.queryOne(existingSQL, [newNameEs, countryId]);
        if (existing) {
            throw new Error(`Country name '${newNameEs}' already exists in Spanish`);
        }

        return await this.updateCountry(countryId, { name_es: newNameEs });
    }

    /**
     * Update both country names
     */
    async updateCountryNames(countryId, englishName, spanishName) {
        // Check uniqueness for both names
        const existingEnglishSQL = `
            SELECT id FROM countries WHERE name = ? AND id != ?
        `;
        const existingSpanishSQL = `
            SELECT id FROM countries WHERE name_es = ? AND id != ?
        `;
        
        const existingEnglish = await this.db.queryOne(existingEnglishSQL, [englishName, countryId]);
        const existingSpanish = await this.db.queryOne(existingSpanishSQL, [spanishName, countryId]);
        
        if (existingEnglish) {
            throw new Error(`Country '${englishName}' already exists`);
        }
        
        if (existingSpanish) {
            throw new Error(`Country name '${spanishName}' already exists in Spanish`);
        }

        return await this.updateCountry(countryId, { 
            name: englishName, 
            name_es: spanishName 
        });
    }

    // =====================================================
    // DELETE OPERATIONS
    // =====================================================

    /**
     * Delete a country (will fail if it has cities)
     */
    async deleteCountry(countryId) {
        // Check if country has cities
        const cityCount = await this.db.queryScalar(
            'SELECT COUNT(*) FROM cities WHERE country_id = ?', 
            [countryId]
        );

        if (cityCount > 0) {
            throw new Error(`Cannot delete country: ${cityCount} cities are located in it. Delete cities first.`);
        }

        const sql = 'DELETE FROM countries WHERE id = ?';
        const result = await this.db.execute(sql, [countryId]);
        return result.changes > 0;
    }

    /**
     * Delete country with cascade (force delete with all cities, universities, and programs)
     */
    async deleteCountryWithCascade(countryId) {
        const queries = [
            { 
                sql: `DELETE FROM programs 
                      WHERE university_id IN (
                          SELECT u.id FROM universities u 
                          JOIN cities c ON u.city_id = c.id 
                          WHERE c.country_id = ?
                      )`, 
                params: [countryId] 
            },
            { 
                sql: `DELETE FROM universities 
                      WHERE city_id IN (
                          SELECT id FROM cities WHERE country_id = ?
                      )`, 
                params: [countryId] 
            },
            { sql: 'DELETE FROM cities WHERE country_id = ?', params: [countryId] },
            { sql: 'DELETE FROM countries WHERE id = ?', params: [countryId] }
        ];

        const results = await this.db.transaction(queries);
        return results[3].changes > 0;
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Get unique country names for autocomplete
     */
    async getUniqueCountryNames() {
        const sql = 'SELECT name, name_es FROM countries ORDER BY name_es';
        const results = await this.db.query(sql);
        return results.map(row => ({
            english: row.name,
            spanish: row.name_es
        }));
    }

    /**
     * Get country statistics
     */
    async getCountryStatistics() {
        const sql = `
            SELECT 
                COUNT(*) as total_countries,
                SUM(CASE WHEN name != name_es THEN 1 ELSE 0 END) as translated_countries
            FROM countries
        `;
        
        const basicStats = await this.db.queryOne(sql);
        
        // Get detailed stats per country
        const detailedSQL = `
            SELECT 
                c.name_es as country_name,
                COUNT(DISTINCT ci.id) as cities,
                COUNT(DISTINCT u.id) as universities,
                COUNT(DISTINCT p.id) as programs,
                COUNT(CASE WHEN p.is_favorite = 1 THEN 1 END) as favorite_programs,
                ROUND(AVG(CASE WHEN p.overall_rating > 0 THEN p.overall_rating END), 2) as avg_rating
            FROM countries c
            LEFT JOIN cities ci ON ci.country_id = c.id
            LEFT JOIN universities u ON u.city_id = ci.id
            LEFT JOIN programs p ON p.university_id = u.id
            GROUP BY c.id
            ORDER BY programs DESC
        `;
        
        const countryDetails = await this.db.query(detailedSQL);
        
        return {
            ...basicStats,
            country_details: countryDetails
        };
    }

    /**
     * Check if country name is unique
     */
    async isNameUnique(countryName, excludeId = null) {
        let sql = 'SELECT id FROM countries WHERE name = ? OR name_es = ?';
        const params = [countryName, countryName];
        
        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }
        
        const result = await this.db.queryOne(sql, params);
        return !result;
    }

    /**
     * Get countries with their geographic bounds (based on cities)
     */
    async getCountriesWithBounds() {
        const sql = `
            SELECT 
                c.*,
                COUNT(ci.id) as city_count,
                MIN(ci.latitude) as min_lat,
                MAX(ci.latitude) as max_lat,
                MIN(ci.longitude) as min_lon,
                MAX(ci.longitude) as max_lon,
                AVG(ci.latitude) as center_lat,
                AVG(ci.longitude) as center_lon
            FROM countries c
            LEFT JOIN cities ci ON ci.country_id = c.id AND ci.latitude IS NOT NULL AND ci.longitude IS NOT NULL
            GROUP BY c.id
            ORDER BY c.name_es
        `;
        
        return await this.db.query(sql);
    }

    /**
     * Get the most popular countries (by program count)
     */
    async getPopularCountries(limit = 10) {
        const sql = `
            SELECT 
                c.*,
                COUNT(DISTINCT ci.id) as city_count,
                COUNT(DISTINCT u.id) as university_count,
                COUNT(DISTINCT p.id) as program_count,
                COUNT(CASE WHEN p.is_favorite = 1 THEN 1 END) as favorite_programs
            FROM countries c
            LEFT JOIN cities ci ON ci.country_id = c.id
            LEFT JOIN universities u ON u.city_id = ci.id
            LEFT JOIN programs p ON p.university_id = u.id
            GROUP BY c.id
            ORDER BY program_count DESC, university_count DESC
            LIMIT ?
        `;
        
        return await this.db.query(sql, [limit]);
    }

    /**
     * Validate country data
     */
    validateCountryData(countryData) {
        const errors = [];
        
        if (!countryData.name || countryData.name.trim().length === 0) {
            errors.push('Country name is required');
        }
        
        if (countryData.name && countryData.name.length > 100) {
            errors.push('Country name must be less than 100 characters');
        }
        
        if (countryData.name_es && countryData.name_es.length > 100) {
            errors.push('Spanish country name must be less than 100 characters');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}