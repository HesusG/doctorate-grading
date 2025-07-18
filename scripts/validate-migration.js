#!/usr/bin/env node

/**
 * =====================================================
 * Comprehensive Database Validation & Quality Assurance
 * Validates migrated data integrity, consistency, and performance
 * =====================================================
 */

const fs = require('fs');
const path = require('path');
const { DatabaseConnection, Logger, ValidationError } = require('./migration-framework.js');

// =====================================================
// VALIDATION RESULT CLASSES
// =====================================================

class ValidationResult {
    constructor(testName, passed = false, message = '', details = null) {
        this.testName = testName;
        this.passed = passed;
        this.message = message;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    static success(testName, message, details = null) {
        return new ValidationResult(testName, true, message, details);
    }

    static failure(testName, message, details = null) {
        return new ValidationResult(testName, false, message, details);
    }
}

class ValidationReport {
    constructor() {
        this.results = [];
        this.startTime = null;
        this.endTime = null;
        this.statistics = {
            totalTests: 0,
            passed: 0,
            failed: 0,
            warnings: 0
        };
    }

    addResult(result) {
        this.results.push(result);
        this.statistics.totalTests++;
        if (result.passed) {
            this.statistics.passed++;
        } else {
            this.statistics.failed++;
        }
    }

    addWarning(testName, message, details = null) {
        const warning = new ValidationResult(testName, true, `⚠️ WARNING: ${message}`, details);
        this.results.push(warning);
        this.statistics.warnings++;
    }

    getFailedTests() {
        return this.results.filter(r => !r.passed);
    }

    isValid() {
        return this.statistics.failed === 0;
    }

    getDuration() {
        return this.endTime - this.startTime;
    }
}

// =====================================================
// DATABASE VALIDATOR CLASS
// =====================================================

class DatabaseValidator {
    constructor(dbPath) {
        this.dbConnection = new DatabaseConnection(dbPath);
        this.report = new ValidationReport();
    }

    async validate() {
        this.report.startTime = new Date();
        Logger.info('🔍 Starting comprehensive database validation...');

        try {
            await this.dbConnection.connect();

            // Execute all validation tests
            await this.validateSchemaIntegrity();
            await this.validateReferentialIntegrity();
            await this.validateDataConsistency();
            await this.validateUniqueConstraints();
            await this.validateDataTypes();
            await this.validateBusinessRules();
            await this.validatePerformance();
            await this.validateEdgeCases();

            await this.dbConnection.disconnect();

        } catch (error) {
            this.report.addResult(ValidationResult.failure(
                'database_connection',
                `Failed to complete validation: ${error.message}`,
                { error: error.stack }
            ));
        } finally {
            this.report.endTime = new Date();
        }

        return this.generateValidationReport();
    }

    async validateSchemaIntegrity() {
        Logger.info('Validating schema integrity...');

        const requiredTables = [
            'countries', 'cities', 'universities', 'programs',
            'research_lines', 'program_research_lines',
            'program_ratings', 'program_criteria', 'city_criteria',
            'ai_program_metrics', 'ai_university_summaries', 'ai_city_summaries',
            'schema_versions', 'migration_log'
        ];

        for (const tableName of requiredTables) {
            try {
                const exists = await this.dbConnection.tableExists(tableName);
                if (exists) {
                    const tableInfo = await this.dbConnection.getTableInfo(tableName);
                    const columns = Array.isArray(tableInfo) ? tableInfo.map(c => c.name) : [];
                    this.report.addResult(ValidationResult.success(
                        `schema_table_${tableName}`,
                        `Table ${tableName} exists with ${tableInfo.length} columns`,
                        { columnCount: tableInfo.length, columns }
                    ));
                } else {
                    this.report.addResult(ValidationResult.failure(
                        `schema_table_${tableName}`,
                        `Required table ${tableName} is missing`
                    ));
                }
            } catch (error) {
                this.report.addResult(ValidationResult.failure(
                    `schema_table_${tableName}`,
                    `Failed to check table ${tableName}: ${error.message}`
                ));
            }
        }

        // Validate indexes
        await this.validateIndexes();
        
        // Validate triggers
        await this.validateTriggers();
    }

