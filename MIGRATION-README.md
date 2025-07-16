# SQLite Migration Framework

## Overview

This directory contains a professional-grade database migration framework that transforms the denormalized JavaScript data structure into a normalized SQLite database following Third Normal Form (3NF) principles.

## Architecture

### Design Principles
- **Object-Oriented Programming**: Clean class-based architecture with SOLID principles
- **Separation of Concerns**: Distinct modules for schema, migration, validation, and orchestration
- **Error Handling**: Comprehensive error handling with custom exception classes
- **Transaction Safety**: All migrations run within database transactions
- **Data Integrity**: Foreign key constraints, unique constraints, and check constraints
- **Performance**: Optimized with indexes and efficient query patterns

### Framework Components

```
scripts/
├── migration-framework.js    # Core migration infrastructure
├── data-migrator.js         # Data transformation and migration logic
├── validate-migration.js    # Comprehensive validation and QA testing
├── setup.js                 # Orchestration script for complete setup
└── test-migration.js        # (Future) Automated testing framework
```

## Quick Start

### Prerequisites
- Node.js 16+ 
- SQLite3 support

### One-Command Setup
```bash
# Linux/macOS
./setup.sh

# Windows
setup.bat

# Or using npm
npm run setup
```

This will:
1. ✅ Check prerequisites
2. 📦 Install dependencies  
3. 🏗️ Initialize database schema
4. 🔄 Migrate all data
5. 🔍 Validate migration results
6. 📚 Generate documentation

## Database Schema

### Normalized Structure (3NF)

**Master Entities:**
- `countries` - Country master data (Spain, Portugal)
- `cities` - Cities with coordinates and geographic data
- `universities` - Universities linked to cities
- `programs` - PhD programs linked to universities

**Relationship Entities:**
- `research_lines` - Master list of research areas
- `program_research_lines` - Many-to-many program ↔ research lines

**Evaluation Data:**
- `program_ratings` - Overall ratings and comments
- `program_criteria` - Detailed 5-dimension evaluations
- `city_criteria` - City evaluation metrics

**AI Analysis:**
- `ai_program_metrics` - AI-generated program analysis
- `ai_university_summaries` - University summaries
- `ai_city_summaries` - City analysis and metrics

**System Tables:**
- `schema_versions` - Schema version tracking
- `migration_log` - Migration execution history

### Data Relationships

```
countries (1) ←→ (N) cities (1) ←→ (N) universities (1) ←→ (N) programs
                                                              ↕ (N)
                                                      research_lines
```

## Migration Process

### 1. Schema Initialization
- Creates all tables with proper constraints
- Sets up indexes for performance
- Configures triggers for data integrity
- Enables foreign key enforcement

### 2. Data Transformation
Uses Strategy Pattern for different entity types:

```javascript
class CountryTransformationStrategy {
    transform(programs) {
        // Extract unique countries, add Spanish translations
    }
}
```

### 3. Data Validation
Comprehensive validation includes:
- Required field validation
- Data type checking
- Coordinate validation
- Rating range validation
- Business rule enforcement

### 4. Migration Pipeline
1. **Countries** → Extract unique countries
2. **Cities** → Link to countries, validate coordinates
3. **Universities** → Link to cities
4. **Programs** → Link to universities
5. **Research Lines** → Extract and link many-to-many
6. **Ratings & Criteria** → Link to programs
7. **AI Analysis** → Link to programs, universities, cities

### 5. Quality Assurance
- Referential integrity checks
- Data consistency validation
- Performance testing
- Edge case handling
- Business rule verification

## Usage Examples

### Running Individual Components

```bash
# Initialize schema only
npm run init-db

# Migrate data only (requires existing schema)
npm run migrate-data

# Validate existing database
npm run validate-db

# Complete reset and setup
npm run reset
```

### Custom Migration

```javascript
import { DatabaseInitializer } from './scripts/migration-framework.js';

const initializer = new DatabaseInitializer(
    './db/custom.sqlite',
    './db/schema.sql'
);

await initializer.initialize();
```

### Data Access Examples

