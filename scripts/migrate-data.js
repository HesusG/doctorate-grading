#!/usr/bin/env node

/**
 * One-time migration script for doctorate grading data
 * Adds missing fields and normalizes data structure
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the data file
const dataFilePath = join(__dirname, '../data/universidades.js');

// Generate a unique ID similar to MongoDB ObjectId format
function generateId() {
    return randomBytes(12).toString('hex');
}

console.log('🔄 Starting data migration...');

try {
    // Read the current data file
    const fileContent = readFileSync(dataFilePath, 'utf8');
    
    // Extract the data array from the ES module
    const dataMatch = fileContent.match(/export const universidadesData = \s*(\[[\s\S]*\]);/);
    if (!dataMatch) {
        throw new Error('Could not parse universidadesData from file');
    }
    
    // Parse the data
    const dataArray = JSON.parse(dataMatch[1]);
    console.log(`📊 Found ${dataArray.length} records to migrate`);
    
    let migratedCount = 0;
    let idNormalizedCount = 0;
    let idCreatedCount = 0;
    let favoriteAddedCount = 0;
    
    // Process each record
    const migratedData = dataArray.map((record, index) => {
        let modified = false;
        
        // 1. Handle _id field
        if (!record._id) {
            // No _id exists, create a new one
            record._id = generateId();
            idCreatedCount++;
            modified = true;
            console.log(`   Created new ID for record ${index + 1}: ${record._id}`);
        } else if (typeof record._id === 'object' && record._id.$oid) {
            // Normalize MongoDB format to simple string
            record._id = record._id.$oid;
            idNormalizedCount++;
            modified = true;
            console.log(`   Normalized ID for record ${index + 1}: ${record._id}`);
        }
        
        // 2. Add is_favorite field if missing
        if (record.program && !record.program.hasOwnProperty('is_favorite')) {
            record.program.is_favorite = false;
            favoriteAddedCount++;
            modified = true;
        }
        
        // 3. Ensure updated_date exists (keep existing if present)
        if (!record.updated_date) {
            record.updated_date = new Date().toISOString();
            modified = true;
        }
        
        if (modified) {
            migratedCount++;
        }
        
        return record;
    });
    
    // Generate the new file content
    const newFileContent = `export const universidadesData = 
${JSON.stringify(migratedData, null, 2)};`;
    
    // Create backup of original file
    const backupPath = dataFilePath + '.backup.' + Date.now();
    writeFileSync(backupPath, fileContent);
    console.log(`💾 Created backup: ${backupPath}`);
    
    // Write the migrated data
    writeFileSync(dataFilePath, newFileContent, 'utf8');
    
    console.log('✅ Migration completed successfully!');
    console.log(`📈 Migration Summary:`);
    console.log(`   - Total records: ${dataArray.length}`);
    console.log(`   - Records modified: ${migratedCount}`);
    console.log(`   - New IDs created: ${idCreatedCount}`);
    console.log(`   - IDs normalized: ${idNormalizedCount}`);
    console.log(`   - Favorites added: ${favoriteAddedCount}`);
    console.log(`   - Backup created: ${backupPath}`);
    
} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}