    async validateIndexes() {
        Logger.info('Validating database indexes...');

        const expectedIndexes = [
            'idx_programs_university_id',
            'idx_programs_status',
            'idx_programs_is_favorite',
            'idx_programs_name',
            'idx_universities_city_id',
            'idx_universities_name',
            'idx_cities_country_id',
            'idx_cities_name',
            'idx_program_ratings_overall_rating',
            'idx_program_ratings_program_id'
        ];

        try {
            const indexes = await this.dbConnection.executeQuery(
                "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
            );
            const indexNames = indexes.map(idx => idx.name);

            for (const expectedIndex of expectedIndexes) {
                if (indexNames.includes(expectedIndex)) {
                    this.report.addResult(ValidationResult.success(
                        `index_${expectedIndex}`,
                        `Index ${expectedIndex} exists`
                    ));
                } else {
                    this.report.addWarning(
                        `index_${expectedIndex}`,
                        `Performance index ${expectedIndex} is missing`
                    );
                }
            }

        } catch (error) {
            this.report.addResult(ValidationResult.failure(
                'indexes_validation',
                `Failed to validate indexes: ${error.message}`
            ));
        }
    }

    async validateTriggers() {
        Logger.info('Validating database triggers...');

        const expectedTriggers = [
            'update_programs_timestamp',
            'update_universities_timestamp',
            'update_cities_timestamp',
            'update_countries_timestamp'
        ];

        try {
            const triggers = await this.dbConnection.executeQuery(
                "SELECT name FROM sqlite_master WHERE type='trigger'"
            );
            const triggerNames = triggers.map(t => t.name);

            for (const expectedTrigger of expectedTriggers) {
                if (triggerNames.includes(expectedTrigger)) {
                    this.report.addResult(ValidationResult.success(
                        `trigger_${expectedTrigger}`,
                        `Trigger ${expectedTrigger} exists`
                    ));
                } else {
                    this.report.addWarning(
                        `trigger_${expectedTrigger}`,
                        `Timestamp trigger ${expectedTrigger} is missing`
                    );
                }
            }

        } catch (error) {
            this.report.addResult(ValidationResult.failure(
                'triggers_validation',
                `Failed to validate triggers: ${error.message}`
            ));
        }
    }

    async validateReferentialIntegrity() {
        Logger.info('Validating referential integrity...');

        const referentialChecks = [
            {
                name: 'cities_country_fk',
                query: `SELECT COUNT(*) as orphans FROM cities c 
                       LEFT JOIN countries co ON c.country_id = co.id 
                       WHERE co.id IS NULL`,
                description: 'Cities without valid country references'
            },
            {
                name: 'universities_city_fk',
                query: `SELECT COUNT(*) as orphans FROM universities u 
                       LEFT JOIN cities c ON u.city_id = c.id 
                       WHERE c.id IS NULL`,
                description: 'Universities without valid city references'
            },
            {
                name: 'programs_university_fk',
                query: `SELECT COUNT(*) as orphans FROM programs p 
                       LEFT JOIN universities u ON p.university_id = u.id 
                       WHERE u.id IS NULL`,
                description: 'Programs without valid university references'
            },
            {
                name: 'program_ratings_fk',
                query: `SELECT COUNT(*) as orphans FROM program_ratings pr 
                       LEFT JOIN programs p ON pr.program_id = p.id 
                       WHERE p.id IS NULL`,
                description: 'Ratings without valid program references'
            },
            {
                name: 'program_criteria_fk',
                query: `SELECT COUNT(*) as orphans FROM program_criteria pc 
                       LEFT JOIN programs p ON pc.program_id = p.id 
                       WHERE p.id IS NULL`,
                description: 'Criteria without valid program references'
            },
            {
                name: 'program_research_lines_fk',
                query: `SELECT COUNT(*) as orphans FROM program_research_lines prl 
                       LEFT JOIN programs p ON prl.program_id = p.id 
                       LEFT JOIN research_lines rl ON prl.research_line_id = rl.id
                       WHERE p.id IS NULL OR rl.id IS NULL`,
                description: 'Research line relationships with invalid references'
            }
        ];

        for (const check of referentialChecks) {
            try {
                const result = await this.dbConnection.executeQuery(check.query);
                const orphanCount = result[0].orphans;

                if (orphanCount === 0) {
                    this.report.addResult(ValidationResult.success(
                        check.name,
                        `No referential integrity violations found: ${check.description}`,
                        { orphanCount }
                    ));
                } else {
                    this.report.addResult(ValidationResult.failure(
                        check.name,
                        `Found ${orphanCount} referential integrity violations: ${check.description}`,
                        { orphanCount }
                    ));
                }
            } catch (error) {
                this.report.addResult(ValidationResult.failure(
                    check.name,
                    `Failed to check referential integrity: ${error.message}`
                ));
            }
        }
    }

