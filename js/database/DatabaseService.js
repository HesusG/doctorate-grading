/**
 * DatabaseService - Core SQLite connection and query management
 * Handles loading SQLite database with sql.js in the browser
 */

export class DatabaseService {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.SQL = null;
        this.changeCount = 0;
        this.hasChanges = false;
    }

    /**
     * Initialize the SQLite database connection
     */
    async initialize() {
        try {
            console.log('🔌 Initializing SQLite database...');
            
            // Initialize sql.js library
            this.SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            
            // Load the SQLite database file
            await this.loadDatabase();
            
            this.isInitialized = true;
            console.log('✅ SQLite database initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize SQLite database:', error);
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    /**
     * Load the SQLite database file from the server
     */
    async loadDatabase() {
        try {
            console.log('📁 Loading database file: ./db/doctorate.sqlite');
            
            const response = await fetch('./db/doctorate.sqlite');
            if (!response.ok) {
                throw new Error(`Failed to fetch database: ${response.status} ${response.statusText}`);
            }
            
            const dbBuffer = await response.arrayBuffer();
            this.db = new this.SQL.Database(new Uint8Array(dbBuffer));
            
            // Verify database structure
            await this.verifyDatabaseStructure();
            
            console.log('📊 Database loaded and verified successfully');
        } catch (error) {
            console.error('❌ Failed to load database:', error);
            throw error;
        }
    }

    /**
     * Verify that the database has the expected tables and structure
     */
    async verifyDatabaseStructure() {
        const expectedTables = ['countries', 'cities', 'universities', 'programs'];
        
        try {
            const result = this.db.exec(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `);
            
            if (result.length === 0) {
                throw new Error('No tables found in database');
            }
            
            const tables = result[0].values.map(row => row[0]);
            
            for (const expectedTable of expectedTables) {
                if (!tables.includes(expectedTable)) {
                    throw new Error(`Required table '${expectedTable}' not found in database`);
                }
            }
            
            console.log('✅ Database structure verified:', tables);
        } catch (error) {
            console.error('❌ Database structure verification failed:', error);
            throw error;
        }
    }

    /**
     * Execute a parameterized SQL query
     * @param {string} sql - The SQL query
     * @param {Array} params - Parameters for the query
     * @returns {Array} Query results
     */
    async query(sql, params = []) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }

        try {
            const stmt = this.db.prepare(sql);
            
            if (params.length > 0) {
                stmt.bind(params);
            }
            
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            
            stmt.free();
            return results;
        } catch (error) {
            console.error('❌ Query execution failed:', error);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw new Error(`Query failed: ${error.message}`);
        }
    }

    /**
     * Execute a query that returns a single value
     * @param {string} sql - The SQL query
     * @param {Array} params - Parameters for the query
     * @returns {*} Single value result
     */
    async queryScalar(sql, params = []) {
        const results = await this.query(sql, params);
        if (results.length === 0) {
            return null;
        }
        
        const firstRow = results[0];
        const firstKey = Object.keys(firstRow)[0];
        return firstRow[firstKey];
    }

    /**
     * Execute a query that returns a single row
     * @param {string} sql - The SQL query
     * @param {Array} params - Parameters for the query
     * @returns {Object} Single row result
     */
    async queryOne(sql, params = []) {
        const results = await this.query(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Execute an INSERT, UPDATE, or DELETE query
     * @param {string} sql - The SQL query
     * @param {Array} params - Parameters for the query
     * @returns {Object} Result with changes and lastInsertId
     */
    async execute(sql, params = []) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }

        try {
            const stmt = this.db.prepare(sql);
            
            if (params.length > 0) {
                stmt.bind(params);
            }
            
            stmt.step();
            
            const result = {
                changes: this.db.getRowsModified(),
                lastInsertId: this.db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || null
            };
            
            stmt.free();
            
            // Track changes for export
            if (result.changes > 0) {
                this.hasChanges = true;
                this.changeCount++;
            }
            
            return result;
        } catch (error) {
            console.error('❌ Execute failed:', error);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw new Error(`Execute failed: ${error.message}`);
        }
    }

    /**
     * Execute multiple queries in a transaction
     * @param {Array} queries - Array of {sql, params} objects
     * @returns {Array} Array of results
     */
    async transaction(queries) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }

        try {
            this.db.exec('BEGIN TRANSACTION');
            
            const results = [];
            for (const query of queries) {
                const result = await this.execute(query.sql, query.params || []);
                results.push(result);
            }
            
            this.db.exec('COMMIT');
            console.log('✅ Transaction completed successfully');
            
            return results;
        } catch (error) {
            console.error('❌ Transaction failed, rolling back:', error);
            this.db.exec('ROLLBACK');
            throw error;
        }
    }

    /**
     * Get database statistics
     */
    async getStatistics() {
        try {
            const stats = await this.query(`
                SELECT 
                    (SELECT COUNT(*) FROM programs) as total_programs,
                    (SELECT COUNT(*) FROM universities) as total_universities,
                    (SELECT COUNT(*) FROM cities) as total_cities,
                    (SELECT COUNT(*) FROM countries) as total_countries,
                    (SELECT COUNT(*) FROM programs WHERE is_favorite = 1) as favorite_programs,
                    (SELECT COUNT(*) FROM programs WHERE status = 'applying') as applying_programs,
                    (SELECT ROUND(AVG(overall_rating), 2) FROM programs WHERE overall_rating > 0) as avg_rating
            `);
            
            return stats[0];
        } catch (error) {
            console.error('❌ Failed to get statistics:', error);
            throw error;
        }
    }

    /**
     * Export the current database as a file
     */
    async exportDatabase() {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }

        try {
            const exportedDb = this.db.export();
            const blob = new Blob([exportedDb], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `doctorate-${timestamp}.sqlite`;
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Reset change tracking
            this.hasChanges = false;
            this.changeCount = 0;
            
            console.log(`✅ Database exported as ${filename}`);
            return filename;
        } catch (error) {
            console.error('❌ Failed to export database:', error);
            throw error;
        }
    }

    /**
     * Get database status information
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasChanges: this.hasChanges,
            changeCount: this.changeCount,
            databaseSize: this.db ? this.db.export().length : 0
        };
    }

    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
            console.log('📌 Database connection closed');
        }
    }
}