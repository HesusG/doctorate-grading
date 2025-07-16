export class DataUtils {
    constructor(data) {
        this.data = data;
    }

    // Get unique values for filter dropdowns
    getUniqueValues(field) {
        const values = new Set();
        
        this.data.forEach(program => {
            let value;
            
            switch(field) {
                case 'city':
                    value = program.city?.name;
                    break;
                case 'university':
                    value = program.university?.name;
                    break;
                case 'country':
                    value = program.city?.country;
                    break;
                case 'status':
                    value = program.program?.status;
                    break;
                default:
                    value = program[field];
            }
            
            if (value) {
                values.add(value);
            }
        });
        
        return Array.from(values).sort();
    }

    // Get programs by city
    getProgramsByCity(cityName) {
        return this.data.filter(program => 
            program.city?.name === cityName
        );
    }

    // Get programs by university
    getProgramsByUniversity(universityName) {
        return this.data.filter(program => 
            program.university?.name === universityName
        );
    }

    // Get programs by status
    getProgramsByStatus(status) {
        return this.data.filter(program => 
            program.program?.status === status
        );
    }

    // Get programs with minimum rating
    getProgramsByMinRating(minRating) {
        return this.data.filter(program => {
            const rating = program.program?.rating?.overall || 0;
            return rating >= minRating;
        });
    }

    // Search programs by text
    searchPrograms(searchText) {
        if (!searchText || searchText.trim() === '') {
            return this.data;
        }
        
        const searchLower = searchText.toLowerCase();
        
        return this.data.filter(program => {
            const programName = program.program?.name?.toLowerCase() || '';
            const universityName = program.university?.name?.toLowerCase() || '';
            const cityName = program.city?.name?.toLowerCase() || '';
            const researchLines = program.program?.research_lines?.join(' ').toLowerCase() || '';
            
            return programName.includes(searchLower) ||
                   universityName.includes(searchLower) ||
                   cityName.includes(searchLower) ||
                   researchLines.includes(searchLower);
        });
    }

    // Apply multiple filters
    applyFilters(filters) {
        let filteredData = this.data;

        // Apply search filter
        if (filters.search) {
            const dataUtils = new DataUtils(filteredData);
            filteredData = dataUtils.searchPrograms(filters.search);
        }

        // Apply city filter
        if (filters.city) {
            filteredData = filteredData.filter(program => 
                program.city?.name === filters.city
            );
        }

        // Apply university filter
        if (filters.university) {
            filteredData = filteredData.filter(program => 
                program.university?.name === filters.university
            );
        }

        // Apply status filter
        if (filters.status) {
            filteredData = filteredData.filter(program => 
                program.program?.status === filters.status
            );
        }

        // Apply minimum rating filter
        if (filters.minRating) {
            filteredData = filteredData.filter(program => {
                const rating = program.program?.rating?.overall || 0;
                return rating >= parseInt(filters.minRating);
            });
        }

        return filteredData;
    }

    // Get program statistics
    getStatistics() {
        const stats = {
            totalPrograms: this.data.length,
            totalUniversities: this.getUniqueValues('university').length,
            totalCities: this.getUniqueValues('city').length,
            statusDistribution: {},
            countryDistribution: {},
            averageRating: 0
        };

        // Calculate status distribution
        this.data.forEach(program => {
            const status = program.program?.status || 'unknown';
            stats.statusDistribution[status] = (stats.statusDistribution[status] || 0) + 1;
        });

        // Calculate country distribution
        this.data.forEach(program => {
            const country = program.city?.country || 'unknown';
            stats.countryDistribution[country] = (stats.countryDistribution[country] || 0) + 1;
        });

        // Calculate average rating
        const ratedPrograms = this.data.filter(program => {
            const rating = program.program?.rating?.overall;
            return rating && rating > 0;
        });
        
        if (ratedPrograms.length > 0) {
            const totalRating = ratedPrograms.reduce((sum, program) => {
                return sum + (program.program?.rating?.overall || 0);
            }, 0);
            stats.averageRating = (totalRating / ratedPrograms.length).toFixed(2);
        }

        return stats;
    }

    // Get coordinates for mapping
    getCoordinates() {
        return this.data.map(program => ({
            id: program._id?.$oid || Math.random().toString(36),
            lat: program.city?.coords?.lat,
            lon: program.city?.coords?.lon,
            program: program.program,
            university: program.university,
            city: program.city
        })).filter(item => item.lat && item.lon);
    }
}

// Export utility functions
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
}

export function formatRating(rating) {
    if (!rating || rating === 0) return 'Sin calificar';
    return '⭐'.repeat(rating) + (rating < 5 ? '☆'.repeat(5 - rating) : '');
}

export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}