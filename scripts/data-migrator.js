#!/usr/bin/env node

/**
 * =====================================================
 * Professional Data Migration Script
 * Transforms denormalized data to normalized SQLite schema
 * =====================================================
 */

const fs = require('fs');
const path = require('path');
const { DatabaseConnection, Logger, MigrationError, ValidationError } = require('./migration-framework.js');

// =====================================================
// DATA VALIDATION UTILITIES
// =====================================================

class DataValidator {
    static validateProgram(program, index) {
        const errors = [];
        const warnings = [];

        // Required fields validation
        if (!program.program?.name) {
            errors.push(`Program name is required (index: ${index})`);
        }
        if (!program.university?.name) {
            errors.push(`University name is required (index: ${index})`);
        }
        if (!program.city?.name) {
            errors.push(`City name is required (index: ${index})`);
        }
        if (!program.city?.country) {
            errors.push(`Country is required (index: ${index})`);
        }

        // Data type validation
        if (program.program?.name && typeof program.program.name !== 'string') {
            errors.push(`Program name must be a string (index: ${index})`);
        }

        // Coordinate validation
        if (program.city?.coords) {
            const { lat, lon } = program.city.coords;
            if (lat !== null && (typeof lat !== 'number' || lat < -90 || lat > 90)) {
                warnings.push(`Invalid latitude: ${lat} (index: ${index})`);
            }
            if (lon !== null && (typeof lon !== 'number' || lon < -180 || lon > 180)) {
                warnings.push(`Invalid longitude: ${lon} (index: ${index})`);
            }
        }

        // Rating validation
        if (program.program?.rating?.overall) {
            const rating = program.program.rating.overall;
            if (rating < 0 || rating > 5) {
                warnings.push(`Rating out of range (0-5): ${rating} (index: ${index})`);
            }
        }

        // Criteria validation
        if (program.program?.criteria) {
            Object.entries(program.program.criteria).forEach(([key, value]) => {
                if (value < 0 || value > 5) {
                    warnings.push(`Criteria ${key} out of range (0-5): ${value} (index: ${index})`);
                }
            });
        }

        return { 
            isValid: errors.length === 0, 
            errors, 
            warnings,
            programName: program.program?.name || `Unknown Program ${index}`
        };
    }

    static sanitizeString(str) {
        if (!str) return null;
        return str.trim().replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
    }

    static validateUrl(url) {
        if (!url) return null;
        try {
            new URL(url);
            return url;
        } catch {
            return null;
        }
    }

    static normalizeStatus(status) {
        const validStatuses = ['pending', 'considering', 'interested', 'applying', 'discarded'];
        return validStatuses.includes(status) ? status : 'pending';
    }

    static validateAndClampRating(rating, min = 0, max = 5) {
        if (rating === null || rating === undefined) return 0;
        const num = Number(rating);
        if (isNaN(num)) return 0;
        return Math.max(min, Math.min(max, Math.round(num)));
    }
}

// =====================================================
// TRANSFORMATION STRATEGIES (Strategy Pattern)
// =====================================================

class TransformationStrategy {
    transform(data, context = {}) {
        throw new Error('Transform method must be implemented by subclass');
    }
}

class CountryTransformationStrategy extends TransformationStrategy {
    transform(programs) {
        Logger.info('Transforming countries data...');
        const countries = new Map();
        
        programs.forEach((program, index) => {
            const country = program.city?.country;
            if (country && !countries.has(country)) {
                countries.set(country, {
                    name: DataValidator.sanitizeString(country),
                    name_es: country === 'Spain' ? 'España' : country
                });
            }
        });

        const result = Array.from(countries.values());
        Logger.success(`Extracted ${result.length} unique countries`);
        return result;
    }
}

class CityTransformationStrategy extends TransformationStrategy {
    transform(programs, countriesMap) {
        Logger.info('Transforming cities data...');
        const cities = new Map();
        
        programs.forEach((program, index) => {
            const cityData = program.city;
            if (!cityData?.name) return;

            const cityKey = `${cityData.name}_${cityData.country}`;
            if (cities.has(cityKey)) return;

            const countryId = countriesMap.get(cityData.country);
            if (!countryId) {
                Logger.warning(`Country not found for city: ${cityData.name}`);
                return;
            }

            cities.set(cityKey, {
                name: DataValidator.sanitizeString(cityData.name),
                country_id: countryId,
                latitude: cityData.coords?.lat || null,
                longitude: cityData.coords?.lon || null,
                madrid_distance_km: cityData.distances?.madrid_km || null
            });
        });

        const result = Array.from(cities.values());
        Logger.success(`Extracted ${result.length} unique cities`);
        return result;
    }
}

