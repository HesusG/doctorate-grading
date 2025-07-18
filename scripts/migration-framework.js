#!/usr/bin/env node

/**
 * =====================================================
 * Professional Database Migration Framework
 * Object-Oriented Design with SOLID Principles
 * =====================================================
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// =====================================================
// CUSTOM ERROR CLASSES
// =====================================================

class MigrationError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'MigrationError';
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

class ValidationError extends Error {
    constructor(message, validationResults = []) {
        super(message);
        this.name = 'ValidationError';
        this.validationResults = validationResults;
        this.timestamp = new Date().toISOString();
    }
}

class DatabaseConnectionError extends Error {
    constructor(message, dbPath = null) {
        super(message);
        this.name = 'DatabaseConnectionError';
        this.dbPath = dbPath;
        this.timestamp = new Date().toISOString();
    }
}

// =====================================================
// LOGGING UTILITIES
// =====================================================

class Logger {
    static log(level, message, details = null) {
        const timestamp = new Date().toISOString();
        const emoji = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'debug': '🐛'
        };
        
        console.log(`${emoji[level] || '📝'} [${timestamp}] ${level.toUpperCase()}: ${message}`);
        if (details) {
            console.log('   Details:', JSON.stringify(details, null, 2));
        }
    }

    static info(message, details) { this.log('info', message, details); }
    static success(message, details) { this.log('success', message, details); }
    static warning(message, details) { this.log('warning', message, details); }
    static error(message, details) { this.log('error', message, details); }
    static debug(message, details) { this.log('debug', message, details); }
}

// =====================================================
// DATABASE CONNECTION MANAGER
// =====================================================

class DatabaseConnection {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
        this.isConnected = false;
        this.transactionActive = false;
        this.connectionConfig = {
            mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
            verbose: process.env.NODE_ENV === 'development'
        };
    }

    async connect() {
        try {
            Logger.info(`Connecting to database: ${this.dbPath}`);
            
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
                Logger.info(`Created database directory: ${dbDir}`);
            }

            return new Promise((resolve, reject) => {
                this.db = new sqlite3.Database(this.dbPath, this.connectionConfig.mode, (err) => {
                    if (err) {
                        reject(new DatabaseConnectionError(`Failed to connect to database: ${err.message}`, this.dbPath));
                    } else {
                        this.isConnected = true;
                        Logger.success(`Connected to SQLite database: ${this.dbPath}`);
                        
                        // Enable foreign key constraints
                        this.db.run('PRAGMA foreign_keys = ON;', (err) => {
                            if (err) {
                                Logger.warning('Failed to enable foreign key constraints', err);
                            } else {
                                Logger.info('Foreign key constraints enabled');
                            }
                            resolve();
                        });
                    }
                });
            });
        } catch (error) {
            throw new DatabaseConnectionError(`Connection failed: ${error.message}`, this.dbPath);
        }
    }

    async disconnect() {
        if (!this.db || !this.isConnected) {
            Logger.warning('Database not connected or already disconnected');
            return;
        }

        try {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        reject(new DatabaseConnectionError(`Failed to close database: ${err.message}`));
                    } else {
                        this.isConnected = false;
                        this.transactionActive = false;
                        Logger.success('Database connection closed');
                        resolve();
                    }
                });
            });
        } catch (error) {
            throw new DatabaseConnectionError(`Disconnect failed: ${error.message}`);
        }
    }

    async executeQuery(sql, params = []) {
        if (!this.isConnected) {
            throw new DatabaseConnectionError('Database not connected');
        }

        Logger.debug('Executing query', { sql: sql.substring(0, 100) + '...', paramCount: params.length });

        return new Promise((resolve, reject) => {
            if (sql.trim().toLowerCase().startsWith('select')) {
                this.db.all(sql, params, (err, rows) => {
                    if (err) {
                        Logger.error('Query execution failed', { sql, error: err.message });
                        reject(new MigrationError(`Query failed: ${err.message}`, { sql, params }));
                    } else {
                        Logger.debug(`Query returned ${rows.length} rows`);
                        resolve(rows);
                    }
                });
            } else {
                this.db.run(sql, params, function(err) {
                    if (err) {
                        Logger.error('Query execution failed', { sql, error: err.message });
                        reject(new MigrationError(`Query failed: ${err.message}`, { sql, params }));
                    } else {
                        Logger.debug(`Query executed successfully. Changes: ${this.changes}, Last ID: ${this.lastID}`);
                        resolve({ changes: this.changes, lastID: this.lastID });
                    }
                });
            }
        });
    }

    async executeMultipleStatements(sql) {
        if (!this.isConnected) {
            throw new DatabaseConnectionError('Database not connected');
        }

        Logger.debug('Executing multiple statements', { sqlLength: sql.length });

        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) {
                    Logger.error('Multiple statements execution failed', { error: err.message });
                    reject(new MigrationError(`Multiple statements failed: ${err.message}`, { sql }));
                } else {
                    Logger.debug('Multiple statements executed successfully');
                    resolve({ success: true });
                }
            });
        });
    }

    async beginTransaction() {
        if (this.transactionActive) {
            Logger.warning('Transaction already active');
            return;
        }

        try {
            await this.executeQuery('BEGIN TRANSACTION');
            this.transactionActive = true;
            Logger.info('Transaction started');
        } catch (error) {
            throw new MigrationError(`Failed to start transaction: ${error.message}`);
        }
    }

    async commit() {
        if (!this.transactionActive) {
            Logger.warning('No active transaction to commit');
            return;
        }

        try {
            await this.executeQuery('COMMIT');
            this.transactionActive = false;
            Logger.success('Transaction committed');
        } catch (error) {
            throw new MigrationError(`Failed to commit transaction: ${error.message}`);
        }
    }

    async rollback() {
        if (!this.transactionActive) {
            Logger.warning('No active transaction to rollback');
            return;
        }

        try {
            await this.executeQuery('ROLLBACK');
            this.transactionActive = false;
            Logger.warning('Transaction rolled back');
        } catch (error) {
            throw new MigrationError(`Failed to rollback transaction: ${error.message}`);
        }
    }

    async getTableInfo(tableName) {
        const result = await this.executeQuery(`PRAGMA table_info(${tableName})`);
        return result;
    }

    async tableExists(tableName) {
        const result = await this.executeQuery(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            [tableName]
        );
        return result.length > 0;
    }
}

// =====================================================
// MIGRATION CLASS
// =====================================================

class Migration {
    constructor(name, upSql, downSql = null, description = '') {
        this.name = name;
        this.upSql = upSql;
        this.downSql = downSql;
        this.description = description;
        this.timestamp = new Date().toISOString();
        this.executionTime = 0;
    }

    async execute(dbConnection) {
        const startTime = Date.now();
        Logger.info(`Executing migration: ${this.name}`);
        
        try {
            if (Array.isArray(this.upSql)) {
                // Execute multiple SQL statements
                for (const sql of this.upSql) {
                    await dbConnection.executeQuery(sql);
                }
            } else {
                // Check if SQL contains multiple statements (indicated by semicolons)
                if (this.upSql.split(';').filter(s => s.trim()).length > 1) {
                    await dbConnection.executeMultipleStatements(this.upSql);
                } else {
                    await dbConnection.executeQuery(this.upSql);
                }
            }
            
            this.executionTime = Date.now() - startTime;
            Logger.success(`Migration completed: ${this.name} (${this.executionTime}ms)`);
            
            // Log migration to database
            await this.logMigration(dbConnection, 'success');
            
        } catch (error) {
            this.executionTime = Date.now() - startTime;
            await this.logMigration(dbConnection, 'failed', error.message);
            throw new MigrationError(`Migration failed: ${this.name} - ${error.message}`, {
                migration: this.name,
                executionTime: this.executionTime
            });
        }
    }

    async rollback(dbConnection) {
        if (!this.downSql) {
            throw new MigrationError(`No rollback SQL defined for migration: ${this.name}`);
        }

        Logger.warning(`Rolling back migration: ${this.name}`);
        
        try {
            if (Array.isArray(this.downSql)) {
                for (const sql of this.downSql) {
                    await dbConnection.executeQuery(sql);
                }
            } else {
                await dbConnection.executeQuery(this.downSql);
            }
            
            await this.logMigration(dbConnection, 'rolled_back');
            Logger.success(`Migration rolled back: ${this.name}`);
            
        } catch (error) {
            throw new MigrationError(`Rollback failed: ${this.name} - ${error.message}`);
        }
    }

    async logMigration(dbConnection, status, errorMessage = null) {
        try {
            // Check if migration_log table exists first
            const tableExists = await dbConnection.tableExists('migration_log');
            if (!tableExists) {
                Logger.debug('Migration log table does not exist yet, skipping log entry');
                return;
            }

            await dbConnection.executeQuery(
                `INSERT INTO migration_log (migration_name, execution_time_ms, status, error_message) 
                 VALUES (?, ?, ?, ?)`,
                [this.name, this.executionTime, status, errorMessage]
            );
        } catch (error) {
            Logger.warning(`Failed to log migration: ${error.message}`);
        }
    }
}

// =====================================================
// SCHEMA MANAGER
// =====================================================

class SchemaManager {
    constructor(dbConnection) {
        this.db = dbConnection;
        this.migrations = [];
        this.migrationHistory = [];
    }

    addMigration(migration) {
        if (!(migration instanceof Migration)) {
            throw new ValidationError('Invalid migration object provided');
        }
        this.migrations.push(migration);
        Logger.debug(`Added migration: ${migration.name}`);
    }

    async loadMigrationHistory() {
        try {
            const historyExists = await this.db.tableExists('migration_log');
            if (!historyExists) {
                Logger.info('No migration history found (first run)');
                return;
            }

            this.migrationHistory = await this.db.executeQuery(
                "SELECT * FROM migration_log WHERE status = 'success' ORDER BY executed_at"
            );
            Logger.info(`Loaded ${this.migrationHistory.length} completed migrations`);
        } catch (error) {
            Logger.warning(`Failed to load migration history: ${error.message}`);
        }
    }

    hasMigrationBeenExecuted(migrationName) {
        return this.migrationHistory.some(record => record.migration_name === migrationName);
    }

    async executeMigrations() {
        if (this.migrations.length === 0) {
            Logger.warning('No migrations to execute');
            return;
        }

        Logger.info(`Starting execution of ${this.migrations.length} migrations`);
        await this.loadMigrationHistory();

        let executedCount = 0;
        let skippedCount = 0;

        await this.db.beginTransaction();
        
        try {
            for (const migration of this.migrations) {
                if (this.hasMigrationBeenExecuted(migration.name)) {
                    Logger.info(`Skipping already executed migration: ${migration.name}`);
                    skippedCount++;
                    continue;
                }

                await migration.execute(this.db);
                executedCount++;
            }

            await this.db.commit();
            
            Logger.success(`Migration execution completed successfully!`);
            Logger.info(`Executed: ${executedCount}, Skipped: ${skippedCount}, Total: ${this.migrations.length}`);
            
        } catch (error) {
            Logger.error('Migration execution failed, rolling back transaction');
            await this.db.rollback();
            throw error;
        }
    }

    async validateSchema() {
        Logger.info('Validating database schema...');
        
        const requiredTables = [
            'countries', 'cities', 'universities', 'programs',
            'research_lines', 'program_research_lines',
            'program_ratings', 'program_criteria', 'city_criteria',
            'ai_program_metrics', 'ai_university_summaries', 'ai_city_summaries',
            'schema_versions', 'migration_log'
        ];

        const validationResults = [];

        for (const tableName of requiredTables) {
            const exists = await this.db.tableExists(tableName);
            validationResults.push({
                table: tableName,
                exists: exists,
                status: exists ? 'OK' : 'MISSING'
            });

            if (exists) {
                const tableInfo = await this.db.getTableInfo(tableName);
                Logger.debug(`Table ${tableName}: ${tableInfo.length} columns`);
            }
        }

        const missingTables = validationResults.filter(r => !r.exists);
        
        if (missingTables.length > 0) {
            throw new ValidationError('Schema validation failed', validationResults);
        }

        Logger.success('Schema validation passed - all required tables exist');
        return validationResults;
    }
}

// =====================================================
// DATABASE INITIALIZER (Main Orchestrator)
// =====================================================

class DatabaseInitializer {
    constructor(dbPath, schemaPath) {
        this.dbPath = dbPath;
        this.schemaPath = schemaPath;
        this.dbConnection = new DatabaseConnection(dbPath);
        this.schemaManager = new SchemaManager(this.dbConnection);
        this.initializationReport = {
            startTime: null,
            endTime: null,
            duration: 0,
            migrationsExecuted: 0,
            errors: [],
            success: false
        };
    }

    async initialize() {
        this.initializationReport.startTime = new Date();
        Logger.info('🚀 Starting database initialization...');

        try {
            // Step 1: Connect to database
            await this.dbConnection.connect();

            // Step 2: Load and setup migrations
            await this.setupMigrations();

            // Step 3: Execute migrations
            await this.schemaManager.executeMigrations();

            // Step 4: Validate schema
            await this.schemaManager.validateSchema();

            // Step 5: Disconnect
            await this.dbConnection.disconnect();

            this.initializationReport.success = true;
            this.generateInitializationReport();

        } catch (error) {
            this.initializationReport.errors.push(error);
            Logger.error('Database initialization failed', error);
            
            // Ensure we disconnect even on failure
            if (this.dbConnection.isConnected) {
                await this.dbConnection.disconnect();
            }
            
            throw error;
        } finally {
            this.initializationReport.endTime = new Date();
            this.initializationReport.duration = 
                this.initializationReport.endTime - this.initializationReport.startTime;
        }
    }

    async setupMigrations() {
        Logger.info('Setting up database migrations...');

        if (!fs.existsSync(this.schemaPath)) {
            throw new MigrationError(`Schema file not found: ${this.schemaPath}`);
        }

        // Read and parse schema file
        const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
        const schemaMigration = new Migration(
            '001_create_initial_schema',
            schemaContent,
            null,  // No rollback for initial schema
            'Create initial normalized database schema'
        );

        this.schemaManager.addMigration(schemaMigration);
        Logger.success('Schema migration loaded successfully');
    }

    generateInitializationReport() {
        const report = {
            ...this.initializationReport,
            database: this.dbPath,
            schema: this.schemaPath,
            timestamp: new Date().toISOString()
        };

        Logger.info('📊 Database Initialization Report:', report);

        // Save report to file
        const reportPath = path.join(path.dirname(this.dbPath), 'initialization-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        Logger.success(`Initialization report saved: ${reportPath}`);
    }
}

// =====================================================
// COMMAND LINE INTERFACE
// =====================================================

async function main() {
    const args = process.argv.slice(2);
    const dbPath = args[0] || path.join(__dirname, '..', 'db', 'doctorate.sqlite');
    const schemaPath = args[1] || path.join(__dirname, '..', 'db', 'schema.sql');

    console.log('='.repeat(60));
    console.log('🎓 Doctorate Grading Database Initializer');
    console.log('='.repeat(60));

    try {
        const initializer = new DatabaseInitializer(dbPath, schemaPath);
        await initializer.initialize();
        
        Logger.success('🎉 Database initialization completed successfully!');
        process.exit(0);
        
    } catch (error) {
        Logger.error('💥 Database initialization failed!');
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
    DatabaseConnection,
    Migration,
    SchemaManager,
    DatabaseInitializer,
    MigrationError,
    ValidationError,
    DatabaseConnectionError,
    Logger
};

// Run CLI if this file is executed directly
if (require.main === module) {
    main();
}