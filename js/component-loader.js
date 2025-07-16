export class ComponentLoader {
    constructor() {
        this.loadedComponents = new Map();
    }

    // Load HTML component and insert into target element
    async loadComponent(componentPath, targetElementId) {
        try {
            // Check if component is already loaded
            if (this.loadedComponents.has(componentPath)) {
                const cached = this.loadedComponents.get(componentPath);
                document.getElementById(targetElementId).innerHTML = cached;
                return cached;
            }

            // Fetch component HTML
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentPath}`);
            }
            
            const html = await response.text();
            
            // Cache the component
            this.loadedComponents.set(componentPath, html);
            
            // Insert into target element
            const targetElement = document.getElementById(targetElementId);
            if (targetElement) {
                targetElement.innerHTML = html;
                console.log(`✅ Loaded component: ${componentPath}`);
            } else {
                console.error(`❌ Target element not found: ${targetElementId}`);
            }
            
            return html;
        } catch (error) {
            console.error(`❌ Error loading component ${componentPath}:`, error);
            return null;
        }
    }

    // Load multiple components in parallel
    async loadComponents(components) {
        const promises = components.map(({ path, target }) => 
            this.loadComponent(path, target)
        );
        
        try {
            const results = await Promise.all(promises);
            console.log(`✅ Loaded ${results.filter(r => r).length}/${components.length} components`);
            return results;
        } catch (error) {
            console.error('❌ Error loading components:', error);
            return [];
        }
    }

    // Clear component cache
    clearCache() {
        this.loadedComponents.clear();
        console.log('🧹 Component cache cleared');
    }

    // Get loaded component HTML (useful for debugging)
    getLoadedComponent(componentPath) {
        return this.loadedComponents.get(componentPath);
    }

    // Check if component is loaded
    isComponentLoaded(componentPath) {
        return this.loadedComponents.has(componentPath);
    }
}

// Create global instance
export const componentLoader = new ComponentLoader();