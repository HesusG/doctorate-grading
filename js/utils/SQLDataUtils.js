/**
 * SQLDataUtils - SQL-based data operations to replace array-based DataUtils
 * Maintains the same API but uses SQLite queries for better performance
 */

export class SQLDataUtils {
    constructor(databaseService, programService) {
        this.db = databaseService;
        this.programService = programService;
        this.cache = new Map(); // Simple query result caching
        this.cacheTimeout = 30000; // 30 seconds cache timeout
    }

    /**
     * Get unique values for filter dropdowns
     * @param {string} field - The field to get unique values for
     * @returns {Array} Sorted array of unique values
     */
    async getUniqueValues(field) {
        const cacheKey = `unique_${field}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        let sql, results;
        
        switch(field) {
            case 'city':
                sql = `
                    SELECT DISTINCT c.name 
                    FROM cities c
                    JOIN universities u ON u.city_id = c.id
                    JOIN programs p ON p.university_id = u.id
                    ORDER BY c.name
                `;
                results = await this.db.query(sql);
                break;
                
            case 'university':
                sql = `
                    SELECT DISTINCT u.name 
                    FROM universities u
                    JOIN programs p ON p.university_id = u.id
                    ORDER BY u.name
                `;
                results = await this.db.query(sql);
                break;
                
            case 'country':
                sql = `
                    SELECT DISTINCT co.name_es as name
                    FROM countries co
                    JOIN cities c ON c.country_id = co.id
                    JOIN universities u ON u.city_id = c.id
                    JOIN programs p ON p.university_id = u.id
                    ORDER BY co.name_es
                `;
                results = await this.db.query(sql);
                break;
                
            case 'status':
                sql = `
                    SELECT DISTINCT status as name
                    FROM programs 
                    WHERE status IS NOT NULL
                    ORDER BY status
                `;
                results = await this.db.query(sql);
                break;
                
            default:
                throw new Error(`Unknown field: ${field}`);
        }
        
        const uniqueValues = results.map(row => row.name);
        
        // Cache the result
        this.cache.set(cacheKey, {
            data: uniqueValues,
            timestamp: Date.now()
        });
        
        return uniqueValues;
    }

    /**
     * Get programs by city name
     * @param {string} cityName - Name of the city
     * @returns {Array} Array of programs in the specified city
     */
    async getProgramsByCity(cityName) {
        const programs = await this.programService.filterPrograms({ city: cityName });
        return programs;
    }

    /**
     * Get programs by university name
     * @param {string} universityName - Name of the university
     * @returns {Array} Array of programs from the specified university
     */
    async getProgramsByUniversity(universityName) {
        const programs = await this.programService.getProgramsByUniversity(universityName);
        return programs;
    }

    /**
     * Get programs by status
     * @param {string} status - Program status
     * @returns {Array} Array of programs with the specified status
     */
    async getProgramsByStatus(status) {
        const programs = await this.programService.filterPrograms({ status });
        return programs;
    }

    /**
     * Get programs with minimum rating
     * @param {number} minRating - Minimum rating (0-5)
     * @returns {Array} Array of programs with rating >= minRating
     */
    async getProgramsByMinRating(minRating) {
        const programs = await this.programService.filterPrograms({ minRating });
        return programs;
    }

    /**
     * Search programs by text across all fields
     * @param {string} searchText - Text to search for
     * @returns {Array} Array of matching programs
     */
    async searchPrograms(searchText) {
        if (!searchText || searchText.trim() === '') {
            return await this.programService.getAllPrograms();
        }
        
        return await this.programService.searchPrograms(searchText);
    }

    /**
     * Apply multiple filters to programs
     * @param {Object} filters - Filter criteria
     * @returns {Array} Array of filtered programs
     */
    async applyFilters(filters) {
        return await this.programService.filterPrograms(filters);
    }

    /**
     * Get comprehensive program statistics
     * @returns {Object} Statistics object with counts and averages
     */
    async getStatistics() {
        const cacheKey = 'statistics';
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const sql = `
            SELECT 
                COUNT(DISTINCT p.id) as totalPrograms,
                COUNT(DISTINCT u.id) as totalUniversities,
                COUNT(DISTINCT c.id) as totalCities,
                COUNT(DISTINCT co.id) as totalCountries,
                COUNT(CASE WHEN p.is_favorite = 1 THEN 1 END) as favoritePrograms,
                ROUND(AVG(CASE WHEN p.overall_rating > 0 THEN p.overall_rating END), 2) as averageRating,
                COUNT(CASE WHEN p.overall_rating > 0 THEN 1 END) as ratedPrograms
            FROM programs p
            JOIN universities u ON p.university_id = u.id
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
        `;

        const basicStats = await this.db.queryOne(sql);

        // Get status distribution
        const statusSQL = `
            SELECT 
                status,
                COUNT(*) as count
            FROM programs 
            WHERE status IS NOT NULL
            GROUP BY status
            ORDER BY count DESC
        `;
        
        const statusResults = await this.db.query(statusSQL);
        const statusDistribution = {};
        statusResults.forEach(row => {
            statusDistribution[row.status] = row.count;
        });

        // Get country distribution
        const countrySQL = `
            SELECT 
                co.name_es as country,
                COUNT(DISTINCT p.id) as count
            FROM programs p
            JOIN universities u ON p.university_id = u.id
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            GROUP BY co.id
            ORDER BY count DESC
        `;
        
        const countryResults = await this.db.query(countrySQL);
        const countryDistribution = {};
        countryResults.forEach(row => {
            countryDistribution[row.country] = row.count;
        });

        const statistics = {
            totalPrograms: basicStats.totalPrograms,
            totalUniversities: basicStats.totalUniversities,
            totalCities: basicStats.totalCities,
            totalCountries: basicStats.totalCountries,
            favoritePrograms: basicStats.favoritePrograms,
            averageRating: basicStats.averageRating || 0,
            ratedPrograms: basicStats.ratedPrograms,
            statusDistribution,
            countryDistribution
        };

        // Cache the result
        this.cache.set(cacheKey, {
            data: statistics,
            timestamp: Date.now()
        });

        return statistics;
    }

    /**
     * Get coordinates for mapping (universities with their program counts)
     * @returns {Array} Array of coordinate objects for map markers
     */
    async getCoordinates() {
        const cacheKey = 'coordinates';
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const sql = `
            SELECT 
                u.id as university_id,
                u.name as university_name,
                c.latitude as lat,
                c.longitude as lon,
                c.name as city_name,
                co.name_es as country_name,
                p.id as program_id,
                p.original_id,
                p.name as program_name,
                p.status,
                p.overall_rating,
                p.is_favorite,
                p.research_lines
            FROM programs p
            JOIN universities u ON p.university_id = u.id
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
            ORDER BY u.name, p.name
        `;

        const results = await this.db.query(sql);
        
        // Transform to expected format for MapComponent
        const coordinates = results.map(row => ({
            id: row.original_id || row.program_id.toString(),
            lat: row.lat,
            lon: row.lon,
            program: {
                name: row.program_name,
                status: row.status,
                rating: {
                    overall: row.overall_rating
                },
                is_favorite: Boolean(row.is_favorite),
                research_lines: row.research_lines ? row.research_lines.split('|').filter(line => line.trim()) : []
            },
            university: {
                name: row.university_name
            },
            city: {
                name: row.city_name,
                country: row.country_name
            }
        }));

        // Cache the result
        this.cache.set(cacheKey, {
            data: coordinates,
            timestamp: Date.now()
        });

        return coordinates;
    }

    /**
     * Get filtered coordinates for mapping
     * @param {Object} filters - Filter criteria
     * @returns {Array} Array of filtered coordinate objects
     */
    async getFilteredCoordinates(filters) {
        // For filtered results, don't use cache as filters can vary
        const programs = await this.programService.filterPrograms(filters);
        
        // Transform to coordinate format
        const coordinates = programs
            .filter(program => program.city.coords.lat && program.city.coords.lon)
            .map(program => ({
                id: program._id,
                lat: program.city.coords.lat,
                lon: program.city.coords.lon,
                program: program.program,
                university: program.university,
                city: program.city
            }));

        return coordinates;
    }

    /**
     * Get universities grouped by location for map clustering
     * @returns {Array} Array of university groups with coordinates and program lists
     */
    async getUniversityGroups() {
        const cacheKey = 'university_groups';
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const sql = `
            SELECT 
                u.id as university_id,
                u.name as university_name,
                c.latitude as lat,
                c.longitude as lon,
                c.name as city_name,
                co.name_es as country_name,
                COUNT(p.id) as program_count,
                GROUP_CONCAT(p.name, '|||') as program_names,
                GROUP_CONCAT(p.status, '|||') as program_statuses,
                GROUP_CONCAT(p.overall_rating, '|||') as program_ratings,
                GROUP_CONCAT(p.is_favorite, '|||') as program_favorites
            FROM universities u
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            LEFT JOIN programs p ON p.university_id = u.id
            WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
            GROUP BY u.id
            ORDER BY u.name
        `;

        const results = await this.db.query(sql);
        
        // Transform to expected format for MapComponent
        const universityGroups = results.map(row => {
            const programs = [];
            
            if (row.program_names) {
                const names = row.program_names.split('|||');
                const statuses = row.program_statuses.split('|||');
                const ratings = row.program_ratings.split('|||');
                const favorites = row.program_favorites.split('|||');
                
                for (let i = 0; i < names.length; i++) {
                    programs.push({
                        name: names[i],
                        status: statuses[i],
                        rating: {
                            overall: parseInt(ratings[i]) || 0
                        },
                        is_favorite: Boolean(parseInt(favorites[i]))
                    });
                }
            }

            return {
                university: {
                    name: row.university_name
                },
                city: {
                    name: row.city_name,
                    country: row.country_name
                },
                lat: row.lat,
                lon: row.lon,
                programs: programs
            };
        });

        // Cache the result
        this.cache.set(cacheKey, {
            data: universityGroups,
            timestamp: Date.now()
        });

        return universityGroups;
    }

    /**
     * Clear cache (useful after data updates)
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ SQLDataUtils cache cleared');
    }

    /**
     * Clear specific cache entry
     * @param {string} key - Cache key to clear
     */
    clearCacheEntry(key) {
        this.cache.delete(key);
        console.log(`🗑️ Cache entry '${key}' cleared`);
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache usage statistics
     */
    getCacheStats() {
        const entries = Array.from(this.cache.entries());
        const now = Date.now();
        
        return {
            totalEntries: entries.length,
            validEntries: entries.filter(([key, value]) => now - value.timestamp < this.cacheTimeout).length,
            expiredEntries: entries.filter(([key, value]) => now - value.timestamp >= this.cacheTimeout).length,
            cacheKeys: entries.map(([key]) => key)
        };
    }

    /**
     * Cleanup expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp >= this.cacheTimeout) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
        
        if (keysToDelete.length > 0) {
            console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
        }
    }
}

// Export utility functions (maintaining compatibility with original DataUtils)
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
}

export function formatRating(rating) {
    if (!rating || rating === 0) return 'Sin calificar';
    return '⭐'.repeat(rating) + (rating < 5 ? '☆'.repeat(5 - rating) : '');
}

export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}