    async validateDataConsistency() {
        Logger.info('Validating data consistency...');

        const consistencyChecks = [
            {
                name: 'duplicate_programs',
                query: `SELECT name, university_id, COUNT(*) as count 
                       FROM programs 
                       GROUP BY name, university_id 
                       HAVING COUNT(*) > 1`,
                description: 'Duplicate programs in same university'
            },
            {
                name: 'duplicate_universities',
                query: `SELECT name, city_id, COUNT(*) as count 
                       FROM universities 
                       GROUP BY name, city_id 
                       HAVING COUNT(*) > 1`,
                description: 'Duplicate universities in same city'
            },
            {
                name: 'invalid_coordinates',
                query: `SELECT COUNT(*) as count FROM cities 
                       WHERE (latitude IS NOT NULL AND (latitude < -90 OR latitude > 90))
                          OR (longitude IS NOT NULL AND (longitude < -180 OR longitude > 180))`,
                description: 'Cities with invalid coordinates'
            },
            {
                name: 'invalid_ratings',
                query: `SELECT COUNT(*) as count FROM program_ratings 
                       WHERE overall_rating < 0 OR overall_rating > 5`,
                description: 'Ratings outside valid range (0-5)'
            },
            {
                name: 'invalid_criteria',
                query: `SELECT COUNT(*) as count FROM program_criteria 
                       WHERE personal_relevance < 0 OR personal_relevance > 5
                          OR information_clarity < 0 OR information_clarity > 5
                          OR research_environment < 0 OR research_environment > 5
                          OR infrastructure < 0 OR infrastructure > 5
                          OR training_activities < 0 OR training_activities > 5`,
                description: 'Criteria values outside valid range (0-5)'
            },
            {
                name: 'invalid_ai_metrics',
                query: `SELECT COUNT(*) as count FROM ai_program_metrics 
                       WHERE innovacion < 0 OR innovacion > 10
                          OR interdisciplinariedad < 0 OR interdisciplinariedad > 10
                          OR impacto < 0 OR impacto > 10
                          OR internacional < 0 OR internacional > 10
                          OR aplicabilidad < 0 OR aplicabilidad > 10`,
                description: 'AI metrics outside valid range (0-10)'
            }
        ];

        for (const check of consistencyChecks) {
            try {
                const result = await this.dbConnection.executeQuery(check.query);
                
                if (check.name === 'duplicate_programs' || check.name === 'duplicate_universities') {
                    if (result.length === 0) {
                        this.report.addResult(ValidationResult.success(
                            check.name,
                            `No duplicates found: ${check.description}`
                        ));
                    } else {
                        this.report.addResult(ValidationResult.failure(
                            check.name,
                            `Found ${result.length} sets of duplicates: ${check.description}`,
                            { duplicates: result }
                        ));
                    }
                } else {
                    const invalidCount = result[0].count;
                    if (invalidCount === 0) {
                        this.report.addResult(ValidationResult.success(
                            check.name,
                            `No data inconsistencies found: ${check.description}`
                        ));
                    } else {
                        this.report.addResult(ValidationResult.failure(
                            check.name,
                            `Found ${invalidCount} inconsistent records: ${check.description}`,
                            { invalidCount }
                        ));
                    }
                }
            } catch (error) {
                this.report.addResult(ValidationResult.failure(
                    check.name,
                    `Failed to check data consistency: ${error.message}`
                ));
            }
        }
    }

