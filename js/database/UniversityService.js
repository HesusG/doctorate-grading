/**
 * UniversityService - Complete CRUD operations for universities
 * Handles all university-related database operations with full field editing
 */

export class UniversityService {
    constructor(databaseService) {
        this.db = databaseService;
    }

    // =====================================================
    // READ OPERATIONS
    // =====================================================

    /**
     * Get all universities with city and country information
     */
    async getAllUniversities() {
        const sql = `
            SELECT 
                u.*,
                c.name as city_name,
                c.latitude,
                c.longitude,
                c.madrid_distance_km,
                co.name as country_name,
                co.name_es as country_name_es,
                COUNT(p.id) as program_count
            FROM universities u
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN programs p ON p.university_id = u.id
            GROUP BY u.id
            ORDER BY u.name
        `;
        
        return await this.db.query(sql);
    }

    /**
     * Get a single university by ID with all related data
     */
    async getUniversityById(universityId) {
        const sql = `
            SELECT 
                u.*,
                c.name as city_name,
                c.latitude,
                c.longitude,
                c.madrid_distance_km,
                co.name as country_name,
                co.name_es as country_name_es
            FROM universities u
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            WHERE u.id = ?
        `;
        
        return await this.db.queryOne(sql, [universityId]);
    }

    /**
     * Get university by name with city and country info
     */
    async getUniversityByName(universityName) {
        const sql = `
            SELECT 
                u.*,
                c.name as city_name,
                c.latitude,
                c.longitude,
                c.madrid_distance_km,
                co.name as country_name,
                co.name_es as country_name_es
            FROM universities u
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            WHERE u.name = ?
        `;
        
        return await this.db.queryOne(sql, [universityName]);
    }

    /**
     * Get universities in a specific city
     */
    async getUniversitiesByCity(cityId) {
        const sql = `
            SELECT 
                u.*,
                c.name as city_name,
                co.name_es as country_name_es,
                COUNT(p.id) as program_count
            FROM universities u
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN programs p ON p.university_id = u.id
            WHERE u.city_id = ?
            GROUP BY u.id
            ORDER BY u.name
        `;
        
        return await this.db.query(sql, [cityId]);
    }

    /**
     * Get universities with their programs
     */
    async getUniversityWithPrograms(universityId) {
        const university = await this.getUniversityById(universityId);
        if (!university) return null;

        const programsSQL = `
            SELECT 
                p.*
            FROM programs p
            WHERE p.university_id = ?
            ORDER BY p.name
        `;
        
        const programs = await this.db.query(programsSQL, [universityId]);
        
        return {
            ...university,
            programs: programs
        };
    }

    /**
     * Search universities by name or city
     */
    async searchUniversities(searchText) {
        if (!searchText || searchText.trim() === '') {
            return await this.getAllUniversities();
        }

        const searchTerm = `%${searchText.toLowerCase()}%`;
        const sql = `
            SELECT 
                u.*,
                c.name as city_name,
                c.latitude,
                c.longitude,
                c.madrid_distance_km,
                co.name as country_name,
                co.name_es as country_name_es,
                COUNT(p.id) as program_count
            FROM universities u
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN programs p ON p.university_id = u.id
            WHERE 
                LOWER(u.name) LIKE ? OR
                LOWER(c.name) LIKE ? OR
                LOWER(u.university_summary) LIKE ?
            GROUP BY u.id
            ORDER BY u.name
        `;
        
        return await this.db.query(sql, [searchTerm, searchTerm, searchTerm]);
    }

    // =====================================================
    // CREATE OPERATIONS
    // =====================================================

