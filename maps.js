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
    
    // Update the year filter in the transform (data layer is now index 2)
    if (spec.layer && spec.layer[2] && spec.layer[2].transform) {
        spec.layer[2].transform[0].filter = specKey.includes('income') 
            ? `year(datum.date) == ${year}`
            : `year(datum.date) == ${year} && (datum.sex == 'both')`; 
    }
    
    // Add stroke-based highlighting to data layer (now index 2)
    if (spec.layer && spec.layer[2] && spec.layer[2].encoding) {
        // Keep all states fully visible
        spec.layer[2].encoding.opacity = { "value": 1 };
        
        // If user clicked a state, highlight only that state
        // Otherwise, highlight both KL and Kelantan by default
        if (selectedState) {
            // User has selected a specific state
            spec.layer[2].encoding.strokeWidth = {
                "condition": {
                    "test": `datum.state === '${selectedState}'`,
                    "value": 5
                },
                "value": 1
            };
            
            spec.layer[2].encoding.stroke = {
                "condition": {
                    "test": `datum.state === '${selectedState}'`,
                    "value": "#ff8bc9ff"  // selected state
                },
                "value": "white"
            };
        } else {
            // Default: highlight both KL and Kelantan
            spec.layer[2].encoding.strokeWidth = {
                "condition": {
                    "test": "datum.state === 'Kuala Lumpur' || datum.state === 'Kelantan'",
                    "value": 5
                },
                "value": 1
            };
            
            spec.layer[2].encoding.stroke = {
                "condition": [
                    {
                        "test": "datum.state === 'Kuala Lumpur'",
                        "value": "#000000ff"  // prosperous (KL)
                    },
                    {
                        "test": "datum.state === 'Kelantan'",
                        "value": "#111111ff"  // struggling (Kelantan)
                    }
                ],
                "value": "white"
            };
        }
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
            
            // Update state tags to reflect map click
            document.querySelectorAll('.state-tag').forEach(t => t.classList.remove('active'));
            const clickedTag = document.querySelector(`.state-tag[data-state="${item.datum.state}"]`);
            if (clickedTag && selectedState) {
                clickedTag.classList.add('active');
            }
        } else if (!item || !item.datum) {
            // Clicking on background - reset to default (KL/Kelantan highlighted)
            handleStateClick(null);
            document.querySelectorAll('.state-tag').forEach(t => t.classList.remove('active'));
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
    // Add event listeners for year selectors
    const year1Select = document.getElementById('year1');
    const year2Select = document.getElementById('year2');
    
    if (year1Select) {
        year1Select.addEventListener('change', updateMaps);
    }
    
    if (year2Select) {
        year2Select.addEventListener('change', updateMaps);
    }
    
    // Add event listeners for state tag clicks
    document.querySelectorAll('.state-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            const stateName = this.getAttribute('data-state');
            
            // Remove active class from all tags
            document.querySelectorAll('.state-tag').forEach(t => t.classList.remove('active'));
            
            // Toggle selection
            if (selectedState === stateName) {
                handleStateClick(null); // Deselect - returns to default dual highlight
            } else {
                this.classList.add('active');
                handleStateClick(stateName);
            }
        });
    });
    
    // Add event listener for clear selection button
    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            handleStateClick(null); // Returns to default dual highlight
            document.querySelectorAll('.state-tag').forEach(t => t.classList.remove('active'));
        });
    }
    
    // Initial load - show both KL and Kelantan highlighted by default
    updateMaps();
});