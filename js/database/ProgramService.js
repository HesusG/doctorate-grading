/**
 * ProgramService - Complete CRUD operations for programs
 * Handles all program-related database operations with full field editing
 */

export class ProgramService {
    constructor(databaseService) {
        this.db = databaseService;
    }

    // =====================================================
    // READ OPERATIONS
    // =====================================================

    /**
     * Get all programs with complete related data
     */
    async getAllPrograms() {
        const sql = `
            SELECT 
                p.*,
                u.name as university_name,
                u.founded_year as university_founded_year,
                u.website as university_website,
                u.university_summary,
                c.name as city_name,
                c.latitude,
                c.longitude,
                c.madrid_distance_km,
                c.cost_effectiveness,
                c.medical_services,
                c.transportation,
                c.air_quality,
                c.weather,
                c.city_summary,
                c.ai_cost_of_living,
                c.ai_medical_quality,
                c.ai_transport_quality,
                c.ai_air_quality,
                co.name as country_name,
                co.name_es as country_name_es
            FROM programs p
            JOIN universities u ON p.university_id = u.id
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            ORDER BY p.name
        `;
        
        const results = await this.db.query(sql);
        return results.map(this.transformProgramResult);
    }

    /**
     * Get a single program by ID with all related data
     */
    async getProgramById(programId) {
        const sql = `
            SELECT 
                p.*,
                u.name as university_name,
                u.founded_year as university_founded_year,
                u.website as university_website,
                u.university_summary,
                c.name as city_name,
                c.latitude,
                c.longitude,
                c.madrid_distance_km,
                c.cost_effectiveness,
                c.medical_services,
                c.transportation,
                c.air_quality,
                c.weather,
                c.city_summary,
                c.ai_cost_of_living,
                c.ai_medical_quality,
                c.ai_transport_quality,
                c.ai_air_quality,
                co.name as country_name,
                co.name_es as country_name_es
            FROM programs p
            JOIN universities u ON p.university_id = u.id
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            WHERE p.id = ?
        `;
        
        const result = await this.db.queryOne(sql, [programId]);
        return result ? this.transformProgramResult(result) : null;
    }

    /**
     * Search programs by text across all fields
     */
    async searchPrograms(searchText) {
        if (!searchText || searchText.trim() === '') {
            return await this.getAllPrograms();
        }

        const searchTerm = `%${searchText.toLowerCase()}%`;
        const sql = `
            SELECT 
                p.*,
                u.name as university_name,
                u.founded_year as university_founded_year,
                u.website as university_website,
                u.university_summary,
                c.name as city_name,
                c.latitude,
                c.longitude,
                c.madrid_distance_km,
                c.cost_effectiveness,
                c.medical_services,
                c.transportation,
                c.air_quality,
                c.weather,
                c.city_summary,
                c.ai_cost_of_living,
                c.ai_medical_quality,
                c.ai_transport_quality,
                c.ai_air_quality,
                co.name as country_name,
                co.name_es as country_name_es
            FROM programs p
            JOIN universities u ON p.university_id = u.id
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            WHERE 
                LOWER(p.name) LIKE ? OR
                LOWER(p.research_lines) LIKE ? OR
                LOWER(u.name) LIKE ? OR
                LOWER(c.name) LIKE ? OR
                LOWER(p.program_summary) LIKE ? OR
                LOWER(p.rating_comment) LIKE ?
            ORDER BY p.name
        `;
        
        const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
        const results = await this.db.query(sql, params);
        return results.map(this.transformProgramResult);
    }

