#!/usr/bin/env node

/**
 * =====================================================
 * Doctorate Grading Database Setup Orchestrator
 * Professional end-to-end migration setup script
 * =====================================================
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Logger } = require('./migration-framework.js');

// =====================================================
// SETUP ORCHESTRATOR CLASS
// =====================================================

class SetupOrchestrator {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.dbPath = path.join(this.projectRoot, 'db', 'doctorate.sqlite');
        this.schemaPath = path.join(this.projectRoot, 'db', 'schema.sql');
        this.dataPath = path.join(this.projectRoot, 'data', 'universidades.js');
        this.setupReport = {
            startTime: null,
            endTime: null,
            steps: [],
            success: false,
            errors: []
        };
    }

    async setup() {
        this.setupReport.startTime = new Date();
        
        console.log('='.repeat(60));
        console.log('🎓 Doctorate Grading Database Setup');
        console.log('='.repeat(60));
        
        try {
            await this.checkPrerequisites();
            await this.installDependencies();
            await this.initializeDatabase();
            await this.migrateData();
            await this.validateMigration();
            await this.generateDocumentation();
            
            this.setupReport.success = true;
            this.generateSetupReport();
            
            Logger.success('🎉 Setup completed successfully!');
            console.log('\n' + '='.repeat(60));
            console.log('✅ Your Doctorate Grading database is ready!');
            console.log('='.repeat(60));
            
        } catch (error) {
            this.setupReport.errors.push(error.message);
            Logger.error('💥 Setup failed!');
            Logger.error(error.message);
            throw error;
        } finally {
            this.setupReport.endTime = new Date();
        }
    }

    async checkPrerequisites() {
        const step = 'check_prerequisites';
        Logger.info('🔍 Checking prerequisites...');
        
        try {
            // Check Node.js version
            const nodeVersion = process.version;
            const requiredVersion = '16.0.0';
            Logger.info(`Node.js version: ${nodeVersion}`);
            
            if (!this.isVersionAtLeast(nodeVersion.slice(1), requiredVersion)) {
                throw new Error(`Node.js ${requiredVersion} or higher is required. Current: ${nodeVersion}`);
            }

            // Check if required files exist
            const requiredFiles = [
                { path: this.schemaPath, description: 'Database schema file' },
                { path: this.dataPath, description: 'Source data file' },
                { path: path.join(__dirname, 'migration-framework.js'), description: 'Migration framework' },
                { path: path.join(__dirname, 'data-migrator.js'), description: 'Data migrator' },
                { path: path.join(__dirname, 'validate-migration.js'), description: 'Validation script' }
            ];

            for (const file of requiredFiles) {
                if (!fs.existsSync(file.path)) {
                    throw new Error(`Required file missing: ${file.description} (${file.path})`);
                }
                Logger.info(`✅ Found: ${file.description}`);
            }

            // Check write permissions for database directory
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
                Logger.info(`Created database directory: ${dbDir}`);
            }

            this.addStepResult(step, true, 'Prerequisites check completed');
            Logger.success('Prerequisites check completed');

        } catch (error) {
            this.addStepResult(step, false, error.message);
            throw error;
        }
    }

    async installDependencies() {
        const step = 'install_dependencies';
        Logger.info('📦 Installing dependencies...');
        
        try {
            const packageJsonPath = path.join(this.projectRoot, 'package.json');
            
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error('package.json not found. Please run this from the project root.');
            }

            // Check if node_modules exists
            const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
            if (fs.existsSync(nodeModulesPath)) {
                Logger.info('Dependencies already installed, skipping npm install');
            } else {
                Logger.info('Installing npm dependencies...');
                execSync('npm install', { 
                    cwd: this.projectRoot, 
                    stdio: 'inherit'
                });
            }

            // Verify sqlite3 installation
            try {
                require('sqlite3');
                Logger.success('SQLite3 module available');
            } catch (error) {
                throw new Error('SQLite3 module not found. Please run: npm install sqlite3');
            }

            this.addStepResult(step, true, 'Dependencies installed successfully');
            Logger.success('Dependencies installation completed');

        } catch (error) {
            this.addStepResult(step, false, error.message);
            throw error;
        }
    }

    async initializeDatabase() {
        const step = 'initialize_database';
        Logger.info('🏗️ Initializing database schema...');
        
        try {
            // Remove existing database if it exists
            if (fs.existsSync(this.dbPath)) {
                Logger.warning('Removing existing database...');
                fs.unlinkSync(this.dbPath);
            }

            // Run database initialization
            const initScript = path.join(__dirname, 'migration-framework.js');
            execSync(`node "${initScript}" "${this.dbPath}" "${this.schemaPath}"`, {
                cwd: this.projectRoot,
                stdio: 'inherit'
            });

            // Verify database was created
            if (!fs.existsSync(this.dbPath)) {
                throw new Error('Database file was not created');
            }

            const stats = fs.statSync(this.dbPath);
            Logger.info(`Database created: ${this.dbPath} (${this.formatBytes(stats.size)})`);

            this.addStepResult(step, true, 'Database schema initialized');
            Logger.success('Database initialization completed');

        } catch (error) {
            this.addStepResult(step, false, error.message);
            throw error;
        }
    }

    async migrateData() {
        const step = 'migrate_data';
        Logger.info('🔄 Migrating data...');
        
        try {
            // Run data migration
            const migratorScript = path.join(__dirname, 'data-migrator.js');
            execSync(`node "${migratorScript}" "${this.dataPath}" "${this.dbPath}"`, {
                cwd: this.projectRoot,
                stdio: 'inherit'
            });

            // Check migration report
            const reportPath = path.join(this.projectRoot, 'db', 'migration-report.json');
            if (fs.existsSync(reportPath)) {
                const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
                Logger.info(`Migration statistics:`, {
                    totalRecords: report.totalRecords,
                    successfulMigrations: report.successfulMigrations,
                    duration: report.durationFormatted
                });
            }

            this.addStepResult(step, true, 'Data migration completed');
            Logger.success('Data migration completed');

        } catch (error) {
            this.addStepResult(step, false, error.message);
            throw error;
        }
    }

    async validateMigration() {
        const step = 'validate_migration';
        Logger.info('🔍 Validating migration...');
        
        try {
            // Run validation
            const validatorScript = path.join(__dirname, 'validate-migration.js');
            execSync(`node "${validatorScript}" "${this.dbPath}"`, {
                cwd: this.projectRoot,
                stdio: 'inherit'
            });

            // Check validation report
            const reportPath = path.join(this.projectRoot, 'db', 'validation-report.json');
            if (fs.existsSync(reportPath)) {
                const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
                if (!report.summary.isValid) {
                    throw new Error(`Validation failed: ${report.summary.failed} critical issues found`);
                }
                Logger.info(`Validation statistics:`, {
                    totalTests: report.summary.totalTests,
                    passed: report.summary.passed,
                    warnings: report.summary.warnings
                });
            }

            this.addStepResult(step, true, 'Migration validation passed');
            Logger.success('Migration validation completed');

        } catch (error) {
            this.addStepResult(step, false, error.message);
            throw error;
        }
    }

    async generateDocumentation() {
        const step = 'generate_documentation';
        Logger.info('📚 Generating documentation...');
        
        try {
            const docContent = this.generateSetupDocumentation();
            const docPath = path.join(this.projectRoot, 'db', 'README.md');
            fs.writeFileSync(docPath, docContent);

            Logger.success(`Documentation generated: ${docPath}`);
            this.addStepResult(step, true, 'Documentation generated');

        } catch (error) {
            this.addStepResult(step, false, error.message);
            // Don't throw - documentation generation is not critical
            Logger.warning('Documentation generation failed, but setup will continue');
        }
    }

    addStepResult(step, success, message) {
        this.setupReport.steps.push({
            step,
            success,
            message,
            timestamp: new Date().toISOString()
        });
    }

    generateSetupReport() {
        const duration = this.setupReport.endTime - this.setupReport.startTime;
        
        const report = {
            ...this.setupReport,
            duration: `${Math.round(duration / 1000)}s`,
            summary: {
                totalSteps: this.setupReport.steps.length,
                successfulSteps: this.setupReport.steps.filter(s => s.success).length,
                failedSteps: this.setupReport.steps.filter(s => !s.success).length
            }
        };

        const reportPath = path.join(this.projectRoot, 'db', 'setup-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        Logger.success(`Setup report saved: ${reportPath}`);
    }

    generateSetupDocumentation() {
        return `# Doctorate Grading Database

## Overview
This database contains normalized data for PhD program evaluation, including universities, programs, cities, ratings, and AI analysis.

## Database Information
- **Database**: SQLite 3
- **Location**: \`${this.dbPath}\`
- **Schema Version**: 1.0.0
- **Created**: ${new Date().toISOString()}

## Schema Overview

### Core Tables
- **countries**: Master list of countries (Spain, Portugal)
- **cities**: Cities with coordinates and distances
- **universities**: Universities linked to cities
- **programs**: PhD programs linked to universities

### Relationship Tables
- **research_lines**: Master list of research areas
- **program_research_lines**: Many-to-many relationship between programs and research lines

### Evaluation Tables
- **program_ratings**: Overall ratings and comments for programs
- **program_criteria**: Detailed criteria evaluations (5 dimensions)
- **city_criteria**: City evaluation criteria (cost, medical, transport, etc.)

### AI Analysis Tables
- **ai_program_metrics**: AI-generated program metrics (innovation, impact, etc.)
- **ai_university_summaries**: AI-generated university summaries
- **ai_city_summaries**: AI-generated city analysis and metrics

### System Tables
- **schema_versions**: Schema version tracking
- **migration_log**: Migration execution history

## Usage

### Connecting to the Database
\`\`\`javascript
import { DatabaseConnection } from './scripts/migration-framework.js';

const db = new DatabaseConnection('${this.dbPath}');
await db.connect();
\`\`\`

### Sample Queries

#### Get all programs with university and city information:
\`\`\`sql
SELECT p.name as program, u.name as university, c.name as city, co.name_es as country
FROM programs p
JOIN universities u ON p.university_id = u.id
JOIN cities c ON u.city_id = c.id
JOIN countries co ON c.country_id = co.id;
\`\`\`

#### Get top-rated programs:
\`\`\`sql
SELECT p.name, pr.overall_rating, u.name as university
FROM programs p
JOIN program_ratings pr ON p.id = pr.program_id
JOIN universities u ON p.university_id = u.id
WHERE pr.overall_rating > 0
ORDER BY pr.overall_rating DESC;
\`\`\`

#### Search programs by research area:
\`\`\`sql
SELECT DISTINCT p.name, rl.line_text
FROM programs p
JOIN program_research_lines prl ON p.id = prl.program_id
JOIN research_lines rl ON prl.research_line_id = rl.id
WHERE rl.line_text LIKE '%química%';
\`\`\`

## Maintenance

### Re-running Migration
To re-run the complete migration process:
\`\`\`bash
npm run setup
\`\`\`

### Individual Scripts
- **Initialize Schema**: \`npm run init-db\`
- **Migrate Data**: \`npm run migrate-data\`
- **Validate Database**: \`npm run validate-db\`

### Backup
To create a backup:
\`\`\`bash
cp "${this.dbPath}" "${this.dbPath}.backup.$(date +%Y%m%d)"
\`\`\`

## Performance Notes
- All tables have appropriate indexes for common queries
- Full-text search is available for programs and research lines
- Query performance is optimized for filtering and joining operations

## Data Quality
- All foreign key constraints are enforced
- Data validation ensures rating ranges (0-5 or 0-10)
- Duplicate prevention through unique constraints
- Referential integrity maintained throughout

---
*Generated automatically by the Doctorate Grading Setup System*
`;
    }

    isVersionAtLeast(current, required) {
        const currentParts = current.split('.').map(Number);
        const requiredParts = required.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
            if (currentParts[i] > requiredParts[i]) return true;
            if (currentParts[i] < requiredParts[i]) return false;
        }
        return true;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// =====================================================
// COMMAND LINE INTERFACE
// =====================================================

async function main() {
    try {
        const orchestrator = new SetupOrchestrator();
        await orchestrator.setup();
        process.exit(0);
    } catch (error) {
        console.error('\n💥 Setup failed!');
        console.error(error.message);
        console.error('\nPlease check the error above and try again.');
        process.exit(1);
    }
}

// =====================================================
// MODULE EXPORTS
// =====================================================

module.exports = {
    SetupOrchestrator
};

// Run CLI if this file is executed directly
if (require.main === module) {
    main();
}