-- =====================================================
-- Doctorate Grading Application - Simplified SQLite Schema
-- Proper normalization with simple research lines text field
-- =====================================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- =====================================================
-- CORE TABLES (4 tables only)
-- =====================================================

-- Countries table
CREATE TABLE countries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    name_es TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Cities table
CREATE TABLE cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country_id INTEGER NOT NULL,
    latitude REAL,
    longitude REAL,
    madrid_distance_km INTEGER,
    
    -- City criteria
    cost_effectiveness INTEGER DEFAULT 0 CHECK (cost_effectiveness >= 0 AND cost_effectiveness <= 5),
    medical_services INTEGER DEFAULT 0 CHECK (medical_services >= 0 AND medical_services <= 5),
    transportation INTEGER DEFAULT 0 CHECK (transportation >= 0 AND transportation <= 5),
    air_quality INTEGER DEFAULT 0 CHECK (air_quality >= 0 AND air_quality <= 5),
    weather INTEGER DEFAULT 0 CHECK (weather >= 0 AND weather <= 5),
    
    -- AI city analysis
    city_summary TEXT,
    ai_cost_of_living INTEGER CHECK (ai_cost_of_living >= 0 AND ai_cost_of_living <= 10),
    ai_medical_quality INTEGER CHECK (ai_medical_quality >= 0 AND ai_medical_quality <= 10),
    ai_transport_quality INTEGER CHECK (ai_transport_quality >= 0 AND ai_transport_quality <= 10),
    ai_air_quality INTEGER CHECK (ai_air_quality >= 0 AND ai_air_quality <= 10),
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE RESTRICT,
    UNIQUE(name, country_id)
);

-- Universities table
CREATE TABLE universities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city_id INTEGER NOT NULL,
    founded_year INTEGER,
    website TEXT,
    
    -- AI university analysis
    university_summary TEXT,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT,
    UNIQUE(name, city_id)
);

-- Programs table (main table with simple research_lines text field)
CREATE TABLE programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_id TEXT UNIQUE,              -- Original _id from source data
    name TEXT NOT NULL,
    university_id INTEGER NOT NULL,
    
    -- Program details
    research_lines TEXT,                  -- Simple pipe-separated text field (e.g., "Line 1|Line 2|Line 3")
    url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'considering', 'interested', 'applying', 'discarded')),
    is_favorite BOOLEAN DEFAULT FALSE,
    
    -- Rating
    overall_rating INTEGER DEFAULT 0 CHECK (overall_rating >= 0 AND overall_rating <= 5),
    rating_date TEXT,
    rating_comment TEXT,
    
    -- Program criteria
    personal_relevance INTEGER DEFAULT 0 CHECK (personal_relevance >= 0 AND personal_relevance <= 5),
    information_clarity INTEGER DEFAULT 0 CHECK (information_clarity >= 0 AND information_clarity <= 5),
    research_environment INTEGER DEFAULT 0 CHECK (research_environment >= 0 AND research_environment <= 5),
    infrastructure INTEGER DEFAULT 0 CHECK (infrastructure >= 0 AND infrastructure <= 5),
    training_activities INTEGER DEFAULT 0 CHECK (training_activities >= 0 AND training_activities <= 5),
    
    -- AI program analysis
    program_summary TEXT,
    ai_innovacion INTEGER CHECK (ai_innovacion >= 0 AND ai_innovacion <= 10),
    ai_interdisciplinariedad INTEGER CHECK (ai_interdisciplinariedad >= 0 AND ai_interdisciplinariedad <= 10),
    ai_impacto INTEGER CHECK (ai_impacto >= 0 AND ai_impacto <= 10),
    ai_internacional INTEGER CHECK (ai_internacional >= 0 AND ai_internacional <= 10),
    ai_aplicabilidad INTEGER CHECK (ai_aplicabilidad >= 0 AND ai_aplicabilidad <= 10),
    
    -- Timestamps
    created_date TEXT,
    updated_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
);

-- =====================================================
-- SYSTEM TABLES
-- =====================================================

-- Schema version tracking
CREATE TABLE schema_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Core relationship indexes
CREATE INDEX idx_cities_country_id ON cities(country_id);
CREATE INDEX idx_universities_city_id ON universities(city_id);
CREATE INDEX idx_programs_university_id ON programs(university_id);

-- Search and filtering indexes
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_is_favorite ON programs(is_favorite);
CREATE INDEX idx_programs_overall_rating ON programs(overall_rating);
CREATE INDEX idx_programs_name ON programs(name);
CREATE INDEX idx_universities_name ON universities(name);
CREATE INDEX idx_cities_name ON cities(name);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

-- Update timestamps on record modification
CREATE TRIGGER update_countries_timestamp 
    AFTER UPDATE ON countries
BEGIN
    UPDATE countries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_cities_timestamp 
    AFTER UPDATE ON cities
BEGIN
    UPDATE cities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_universities_timestamp 
    AFTER UPDATE ON universities
BEGIN
    UPDATE universities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_programs_timestamp 
    AFTER UPDATE ON programs
BEGIN
    UPDATE programs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert initial schema version
INSERT INTO schema_versions (version, description) 
VALUES ('2.0.0', 'Simplified schema with text research lines field');

-- Insert base countries
INSERT INTO countries (name, name_es) VALUES 
    ('Spain', 'España'),
    ('Portugal', 'Portugal');