```javascript
import { DatabaseConnection } from './scripts/migration-framework.js';

const db = new DatabaseConnection('./db/doctorate.sqlite');
await db.connect();

// Get all programs with location data
const programs = await db.executeQuery(`
    SELECT p.name as program, u.name as university, 
           c.name as city, co.name_es as country
    FROM programs p
    JOIN universities u ON p.university_id = u.id
    JOIN cities c ON u.city_id = c.id
    JOIN countries co ON c.country_id = co.id
`);

// Search programs by research area
const chemistryPrograms = await db.executeQuery(`
    SELECT DISTINCT p.name, rl.line_text
    FROM programs p
    JOIN program_research_lines prl ON p.id = prl.program_id
    JOIN research_lines rl ON prl.research_line_id = rl.id
    WHERE rl.line_text LIKE '%química%'
`);
```

## Validation & Quality Assurance

### Automated Testing
The validation framework includes:

- **Schema Integrity**: Table existence, column validation, index verification
- **Referential Integrity**: Foreign key constraint validation
- **Data Consistency**: Duplicate detection, range validation
- **Performance Testing**: Query execution time validation
- **Edge Cases**: Empty data, special characters, boundary conditions

### Quality Metrics
- ✅ **Data Integrity**: ACID compliance with SQLite transactions
- ✅ **Performance**: Sub-second query response times
- ✅ **Completeness**: 100% data migration with validation
- ✅ **Consistency**: Normalized data with no duplication
- ✅ **Reliability**: Comprehensive error handling and rollback

## Error Handling

### Custom Exception Classes
```javascript
class MigrationError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'MigrationError';
        this.details = details;
    }
}
```

### Transaction Safety
- All migrations run in database transactions
- Automatic rollback on any failure
- Complete state recovery on errors
- Detailed error logging and reporting

## Performance Optimizations

### Database Indexes
- Primary key indexes on all tables
- Foreign key indexes for joins
- Search indexes on commonly filtered fields
- Full-text search indexes for program and research line names

### Query Optimization
- Efficient join patterns
- Parameterized queries
- Connection pooling support
- Query result caching

## Reports and Documentation

### Generated Reports
- **Migration Report**: Statistics, timing, error details
- **Validation Report**: Test results, quality metrics, recommendations
- **Setup Report**: Complete process overview
- **Database Documentation**: Schema, usage examples, maintenance guide

### File Locations
```
db/
├── doctorate.sqlite          # The database file
├── migration-report.json     # Migration statistics
├── validation-report.json    # Validation results
├── setup-report.json        # Setup process report
└── README.md                # Database usage documentation
```

## Troubleshooting

### Common Issues

**SQLite3 Module Not Found:**
```bash
npm install sqlite3
```

**Permission Denied:**
```bash
chmod +x setup.sh
```

**Migration Failures:**
Check the migration report at `db/migration-report.json` for detailed error information.

**Validation Failures:**
Review the validation report at `db/validation-report.json` for specific issues and recommendations.

### Debug Mode
Enable verbose logging:
```bash
NODE_ENV=development npm run setup
```

## Future Enhancements

### Planned Features
- **Incremental Migrations**: Support for schema updates without full rebuild
- **Data Versioning**: Track data changes over time
- **Backup/Restore**: Automated backup strategies
- **Performance Monitoring**: Query performance analytics
- **Web Interface**: GUI for migration management

### Extension Points
The framework is designed for extensibility:
- Custom transformation strategies
- Additional validation rules
- Custom migration steps
- Extended reporting formats

## Contributing

### Code Standards
- Object-oriented design with SOLID principles
- Comprehensive error handling
- Transaction safety
- Complete test coverage
- Professional logging

### Adding New Migrations
```javascript
class CustomMigration extends Migration {
    constructor() {
        super(
            'migration_name',
            'CREATE TABLE...', // up SQL
            'DROP TABLE...'    // down SQL (optional)
        );
    }
}
```

---

## Technical Specifications

**Database**: SQLite 3  
**Language**: Node.js 16+  
**Architecture**: Object-Oriented with Design Patterns  
**Data Format**: Third Normal Form (3NF)  
**Performance**: <1s query response, indexed operations  
**Reliability**: ACID transactions, referential integrity  
**Testing**: Comprehensive validation framework  

**Generated by**: Professional SQLite Migration Framework v1.0.0  
**Documentation Date**: ${new Date().toISOString()}  
**Project**: Doctorate Grading Application POC