// Store loaded specs and current state
let specsData = null;
let selectedState = null;
let vegaViews = {}; // Store Vega views for each map

// Load the maps config JSON file
async function loadSpecs() {
    try {
        const response = await fetch('maps_config.json');
        specsData = await response.json();
        return specsData;
    } catch (error) {
        console.error('Error loading maps_config.json:', error);
        return null;
    }
}

// Get spec from loaded data and modify for specific year with selection support
function getSpecForYear(specKey, year) {
    if (!specsData || !specsData[specKey]) {
        console.error(`Spec ${specKey} not found`);
        return null;
    }
    
    // Clone the spec to avoid modifying the original
    const spec = JSON.parse(JSON.stringify(specsData[specKey]));
    
    // Update the year filter in the transform
    if (spec.layer && spec.layer[1] && spec.layer[1].transform) {
        spec.layer[1].transform[0].filter = specKey.includes('income') 
            ? `year(datum.date) == ${year}`
            : `year(datum.date) == ${year} && (datum.sex == 'both')`; 
    }
    
    // Add conditional opacity based on selection
    if (spec.layer && spec.layer[1] && spec.layer[1].encoding) {
        spec.layer[1].encoding.opacity = {
            "condition": {
                "test": selectedState ? `datum.state === '${selectedState}'` : "true",
                "value": 1
            },
            "value": 0.2
        };
        
        // Also reduce stroke opacity for non-selected states
        spec.layer[1].mark.strokeOpacity = 0.5;
    }
    
    return spec;
}

// Function to handle state selection
function handleStateClick(stateName) {
    // Toggle selection: if clicking same state, deselect
    if (selectedState === stateName) {
        selectedState = null;
    } else {
        selectedState = stateName;
    }
    
    // Update all maps
    updateMaps();
}

// Add click listeners to a Vega view
function addClickListener(view, mapId) {
    view.addEventListener('click', function(event, item) {
        if (item && item.datum && item.datum.state) {
            handleStateClick(item.datum.state);
        } else if (!item || !item.datum) {
            // Clicking on background - deselect
            handleStateClick(null);
        }
    });
}

// Function to update all maps
async function updateMaps() {
    // Load specs if not already loaded
    if (!specsData) {
        await loadSpecs();
    }
    
    if (!specsData) {
        console.error('Failed to load specs');
        return;
    }
    
    const year1Select = document.getElementById('year1');
    const year2Select = document.getElementById('year2');
    
    // Check if elements exist
    if (!year1Select || !year2Select) {
        console.error('Year selector elements not found');
        return;
    }
    
    const year1 = year1Select.value;
    const year2 = year2Select.value;

    // Update labels safely
    const labelIncome1 = document.getElementById('label-income-year1');
    const labelUnemployment1 = document.getElementById('label-unemployment-year1');
    const labelIncome2 = document.getElementById('label-income-year2');
    const labelUnemployment2 = document.getElementById('label-unemployment-year2');
    
    if (labelIncome1) labelIncome1.textContent = year1;
    if (labelUnemployment1) labelUnemployment1.textContent = year1;
    if (labelIncome2) labelIncome2.textContent = year2;
    if (labelUnemployment2) labelUnemployment2.textContent = year2;

    // Get specs and embed maps
    const incomeSpec1 = getSpecForYear('income_2012', year1);
    const unemploymentSpec1 = getSpecForYear('unemployment_2012', year1);
    const incomeSpec2 = getSpecForYear('income_2022', year2);
    const unemploymentSpec2 = getSpecForYear('unemployment_2022', year2);

    // Embed maps and store their views
    if (incomeSpec1) {
        vegaEmbed('#income-year1', incomeSpec1, {actions: false}).then(result => {
            vegaViews['income-year1'] = result.view;
            addClickListener(result.view, 'income-year1');
        });
    }
    
    if (unemploymentSpec1) {
        vegaEmbed('#unemployment-year1', unemploymentSpec1, {actions: false}).then(result => {
            vegaViews['unemployment-year1'] = result.view;
            addClickListener(result.view, 'unemployment-year1');
        });
    }
    
    if (incomeSpec2) {
        vegaEmbed('#income-year2', incomeSpec2, {actions: false}).then(result => {
            vegaViews['income-year2'] = result.view;
            addClickListener(result.view, 'income-year2');
        });
    }
    
    if (unemploymentSpec2) {
        vegaEmbed('#unemployment-year2', unemploymentSpec2, {actions: false}).then(result => {
            vegaViews['unemployment-year2'] = result.view;
            addClickListener(result.view, 'unemployment-year2');
        });
    }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', function() {
    // Add event listeners
    const year1Select = document.getElementById('year1');
    const year2Select = document.getElementById('year2');
    
    if (year1Select) {
        year1Select.addEventListener('change', updateMaps);
    }
    
    if (year2Select) {
        year2Select.addEventListener('change', updateMaps);
    }
    
    // Initial load
    updateMaps();
});