    async validateUniqueConstraints() {
        Logger.info('Validating unique constraints...');

        const uniqueChecks = [
            {
                name: 'unique_countries',
                query: 'SELECT name, COUNT(*) as count FROM countries GROUP BY name HAVING COUNT(*) > 1',
                description: 'Duplicate country names'
            },
            {
                name: 'unique_research_lines',
                query: 'SELECT line_text, COUNT(*) as count FROM research_lines GROUP BY line_text HAVING COUNT(*) > 1',
                description: 'Duplicate research lines'
            }
        ];

        for (const check of uniqueChecks) {
            try {
                const result = await this.dbConnection.executeQuery(check.query);
                
                if (result.length === 0) {
                    this.report.addResult(ValidationResult.success(
                        check.name,
                        `Unique constraints satisfied: ${check.description}`
                    ));
                } else {
                    this.report.addResult(ValidationResult.failure(
                        check.name,
                        `Found ${result.length} unique constraint violations: ${check.description}`,
                        { violations: result }
                    ));
                }
            } catch (error) {
                this.report.addResult(ValidationResult.failure(
                    check.name,
                    `Failed to check unique constraints: ${error.message}`
                ));
            }
        }
    }

    async validateDataTypes() {
        Logger.info('Validating data types...');

        const typeChecks = [
            {
                name: 'boolean_is_favorite',
                query: "SELECT COUNT(*) as count FROM programs WHERE is_favorite NOT IN (0, 1)",
                description: 'Invalid boolean values in is_favorite field'
            },
            {
                name: 'valid_status_enum',
                query: "SELECT COUNT(*) as count FROM programs WHERE status NOT IN ('pending', 'considering', 'interested', 'applying', 'discarded')",
                description: 'Invalid status enum values'
            },
            {
                name: 'valid_urls',
                query: "SELECT COUNT(*) as count FROM programs WHERE url IS NOT NULL AND url != '' AND url NOT LIKE 'http%'",
                description: 'Invalid URL formats'
            }
        ];

        for (const check of typeChecks) {
            try {
                const result = await this.dbConnection.executeQuery(check.query);
                const invalidCount = result[0].count;

                if (invalidCount === 0) {
                    this.report.addResult(ValidationResult.success(
                        check.name,
                        `Data types are valid: ${check.description}`
                    ));
                } else {
                    this.report.addResult(ValidationResult.failure(
                        check.name,
                        `Found ${invalidCount} invalid data types: ${check.description}`,
                        { invalidCount }
                    ));
                }
            } catch (error) {
                this.report.addResult(ValidationResult.failure(
                    check.name,
                    `Failed to validate data types: ${error.message}`
                ));
            }
        }
    }

