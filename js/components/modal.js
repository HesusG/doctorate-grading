export class ModalComponent {
    constructor(app) {
        this.app = app;
        this.modalsLoaded = false;
        this.currentUniversityData = null;
        this.currentProgramIndex = 0;
        this.ribbonObserver = null;
    }

    async ensureModalsLoaded() {
        if (this.modalsLoaded) return;

        console.log('📦 Loading modal components...');
        
        const modals = [
            { path: './components/modals/university.html', target: 'modals-container' },
            { path: './components/modals/save-confirm.html', target: 'modals-container' },
            { path: './components/modals/program-edit.html', target: 'modals-container' },
            { path: './components/modals/rating-confirm.html', target: 'modals-container' }
        ];

        // Load modals directly into the modals container
        for (const modal of modals) {
            try {
                const response = await fetch(modal.path);
                if (response.ok) {
                    const html = await response.text();
                    const container = document.getElementById('modals-container');
                    if (container) {
                        container.innerHTML += html;
                        console.log(`✅ Loaded modal: ${modal.path}`);
                    } else {
                        console.error('❌ Modals container not found');
                    }
                } else {
                    console.error(`❌ Failed to load modal: ${modal.path}`);
                }
            } catch (error) {
                console.error(`❌ Error loading modal ${modal.path}:`, error);
            }
        }

        this.setupModalEventListeners();
        this.modalsLoaded = true;
        
        // Force close all modals on startup to ensure clean state
        this.forceCloseAllModals();
        
        // Make force close available globally for debugging
        window.forceCloseAllModals = () => this.forceCloseAllModals();
        window.forceUpdateModalPositions = () => this.forceUpdateModalPositions();
        
        // Initialize dynamic modal positioning
        this.initializeDynamicModalPositioning();
        
        console.log('✅ Modal components loaded and initialized');
    }

    setupModalEventListeners() {
        // University modal close button
        const backBtn = document.getElementById('backToMapBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.closeUniversityModal());
        }

        // Program navigation
        const prevBtn = document.getElementById('prevProgramBtn');
        const nextBtn = document.getElementById('nextProgramBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateProgram(-1));
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateProgram(1));
        }

        // Close modal when clicking outside
        const universityModal = document.getElementById('universityModal');
        if (universityModal) {
            universityModal.addEventListener('click', (e) => {
                if (e.target === universityModal) {
                    this.closeUniversityModal();
                }
            });
        }

        // Add criteria star click handlers
        this.setupCriteriaStarHandlers();
        
        // Add modal tab handlers
        this.setupModalTabHandlers();
        
        // Add favorite button handler
        this.setupFavoriteButtonHandler();
        
        // Add editable text field handlers
        this.setupEditableFieldHandlers();

        // Program edit modal close
        const closeProgramEdit = document.getElementById('closeProgramEditModal');
        if (closeProgramEdit) {
            closeProgramEdit.addEventListener('click', () => this.closeProgramEditModal());
        }

        // Rating confirm modal close
        const closeRatingModal = document.getElementById('closeRatingModal');
        if (closeRatingModal) {
            closeRatingModal.addEventListener('click', () => this.closeRatingModal());
        }
        
        // Rating modal backdrop click
        const ratingModal = document.getElementById('rating-confirm-modal');
        if (ratingModal) {
            ratingModal.addEventListener('click', (e) => {
                if (e.target === ratingModal) {
                    this.closeRatingModal();
                }
            });
        }
        
        // Cancel rating button
        const cancelRatingBtn = document.getElementById('cancel-rating');
        if (cancelRatingBtn) {
            cancelRatingBtn.addEventListener('click', () => this.closeRatingModal());
        }
    }

    async showUniversityModal(universityName, programIndex = 0) {
        console.log('🏛️ STEP 1: Starting to show university modal for:', universityName, 'program index:', programIndex);
        
        await this.ensureModalsLoaded();
        console.log('🏛️ STEP 2: Modals loaded');

        console.log('🏛️ STEP 3: Getting programs for university:', universityName);
        
        try {
            // Get programs for this university (now async)
            const programs = await this.app.dataUtils.getProgramsByUniversity(universityName);
            console.log('🏛️ STEP 4: Found programs:', programs.length);
        
            if (programs.length === 0) {
                console.error('❌ No programs found for university:', universityName);
                return;
            }

            this.currentUniversityData = {
                universityName,
                programs,
                university: programs[0].university,
                city: programs[0].city
            };
            this.currentProgramIndex = Math.min(programIndex, programs.length - 1);
            console.log('🏛️ STEP 5: Set current university data, program index:', this.currentProgramIndex);

            this.updateUniversityModalContent();
            console.log('🏛️ STEP 6: Updated modal content');
            
            this.openModal('universityModal');
            console.log('🏛️ STEP 7: Opened modal');
        } catch (error) {
            console.error('❌ Failed to show university modal:', error);
            this.app.showNotification('Error al cargar la información de la universidad', 'error');
        }
    }

    updateUniversityModalContent() {
        if (!this.currentUniversityData) return;

        const { universityName, programs, university, city } = this.currentUniversityData;
        const currentProgram = programs[this.currentProgramIndex];

        // Update header
        document.getElementById('universityTitle').textContent = universityName;
        const countryInSpanish = city.country === 'Spain' ? 'España' : city.country === 'Portugal' ? 'Portugal' : city.country;
        document.getElementById('universityCity').textContent = `${city.name}, ${countryInSpanish}`;
        document.getElementById('programCounter').textContent = `${this.currentProgramIndex + 1} / ${programs.length}`;

        // Update navigation buttons
        const prevBtn = document.getElementById('prevProgramBtn');
        const nextBtn = document.getElementById('nextProgramBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentProgramIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentProgramIndex === programs.length - 1;

        // Update program details
        this.updateProgramDetails(currentProgram);
        this.updateCriteriaRatings(currentProgram);
        
        // Update university and city details for tabs
        this.updateUniversityDetails(currentProgram);
        this.updateUniversityMetrics(currentProgram);
        this.updateCityDetails(currentProgram);
        this.updateCityAIMetrics(currentProgram);
        this.updateCityCriteria(currentProgram);
        
        // Update favorite button
        this.updateFavoriteButton(currentProgram);
        
        // For debugging - let's see what's happening
        console.log('📋 Updating modal content for:', currentProgram.program.name);
        console.log('📋 Current program data:', currentProgram);
        console.log('📋 City data:', city);
    }

    updateProgramDetails(program) {
        // Program header
        document.getElementById('programName').textContent = program.program?.name || 'N/A';
        
        // Status with emoji
        const status = program.program?.status || 'pending';
        const statusText = this.getStatusText(status);
        const statusEmoji = this.getStatusEmoji(status);
        document.getElementById('programStatus').innerHTML = `${statusEmoji} ${statusText}`;
        document.getElementById('programStatus').className = `program-status status-${status}`;

        // Program URL
        const programUrl = document.getElementById('programUrl');
        if (program.program?.url && program.program.url.trim()) {
            programUrl.href = program.program.url;
            programUrl.textContent = 'Ver programa oficial';
            programUrl.style.display = 'inline';
            programUrl.innerHTML = '🔗 Ver programa oficial';
        } else {
            programUrl.parentElement.style.display = 'none';
        }

        // Rating with stars - update the new star structure
        const rating = program.program?.rating?.overall || 0;
        
        // Update the star display
        const starContainer = document.getElementById('program-overall-rating-stars');
        if (starContainer) {
            const stars = starContainer.querySelectorAll('.criteria-star');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }
        
        // Update the rating value text
        const ratingValueElement = document.getElementById('programRatingValue');
        if (ratingValueElement) {
            if (rating > 0) {
                ratingValueElement.textContent = `${rating}/5`;
                ratingValueElement.className = 'program-status';
            } else {
                ratingValueElement.textContent = 'Sin calificar';
                ratingValueElement.className = 'program-status';
                ratingValueElement.style.backgroundColor = '#6c757d';
            }
        }

        // Update the last updated date (always show)
        const updatedDateElement = document.getElementById('updatedDate');
        if (updatedDateElement && program.updated_date) {
            const updatedDate = this.formatHumanDate(program.updated_date);
            updatedDateElement.textContent = updatedDate;
        }

        // Research lines with better formatting and cleaning
        const researchLinesList = document.getElementById('researchLinesList');
        if (program.program?.research_lines && program.program.research_lines.length > 0) {
            researchLinesList.innerHTML = program.program.research_lines
                .map(line => {
                    // Clean up double bullets and extra characters
                    const cleanLine = this.cleanResearchLine(line);
                    return `<li>${cleanLine}</li>`;
                })
                .join('');
        } else {
            researchLinesList.innerHTML = '<li><em>Información no disponible</em></li>';
        }

        // Program summary if available
        this.updateProgramSummary(program);
    }

    updateProgramSummary(program) {
        // Add program summary section if it exists
        const researchSection = document.getElementById('researchLines').parentElement;
        let summarySection = document.getElementById('programSummarySection');
        
        if (program.ai_analysis?.program_summary) {
            if (!summarySection) {
                summarySection = document.createElement('div');
                summarySection.id = 'programSummarySection';
                summarySection.className = 'program-section';
                summarySection.innerHTML = `
                    <h4>📝 Resumen del Programa</h4>
                    <div class="program-section-content" id="programSummaryContent"></div>
                `;
                researchSection.parentElement.insertBefore(summarySection, researchSection.nextSibling);
            }
            
            const summaryContent = document.getElementById('programSummaryContent');
            const summary = program.ai_analysis.program_summary;
            
            // Use the new preprocessing function for consistency
            summaryContent.innerHTML = this.preprocessSummaryText(summary);
        } else if (summarySection) {
            summarySection.remove();
        }
    }

    updateProgramMetrics(program) {
        const metrics = program.ai_analysis?.program_metrics || {};
        
        console.log('Program metrics:', metrics);
        
        // Map Spanish field names to English IDs
        this.setMetricValue('programInnovation', metrics.innovacion);
        this.setMetricValue('programInterdisciplinarity', metrics.interdisciplinariedad);
        this.setMetricValue('programImpact', metrics.impacto);
        this.setMetricValue('programInternational', metrics.internacional);
        this.setMetricValue('programApplicability', metrics.aplicabilidad);
    }

    setMetricValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (value !== undefined && value !== null && value > 0) {
            const numValue = parseFloat(value);
            const colorClass = this.getMetricColorClass(numValue);
            element.innerHTML = `<span class="metric-value ${colorClass}">${numValue}/10</span>`;
        } else {
            element.innerHTML = '<span class="metric-value no-data">N/A</span>';
        }
    }

    setDistanceValue(elementId, distance) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (distance !== undefined && distance !== null) {
            const distanceClass = this.getDistanceClass(distance);
            element.innerHTML = `<span class="distance-value ${distanceClass}">📍 ${distance} km</span>`;
        } else {
            element.innerHTML = '<span class="distance-value no-data">📍 N/A</span>';
        }
    }

    getMetricColorClass(value) {
        if (value >= 8) return 'metric-high';
        if (value >= 6) return 'metric-medium';
        if (value >= 4) return 'metric-low';
        return 'metric-very-low';
    }

    updateCityInformation(city, program) {
        const aiCityMetrics = program?.ai_analysis?.city_metrics || {};
        const cityCriteria = city.criteria || {};
        
        console.log('City information:', { 
            cityName: city.name,
            aiCityMetrics,
            cityCriteria,
            distances: city.distances
        });
        
        // Use AI metrics if available, fallback to manual city criteria
        // Note: AI metrics use English names, city criteria use different names
        this.setMetricValue('cityCostOfLiving', aiCityMetrics.cost_of_living || cityCriteria.cost_effectiveness);
        this.setMetricValue('cityAirQuality', aiCityMetrics.air_quality || cityCriteria.air_quality);
        this.setMetricValue('cityTransportQuality', aiCityMetrics.transport_quality || cityCriteria.transportation);
        this.setMetricValue('cityMedicalQuality', aiCityMetrics.medical_quality || cityCriteria.medical_services);
        
        // Distance to Madrid
        const distance = city.distances?.madrid_km;
        this.setDistanceValue('cityDistanceMadrid', distance);
        
        // Weather from city criteria (manual rating)
        this.setMetricValue('cityWeather', cityCriteria.weather);
    }


    getDistanceClass(distance) {
        if (distance < 100) return 'distance-close';
        if (distance < 300) return 'distance-medium';
        return 'distance-far';
    }

    updateExplanations(program) {
        const aiAnalysis = program.ai_analysis || {};
        
        // University explanation with better formatting
        const uniExplanation = document.getElementById('universityExplanationContent');
        if (aiAnalysis.university_summary) {
            const formatted = this.formatExplanationText(aiAnalysis.university_summary);
            uniExplanation.innerHTML = formatted;
        } else {
            uniExplanation.innerHTML = '<div class="no-data-message">📋 No hay información disponible sobre la universidad.</div>';
        }

        // City explanation with better formatting
        const cityExplanation = document.getElementById('cityExplanationContent');
        if (aiAnalysis.city_summary) {
            const formatted = this.formatExplanationText(aiAnalysis.city_summary);
            cityExplanation.innerHTML = formatted;
        } else {
            cityExplanation.innerHTML = '<div class="no-data-message">🏙️ No hay información disponible sobre la ciudad.</div>';
        }
    }

    formatExplanationText(text) {
        return text
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                line = line.trim();
                
                // Handle bullet points
                if (line.startsWith('- ')) {
                    const content = line.substring(2);
                    if (content.includes('**') && content.includes('**:')) {
                        // Handle bold headers like "**Population**: Description"
                        const formatted = content.replace(/\*\*(.*?)\*\*:/g, '<strong>$1:</strong>');
                        return `<div class="explanation-point">• ${formatted}</div>`;
                    }
                    return `<div class="explanation-point">• ${content}</div>`;
                }
                
                // Handle markdown-style bold
                if (line.includes('**')) {
                    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                }
                
                // Handle section headers
                if (line.includes(':') && line.length < 100) {
                    return `<h6 class="explanation-header">${line}</h6>`;
                }
                
                return `<p class="explanation-text">${line}</p>`;
            })
            .join('');
    }

    navigateProgram(direction) {
        if (!this.currentUniversityData) return;

        const newIndex = this.currentProgramIndex + direction;
        if (newIndex >= 0 && newIndex < this.currentUniversityData.programs.length) {
            this.currentProgramIndex = newIndex;
            this.updateUniversityModalContent();
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Use flex display for confirmation modals, block for others
            if (modalId === 'rating-confirm-modal' || modalId === 'saveConfirmModal' || modalId === 'confirmModal') {
                modal.style.display = 'flex';
            } else {
                modal.style.display = 'block';
            }
            setTimeout(() => {
                modal.classList.add('show');
                // Adjust modal position after showing
                this.adjustModalPositions();
            }, 10);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    }

    /**
     * Force close all modals (emergency cleanup)
     */
    forceCloseAllModals() {
        const modals = [
            'universityModal',
            'saveConfirmModal', 
            'confirmModal',
            'rating-confirm-modal',
            'program-edit-modal'
        ];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        });
        
        console.log('🔧 All modals forcefully closed');
    }

    closeUniversityModal() {
        this.closeModal('universityModal');
        this.currentUniversityData = null;
        this.currentProgramIndex = 0;
    }

    closeProgramEditModal() {
        this.closeModal('program-edit-modal');
    }

    closeRatingModal() {
        this.closeModal('rating-confirm-modal');
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendiente',
            'considering': 'Considerando',
            'interested': 'Interesado',
            'applying': 'Aplicando',
            'discarded': 'Descartado'
        };
        return statusMap[status] || this.capitalize(status);
    }

    getStatusEmoji(status) {
        const emojiMap = {
            'pending': '⏳',
            'considering': '🤔',
            'interested': '😍',
            'applying': '📝',
            'discarded': '❌'
        };
        return emojiMap[status] || '❓';
    }

    getRatingColor(rating) {
        const colorMap = {
            1: '#dc3545', // Red
            2: '#fd7e14', // Orange
            3: '#ffc107', // Yellow
            4: '#20c997', // Teal
            5: '#28a745'  // Green
        };
        return colorMap[rating] || '#6c757d'; // Grey default
    }

    formatHumanDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                return 'Hoy';
            } else if (diffDays === 1) {
                return 'Ayer';
            } else if (diffDays < 7) {
                return `Hace ${diffDays} días`;
            } else if (diffDays < 30) {
                const weeks = Math.floor(diffDays / 7);
                return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
            } else if (diffDays < 365) {
                const months = Math.floor(diffDays / 30);
                return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
            } else {
                return date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Fecha inválida';
        }
    }

    setupCriteriaStarHandlers() {
        // Add event listeners for criteria star clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('criteria-star')) {
                console.log('Star clicked!', e.target);
                const criterion = e.target.dataset.criterion;
                const value = parseInt(e.target.dataset.value);
                console.log('Criterion:', criterion, 'Value:', value);
                this.updateCriteriaValue(criterion, value);
            }
        });
    }

    setupModalTabHandlers() {
        // Add event listeners for modal tab clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-tab')) {
                const tabName = e.target.dataset.modalTab;
                this.switchModalTab(tabName);
            }
        });
    }

    switchModalTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Remove active class from all tabs
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab contents
        document.querySelectorAll('.modal-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to clicked tab
        const activeTab = document.querySelector(`[data-modal-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Add active class to corresponding content
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
        
        // If switching to universidad tab, populate it with data
        if (tabName === 'universidad' && this.currentUniversityData) {
            this.updateUniversityTabData();
        }
    }

    updateUniversityTabData() {
        if (!this.currentUniversityData) return;
        
        const currentProgram = this.currentUniversityData.programs[this.currentProgramIndex];
        const city = this.currentUniversityData.city;
        
        console.log('Updating university tab with data:', currentProgram);
        
        // Update AI Program Metrics in university tab
        this.updateProgramMetricsInTab(currentProgram);
        
        // Update city information in university tab
        this.updateCityInformationInTab(city, currentProgram);
        
        // Update city criteria
        this.updateCityCriteria(city);
    }

    updateProgramMetricsInTab(program) {
        const metrics = program.ai_analysis?.program_metrics || {};
        
        this.setElementValue('uniInnovacionTab', metrics.innovacion);
        this.setElementValue('uniInterdisciplinariedadTab', metrics.interdisciplinariedad);
        this.setElementValue('uniImpactoTab', metrics.impacto);
        this.setElementValue('uniInternacionalTab', metrics.internacional);
        this.setElementValue('uniAplicabilidadTab', metrics.aplicabilidad);
    }

    updateCityInformationInTab(city, program) {
        // AI city metrics
        const aiCityMetrics = program?.ai_analysis?.city_metrics || {};
        
        this.setElementValue('aiCostOfLivingTab', aiCityMetrics.cost_of_living);
        this.setElementValue('aiMedicalQualityTab', aiCityMetrics.medical_quality);
        this.setElementValue('aiTransportQualityTab', aiCityMetrics.transport_quality);
        this.setElementValue('aiAirQualityTab', aiCityMetrics.air_quality);
        
        // Distance
        const distance = city.distances?.madrid_km;
        if (distance) {
            const distanceElement = document.getElementById('distanciaMadridTab');
            if (distanceElement) {
                distanceElement.innerHTML = `<span class="distance-value">📍 ${distance} km</span>`;
            }
        }
        
        // City summary from AI analysis
        const citySummary = program?.ai_analysis?.city_summary;
        const citySummaryElement = document.getElementById('citySummaryContent');
        if (citySummaryElement && citySummary) {
            citySummaryElement.innerHTML = this.preprocessSummaryText(citySummary);
        }
        
        // University summary from AI analysis
        const universitySummary = program?.ai_analysis?.university_summary;
        const universitySummaryElement = document.getElementById('universitySummaryContent');
        if (universitySummaryElement && universitySummary) {
            universitySummaryElement.innerHTML = this.preprocessSummaryText(universitySummary);
        }
    }

    preprocessSummaryText(text) {
        if (!text) return '<p>No hay información disponible.</p>';
        
        return text
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                line = line.trim();
                
                // Handle bullet points
                if (line.startsWith('- ')) {
                    const content = line.substring(2).trim();
                    
                    // Handle bold headers like "**Population**: Description"
                    if (content.includes('**') && content.includes('**:')) {
                        const formatted = content.replace(/\*\*(.*?)\*\*:/g, '<strong>$1:</strong>');
                        return `<div class="explanation-point">• ${formatted}</div>`;
                    }
                    
                    // Handle regular markdown bold in bullet points
                    const boldFormatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return `<div class="explanation-point">• ${boldFormatted}</div>`;
                }
                
                // Handle section headers (lines ending with colon)
                if (line.includes(':') && line.length < 100 && !line.includes('.')) {
                    const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    return `<h6 class="explanation-header">${boldFormatted}</h6>`;
                }
                
                // Handle regular markdown bold
                if (line.includes('**')) {
                    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                }
                
                // Handle italic text
                if (line.includes('*') && !line.includes('**')) {
                    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
                }
                
                // Handle inline code
                if (line.includes('`')) {
                    line = line.replace(/`(.*?)`/g, '<code>$1</code>');
                }
                
                return `<p class="explanation-text">${line}</p>`;
            })
            .join('');
    }

    updateCityCriteria(city) {
        const criteria = city.criteria || {};
        
        console.log('Updating city criteria:', criteria);
        
        // Update each city criteria
        this.displayCityCriteriaRating('cost_effectiveness', criteria.cost_effectiveness || 0);
        this.displayCityCriteriaRating('medical_services', criteria.medical_services || 0);
        this.displayCityCriteriaRating('transportation', criteria.transportation || 0);
        this.displayCityCriteriaRating('air_quality', criteria.air_quality || 0);
        this.displayCityCriteriaRating('weather', criteria.weather || 0);
    }

    displayCityCriteriaRating(criterion, value) {
        // Update star display for city criteria
        const starContainer = document.getElementById(`city-criteria-${criterion.replace('_', '-')}-stars`);
        if (starContainer) {
            const stars = starContainer.querySelectorAll('.criteria-star');
            stars.forEach((star, index) => {
                if (index < value) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }
        
        // Update active level item for city criteria
        const criteriaBlock = document.querySelector(`[data-criteria="${criterion}"]`)?.parentElement?.parentElement;
        if (criteriaBlock) {
            const levelItems = criteriaBlock.querySelectorAll('.criteria-level-item');
            levelItems.forEach((item) => {
                const itemValue = parseInt(item.dataset.value);
                if (itemValue === value && value > 0) {
                    item.dataset.active = 'true';
                } else {
                    delete item.dataset.active;
                }
            });
        }
    }

    setElementValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value !== undefined && value !== null) {
            element.innerHTML = `<span class="metric-value">${value}/10</span>`;
        } else if (element) {
            element.innerHTML = '<span class="metric-value no-data">N/A</span>';
        }
    }

    cleanResearchLine(line) {
        if (!line) return '';
        
        // Remove multiple bullets and clean up formatting
        return line
            .replace(/^[•\-\*\+]+\s*/g, '') // Remove leading bullets
            .replace(/\s*[•\-\*\+]+\s*/g, ' ') // Remove internal bullets
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/^\s+|\s+$/g, '') // Trim whitespace
            .replace(/^Línea\s*\d+\.?\s*/i, '') // Remove "Línea X." prefix
            .trim();
    }

    updateCriteriaRatings(program) {
        const criteria = program.program?.criteria || {};
        
        console.log('Updating criteria ratings:', criteria);
        
        // Update each criteria rating with new structure
        const criteriaTypes = [
            'personal_relevance',
            'information_clarity', 
            'research_environment',
            'infrastructure',
            'training_activities'
        ];
        
        criteriaTypes.forEach(criterion => {
            const value = criteria[criterion] || 0;
            this.displayCriteriaRating(criterion, value);
        });
        
        // Update average
        const average = this.calculateCriteriaAverage(criteria);
        const averageElement = document.getElementById('criteria-average-value');
        if (averageElement) {
            averageElement.textContent = `${average.toFixed(1)}/5`;
        }
    }

    displayCriteriaRating(criterion, value) {
        // Update star display using new structure
        const starContainer = document.getElementById(`view-criteria-${criterion.replace('_', '-')}-stars`);
        if (starContainer) {
            const stars = starContainer.querySelectorAll('.criteria-star');
            stars.forEach((star, index) => {
                if (index < value) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }
        
        // Update active level item
        const criteriaBlock = document.querySelector(`[data-criteria="${criterion}"]`)?.parentElement?.parentElement;
        if (criteriaBlock) {
            const levelItems = criteriaBlock.querySelectorAll('.criteria-level-item');
            levelItems.forEach((item, index) => {
                const itemValue = parseInt(item.dataset.value);
                if (itemValue === value && value > 0) {
                    item.dataset.active = 'true';
                } else {
                    delete item.dataset.active;
                }
            });
        }
    }

    async updateCriteriaValue(criterion, value) {
        if (!this.currentUniversityData) {
            console.log('No current university data');
            return;
        }
        
        const currentProgram = this.currentUniversityData.programs[this.currentProgramIndex];
        console.log('Current program:', currentProgram.program.name);
        
        // Show confirmation dialog
        const confirmed = await this.showConfirmation(
            `¿Quieres actualizar la calificación de "${this.getCriterionLabel(criterion)}" a ${value} estrellas?`,
            `Programa: ${currentProgram.program.name}`
        );

        if (!confirmed) {
            return;
        }

        // Check if app is initialized
        if (!this.app.isInitialized) {
            console.warn('App not fully initialized yet');
            alert('La aplicación aún se está inicializando. Por favor espera un momento.');
            return;
        }

        try {
            // Update via SQLite database
            const programId = await this.findProgramIdByOriginalId(currentProgram._id);
            if (programId) {
                const criteriaUpdate = { [criterion]: value };
                await this.app.programService.updateProgramCriteria(programId, criteriaUpdate);
                
                // Update local data
                if (!currentProgram.program.criteria) {
                    currentProgram.program.criteria = {};
                }
                currentProgram.program.criteria[criterion] = value;
                
                // Refresh the modal content
                this.updateUniversityModalContent();
                
                console.log(`✅ Updated ${criterion} to ${value} for program:`, currentProgram.program.name);
            } else {
                throw new Error('Program not found in database');
            }
            
            // Update display
            this.displayCriteriaRating(criterion, value);
            
            // Update average
            const average = this.calculateCriteriaAverage(currentProgram.program.criteria);
            console.log('Calculated average:', average);
            
            const averageElement = document.getElementById('criteria-average-value');
            console.log('Average element found:', !!averageElement);
            
            if (averageElement) {
                const newText = `${average.toFixed(1)}/5`;
                console.log('Setting average text to:', newText);
                averageElement.textContent = newText;
            }
            
            console.log(`✅ Updated ${criterion} to ${value} for ${currentProgram.program.name} and saved to database`);
        } catch (error) {
            console.error('Failed to update criteria:', error);
            alert('Error al guardar cambios. Por favor intenta de nuevo.');
        }
    }

    /**
     * Update favorite button state
     */
    updateFavoriteButton(program) {
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn && program) {
            const isFavorite = program.program.is_favorite || false;
            const recordId = program._id;
            
            // Set the data attribute for the record ID
            favoriteBtn.setAttribute('data-record-id', recordId);
            
            // Update button state
            this.updateFavoriteButtonUI(isFavorite);
        }
    }

    /**
     * Get human-readable criterion label
     */
    getCriterionLabel(criterion) {
        const labels = {
            'personal_relevance': 'Relevancia Personal',
            'information_clarity': 'Claridad de Información',
            'research_environment': 'Ambiente de Investigación',
            'infrastructure': 'Infraestructura',
            'training_activities': 'Actividades de Formación'
        };
        return labels[criterion] || criterion;
    }

    calculateCriteriaAverage(criteria) {
        const values = Object.values(criteria || {}).filter(v => v > 0);
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    updateUniversityDetails(program) {
        const university = program.university || {};
        
        // Founded year
        const foundedElement = document.getElementById('universityFounded');
        if (foundedElement) {
            foundedElement.textContent = university.founded_year || 'N/A';
        }
        
        // Website
        const websiteElement = document.getElementById('universityWebsite');
        const websiteNAElement = document.getElementById('universityWebsiteNA');
        
        if (university.website && university.website.trim()) {
            if (websiteElement) {
                websiteElement.href = university.website;
                websiteElement.textContent = '🔗 Ver sitio web';
                websiteElement.style.display = 'inline';
            }
            if (websiteNAElement) {
                websiteNAElement.style.display = 'none';
            }
        } else {
            if (websiteElement) {
                websiteElement.style.display = 'none';
            }
            if (websiteNAElement) {
                websiteNAElement.style.display = 'inline';
            }
        }
        
        // University summary (AI analysis)
        const universitySummaryElement = document.getElementById('universitySummaryContent');
        if (universitySummaryElement) {
            const summary = program.ai_analysis?.university_summary;
            if (summary && summary.trim()) {
                universitySummaryElement.innerHTML = this.preprocessSummaryText(summary);
            } else {
                universitySummaryElement.innerHTML = '<p>No hay información disponible sobre la universidad.</p>';
            }
        }
    }

    /**
     * Update University AI metrics in the University tab
     */
    updateUniversityMetrics(program) {
        const metrics = program.ai_analysis?.program_metrics || {};
        
        // Update program AI metrics in University tab
        this.setElementValue('uniInnovacionTab', metrics.innovacion);
        this.setElementValue('uniInterdisciplinariedadTab', metrics.interdisciplinariedad);
        this.setElementValue('uniImpactoTab', metrics.impacto);
        this.setElementValue('uniInternacionalTab', metrics.internacional);
        this.setElementValue('uniAplicabilidadTab', metrics.aplicabilidad);
    }

    /**
     * Update City details in the University tab
     */
    updateCityDetails(program) {
        const city = program.city || {};
        
        // Madrid distance
        const distanceElement = document.getElementById('distanciaMadridTab');
        if (distanceElement) {
            const distance = city.distances?.madrid_km;
            if (distance !== undefined && distance !== null) {
                distanceElement.innerHTML = `<span class="metric-value">${distance} km</span>`;
            } else {
                distanceElement.innerHTML = '<span class="metric-value no-data">N/A</span>';
            }
        }
        
        // City summary (AI analysis)
        const citySummaryElement = document.getElementById('citySummaryContent');
        if (citySummaryElement) {
            const summary = program.ai_analysis?.city_summary;
            if (summary && summary.trim()) {
                citySummaryElement.innerHTML = this.preprocessSummaryText(summary);
            } else {
                citySummaryElement.innerHTML = '<p>No hay información disponible sobre la ciudad.</p>';
            }
        }
    }

    /**
     * Update City AI metrics in the University tab
     */
    updateCityAIMetrics(program) {
        const cityMetrics = program.ai_analysis?.city_metrics || {};
        
        // Update city AI metrics
        this.setElementValue('aiCostOfLivingTab', cityMetrics.cost_of_living);
        this.setElementValue('aiMedicalQualityTab', cityMetrics.medical_quality);
        this.setElementValue('aiTransportQualityTab', cityMetrics.transport_quality);
        this.setElementValue('aiAirQualityTab', cityMetrics.air_quality);
    }

    /**
     * Update City criteria (star ratings) from SQLite data
     */
    updateCityCriteria(program) {
        const criteria = program.city?.criteria || {};
        
        console.log('Updating city criteria from SQLite:', criteria);
        
        // Update each city criteria with star ratings
        this.displayCityCriteriaRating('cost_effectiveness', criteria.cost_effectiveness || 0);
        this.displayCityCriteriaRating('medical_services', criteria.medical_services || 0);
        this.displayCityCriteriaRating('transportation', criteria.transportation || 0);
        this.displayCityCriteriaRating('air_quality', criteria.air_quality || 0);
        this.displayCityCriteriaRating('weather', criteria.weather || 0);
    }

    /**
     * Note: File system access is now handled by SQLite database
     * This method is kept for compatibility but no longer needed
     */
    async initializeFileSystem() {
        // SQLite database is now used instead of FileSystemManager
        return this.app.isInitialized;
    }

    /**
     * Setup favorite button handler
     */
    setupFavoriteButtonHandler() {
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.favorite-btn')) {
                e.preventDefault();
                e.stopPropagation();
                await this.handleFavoriteToggle();
            }
        });
    }

    /**
     * Handle favorite toggle from modal
     */
    async handleFavoriteToggle() {
        if (!this.app.isInitialized) {
            alert('La aplicación aún se está inicializando. Por favor espera un momento.');
            return;
        }

        const currentProgram = this.getCurrentProgram();
        if (!currentProgram) return;

        const recordId = currentProgram._id;
        const currentFavoriteStatus = currentProgram.program.is_favorite || false;
        const newStatus = !currentFavoriteStatus;

        // Show confirmation dialog
        const confirmed = await this.showConfirmation(
            `¿Quieres ${newStatus ? 'marcar' : 'desmarcar'} este programa como favorito?`,
            `Programa: ${currentProgram.program.name}`
        );

        if (confirmed) {
            try {
                // Update via SQLite database
                const programId = await this.findProgramIdByOriginalId(recordId);
                if (programId) {
                    await this.app.programService.toggleFavorite(programId);
                    
                    // Update the current data
                    currentProgram.program.is_favorite = newStatus;
                    
                    // Update UI
                    this.updateFavoriteButtonUI(newStatus);
                    
                    console.log(`✅ Favorite toggled for program: ${currentProgram.program.name}`);
                } else {
                    throw new Error('Program not found in database');
                }
            } catch (error) {
                console.error('Failed to toggle favorite:', error);
                alert('Error al guardar cambios. Por favor intenta de nuevo.');
            }
        }
    }

    /**
     * Handle favorite toggle from map popup
     */
    async handleFavoriteToggleFromMap(universityName, programIndex) {
        if (!this.app.isInitialized) {
            alert('La aplicación aún se está inicializando. Por favor espera un momento.');
            return;
        }

        try {
            const programs = await this.app.dataUtils.getProgramsByUniversity(universityName);
            const program = programs[programIndex];
            
            if (!program) return;

            const recordId = program._id;
            const currentFavoriteStatus = program.program.is_favorite || false;
            const newStatus = !currentFavoriteStatus;

            // Show confirmation dialog
            const confirmed = await this.showConfirmation(
                `¿Quieres ${newStatus ? 'marcar' : 'desmarcar'} este programa como favorito?`,
                `Programa: ${program.program.name}`
            );

            if (confirmed) {
                try {
                    // Update via SQLite database
                    const programId = await this.findProgramIdByOriginalId(recordId);
                    if (programId) {
                        await this.app.programService.toggleFavorite(programId);
                        
                        // Update the data in memory
                        program.program.is_favorite = newStatus;
                        
                        // If modal is open for this program, update it
                        if (this.currentUniversityData && 
                            this.currentUniversityData.universityName === universityName &&
                            this.currentProgramIndex === programIndex) {
                            this.updateFavoriteButtonUI(newStatus);
                        }
                        
                        console.log(`✅ Favorite toggled from map for program: ${program.program.name}`);
                        
                        // Refresh the map popup
                        // Note: This will require a map refresh or popup update
                    } else {
                        throw new Error('Program not found in database');
                    }
                } catch (error) {
                    console.error('Failed to toggle favorite from map:', error);
                    alert('Error al guardar cambios. Por favor intenta de nuevo.');
                }
            }
        } catch (error) {
            console.error('Failed to handle favorite toggle from map:', error);
            alert('Error al procesar la solicitud. Por favor intenta de nuevo.');
        }
    }

    /**
     * Update favorite button UI
     */
    updateFavoriteButtonUI(isFavorite) {
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn) {
            const icon = favoriteBtn.querySelector('i');
            if (isFavorite) {
                favoriteBtn.classList.add('is-favorite');
                favoriteBtn.setAttribute('title', 'Quitar de favoritos');
                if (icon) {
                    icon.className = 'fas fa-heart';
                }
            } else {
                favoriteBtn.classList.remove('is-favorite');
                favoriteBtn.setAttribute('title', 'Marcar como favorito');
                if (icon) {
                    icon.className = 'far fa-heart';
                }
            }
        }
    }

    /**
     * Show confirmation dialog
     */
    async showConfirmation(message, details = '') {
        return new Promise((resolve) => {
            const confirmModal = document.getElementById('saveConfirmModal');
            if (confirmModal) {
                // Update modal content
                const messageElement = confirmModal.querySelector('p');
                if (messageElement) {
                    messageElement.innerHTML = `${message}${details ? `<br><small>${details}</small>` : ''}`;
                }
                
                // Setup event handlers
                const confirmBtn = document.getElementById('confirmSaveBtn');
                const cancelBtn = document.getElementById('cancelSaveBtn');
                
                const handleConfirm = () => {
                    confirmModal.style.display = 'none';
                    cleanup();
                    resolve(true);
                };
                
                const handleCancel = () => {
                    confirmModal.style.display = 'none';
                    cleanup();
                    resolve(false);
                };
                
                const cleanup = () => {
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleCancel);
                };
                
                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);
                
                // Show modal
                confirmModal.style.display = 'flex';
            } else {
                // Fallback to browser confirm
                resolve(confirm(message));
            }
        });
    }

    /**
     * Get current program being viewed
     */
    getCurrentProgram() {
        if (!this.currentUniversityData || !this.currentUniversityData.programs) {
            return null;
        }
        return this.currentUniversityData.programs[this.currentProgramIndex];
    }

    updateAIMetadata(program) {
        const aiAnalysis = program.ai_analysis || {};
        
        // Last enrichment date
        const lastEnrichmentElement = document.getElementById('lastEnrichment');
        if (lastEnrichmentElement) {
            if (aiAnalysis.last_enrichment) {
                const date = new Date(aiAnalysis.last_enrichment);
                lastEnrichmentElement.textContent = date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } else {
                lastEnrichmentElement.textContent = 'N/A';
            }
        }
        
        // Enrichment version
        const versionElement = document.getElementById('enrichmentVersion');
        if (versionElement) {
            versionElement.textContent = aiAnalysis.enrichment_version || 'N/A';
        }
    }

    // STEP-BY-STEP VALIDATION: Program Metrics
    updateProgramMetricsFromScratch(program) {
        console.log('=== PROGRAM METRICS DEBUG ===');
        console.log('Full program object:', program);
        console.log('AI analysis exists:', !!program.ai_analysis);
        console.log('Program metrics exists:', !!program.ai_analysis?.program_metrics);
        console.log('Program metrics data:', program.ai_analysis?.program_metrics);
        
        const metrics = program.ai_analysis?.program_metrics;
        if (!metrics) {
            console.log('❌ No program metrics found');
            return;
        }
        
        // Test each field individually
        console.log('Testing individual fields:');
        console.log('innovacion:', metrics.innovacion);
        console.log('interdisciplinariedad:', metrics.interdisciplinariedad);
        console.log('impacto:', metrics.impacto);
        console.log('internacional:', metrics.internacional);
        console.log('aplicabilidad:', metrics.aplicabilidad);
        
        // Test element access
        const innovationElement = document.getElementById('programInnovation');
        console.log('Innovation element found:', !!innovationElement);
        
        if (innovationElement && metrics.innovacion) {
            innovationElement.innerHTML = `<span class="metric-value">${metrics.innovacion}/10</span>`;
            console.log('✅ Set innovation to:', metrics.innovacion);
        }
        
        const interdisciplinarityElement = document.getElementById('programInterdisciplinarity');
        console.log('Interdisciplinarity element found:', !!interdisciplinarityElement);
        
        if (interdisciplinarityElement && metrics.interdisciplinariedad) {
            interdisciplinarityElement.innerHTML = `<span class="metric-value">${metrics.interdisciplinariedad}/10</span>`;
            console.log('✅ Set interdisciplinarity to:', metrics.interdisciplinariedad);
        }
        
        const impactElement = document.getElementById('programImpact');
        if (impactElement && metrics.impacto) {
            impactElement.innerHTML = `<span class="metric-value">${metrics.impacto}/10</span>`;
            console.log('✅ Set impact to:', metrics.impacto);
        }
        
        const internationalElement = document.getElementById('programInternational');
        if (internationalElement && metrics.internacional) {
            internationalElement.innerHTML = `<span class="metric-value">${metrics.internacional}/10</span>`;
            console.log('✅ Set international to:', metrics.internacional);
        }
        
        const applicabilityElement = document.getElementById('programApplicability');
        if (applicabilityElement && metrics.aplicabilidad) {
            applicabilityElement.innerHTML = `<span class="metric-value">${metrics.aplicabilidad}/10</span>`;
            console.log('✅ Set applicability to:', metrics.aplicabilidad);
        }
    }

    // STEP-BY-STEP VALIDATION: City Information
    updateCityInformationFromScratch(city, program) {
        console.log('=== CITY INFORMATION DEBUG ===');
        console.log('City object:', city);
        console.log('City criteria:', city.criteria);
        console.log('AI city metrics from program:', program.ai_analysis?.city_metrics);
        
        const cityCriteria = city.criteria || {};
        const aiCityMetrics = program.ai_analysis?.city_metrics || {};
        
        console.log('Manual city criteria fields:');
        console.log('cost_effectiveness:', cityCriteria.cost_effectiveness);
        console.log('medical_services:', cityCriteria.medical_services);
        console.log('transportation:', cityCriteria.transportation);
        console.log('air_quality:', cityCriteria.air_quality);
        console.log('weather:', cityCriteria.weather);
        
        console.log('AI city metrics fields:');
        console.log('cost_of_living:', aiCityMetrics.cost_of_living);
        console.log('medical_quality:', aiCityMetrics.medical_quality);
        console.log('transport_quality:', aiCityMetrics.transport_quality);
        console.log('air_quality:', aiCityMetrics.air_quality);
        
        // Test each field individually
        const costElement = document.getElementById('cityCostOfLiving');
        console.log('Cost element found:', !!costElement);
        const costValue = aiCityMetrics.cost_of_living || cityCriteria.cost_effectiveness;
        if (costElement && costValue) {
            costElement.innerHTML = `<span class="metric-value">${costValue}/10</span>`;
            console.log('✅ Set cost to:', costValue);
        }
        
        const airElement = document.getElementById('cityAirQuality');
        console.log('Air quality element found:', !!airElement);
        const airValue = aiCityMetrics.air_quality || cityCriteria.air_quality;
        if (airElement && airValue) {
            airElement.innerHTML = `<span class="metric-value">${airValue}/10</span>`;
            console.log('✅ Set air quality to:', airValue);
        }
        
        const transportElement = document.getElementById('cityTransportQuality');
        const transportValue = aiCityMetrics.transport_quality || cityCriteria.transportation;
        if (transportElement && transportValue) {
            transportElement.innerHTML = `<span class="metric-value">${transportValue}/10</span>`;
            console.log('✅ Set transport to:', transportValue);
        }
        
        const medicalElement = document.getElementById('cityMedicalQuality');
        const medicalValue = aiCityMetrics.medical_quality || cityCriteria.medical_services;
        if (medicalElement && medicalValue) {
            medicalElement.innerHTML = `<span class="metric-value">${medicalValue}/10</span>`;
            console.log('✅ Set medical to:', medicalValue);
        }
        
        const distanceElement = document.getElementById('cityDistanceMadrid');
        const distance = city.distances?.madrid_km;
        if (distanceElement && distance) {
            distanceElement.innerHTML = `<span class="distance-value">📍 ${distance} km</span>`;
            console.log('✅ Set distance to:', distance);
        }
        
        const weatherElement = document.getElementById('cityWeather');
        const weather = cityCriteria.weather;
        if (weatherElement) {
            if (weather && weather > 0) {
                weatherElement.innerHTML = `<span class="metric-value">${weather}/10</span>`;
                console.log('✅ Set weather to:', weather);
            } else {
                weatherElement.innerHTML = `<span class="metric-value no-data">N/A</span>`;
                console.log('❌ Weather is 0 or missing:', weather);
            }
        }
    }

    /**
     * Setup editable field handlers for program name, URL, and research lines
     */
    setupEditableFieldHandlers() {
        // Make program name editable
        const programNameElement = document.getElementById('programName');
        if (programNameElement) {
            this.makeElementEditable(programNameElement, 'program_name', 'Nombre del Programa');
        }

        // Make program URL editable
        const programUrlElement = document.getElementById('programUrl');
        if (programUrlElement) {
            this.makeElementEditable(programUrlElement, 'program_url', 'URL del Programa');
        }
        
        // Make research lines editable
        const researchLinesElement = document.getElementById('researchLinesList');
        if (researchLinesElement) {
            this.makeResearchLinesEditable(researchLinesElement);
        }
    }

    /**
     * Make an element editable with click-to-edit functionality
     */
    makeElementEditable(element, fieldName, fieldLabel) {
        element.style.cursor = 'pointer';
        element.title = `Clic para editar ${fieldLabel}`;
        
        // Add visual indicator for editable elements
        element.addEventListener('mouseenter', () => {
            element.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
            element.style.padding = '2px 4px';
            element.style.borderRadius = '3px';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.backgroundColor = '';
            element.style.padding = '';
            element.style.borderRadius = '';
        });

        element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startEditingField(element, fieldName, fieldLabel);
        });
    }

    /**
     * Start editing a field
     */
    async startEditingField(element, fieldName, fieldLabel) {
        const currentProgram = this.getCurrentProgram();
        if (!currentProgram) return;

        let currentValue = '';
        if (fieldName === 'program_name') {
            currentValue = currentProgram.program?.name || '';
        } else if (fieldName === 'program_url') {
            currentValue = currentProgram.program?.url || '';
        }

        // Create input element
        const input = document.createElement('input');
        input.type = fieldName === 'program_url' ? 'url' : 'text';
        input.value = currentValue;
        input.style.width = '100%';
        input.style.padding = '4px';
        input.style.border = '2px solid #007bff';
        input.style.borderRadius = '3px';
        input.style.fontSize = element.style.fontSize || 'inherit';

        // Store original content
        const originalContent = element.innerHTML;
        
        // Replace element content with input
        element.innerHTML = '';
        element.appendChild(input);
        input.focus();
        input.select();

        // Handle save/cancel
        const saveEdit = async () => {
            const newValue = input.value.trim();
            
            if (newValue !== currentValue) {
                const confirmed = await this.showConfirmation(
                    `¿Quieres actualizar "${fieldLabel}"?`,
                    `De: "${currentValue}"\nA: "${newValue}"`
                );
                
                if (confirmed) {
                    try {
                        await this.updateProgramField(currentProgram._id, fieldName, newValue);
                        
                        // Update the UI
                        if (fieldName === 'program_name') {
                            element.textContent = newValue;
                            currentProgram.program.name = newValue;
                        } else if (fieldName === 'program_url') {
                            if (newValue) {
                                element.innerHTML = '🔗 Ver programa oficial';
                                element.href = newValue;
                                element.style.display = 'inline';
                            } else {
                                element.parentElement.style.display = 'none';
                            }
                            currentProgram.program.url = newValue;
                        }
                        
                        console.log(`✅ Updated ${fieldName} for program: ${currentProgram.program.name}`);
                        return true;
                    } catch (error) {
                        console.error(`Failed to update ${fieldName}:`, error);
                        alert('Error al guardar cambios. Por favor intenta de nuevo.');
                        return false;
                    }
                }
            }
            
            // Restore original content if not saved
            element.innerHTML = originalContent;
            return false;
        };

        const cancelEdit = () => {
            element.innerHTML = originalContent;
        };

        // Save on Enter, cancel on Escape
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });

        // Save on blur (click outside)
        input.addEventListener('blur', saveEdit);
    }

    /**
     * Make research lines list editable
     */
    makeResearchLinesEditable(listElement) {
        listElement.style.cursor = 'pointer';
        listElement.title = 'Clic para editar líneas de investigación';
        
        // Add visual indicator
        listElement.addEventListener('mouseenter', () => {
            listElement.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
            listElement.style.padding = '8px';
            listElement.style.borderRadius = '5px';
        });
        
        listElement.addEventListener('mouseleave', () => {
            listElement.style.backgroundColor = '';
            listElement.style.padding = '';
            listElement.style.borderRadius = '';
        });

        listElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startEditingResearchLines(listElement);
        });
    }

    /**
     * Start editing research lines
     */
    async startEditingResearchLines(listElement) {
        const currentProgram = this.getCurrentProgram();
        if (!currentProgram) return;

        const currentLines = currentProgram.program?.research_lines || [];
        const currentText = currentLines.join('\n');

        // Create textarea element
        const textarea = document.createElement('textarea');
        textarea.value = currentText;
        textarea.style.width = '100%';
        textarea.style.minHeight = '120px';
        textarea.style.padding = '8px';
        textarea.style.border = '2px solid #007bff';
        textarea.style.borderRadius = '5px';
        textarea.style.fontSize = '14px';
        textarea.style.fontFamily = 'inherit';
        textarea.placeholder = 'Introduce cada línea de investigación en una línea separada...';

        // Store original content
        const originalContent = listElement.innerHTML;
        
        // Replace element content with textarea
        listElement.innerHTML = '';
        listElement.appendChild(textarea);
        textarea.focus();

        // Handle save/cancel
        const saveEdit = async () => {
            const newText = textarea.value.trim();
            const newLines = newText ? newText.split('\n').map(line => line.trim()).filter(line => line) : [];
            
            if (JSON.stringify(newLines) !== JSON.stringify(currentLines)) {
                const confirmed = await this.showConfirmation(
                    '¿Quieres actualizar las líneas de investigación?',
                    `Nuevo contenido: ${newLines.length} líneas`
                );
                
                if (confirmed) {
                    try {
                        await this.updateProgramField(currentProgram._id, 'research_lines', newLines);
                        
                        // Update the UI
                        currentProgram.program.research_lines = newLines;
                        if (newLines.length > 0) {
                            listElement.innerHTML = newLines
                                .map(line => `<li>${this.cleanResearchLine(line)}</li>`)
                                .join('');
                        } else {
                            listElement.innerHTML = '<li><em>Información no disponible</em></li>';
                        }
                        
                        console.log(`✅ Updated research lines for program: ${currentProgram.program.name}`);
                        return true;
                    } catch (error) {
                        console.error('Failed to update research lines:', error);
                        alert('Error al guardar cambios. Por favor intenta de nuevo.');
                        return false;
                    }
                }
            }
            
            // Restore original content if not saved
            listElement.innerHTML = originalContent;
            return false;
        };

        const cancelEdit = () => {
            listElement.innerHTML = originalContent;
        };

        // Save on Ctrl+Enter, cancel on Escape
        textarea.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                await saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });

        // Save on blur (click outside)
        textarea.addEventListener('blur', saveEdit);
    }

    /**
     * Update a program field via SQLite database
     */
    async updateProgramField(recordId, fieldName, value) {
        if (!this.app.isInitialized) {
            throw new Error('La aplicación no está inicializada');
        }

        const programId = await this.findProgramIdByOriginalId(recordId);
        if (!programId) {
            throw new Error('Programa no encontrado');
        }

        // Map field names to the correct database structure
        if (fieldName === 'program_name') {
            return await this.app.programService.updateProgram(programId, { name: value });
        } else if (fieldName === 'program_url') {
            return await this.app.programService.updateProgram(programId, { url: value });
        } else if (fieldName === 'research_lines') {
            return await this.app.programService.updateResearchLines(programId, value);
        }
        
        throw new Error(`Unknown field: ${fieldName}`);
    }

    /**
     * Helper method to find program database ID from original ID
     */
    async findProgramIdByOriginalId(originalId) {
        try {
            const programs = await this.app.programService.getAllPrograms();
            const program = programs.find(p => p._id === originalId);
            return program ? program.id : null;
        } catch (error) {
            console.error('Failed to find program ID:', error);
            return null;
        }
    }

    /**
     * Initialize dynamic modal positioning system
     */
    initializeDynamicModalPositioning() {
        // Set up mutation observer to watch for ribbon visibility changes
        this.observeRibbonChanges();
        
        // Initial positioning check
        this.adjustModalPositions();
    }

    /**
     * Observe ribbon visibility changes
     */
    observeRibbonChanges() {
        const ribbon = document.getElementById('saveIndicatorRibbon');
        if (!ribbon) return;

        // Use MutationObserver to watch for class changes
        this.ribbonObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    this.adjustModalPositions();
                }
            });
        });

        this.ribbonObserver.observe(ribbon, {
            attributes: true,
            attributeFilter: ['class']
        });

        // Also watch for style changes (display property)
        const styleObserver = new MutationObserver(() => {
            this.adjustModalPositions();
        });

        styleObserver.observe(ribbon, {
            attributes: true,
            attributeFilter: ['style']
        });
    }

    /**
     * Adjust modal positions based on ribbon visibility
     */
    adjustModalPositions() {
        const ribbon = document.getElementById('saveIndicatorRibbon');
        if (!ribbon) return;

        const isRibbonVisible = !ribbon.classList.contains('hidden') && 
                               ribbon.style.display !== 'none';
        
        let ribbonHeight = 0;
        if (isRibbonVisible) {
            ribbonHeight = ribbon.getBoundingClientRect().height;
        }

        console.log('🔧 Modal positioning:', {
            isRibbonVisible,
            ribbonHeight,
            ribbonClasses: ribbon.className,
            ribbonDisplay: ribbon.style.display
        });

        // Adjust university modal
        this.adjustUniversityModal(ribbonHeight);
        
        // Adjust confirmation modals
        this.adjustConfirmationModals(ribbonHeight);
    }

    /**
     * Adjust university modal position
     */
    adjustUniversityModal(ribbonHeight) {
        const modal = document.getElementById('universityModal');
        const modalContent = document.querySelector('.university-modal-content');
        
        if (!modal || !modalContent) return;

        if (ribbonHeight > 0) {
            // Calculate new top position
            const baseTopVh = 2; // Original 2vh
            const ribbonHeightVh = (ribbonHeight / window.innerHeight) * 100;
            const newTopVh = baseTopVh + ribbonHeightVh;

            modalContent.style.top = `${newTopVh}vh`;
            
            // Adjust height to compensate
            const newHeight = 96 - ribbonHeightVh;
            modalContent.style.height = `${newHeight}vh`;
        } else {
            // Reset to original position
            modalContent.style.top = '2vh';
            modalContent.style.height = '96vh';
        }
    }

    /**
     * Adjust confirmation modals position
     */
    adjustConfirmationModals(ribbonHeight) {
        const modals = [
            '#rating-confirm-modal',
            '#saveConfirmModal', 
            '#confirmModal'
        ];

        modals.forEach(selector => {
            const modal = document.querySelector(selector);
            const modalContent = modal?.querySelector('.modal-content');
            
            if (!modal || !modalContent) return;

            if (ribbonHeight > 0) {
                // Push modal content down by ribbon height
                modalContent.style.transform = `translateY(${ribbonHeight/2}px)`;
            } else {
                // Reset to center
                modalContent.style.transform = 'translateY(0)';
            }
        });
    }

    /**
     * Force update modal positions (for debugging)
     */
    forceUpdateModalPositions() {
        this.adjustModalPositions();
        console.log('🔧 Modal positions updated');
    }
}