class UniversityTransformationStrategy extends TransformationStrategy {
    transform(programs, citiesMap) {
        Logger.info('Transforming universities data...');
        const universities = new Map();
        
        programs.forEach((program, index) => {
            const uniData = program.university;
            const cityData = program.city;
            
            if (!uniData?.name || !cityData?.name) return;

            const uniKey = `${uniData.name}_${cityData.name}_${cityData.country}`;
            if (universities.has(uniKey)) return;

            const cityId = citiesMap.get(`${cityData.name}_${cityData.country}`);
            if (!cityId) {
                Logger.warning(`City not found for university: ${uniData.name}`);
                return;
            }

            universities.set(uniKey, {
                name: DataValidator.sanitizeString(uniData.name),
                city_id: cityId,
                founded_year: uniData.founded_year || null,
                website: DataValidator.validateUrl(uniData.website)
            });
        });

        const result = Array.from(universities.values());
        Logger.success(`Extracted ${result.length} unique universities`);
        return result;
    }
}

class ProgramTransformationStrategy extends TransformationStrategy {
    transform(programs, universitiesMap, citiesMap) {
        Logger.info('Transforming programs data...');
        const transformedPrograms = [];
        
        programs.forEach((program, index) => {
            const progData = program.program;
            const uniData = program.university;
            const cityData = program.city;
            const aiData = program.ai_analysis;
            
            if (!progData?.name || !uniData?.name || !cityData?.name) {
                Logger.warning(`Skipping incomplete program at index ${index}`);
                return;
            }

            const uniKey = `${uniData.name}_${cityData.name}_${cityData.country}`;
            const universityId = universitiesMap.get(uniKey);
            
            if (!universityId) {
                Logger.warning(`University not found for program: ${progData.name}`);
                return;
            }

            // Convert research lines array to simple pipe-separated text
            let researchLinesText = '';
            if (Array.isArray(progData.research_lines)) {
                researchLinesText = progData.research_lines
                    .filter(line => line && typeof line === 'string')
                    .map(line => DataValidator.sanitizeString(line))
                    .join('|');
            }

            transformedPrograms.push({
                original_id: program._id,
                name: DataValidator.sanitizeString(progData.name),
                university_id: universityId,
                research_lines: researchLinesText,
                url: DataValidator.validateUrl(progData.url),
                status: DataValidator.normalizeStatus(progData.status),
                is_favorite: Boolean(progData.is_favorite),
                
                // Rating data
                overall_rating: DataValidator.validateAndClampRating(progData.rating?.overall),
                rating_date: progData.rating?.date,
                rating_comment: DataValidator.sanitizeString(progData.rating?.comment),
                
                // Criteria data
                personal_relevance: DataValidator.validateAndClampRating(progData.criteria?.personal_relevance),
                information_clarity: DataValidator.validateAndClampRating(progData.criteria?.information_clarity),
                research_environment: DataValidator.validateAndClampRating(progData.criteria?.research_environment),
                infrastructure: DataValidator.validateAndClampRating(progData.criteria?.infrastructure),
                training_activities: DataValidator.validateAndClampRating(progData.criteria?.training_activities),
                
                // AI analysis data
                program_summary: DataValidator.sanitizeString(aiData?.program_summary),
                ai_innovacion: DataValidator.validateAndClampRating(aiData?.program_metrics?.innovacion, 0, 10),
                ai_interdisciplinariedad: DataValidator.validateAndClampRating(aiData?.program_metrics?.interdisciplinariedad, 0, 10),
                ai_impacto: DataValidator.validateAndClampRating(aiData?.program_metrics?.impacto, 0, 10),
                ai_internacional: DataValidator.validateAndClampRating(aiData?.program_metrics?.internacional, 0, 10),
                ai_aplicabilidad: DataValidator.validateAndClampRating(aiData?.program_metrics?.aplicabilidad, 0, 10),
                
                // Timestamps
                created_date: program.created_date,
                updated_date: program.updated_date,
                
                originalIndex: index // Keep reference for related data
            });
        });

        Logger.success(`Transformed ${transformedPrograms.length} programs`);
        return transformedPrograms;
    }
}


// =====================================================
// MAIN DATA MIGRATOR CLASS
// =====================================================

class DataMigrator {
    constructor(dbPath) {
        this.dbConnection = new DatabaseConnection(dbPath);
        this.transformationResults = {};
        this.migrationReport = {
            startTime: null,
            endTime: null,
            totalRecords: 0,
            successfulMigrations: 0,
            errors: [],
            warnings: [],
            statistics: {}
        };
    }