    /**
     * Create a new university
     */
    async createUniversity(universityData) {
        const sql = `
            INSERT INTO universities (
                name, city_id, founded_year, website, university_summary, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            universityData.name,
            universityData.city_id,
            universityData.founded_year || null,
            universityData.website || null,
            universityData.university_summary || null,
            new Date().toISOString(),
            new Date().toISOString()
        ];
        
        const result = await this.db.execute(sql, params);
        return result.lastInsertId;
    }

    /**
     * Create university with city lookup by name
     */
    async createUniversityWithCityName(universityData, cityName, countryName) {
        // First, find the city ID
        const citySQL = `
            SELECT c.id 
            FROM cities c 
            JOIN countries co ON c.country_id = co.id 
            WHERE c.name = ? AND (co.name = ? OR co.name_es = ?)
        `;
        
        const cityResult = await this.db.queryOne(citySQL, [cityName, countryName, countryName]);
        if (!cityResult) {
            throw new Error(`City '${cityName}' in '${countryName}' not found`);
        }

        return await this.createUniversity({
            ...universityData,
            city_id: cityResult.id
        });
    }

    // =====================================================
    // UPDATE OPERATIONS - ALL FIELDS EDITABLE
    // =====================================================

    /**
     * Update any university field
     */
    async updateUniversity(universityId, changes) {
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
        
        params.push(universityId); // For WHERE clause
        
        const sql = `
            UPDATE universities 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `;
        
        const result = await this.db.execute(sql, params);
        return result.changes > 0;
    }

    /**
     * Update university name (with uniqueness validation)
     */
    async updateUniversityName(universityId, newName) {
        // Check if name already exists for another university in the same city
        const existingSQL = `
            SELECT id FROM universities 
            WHERE name = ? AND city_id = (SELECT city_id FROM universities WHERE id = ?) AND id != ?
        `;
        
        const existing = await this.db.queryOne(existingSQL, [newName, universityId, universityId]);
        if (existing) {
            throw new Error(`University '${newName}' already exists in this city`);
        }

        return await this.updateUniversity(universityId, { name: newName });
    }

    /**
     * Update founded year with validation
     */
    async updateFoundedYear(universityId, foundedYear) {
        if (foundedYear !== null && (foundedYear < 800 || foundedYear > new Date().getFullYear())) {
            throw new Error(`Invalid founded year: ${foundedYear}. Must be between 800 and ${new Date().getFullYear()}`);
        }

        return await this.updateUniversity(universityId, { founded_year: foundedYear });
    }

    /**
     * Update website URL with validation
     */
    async updateWebsite(universityId, website) {
        if (website && !this.isValidUrl(website)) {
            throw new Error(`Invalid website URL: ${website}`);
        }

        return await this.updateUniversity(universityId, { website });
    }

    /**
     * Update university summary
     */
    async updateSummary(universityId, summary) {
        return await this.updateUniversity(universityId, { university_summary: summary });
    }

    /**
     * Update university city
     */
    async updateUniversityCity(universityId, cityId) {
        // Verify city exists
        const cityExists = await this.db.queryScalar('SELECT 1 FROM cities WHERE id = ?', [cityId]);
        if (!cityExists) {
            throw new Error(`City with ID ${cityId} not found`);
        }

        return await this.updateUniversity(universityId, { city_id: cityId });
    }

    // =====================================================
    // DELETE OPERATIONS
    // =====================================================

    /**
     * Delete a university (will cascade to programs)
     */
    async deleteUniversity(universityId) {
        // Check if university has programs
        const programCount = await this.db.queryScalar(
            'SELECT COUNT(*) FROM programs WHERE university_id = ?', 
            [universityId]
        );

        if (programCount > 0) {
            throw new Error(`Cannot delete university: ${programCount} programs are associated with it. Delete programs first.`);
        }

        const sql = 'DELETE FROM universities WHERE id = ?';
        const result = await this.db.execute(sql, [universityId]);
        return result.changes > 0;
    }

    /**
     * Delete university with cascade (force delete with all programs)
     */
    async deleteUniversityWithCascade(universityId) {
        const queries = [
            { sql: 'DELETE FROM programs WHERE university_id = ?', params: [universityId] },
            { sql: 'DELETE FROM universities WHERE id = ?', params: [universityId] }
        ];

        const results = await this.db.transaction(queries);
        return results[1].changes > 0;
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Get unique university names for autocomplete
     */
    async getUniqueUniversityNames() {
        const sql = 'SELECT DISTINCT name FROM universities ORDER BY name';
        const results = await this.db.query(sql);
        return results.map(row => row.name);
    }

    /**
     * Get universities grouped by city
     */
    async getUniversitiesGroupedByCity() {
        const sql = `
            SELECT 
                c.name as city_name,
                co.name_es as country_name,
                u.id,
                u.name,
                u.founded_year,
                COUNT(p.id) as program_count
            FROM universities u
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN programs p ON p.university_id = u.id
            GROUP BY u.id
            ORDER BY c.name, u.name
        `;
        
        const results = await this.db.query(sql);
        
        // Group by city
        const grouped = {};
        results.forEach(row => {
            const cityKey = `${row.city_name}, ${row.country_name}`;
            if (!grouped[cityKey]) {
                grouped[cityKey] = [];
            }
            grouped[cityKey].push({
                id: row.id,
                name: row.name,
                founded_year: row.founded_year,
                program_count: row.program_count
            });
        });
        
        return grouped;
    }

    /**
     * Get university statistics
     */
    async getUniversityStatistics() {
        const sql = `
            SELECT 
                COUNT(*) as total_universities,
                COUNT(CASE WHEN founded_year IS NOT NULL THEN 1 END) as with_founded_year,
                COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as with_website,
                COUNT(CASE WHEN university_summary IS NOT NULL THEN 1 END) as with_summary,
                MIN(founded_year) as oldest_year,
                MAX(founded_year) as newest_year,
                AVG(founded_year) as avg_founded_year
            FROM universities
        `;
        
        return await this.db.queryOne(sql);
    }

    /**
     * Validate URL format
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if university name is unique in city
     */
    async isNameUniqueInCity(universityName, cityId, excludeId = null) {
        let sql = 'SELECT id FROM universities WHERE name = ? AND city_id = ?';
        const params = [universityName, cityId];
        
        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }
        
        const result = await this.db.queryOne(sql, params);
        return !result;
    }

    /**
     * Get universities with coordinates for mapping
     */
    async getUniversitiesForMap() {
        const sql = `
            SELECT 
                u.id,
                u.name,
                c.latitude,
                c.longitude,
                c.name as city_name,
                co.name_es as country_name,
                COUNT(p.id) as program_count
            FROM universities u
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN programs p ON p.university_id = u.id
            WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
            GROUP BY u.id
            ORDER BY u.name
        `;
        
        return await this.db.query(sql);
    }
}