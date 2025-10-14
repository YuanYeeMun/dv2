// Define scale ranges for each sex category with threshold
const scaleRanges = {
    'both': {
        type: "threshold",
        domain: [60, 65, 70, 75],
        range: ["#DBF1FF", "#85c1e9", "#3498db", "#21618c", "#154360"]
    },
    'female': {
        type: "threshold",
        domain: [45, 50, 55, 60],
        range: ["#DBF1FF", "#85c1e9", "#3498db", "#21618c", "#154360"]
    },
    'male': {
        type: "threshold",
        domain: [75, 80, 85, 90],
        range: ["#DBF1FF", "#85c1e9", "#3498db", "#21618c", "#154360"]
    }
};

function createHeatmapSpec(selectedSex) {
    return {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": {"url": "lfs_state_sex.csv"},
        "transform": [
            {"filter": `datum.sex == '${selectedSex}'`},
            {"calculate": "year(datum.date)", "as": "year"},  
            {"filter": "datum.year >= 2012 && datum.year <= 2022"}
        ],
        "title": {
            "text": `Participation Rate by State (2012-2022) - ${selectedSex.charAt(0).toUpperCase() + selectedSex.slice(1)}`,
            "fontSize": 18,
            "font": "Arial",
            "anchor": "middle",
            "fontWeight": "bold"
        },
        "width": "container",
        "height": 400,
        "mark": {
            "type": "rect",
            "stroke": "white",
            "strokeWidth": 1
        },
        "encoding": {
            "x": {
                "field": "year",
                "type": "ordinal",
                "title": "Year",
                "axis": {
                    "labelAngle": 0,
                    "labelFontSize": 12,
                    "titleFontSize": 14
                }
            },
            "y": {
                "field": "state",
                "type": "nominal",
                "title": "State",
                "sort": {"field": "p_rate", "op": "mean", "order": "descending"},
                "axis": {
                    "labelFontSize": 11,
                    "titleFontSize": 14
                }
            },
            "color": {
                "field": "p_rate",
                "type": "quantitative",
                "title": "Participation Rate (%)",
                "scale": {
                    "type": scaleRanges[selectedSex].type,
                    "domain": scaleRanges[selectedSex].domain,
                    "range": scaleRanges[selectedSex].range
                },
                "legend": {
                    "direction": "horizontal",
                    "orient": "bottom",
                    "gradientLength": 300,
                    "titleFontSize": 12,
                    "labelFontSize": 11
                }
            },
            "tooltip": [
                {"field": "state", "type": "nominal", "title": "State"},
                {"field": "year", "type": "ordinal", "title": "Year"},
                {"field": "sex", "type": "nominal", "title": "Sex"},
                {"field": "p_rate", "type": "quantitative", "title": "Participation Rate (%)", "format": ".2f"}
            ]
        },
        "config": {
            "view": {"strokeWidth": 0}
        }
    };
}

let heatmapView;

// Render heatmap function
function renderHeatmap(selectedSex = 'both') {
    const spec = createHeatmapSpec(selectedSex);
    
    vegaEmbed('#heatmap-chart', spec, {
        actions: {
            export: true,
            source: false,
            compiled: false,
            editor: false
        }
    }).then(result => {
        console.log("✓ Heatmap loaded successfully with sex:", selectedSex);
        heatmapView = result.view;
    }).catch(error => {
        console.error("Heatmap error:", error);
        document.getElementById('heatmap-chart').innerHTML = 
            '<p style="color: red; padding: 20px;">Error loading heatmap: ' + error.message + '<br>Check that lfs_state_sex.csv is in the correct location.</p>';
    });
}

// Listen to HTML dropdown changes
document.addEventListener('DOMContentLoaded', function() {
    // Initial render with default 'both'
    renderHeatmap('both');
    
    const sexDropdown = document.getElementById('sex-filter');
    if (sexDropdown) {
        sexDropdown.addEventListener('change', function() {
            const selectedSex = this.value;
            console.log("Sex filter changed to:", selectedSex);
            
            // Re-render heatmap with new scale
            renderHeatmap(selectedSex);
            
            // Notify line chart
            window.dispatchEvent(new CustomEvent('sexFilterChanged', { detail: { sex: selectedSex } }));
        });
    } else {
        console.error("Sex filter dropdown not found!");
    }
});