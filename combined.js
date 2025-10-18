let specTemplate = null;

async function loadSpecTemplate() {
    try {
        const response = await fetch('combined_chart_config.json');
        specTemplate = await response.json();
        console.log('Loaded spec template successfully');
        return specTemplate;
    } catch (error) {
        console.error('Error loading spec template:', error);
        return null;
    }
}

async function loadIncomeData() {
    try {
        const response = await fetch('hh_income_state.csv');
        const text = await response.text();
        
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.trim();
            });
            return row;
        });
        
        return data;
    } catch (error) {
        console.error('Error loading income data:', error);
        return [];
    }
}

async function loadUnemploymentData() {
    try {
        const response = await fetch('lfs_state_sex.csv');
        const text = await response.text();
        
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.trim();
            });
            return row;
        });
        
        return data;
    } catch (error) {
        console.error('Error loading unemployment data:', error);
        return [];
    }
}

async function processData(divergingYear) {
    const incomeData = await loadIncomeData();
    const unemploymentData = await loadUnemploymentData();
    
    // Scatter data - ALWAYS 2022
    const scatterIncomeData = incomeData.filter(row => {
        const date = new Date(row.date);
        return date.getFullYear() === 2022;
    });
    
    const scatterUnemploymentData = unemploymentData.filter(row => {
        const date = new Date(row.date);
        return date.getFullYear() === 2022 && row.sex === 'both';
    });
    
    const scatterData = scatterIncomeData.map(row => {
        const unemploymentRow = scatterUnemploymentData.find(u => u.state === row.state);
        
        return {
            state: row.state,
            income_median: parseFloat(row.income_median),
            income_percentile: parseFloat(row.income_percentile), 
            u_rate: unemploymentRow ? parseFloat(unemploymentRow.u_rate) : null
        };
    }).filter(d => d.u_rate !== null);
    
    // Diverging data - changes based on year selector
    const divergingIncomeData = incomeData.filter(row => {
        const date = new Date(row.date);
        return date.getFullYear() === parseInt(divergingYear);
    });
    
    const medians = divergingIncomeData.map(row => parseFloat(row.income_median));
    const nationalAvg = medians.reduce((a, b) => a + b, 0) / medians.length;
    
    const divergingData = divergingIncomeData.map(row => {
        const stateMedian = parseFloat(row.income_median);
        const percentDiff = ((stateMedian - nationalAvg) / nationalAvg) * 100;
        
        return {
            state: row.state,
            percent_diff: percentDiff,
            median: stateMedian,
            category: percentDiff >= 0 ? 'Above Average' : 'Below Average'
        };
    });
    
    return { scatterData, divergingData };
}

function createCombinedChart(scatterData, divergingData, divergingYear) {
    if (!specTemplate) {
        console.error('Spec template not loaded');
        return;
    }
    
    // Clone the template
    const spec = JSON.parse(JSON.stringify(specTemplate.combined_chart));
    
    // Populate the scatter chart data (first chart in hconcat[0])
    spec.hconcat[0].data.values = scatterData;
    
    // ADD BLACK STROKE HIGHLIGHTING TO SCATTER PLOT for KL and Kelantan
    // Find the point mark layer (first layer)
    const pointLayer = spec.hconcat[0].layer[0];
    
    // Add stroke width encoding
    pointLayer.encoding.strokeWidth = {
        "condition": {
            "test": "datum.state === 'Kuala Lumpur' || datum.state === 'Kelantan'",
            "value": 3
        },
        "value": 0
    };
    
    // Add BLACK stroke color for both KL and Kelantan
    pointLayer.encoding.stroke = {
        "condition": {
            "test": "datum.state === 'Kuala Lumpur' || datum.state === 'Kelantan'",
            "value": "#000000"  // BLACK for both KL and Kelantan
        },
        "value": "transparent"
    };
    
    // Populate the diverging chart data (second chart in hconcat[1])
    spec.hconcat[1].data.values = divergingData;
    
    // KEEP ORIGINAL BAR COLORS - don't modify the color encoding
    // The original colors from the template will be preserved
    
    // ADD BLACK STROKE HIGHLIGHTING TO BAR CHART for KL and Kelantan ONLY
    spec.hconcat[1].encoding.strokeWidth = {
        "condition": {
            "test": "datum.state === 'Kuala Lumpur' || datum.state === 'Kelantan'",
            "value": 3
        },
        "value": 0
    };
    
    // Add BLACK stroke for both KL and Kelantan
    spec.hconcat[1].encoding.stroke = {
        "condition": {
            "test": "datum.state === 'Kuala Lumpur' || datum.state === 'Kelantan'",
            "value": "#000000"  // BLACK for both KL and Kelantan
        },
        "value": "transparent"
    };
    
    // Render the combined chart
    vegaEmbed('#combined-chart-container', spec, { actions: false })
        .then(() => console.log('✓ Combined chart rendered successfully'))
        .catch(err => console.error('Error rendering combined chart:', err));
}

async function updateCharts() {
    if (!specTemplate) {
        await loadSpecTemplate();
    }
    
    const divergingYear = document.getElementById('diverging-year').value;
    
    const { scatterData, divergingData } = await processData(divergingYear);
    
    const chartContainer = document.getElementById('combined-chart-container');
    
    // CHECK FOR NO DATA FIRST! (This must come before trying to create the chart)
    if (divergingData.length === 0) {
        // Display "Data not available" message
        chartContainer.innerHTML = `
            <div style="width: 100%; text-align: center; padding: 100px 40px; background-color: #f9f9f9; border-radius: 8px; border: 2px solid #ddd;">
                <h2 style="color: #666; font-size: 32px; margin-bottom: 15px;">Data Not Available</h2>
                <p style="color: #999; font-size: 18px;">No data available for year ${divergingYear}</p>
                <p style="color: #999; font-size: 16px; margin-top: 10px;">Available years: 2012, 2014, 2016, 2019, 2022</p>
            </div>
        `;
        return;
    }
    
    // ONLY create chart if data exists
    if (scatterData.length > 0 && divergingData.length > 0) {
        createCombinedChart(scatterData, divergingData, divergingYear);
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', async function() {
    await loadSpecTemplate();
    
    const divergingYearSelect = document.getElementById('diverging-year');
    
    if (divergingYearSelect) {
        divergingYearSelect.addEventListener('change', updateCharts);
        updateCharts();
    }
});