    async validateBusinessRules() {
        Logger.info('Validating business rules...');

        const businessRules = [
            {
                name: 'programs_have_universities',
                query: 'SELECT COUNT(*) as count FROM programs',
                minExpected: 1,
                description: 'Database should contain at least one program'
            },
            {
                name: 'universities_have_cities',
                query: 'SELECT COUNT(*) as count FROM universities',
                minExpected: 1,
                description: 'Database should contain at least one university'
            },
            {
                name: 'countries_exist',
                query: 'SELECT COUNT(*) as count FROM countries',
                minExpected: 1,
                description: 'Database should contain at least one country'
            },
            {
                name: 'research_lines_linked',
                query: `SELECT COUNT(*) as count FROM research_lines rl 
                       WHERE EXISTS (SELECT 1 FROM program_research_lines prl WHERE prl.research_line_id = rl.id)`,
                description: 'Research lines should be linked to programs'
            }
        ];

        for (const rule of businessRules) {
            try {
                const result = await this.dbConnection.executeQuery(rule.query);
                const count = result[0].count;

                if (rule.minExpected && count >= rule.minExpected) {
                    this.report.addResult(ValidationResult.success(
                        rule.name,
                        `Business rule satisfied: ${rule.description} (found ${count})`,
                        { count }
                    ));
                } else if (!rule.minExpected && count > 0) {
                    this.report.addResult(ValidationResult.success(
                        rule.name,
                        `Business rule satisfied: ${rule.description} (found ${count})`,
                        { count }
                    ));
                } else {
                    this.report.addResult(ValidationResult.failure(
                        rule.name,
                        `Business rule violated: ${rule.description} (found ${count})`,
                        { count, expected: rule.minExpected }
                    ));
                }
            } catch (error) {
                this.report.addResult(ValidationResult.failure(
                    rule.name,
                    `Failed to validate business rule: ${error.message}`
                ));
            }
        }
    }

    async validatePerformance() {
        Logger.info('Validating query performance...');

        const performanceTests = [
            {
                name: 'complex_join_performance',
                query: `SELECT p.name, u.name as university, c.name as city, co.name_es as country 
                       FROM programs p 
                       JOIN universities u ON p.university_id = u.id 
                       JOIN cities c ON u.city_id = c.id 
                       JOIN countries co ON c.country_id = co.id 
                       LIMIT 100`,
                maxTimeMs: 1000,
                description: 'Complex join query performance'
            },
            {
                name: 'filtered_search_performance',
                query: `SELECT p.* FROM programs p 
                       JOIN universities u ON p.university_id = u.id 
                       WHERE p.status = 'interested' AND u.name LIKE '%Universidad%'`,
                maxTimeMs: 500,
                description: 'Filtered search performance'
            },
            {
                name: 'aggregation_performance',
                query: `SELECT c.name, COUNT(p.id) as program_count 
                       FROM cities c 
                       JOIN universities u ON c.id = u.city_id 
                       JOIN programs p ON u.id = p.university_id 
                       GROUP BY c.id, c.name 
                       ORDER BY program_count DESC`,
                maxTimeMs: 800,
                description: 'Aggregation query performance'
            }
        ];

        for (const test of performanceTests) {
            try {
                const startTime = Date.now();
                const result = await this.dbConnection.executeQuery(test.query);
                const executionTime = Date.now() - startTime;

                if (executionTime <= test.maxTimeMs) {
                    this.report.addResult(ValidationResult.success(
                        test.name,
                        `${test.description} completed in ${executionTime}ms (threshold: ${test.maxTimeMs}ms)`,
                        { executionTime, resultCount: result.length }
                    ));
                } else {
                    this.report.addWarning(
                        test.name,
                        `${test.description} took ${executionTime}ms (exceeds ${test.maxTimeMs}ms threshold)`,
                        { executionTime, resultCount: result.length }
                    );
                }
            } catch (error) {
                this.report.addResult(ValidationResult.failure(
                    test.name,
                    `Performance test failed: ${error.message}`
                ));
            }
        }
    }