    async migrate(sourceDataPath) {
        this.migrationReport.startTime = new Date();
        Logger.info('🚀 Starting data migration...');

        try {
            // Step 1: Load and validate source data
            const sourceData = await this.loadSourceData(sourceDataPath);
            
            // Step 2: Connect to database
            await this.dbConnection.connect();
            
            // Step 3: Initialize database schema
            await this.initializeSchema();
            
            // Step 4: Begin transaction
            await this.dbConnection.beginTransaction();
            
            // Step 5: Execute migration pipeline
            await this.executeMigrationPipeline(sourceData);
            
            // Step 6: Commit transaction
            await this.dbConnection.commit();
            
            // Step 7: Generate report
            this.generateMigrationReport();
            
            Logger.success('🎉 Data migration completed successfully!');
            
        } catch (error) {
            Logger.error('Migration failed, rolling back...');
            if (this.dbConnection.transactionActive) {
                await this.dbConnection.rollback();
            }
            this.migrationReport.errors.push(error.message);
            throw error;
        } finally {
            if (this.dbConnection.isConnected) {
                await this.dbConnection.disconnect();
            }
            this.migrationReport.endTime = new Date();
        }
    }

    async initializeSchema() {
        Logger.info('Initializing database schema...');
        
        const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            throw new MigrationError(`Schema file not found: ${schemaPath}`);
        }