    /**
     * Filter programs by multiple criteria
     */
    async filterPrograms(filters) {
        let sql = `
            SELECT 
                p.*,
                u.name as university_name,
                u.founded_year as university_founded_year,
                u.website as university_website,
                u.university_summary,
                c.name as city_name,
                c.latitude,
                c.longitude,
                c.madrid_distance_km,
                c.cost_effectiveness,
                c.medical_services,
                c.transportation,
                c.air_quality,
                c.weather,
                c.city_summary,
                c.ai_cost_of_living,
                c.ai_medical_quality,
                c.ai_transport_quality,
                c.ai_air_quality,
                co.name as country_name,
                co.name_es as country_name_es
            FROM programs p
            JOIN universities u ON p.university_id = u.id
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Add filter conditions
        if (filters.city) {
            sql += ' AND c.name = ?';
            params.push(filters.city);
        }
        
        if (filters.university) {
            sql += ' AND u.name = ?';
            params.push(filters.university);
        }
        
        if (filters.status) {
            sql += ' AND p.status = ?';
            params.push(filters.status);
        }
        
        if (filters.minRating) {
            sql += ' AND p.overall_rating >= ?';
            params.push(parseInt(filters.minRating));
        }
        
        if (filters.isFavorite) {
            sql += ' AND p.is_favorite = 1';
        }
        
        if (filters.search) {
            const searchTerm = `%${filters.search.toLowerCase()}%`;
            sql += ` AND (
                LOWER(p.name) LIKE ? OR
                LOWER(p.research_lines) LIKE ? OR
                LOWER(u.name) LIKE ? OR
                LOWER(c.name) LIKE ?
            )`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        sql += ' ORDER BY p.name';
        
        const results = await this.db.query(sql, params);
        return results.map(this.transformProgramResult);
    }

    /**
     * Get programs by university name
     */
    async getProgramsByUniversity(universityName) {
        const sql = `
            SELECT 
                p.*,
                u.name as university_name,
                u.founded_year as university_founded_year,
                u.website as university_website,
                u.university_summary,
                c.name as city_name,
                c.latitude,
                c.longitude,
                c.madrid_distance_km,
                c.cost_effectiveness,
                c.medical_services,
                c.transportation,
                c.air_quality,
                c.weather,
                c.city_summary,
                c.ai_cost_of_living,
                c.ai_medical_quality,
                c.ai_transport_quality,
                c.ai_air_quality,
                co.name as country_name,
                co.name_es as country_name_es
            FROM programs p
            JOIN universities u ON p.university_id = u.id
            JOIN cities c ON u.city_id = c.id
            JOIN countries co ON c.country_id = co.id
            WHERE u.name = ?
            ORDER BY p.name
        `;
        
        const results = await this.db.query(sql, [universityName]);
        return results.map(this.transformProgramResult);
    }

    // =====================================================
    // CREATE OPERATIONS
    // =====================================================

    /**
     * Create a new program
     */
    async createProgram(programData) {
        const sql = `
            INSERT INTO programs (
                original_id, name, university_id, research_lines, url, status, is_favorite,
                overall_rating, rating_date, rating_comment,
                personal_relevance, information_clarity, research_environment, infrastructure, training_activities,
                program_summary, ai_innovacion, ai_interdisciplinariedad, ai_impacto, ai_internacional, ai_aplicabilidad,
                created_date, updated_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            programData.original_id || null,
            programData.name,
            programData.university_id,
            Array.isArray(programData.research_lines) ? programData.research_lines.join('|') : programData.research_lines || '',
            programData.url || null,
            programData.status || 'pending',
            programData.is_favorite || false,
            programData.overall_rating || 0,
            programData.rating_date || null,
            programData.rating_comment || null,
            programData.personal_relevance || 0,
            programData.information_clarity || 0,
            programData.research_environment || 0,
            programData.infrastructure || 0,
            programData.training_activities || 0,
            programData.program_summary || null,
            programData.ai_innovacion || null,
            programData.ai_interdisciplinariedad || null,
            programData.ai_impacto || null,
            programData.ai_internacional || null,
            programData.ai_aplicabilidad || null,
            new Date().toISOString(),
            new Date().toISOString()
        ];
        
        const result = await this.db.execute(sql, params);
        return result.lastInsertId;
    }

    // =====================================================
    // UPDATE OPERATIONS
    // =====================================================

    /**
     * Update any program field
     */
    async updateProgram(programId, changes) {
        const updateFields = [];
        const params = [];
        
        // Build dynamic UPDATE query
        Object.keys(changes).forEach(field => {
            if (field === 'research_lines' && Array.isArray(changes[field])) {
                updateFields.push(`${field} = ?`);
                params.push(changes[field].join('|'));
            } else {
                updateFields.push(`${field} = ?`);
                params.push(changes[field]);
            }
        });
        
        // Always update the timestamp
        updateFields.push('updated_date = ?');
        params.push(new Date().toISOString());
        
        params.push(programId); // For WHERE clause
        
        const sql = `
            UPDATE programs 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `;
        
        const result = await this.db.execute(sql, params);
        return result.changes > 0;
    }

    /**
     * Update program rating
     */
    async updateProgramRating(programId, rating, comment = '') {
        const changes = {
            overall_rating: rating,
            rating_date: new Date().toISOString(),
            rating_comment: comment
        };
        
        return await this.updateProgram(programId, changes);
    }

