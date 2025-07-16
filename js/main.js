import { DatabaseService } from './database/DatabaseService.js';
import { ProgramService } from './database/ProgramService.js';
import { UniversityService } from './database/UniversityService.js';
import { CityService } from './database/CityService.js';
import { CountryService } from './database/CountryService.js';
import { SQLDataUtils } from './utils/SQLDataUtils.js';
import { MapComponent } from './components/map.js';
import { ModalComponent } from './components/modal.js';
import { componentLoader } from './component-loader.js';

class DoctorateApp {
    constructor() {
        // Initialize SQLite services
        this.databaseService = new DatabaseService();
        this.programService = null;
        this.universityService = null;
        this.cityService = null;
        this.countryService = null;
        this.dataUtils = null;
        
        // Initialize components
        this.mapComponent = null;
        this.modalComponent = new ModalComponent(this);
        this.componentLoader = componentLoader;
        this.map = null;
        this.currentView = 'mapa';
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing Doctorate App with SQLite...');
            
            // Initialize SQLite database connection
            await this.initializeDatabase();
            
            // Display database statistics
            const stats = await this.dataUtils.getStatistics();
            console.log('📈 Database Statistics:', stats);
            
            // Initialize components when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
            } else {
                await this.initializeComponents();
            }
            
            this.isInitialized = true;
            console.log('✅ Doctorate App initialized successfully with SQLite backend');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showInitializationError(error);
        }
    }

    /**
     * Initialize SQLite database and all services
     */
    async initializeDatabase() {
        try {
            // Initialize database connection
            await this.databaseService.initialize();
            
            // Initialize all service layers
            this.programService = new ProgramService(this.databaseService);
            this.universityService = new UniversityService(this.databaseService);
            this.cityService = new CityService(this.databaseService);
            this.countryService = new CountryService(this.databaseService);
            
            // Initialize data utilities with SQLite backend
            this.dataUtils = new SQLDataUtils(this.databaseService, this.programService);
            
            // Initialize map component with SQL data utils
            this.mapComponent = new MapComponent(this.dataUtils);
            
            console.log('✅ SQLite database and services initialized');
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }

    async initializeComponents() {
        console.log('🔧 Initializing components...');
        
        // Load HTML components
        await this.loadHTMLComponents();
        
        // Initialize tab functionality
        this.initializeTabs();
        
        // Make app globally available for debugging
        window.doctorateApp = this;
        
        // Add debug console for SQLite testing
        this.addDebugConsole();
        
        console.log('✅ App initialization complete');
    }

    async loadHTMLComponents() {
        console.log('📦 Loading HTML components...');
        
        const components = [
            { path: './components/header.html', target: 'header-component' },
            { path: './components/tabs.html', target: 'tabs-component' },
            { path: './components/filters.html', target: 'filters-component' }
        ];

        await this.componentLoader.loadComponents(components);
        
        // Load initial view (mapa)
        await this.loadView('mapa');
    }

    async loadView(viewName) {
        console.log(`🔄 Loading view: ${viewName}`);
        
        try {
            await this.componentLoader.loadComponent(
                `./views/${viewName}.html`, 
                'views-container'
            );
            
            this.currentView = viewName;
            this.updateTabActiveState(viewName);
            
            // Initialize view-specific functionality
            if (viewName === 'mapa') {
                // Map will be initialized after DOM is ready
                setTimeout(() => this.initializeMap(), 100);
            }
            
        } catch (error) {
            console.error(`❌ Failed to load view ${viewName}:`, error);
        }
    }

    initializeTabs() {
        // Add click handlers to tabs
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab')) {
                const tabName = e.target.dataset.tab;
                this.loadView(tabName);
            }
        });
    }

    updateTabActiveState(activeTab) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to current tab
        const currentTab = document.querySelector(`[data-tab="${activeTab}"]`);
        if (currentTab) {
            currentTab.classList.add('active');
        }
    }

    async initializeMap() {
        // Only initialize if map container exists and map isn't already initialized
        const mapContainer = document.getElementById('map');
        if (!mapContainer || this.map || !this.isInitialized) {
            return;
        }

        try {
            console.log('🗺️ Initializing map with SQLite university data...');
            
            // Initialize map component with all university markers (now async)
            this.map = await this.mapComponent.initialize('map');
            
            console.log('✅ Map initialized with SQLite backend');
        } catch (error) {
            console.error('❌ Failed to initialize map:', error);
            this.showNotification('Error al inicializar el mapa', 'error');
        }
    }

    // Get services for debugging and advanced operations
    getDatabaseService() {
        return this.databaseService;
    }

    getProgramService() {
        return this.programService;
    }

    getUniversityService() {
        return this.universityService;
    }

    getCityService() {
        return this.cityService;
    }

    getCountryService() {
        return this.countryService;
    }

    // Get data utilities
    getDataUtils() {
        return this.dataUtils;
    }

    // Get unique cities for filters (async now)
    async getCities() {
        if (!this.isInitialized) {
            console.warn('App not fully initialized yet');
            return [];
        }
        return await this.dataUtils.getUniqueValues('city');
    }

    // Get unique universities for filters (async now)
    async getUniversities() {
        if (!this.isInitialized) {
            console.warn('App not fully initialized yet');
            return [];
        }
        return await this.dataUtils.getUniqueValues('university');
    }

    // Get statistics (async now)
    async getStatistics() {
        if (!this.isInitialized) {
            console.warn('App not fully initialized yet');
            return {};
        }
        return await this.dataUtils.getStatistics();
    }

    // Get map component
    getMapComponent() {
        return this.mapComponent;
    }

    // Show university details (called from popup buttons)
    showUniversityDetails(universityName) {
        this.modalComponent.showUniversityModal(universityName);
    }

    // Show specific program details (called from program cards in popup)
    showProgramDetails(universityName, programIndex) {
        this.modalComponent.showUniversityModal(universityName, programIndex);
    }

    // Get modal component
    getModalComponent() {
        return this.modalComponent;
    }

    // Toggle favorite from map popup (async now with SQLite)
    async toggleFavoriteFromMap(universityName, programIndex) {
        try {
            if (!this.isInitialized) {
                console.warn('App not fully initialized yet');
                return;
            }
            await this.modalComponent.handleFavoriteToggleFromMap(universityName, programIndex);
        } catch (error) {
            console.error('❌ Failed to toggle favorite:', error);
        }
    }

    /**
     * Show initialization error to user
     */
    showInitializationError(error) {
        const errorMessage = `
            <div style="
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                background: white; 
                padding: 20px; 
                border-radius: 8px; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 500px;
                z-index: 10000;
                font-family: Arial, sans-serif;
            ">
                <h3 style="color: #d32f2f; margin-bottom: 16px;">
                    ❌ Error de Inicialización
                </h3>
                <p style="margin-bottom: 16px;">
                    No se pudo inicializar la base de datos SQLite. Esto puede deberse a:
                </p>
                <ul style="margin-bottom: 16px;">
                    <li>El archivo de base de datos no se encuentra</li>
                    <li>Problemas de CORS en el navegador</li>
                    <li>sql.js no se cargó correctamente</li>
                </ul>
                <details style="margin-bottom: 16px;">
                    <summary>Detalles del error</summary>
                    <pre style="background: #f5f5f5; padding: 8px; font-size: 12px; overflow: auto;">
${error.message}
                    </pre>
                </details>
                <button onclick="location.reload()" style="
                    background: #1976d2; 
                    color: white; 
                    border: none; 
                    padding: 8px 16px; 
                    border-radius: 4px; 
                    cursor: pointer;
                ">
                    Reintentar
                </button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorMessage);
    }

    /**
     * Export current database
     */
    async exportDatabase() {
        try {
            if (!this.isInitialized) {
                console.warn('App not fully initialized yet');
                return;
            }
            
            const filename = await this.databaseService.exportDatabase();
            console.log(`✅ Database exported as ${filename}`);
            
            // Show success message
            this.showNotification('Base de datos exportada exitosamente', 'success');
            
            return filename;
        } catch (error) {
            console.error('❌ Failed to export database:', error);
            this.showNotification('Error al exportar la base de datos', 'error');
            throw error;
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            font-family: Arial, sans-serif;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * Get app status for debugging
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            currentView: this.currentView,
            databaseStatus: this.databaseService ? this.databaseService.getStatus() : null,
            cacheStats: this.dataUtils ? this.dataUtils.getCacheStats() : null
        };
    }

    /**
     * Add debug console for testing SQLite integration
     */
    addDebugConsole() {
        if (!this.isInitialized) return;

        console.log(`
🐞 SQLite Debug Console Available:

// Get app status
window.doctorateApp.getStatus()

// Test database statistics 
await window.doctorateApp.getStatistics()

// Test program service
await window.doctorateApp.getProgramService().getAllPrograms()

// Test search
await window.doctorateApp.getDataUtils().searchPrograms('química')

// Export database
await window.doctorateApp.exportDatabase()

// Get unique cities
await window.doctorateApp.getCities()

Ready to test SQLite integration! 🚀
        `);
    }
}

// Initialize the app
export default DoctorateApp;