# Doctorate Grading Application - Development Guide

## Project Overview

This is a PhD program evaluation tool for Spanish and Portuguese universities. The application allows users to explore, filter, rate, and compare doctorate programs through an interactive interface.

**Current Status**: Rebuilding from legacy monolithic codebase into clean, modular vanilla JavaScript with ES Modules.

## Critical Technical Constraints

⚠️ **ABSOLUTE REQUIREMENTS - NO EXCEPTIONS**:

1. **MUST work by opening index.html in VS Code Live Server**
   - No npm install, no build steps, no local server setup
   - Pure client-side application

2. **NO fetch() from local files** 
   - CORS will block loading local JSON files
   - Data must be in JavaScript modules (.js files, not .json)

3. **ES Modules only**
   - Use `type="module"` in script tags
   - Use `import/export` statements
   - All dependencies via CDN

4. **No backend/server required**
   - All data manipulation happens client-side
   - No AI features (for now)

## Data Structure

### Core Data Format (from /db/doctorate.json)
```javascript
// Convert to: /data/universidades.js
export const universidadesData = {
  programs: [
    {
      _id: "unique_id",
      program: {
        name: "Program Name",
        research_lines: ["Line 1", "Line 2"],
        url: "program_url", 
        status: "pending|considering|interested|applying|discarded",
        rating: {
          overall: 0-5,
          date: "ISO_date",
          comment: "text"
        }
      },
      university: {
        name: "University Name",
        website: "url"
      },
      city: {
        name: "City Name", 
        country: "Spain|Portugal",
        coords: { lat: number, lon: number },
        distances: { madrid_km: number }
      }
    }
  ]
};
```

### Key Data Relationships
- Each program belongs to one university
- Each university is in one city
- Cities have geographic coordinates for mapping
- Programs have ratings and status tracking

## Features to Preserve (Phase 1)

**KEEP ONLY THESE 3 CORE FEATURES**:

1. **Interactive Map** (`/js/components/map.js`)
   - Leaflet.js integration via CDN
   - University markers with clustering
   - Click markers to show program details

2. **Filtering System** (`/js/utils/filters.js`) 
   - Search by university name
   - Filter by city, rating, status
   - Real-time filter application

3. **University Program Modals** (`/js/components/modals.js`)
   - Show program details on marker click
   - Display program info, research lines, ratings
   - Basic program information display

**REMOVE EVERYTHING ELSE**:
- ❌ Data table view
- ❌ Analysis/charts
- ❌ Rating interface
- ❌ Ranking system
- ❌ Admin panel
- ❌ AI integration
- ❌ Heart animation
- ❌ Advanced search
- ❌ All other tabs except map

## Required Dependencies (CDN Only)

```html
<!-- Mapping -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
```

## Recommended File Structure

```
project/
├── index.html                 
├── styles.css                ← Preserve core styling only
├── /data/
│   └── universidades.js      ← Convert JSON to JS module
├── /js/
│   ├── main.js              ← Entry point, initialize app
│   ├── /components/
│   │   ├── map.js           ← Map initialization and markers
│   │   └── modals.js        ← Program detail modals
│   └── /utils/
│       ├── filters.js       ← Filter logic
│       └── data.js          ← Data manipulation helpers
```

## UI/Styling to Preserve

**Keep these visual elements**:
- Purple-pink gradient background theme
- White card-based layouts with shadows
- Tab system structure (but only show Map tab)
- Filter panel design
- Modal overlay styling
- Responsive design patterns

**CSS Classes to Preserve**:
- `.container`, `.header`, `.tabs`, `.filters`
- `.modal`, `.modal-content` 
- `.card`, `.filter-group`
- All gradient and hover effects

## Development Workflow

1. **Start Live Server**: Right-click index.html → "Open with Live Server"
2. **Hot Reload**: Save changes and browser auto-refreshes
3. **Debug**: Use browser DevTools, no build tools needed
4. **Test**: Manual testing in browser only

## Data Loading Pattern

```javascript
// In main.js
import { universidadesData } from '../data/universidades.js';

// Initialize app with data
document.addEventListener('DOMContentLoaded', () => {
  initializeMap(universidadesData);
  initializeFilters(universidadesData);
});
```

## Common First Tasks Expected

The user will likely first ask to:
1. **Strip down the existing app** to only map + filters + modals
2. **Convert doctorate.json to universidades.js** 
3. **Create the new modular file structure**
4. **Remove all tabs except the map view**
5. **Clean up styles.css** to remove unused components

## Critical Notes for Future Development

- **Never suggest npm, webpack, or build tools**
- **Never try to fetch() local JSON files** 
- **Always use ES modules with .js extensions**
- **Preserve the core visual design but clean up code**
- **Focus on maintainable, readable vanilla JavaScript**
- **All external libraries must come from CDN**

## Current Legacy Codebase Issues

- Monolithic structure with mixed concerns
- Embedded JavaScript in HTML
- Complex dependencies and unused features
- Performance issues with large datasets
- Difficult to maintain and extend

The rebuild aims to create clean, modular, maintainable code while preserving core functionality.