    /**
     * Update program criteria
     */
    async updateProgramCriteria(programId, criteria) {
        const changes = {};
        
        if (criteria.personal_relevance !== undefined) changes.personal_relevance = criteria.personal_relevance;
        if (criteria.information_clarity !== undefined) changes.information_clarity = criteria.information_clarity;
        if (criteria.research_environment !== undefined) changes.research_environment = criteria.research_environment;
        if (criteria.infrastructure !== undefined) changes.infrastructure = criteria.infrastructure;
        if (criteria.training_activities !== undefined) changes.training_activities = criteria.training_activities;
        
        return await this.updateProgram(programId, changes);
    }

    /**
     * Update program status
     */
    async updateProgramStatus(programId, status) {
        const validStatuses = ['pending', 'considering', 'interested', 'applying', 'discarded'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
        }
        
        return await this.updateProgram(programId, { status });
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(programId) {
        const current = await this.db.queryScalar('SELECT is_favorite FROM programs WHERE id = ?', [programId]);
        const newStatus = !current;
        
        return await this.updateProgram(programId, { is_favorite: newStatus });
    }

    /**
     * Update research lines
     */
    async updateResearchLines(programId, researchLines) {
        return await this.updateProgram(programId, { research_lines: researchLines });
    }

    // =====================================================
    // DELETE OPERATIONS
    // =====================================================

    /**
     * Delete a program
     */
    async deleteProgram(programId) {
        const sql = 'DELETE FROM programs WHERE id = ?';
        const result = await this.db.execute(sql, [programId]);
        return result.changes > 0;
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Transform database result to match expected format
     */
    transformProgramResult(dbRow) {
        return {
            _id: dbRow.original_id || dbRow.id.toString(),
            id: dbRow.id,
            program: {
                name: dbRow.name,
                research_lines: dbRow.research_lines ? dbRow.research_lines.split('|').filter(line => line.trim()) : [],
                url: dbRow.url,
                status: dbRow.status,
                is_favorite: Boolean(dbRow.is_favorite),
                rating: {
                    overall: dbRow.overall_rating,
                    date: dbRow.rating_date,
                    comment: dbRow.rating_comment
                },
                criteria: {
                    personal_relevance: dbRow.personal_relevance,
                    information_clarity: dbRow.information_clarity,
                    research_environment: dbRow.research_environment,
                    infrastructure: dbRow.infrastructure,
                    training_activities: dbRow.training_activities
                }
            },
            university: {
                name: dbRow.university_name,
                founded_year: dbRow.university_founded_year,
                website: dbRow.university_website
            },
            city: {
                name: dbRow.city_name,
                country: dbRow.country_name_es || dbRow.country_name,
                coords: {
                    lat: dbRow.latitude,
                    lon: dbRow.longitude
                },
                distances: {
                    madrid_km: dbRow.madrid_distance_km
                },
                criteria: {
                    cost_effectiveness: dbRow.cost_effectiveness,
                    medical_services: dbRow.medical_services,
                    transportation: dbRow.transportation,
                    air_quality: dbRow.air_quality,
                    weather: dbRow.weather
                }
            },
            ai_analysis: {
                program_summary: dbRow.program_summary,
                university_summary: dbRow.university_summary,
                city_summary: dbRow.city_summary,
                program_metrics: {
                    innovacion: dbRow.ai_innovacion,
                    interdisciplinariedad: dbRow.ai_interdisciplinariedad,
                    impacto: dbRow.ai_impacto,
                    internacional: dbRow.ai_internacional,
                    aplicabilidad: dbRow.ai_aplicabilidad
                },
                city_metrics: {
                    cost_of_living: dbRow.ai_cost_of_living,
                    medical_quality: dbRow.ai_medical_quality,
                    transport_quality: dbRow.ai_transport_quality,
                    air_quality: dbRow.ai_air_quality
                }
            },
            created_date: dbRow.created_date,
            updated_date: dbRow.updated_date
        };
    }

    /**
     * Get unique values for filters
     */
    async getUniqueStatuses() {
        const sql = 'SELECT DISTINCT status FROM programs WHERE status IS NOT NULL ORDER BY status';
        const results = await this.db.query(sql);
        return results.map(row => row.status);
    }

    /**
     * Get program statistics
     */
    async getStatistics() {
        const sql = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_favorite = 1 THEN 1 END) as favorites,
                COUNT(CASE WHEN status = 'applying' THEN 1 END) as applying,
                COUNT(CASE WHEN overall_rating > 0 THEN 1 END) as rated,
                ROUND(AVG(CASE WHEN overall_rating > 0 THEN overall_rating END), 2) as avg_rating
            FROM programs
        `;
        
        return await this.db.queryOne(sql);
    }
}