        try {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await this.dbConnection.executeMultipleStatements(schemaSql);
            Logger.success('Database schema initialized successfully');
        } catch (error) {
            throw new MigrationError(`Failed to initialize schema: ${error.message}`);
        }
    }

    async loadSourceData(sourcePath) {
        Logger.info(`Loading source data from: ${sourcePath}`);
        
        if (!fs.existsSync(sourcePath)) {
            throw new MigrationError(`Source data file not found: ${sourcePath}`);
        }

        try {
            // Handle both .js and .json files
            if (sourcePath.endsWith('.js')) {
                // For ES6 modules, we need to use dynamic import
                const moduleUrl = `file://${path.resolve(sourcePath)}`;
                const module = await import(moduleUrl);
                return module.universidadesData || module.default;
            } else {
                const rawData = fs.readFileSync(sourcePath, 'utf8');
                return JSON.parse(rawData);
            }
        } catch (error) {
            throw new MigrationError(`Failed to load source data: ${error.message}`);
        }
    }

    async executeMigrationPipeline(sourceData) {
        Logger.info('Executing migration pipeline...');
        this.migrationReport.totalRecords = sourceData.length;

        // Step 1: Validate source data
        await this.validateSourceData(sourceData);

        // Step 2: Transform and migrate master entities
        const countriesMap = await this.migrateCountries(sourceData);
        const citiesMap = await this.migrateCities(sourceData, countriesMap);
        const universitiesMap = await this.migrateUniversities(sourceData, citiesMap);

        // Step 3: Migrate programs (includes all data now)
        const programsMap = await this.migratePrograms(sourceData, universitiesMap, citiesMap);

        // Step 4: Migrate city and university AI analysis data
        await this.migrateCityAndUniversityAIData(sourceData, universitiesMap, citiesMap);
    }

    async validateSourceData(sourceData) {
        Logger.info('Validating source data...');
        
        if (!Array.isArray(sourceData)) {
            throw new ValidationError('Source data must be an array');
        }

        let validCount = 0;
        let errorCount = 0;

        for (let i = 0; i < sourceData.length; i++) {
            const validation = DataValidator.validateProgram(sourceData[i], i);
            
            if (validation.isValid) {
                validCount++;
            } else {
                errorCount++;
                this.migrationReport.errors.push(...validation.errors);
            }
            
            this.migrationReport.warnings.push(...validation.warnings);
        }

        Logger.info(`Validation complete: ${validCount} valid, ${errorCount} invalid records`);
        
        if (errorCount > sourceData.length * 0.5) {
            throw new ValidationError(`Too many validation errors: ${errorCount} out of ${sourceData.length} records failed validation`);
        }
    }

    async migrateCountries(sourceData) {
        Logger.info('Migrating countries...');
        
        const strategy = new CountryTransformationStrategy();
        const countries = strategy.transform(sourceData);
        const countriesMap = new Map();

        for (const country of countries) {
            const result = await this.dbConnection.executeQuery(
                'INSERT INTO countries (name, name_es) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET name_es = excluded.name_es',
                [country.name, country.name_es]
            );
            
            // Get the country ID
            const countryRecord = await this.dbConnection.executeQuery(
                'SELECT id FROM countries WHERE name = ?',
                [country.name]
            );
            
            countriesMap.set(country.name, countryRecord[0].id);
        }

        this.migrationReport.statistics.countries = countries.length;
        Logger.success(`Migrated ${countries.length} countries`);
        return countriesMap;
    }

    async migrateCities(sourceData, countriesMap) {
        Logger.info('Migrating cities...');
        
        const strategy = new CityTransformationStrategy();
        const cities = strategy.transform(sourceData, countriesMap);
        const citiesMap = new Map();

        for (const city of cities) {
            const result = await this.dbConnection.executeQuery(
                `INSERT INTO cities (name, country_id, latitude, longitude, madrid_distance_km) 
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(name, country_id) DO UPDATE SET
                 latitude = excluded.latitude,
                 longitude = excluded.longitude,
                 madrid_distance_km = excluded.madrid_distance_km`,
                [city.name, city.country_id, city.latitude, city.longitude, city.madrid_distance_km]
            );

            // Get the city ID
            const cityRecord = await this.dbConnection.executeQuery(
                'SELECT id FROM cities WHERE name = ? AND country_id = ?',
                [city.name, city.country_id]
            );

            // Create composite key for lookup
            const countryName = Array.from(countriesMap.entries())
                .find(([name, id]) => id === city.country_id)?.[0];
            
            if (countryName) {
                citiesMap.set(`${city.name}_${countryName}`, cityRecord[0].id);
            }
        }

        this.migrationReport.statistics.cities = cities.length;
        Logger.success(`Migrated ${cities.length} cities`);
        return citiesMap;
    }

    async migrateUniversities(sourceData, citiesMap) {
        Logger.info('Migrating universities...');
        
        const strategy = new UniversityTransformationStrategy();
        const universities = strategy.transform(sourceData, citiesMap);
        const universitiesMap = new Map();

        for (const university of universities) {
            await this.dbConnection.executeQuery(
                `INSERT INTO universities (name, city_id, founded_year, website) 
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(name, city_id) DO UPDATE SET
                 founded_year = excluded.founded_year,
                 website = excluded.website`,
                [university.name, university.city_id, university.founded_year, university.website]
            );

            // Get the university ID
            const uniRecord = await this.dbConnection.executeQuery(
                'SELECT id FROM universities WHERE name = ? AND city_id = ?',
                [university.name, university.city_id]
            );

            // Create composite key for lookup - need to find city and country names
            const cityEntry = Array.from(citiesMap.entries())
                .find(([key, id]) => id === university.city_id);
            
            if (cityEntry) {
                const [cityCountryKey] = cityEntry;
                universitiesMap.set(`${university.name}_${cityCountryKey}`, uniRecord[0].id);
            }
        }

        this.migrationReport.statistics.universities = universities.length;
        Logger.success(`Migrated ${universities.length} universities`);
        return universitiesMap;
    }

    async migratePrograms(sourceData, universitiesMap, citiesMap) {
        Logger.info('Migrating programs...');
        
        const strategy = new ProgramTransformationStrategy();
        const programs = strategy.transform(sourceData, universitiesMap, citiesMap);
        const programsMap = new Map();

        for (const program of programs) {
            const result = await this.dbConnection.executeQuery(
                `INSERT INTO programs (
                    original_id, name, university_id, research_lines, url, status, is_favorite,
                    overall_rating, rating_date, rating_comment,
                    personal_relevance, information_clarity, research_environment, infrastructure, training_activities,
                    program_summary, ai_innovacion, ai_interdisciplinariedad, ai_impacto, ai_internacional, ai_aplicabilidad,
                    created_date, updated_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    program.original_id, program.name, program.university_id, program.research_lines, 
                    program.url, program.status, program.is_favorite,
                    program.overall_rating, program.rating_date, program.rating_comment,
                    program.personal_relevance, program.information_clarity, program.research_environment, 
                    program.infrastructure, program.training_activities,
                    program.program_summary, program.ai_innovacion, program.ai_interdisciplinariedad, 
                    program.ai_impacto, program.ai_internacional, program.ai_aplicabilidad,
                    program.created_date, program.updated_date
                ]
            );

            programsMap.set(program.originalIndex, result.lastID);
        }

        this.migrationReport.statistics.programs = programs.length;
        this.migrationReport.successfulMigrations = programs.length;
        Logger.success(`Migrated ${programs.length} programs`);
        return programsMap;
    }



    async migrateCityAndUniversityAIData(sourceData, universitiesMap, citiesMap) {
        Logger.info('Migrating city and university AI analysis data...');
        
        let universitySummariesCount = 0;
        let citySummariesCount = 0;
        const processedUniversities = new Set();
        const processedCities = new Set();

        for (let i = 0; i < sourceData.length; i++) {
            const program = sourceData[i];
            
            if (!program.ai_analysis) continue;

            const aiData = program.ai_analysis;

            // Migrate university summaries (avoid duplicates)
            const uniKey = `${program.university.name}_${program.city.name}_${program.city.country}`;
            const universityId = universitiesMap.get(uniKey);
            
            if (universityId && !processedUniversities.has(universityId) && aiData.university_summary) {
                await this.dbConnection.executeQuery(
                    `UPDATE universities SET university_summary = ? WHERE id = ?`,
                    [DataValidator.sanitizeString(aiData.university_summary), universityId]
                );
                processedUniversities.add(universityId);
                universitySummariesCount++;
            }

            // Migrate city analysis data (avoid duplicates)
            const cityKey = `${program.city.name}_${program.city.country}`;
            const cityId = citiesMap.get(cityKey);
            
            if (cityId && !processedCities.has(cityId)) {
                const cityData = program.city;
                
                await this.dbConnection.executeQuery(
                    `UPDATE cities SET 
                        cost_effectiveness = ?, medical_services = ?, transportation = ?, 
                        air_quality = ?, weather = ?, city_summary = ?,
                        ai_cost_of_living = ?, ai_medical_quality = ?, 
                        ai_transport_quality = ?, ai_air_quality = ?
                     WHERE id = ?`,
                    [
                        cityData.criteria?.cost_effectiveness || 0,
                        cityData.criteria?.medical_services || 0,
                        cityData.criteria?.transportation || 0,
                        cityData.criteria?.air_quality || 0,
                        cityData.criteria?.weather || 0,
                        DataValidator.sanitizeString(aiData.city_summary),
                        DataValidator.validateAndClampRating(aiData.city_metrics?.cost_of_living, 0, 10),
                        DataValidator.validateAndClampRating(aiData.city_metrics?.medical_quality, 0, 10),
                        DataValidator.validateAndClampRating(aiData.city_metrics?.transport_quality, 0, 10),
                        DataValidator.validateAndClampRating(aiData.city_metrics?.air_quality, 0, 10),
                        cityId
                    ]
                );
                processedCities.add(cityId);
                citySummariesCount++;
            }
        }

        this.migrationReport.statistics.aiUniversitySummaries = universitySummariesCount;
        this.migrationReport.statistics.aiCitySummaries = citySummariesCount;
        
        Logger.success(`Migrated AI analysis: ${universitySummariesCount} university summaries, ${citySummariesCount} city summaries`);
    }

    generateMigrationReport() {
        const duration = this.migrationReport.endTime - this.migrationReport.startTime;
        this.migrationReport.duration = duration;

        const report = {
            ...this.migrationReport,
            timestamp: new Date().toISOString(),
            durationMs: duration,
            durationFormatted: `${Math.round(duration / 1000)}s`
        };

        Logger.info('📊 Migration Report:', report);

        // Save report to file
        const reportPath = path.join(path.dirname(this.dbConnection.dbPath), 'migration-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        Logger.success(`Migration report saved: ${reportPath}`);
    }
}

// =====================================================
// COMMAND LINE INTERFACE
// =====================================================

async function main() {
    const args = process.argv.slice(2);
    const sourceDataPath = args[0] || path.join(__dirname, '..', 'data', 'universidades.js');
    const dbPath = args[1] || path.join(__dirname, '..', 'db', 'doctorate.sqlite');

    console.log('='.repeat(60));
    console.log('🔄 Doctorate Grading Data Migrator');
    console.log('='.repeat(60));

    try {
        const migrator = new DataMigrator(dbPath);
        await migrator.migrate(sourceDataPath);
        
        Logger.success('🎉 Data migration completed successfully!');
        process.exit(0);
        
    } catch (error) {
        Logger.error('💥 Data migration failed!');
        Logger.error(error.message);
        
        if (error.details) {
            Logger.debug('Error details:', error.details);
        }
        
        process.exit(1);
    }
}

// =====================================================
// MODULE EXPORTS FOR TESTING
// =====================================================

module.exports = {
    DataMigrator,
    DataValidator,
    CountryTransformationStrategy,
    CityTransformationStrategy,
    UniversityTransformationStrategy,
    ProgramTransformationStrategy
};

// Run CLI if this file is executed directly
if (require.main === module) {
    main();
}