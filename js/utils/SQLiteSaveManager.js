/**
 * SQLiteSaveManager - Handles save notifications and database export for SQLite
 * Replaces FileSystemManager with SQLite-compatible functionality
 */

export class SQLiteSaveManager {
    constructor(databaseService) {
        this.databaseService = databaseService;
        this.reminderInterval = 300000; // 5 minutes
        this.reminderTimer = null;
        this.autoExportThreshold = 5; // Auto-suggest export after 5 changes
    }

    /**
     * Initialize the save manager
     */
    async initialize() {
        this.createSaveIndicator();
        this.startReminderTimer();
        console.log('✅ SQLiteSaveManager initialized with database persistence');
        return true;
    }

    /**
     * Create the save indicator ribbon at the top of the page
     */
    createSaveIndicator() {
        // Create save indicator ribbon
        const ribbon = document.createElement('div');
        ribbon.id = 'saveIndicatorRibbon';
        ribbon.className = 'save-indicator-ribbon hidden';
        ribbon.innerHTML = `
            <div class="save-indicator-content">
                <div class="save-indicator-left">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span id="saveIndicatorText">Tienes cambios sin guardar en la base de datos</span>
                    <span id="changeCounter">(0 cambios)</span>
                </div>
                <div class="save-indicator-right">
                    <button id="discardChangesBtn" class="discard-btn">
                        <i class="fas fa-undo"></i> Descartar Cambios
                    </button>
                    <button id="downloadDataBtn" class="save-btn">
                        <i class="fas fa-download"></i> Exportar Base de Datos
                    </button>
                    <button id="dismissReminderBtn" class="dismiss-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        // Insert at the very top of body, above everything
        document.body.insertBefore(ribbon, document.body.firstChild);

        // Add event listeners
        document.getElementById('downloadDataBtn').addEventListener('click', () => {
            this.exportDatabase();
        });

        document.getElementById('discardChangesBtn').addEventListener('click', () => {
            this.discardChanges();
        });

        document.getElementById('dismissReminderBtn').addEventListener('click', () => {
            this.hideSaveIndicator();
        });
    }

    /**
     * Show save indicator when changes exist
     */
    showSaveIndicator() {
        const ribbon = document.getElementById('saveIndicatorRibbon');
        if (ribbon) {
            ribbon.classList.remove('hidden');
            this.updateChangeCounter();
            // Add padding to push content down
            document.body.style.paddingTop = '60px';
        }
    }

    /**
     * Hide save indicator
     */
    hideSaveIndicator() {
        const ribbon = document.getElementById('saveIndicatorRibbon');
        if (ribbon) {
            ribbon.classList.add('hidden');
            // Remove padding when hidden
            document.body.style.paddingTop = '0';
        }
    }

    /**
     * Update change counter display
     */
    updateChangeCounter() {
        const counter = document.getElementById('changeCounter');
        const status = this.databaseService.getStatus();
        const changeCount = status.changeCount || 0;
        
        if (counter) {
            counter.textContent = `(${changeCount} cambio${changeCount !== 1 ? 's' : ''})`;
        }
    }

    /**
     * Check for changes and update UI
     */
    checkForChanges() {
        const status = this.databaseService.getStatus();
        
        if (status.hasChanges) {
            this.showSaveIndicator();
            
            // Auto-suggest export after threshold
            if (status.changeCount >= this.autoExportThreshold && 
                status.changeCount % this.autoExportThreshold === 0) {
                this.suggestExport();
            }
        } else {
            this.hideSaveIndicator();
        }
    }

    /**
     * Start reminder timer
     */
    startReminderTimer() {
        if (this.reminderTimer) {
            clearInterval(this.reminderTimer);
        }

        this.reminderTimer = setInterval(() => {
            const status = this.databaseService.getStatus();
            if (status.hasChanges) {
                this.showSaveReminder();
            }
        }, this.reminderInterval);
    }

    /**
     * Show save reminder notification
     */
    showSaveReminder() {
        const status = this.databaseService.getStatus();
        const changeCount = status.changeCount || 0;
        
        const reminder = document.createElement('div');
        reminder.className = 'save-reminder-notification';
        reminder.innerHTML = `
            <div class="reminder-content">
                <i class="fas fa-save"></i>
                <span>Recordatorio: Tienes ${changeCount} cambios sin guardar en la base de datos</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(reminder);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (reminder.parentElement) {
                reminder.remove();
            }
        }, 5000);
    }

    /**
     * Suggest database export to user
     */
    suggestExport() {
        const status = this.databaseService.getStatus();
        const changeCount = status.changeCount || 0;
        
        const suggestion = document.createElement('div');
        suggestion.className = 'download-suggestion';
        suggestion.innerHTML = `
            <div class="suggestion-content">
                <i class="fas fa-download"></i>
                <div class="suggestion-text">
                    <strong>¡Tiempo de guardar!</strong>
                    <p>Tienes ${changeCount} cambios. Exporta la base de datos actualizada.</p>
                </div>
                <div class="suggestion-actions">
                    <button onclick="window.app.saveManager.exportDatabase()" class="suggestion-btn primary">
                        Exportar Ahora
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="suggestion-btn secondary">
                        Más Tarde
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(suggestion);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (suggestion.parentElement) {
                suggestion.remove();
            }
        }, 10000);
    }

    /**
     * Export database to file
     */
    async exportDatabase() {
        try {
            const filename = await this.databaseService.exportDatabase();
            
            // Reset change tracking after successful export
            this.hideSaveIndicator();
            
            // Show success message
            this.showNotification(`Base de datos exportada como ${filename}`, 'success');
            
            console.log(`✅ Database exported as ${filename}`);
            
        } catch (error) {
            console.error('Failed to export database:', error);
            this.showNotification('Error al exportar la base de datos', 'error');
        }
    }

    /**
     * Discard all unsaved changes
     */
    async discardChanges() {
        try {
            // Show confirmation dialog
            const confirmed = confirm(
                '¿Estás seguro de que quieres descartar todos los cambios no guardados?\\n\\n' +
                'Esto revertirá todos los cambios realizados desde la última exportación y recargará la aplicación.'
            );
            
            if (confirmed) {
                // Reload the page to reset to original database state
                window.location.reload();
                
                console.log('✅ Changes discarded - page reloaded');
            }
        } catch (error) {
            console.error('Failed to discard changes:', error);
            this.showNotification('Error al descartar cambios', 'error');
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
     * Called after database operations to update save status
     */
    onDataChange() {
        // This will be called by the database services after any data modification
        setTimeout(() => this.checkForChanges(), 100); // Small delay to ensure status is updated
    }

    /**
     * Get save manager status
     */
    getStatus() {
        return {
            reminderActive: !!this.reminderTimer,
            databaseStatus: this.databaseService.getStatus()
        };
    }

    /**
     * Cleanup when app is being destroyed
     */
    destroy() {
        if (this.reminderTimer) {
            clearInterval(this.reminderTimer);
            this.reminderTimer = null;
        }
        
        // Remove ribbon if it exists
        const ribbon = document.getElementById('saveIndicatorRibbon');
        if (ribbon) {
            ribbon.remove();
        }
        
        // Reset body padding
        document.body.style.paddingTop = '0';
    }
}