    async validateEdgeCases() {
        Logger.info('Validating edge cases...');

        const edgeCaseTests = [
            {
                name: 'empty_strings',
                query: "SELECT COUNT(*) as count FROM programs WHERE name = '' OR name IS NULL",
                description: 'Programs with empty or null names'
            },
            {
                name: 'special_characters',
                query: "SELECT COUNT(*) as count FROM programs WHERE name LIKE '%[<>\"&]%'",
                description: 'Programs with potentially problematic characters'
            },
            {
                name: 'very_long_names',
                query: "SELECT COUNT(*) as count FROM programs WHERE LENGTH(name) > 200",
                description: 'Programs with unusually long names'
            },
            {
                name: 'orphaned_ratings',
                query: `SELECT COUNT(*) as count FROM program_ratings pr 
                       WHERE NOT EXISTS (SELECT 1 FROM programs p WHERE p.id = pr.program_id)`,
                description: 'Ratings without corresponding programs'
            }
        ];

        for (const test of edgeCaseTests) {
            try {
                const result = await this.dbConnection.executeQuery(test.query);
                const count = result[0].count;

                if (count === 0) {
                    this.report.addResult(ValidationResult.success(
                        test.name,
                        `No edge case violations found: ${test.description}`
                    ));
                } else {
                    this.report.addWarning(
                        test.name,
                        `Found ${count} potential edge case issues: ${test.description}`,
                        { count }
                    );
                }
            } catch (error) {
                this.report.addResult(ValidationResult.failure(
                    test.name,
                    `Failed to check edge case: ${error.message}`
                ));
            }
        }
    }

    generateValidationReport() {
        const duration = this.report.getDuration();
        
        Logger.info('📊 Generating validation report...');
        
        // Log summary
        const { totalTests, passed, failed, warnings } = this.report.statistics;
        Logger.info(`Validation Summary: ${passed}/${totalTests} passed, ${failed} failed, ${warnings} warnings`);
        
        if (failed > 0) {
            Logger.error('❌ Validation FAILED - Critical issues found:');
            this.report.getFailedTests().forEach(test => {
                Logger.error(`  - ${test.testName}: ${test.message}`);
            });
        } else {
            Logger.success('✅ Validation PASSED - All critical tests successful');
        }

        if (warnings > 0) {
            Logger.warning(`⚠️ ${warnings} warnings found - review recommended`);
        }

        // Create detailed report
        const detailedReport = {
            summary: {
                isValid: this.report.isValid(),
                totalTests,
                passed,
                failed,
                warnings,
                duration: `${Math.round(duration / 1000)}s`,
                timestamp: new Date().toISOString()
            },
            testResults: this.report.results,
            failedTests: this.report.getFailedTests(),
            recommendations: this.generateRecommendations()
        };

        // Save report to file
        const reportPath = path.join(path.dirname(this.dbConnection.dbPath), 'validation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
        Logger.success(`Detailed validation report saved: ${reportPath}`);

        return detailedReport;
    }

    generateRecommendations() {
        const recommendations = [];
        const failedTests = this.report.getFailedTests();

        if (failedTests.some(t => t.testName.includes('referential'))) {
            recommendations.push('Fix referential integrity violations before proceeding with production use');
        }

        if (failedTests.some(t => t.testName.includes('duplicate'))) {
            recommendations.push('Remove duplicate records to ensure data consistency');
        }

        if (failedTests.some(t => t.testName.includes('invalid'))) {
            recommendations.push('Clean invalid data values that violate business rules');
        }

        if (this.report.statistics.warnings > 0) {
            recommendations.push('Review warnings for potential data quality improvements');
        }

        if (recommendations.length === 0) {
            recommendations.push('Database validation passed - ready for production use');
        }

        return recommendations;
    }
}

// =====================================================
// COMMAND LINE INTERFACE
// =====================================================

async function main() {
    const args = process.argv.slice(2);
    const dbPath = args[0] || path.join(__dirname, '..', 'db', 'doctorate.sqlite');

    console.log('='.repeat(60));
    console.log('🔍 Doctorate Grading Database Validator');
    console.log('='.repeat(60));

    try {
        const validator = new DatabaseValidator(dbPath);
        const report = await validator.validate();
        
        if (report.summary.isValid) {
            Logger.success('🎉 Database validation completed successfully!');
            process.exit(0);
        } else {
            Logger.error('💥 Database validation failed!');
            Logger.error(`${report.summary.failed} critical issues found`);
            process.exit(1);
        }
        
    } catch (error) {
        Logger.error('💥 Validation process failed!');
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
    DatabaseValidator,
    ValidationResult,
    ValidationReport
};

// Run CLI if this file is executed directly
if (require.main === module) {
    main();
}