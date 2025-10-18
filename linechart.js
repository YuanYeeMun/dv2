// Define scale ranges for summed total participation rates
const lineScaleRanges = {
    'both': [1029, 1088],      
    'female': [734, 820],     
    'male': [1173, 1215]      
};

function createLineChartSpec(selectedSex) {
    return {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": {"url": "lfs_state_sex.csv"},
        "autosize": {
            "type": "fit-x",
            "contains": "padding"
        },
        "vconcat": [
            {
                "width": "container",
                "height": 300,
                "title": {
                    "text": `Cumulative State Participation Rates (2012–2022) - ${selectedSex.charAt(0).toUpperCase() + selectedSex.slice(1)}`,
                    "fontSize": 18,
                    "font": "Arial",
                    "anchor": "middle",
                    "fontWeight": "bold"
                },
                "transform": [
                    {"filter": `datum.sex == '${selectedSex}'`},
                    {"calculate": "toDate(datum.date)", "as": "date_parsed"},
                    {"filter": "year(datum.date_parsed) >= 2012 && year(datum.date_parsed) <= 2022"},
                    {
                        "aggregate": [{
                            "op": "sum",
                            "field": "p_rate",
                            "as": "total_p_rate"
                        }],
                        "groupby": ["date_parsed"]
                    }
                ],
                "layer": [
                    {
                        "mark": {"type": "area", "color": "#1f77b4", "opacity": 0.3},
                        "encoding": {
                            "x": {
                                "field": "date_parsed",
                                "type": "temporal",
                                "title": "",
                                "scale": {"domain": {"param": "brush"}},
                                "axis": {
                                    "labelFontSize": 10,
                                    "format": "%b %Y",
                                    "tickCount": {"interval": "month", "step": 6},
                                    "labelExpr": "month(datum.value) == 0 ? timeFormat(datum.value, '%Y') : timeFormat(datum.value, '%b')",
                                    "labelFontWeight": {"expr": "month(datum.value) == 0 ? 'bold' : 'normal'"}
                                }
                            },
                            "y": {
                                "field": "total_p_rate",
                                "type": "quantitative",
                                "title": "Sum of State Participation Rates",  // Removed % symbol
                                "scale": {"zero": false, "nice": true},
                                "axis": {"labelFontSize": 12, "titleFontSize": 14}
                            }
                        }
                    },
                    {
                        "mark": {"type": "line", "strokeWidth": 3, "color": "#1f77b4"},
                        "encoding": {
                            "x": {
                                "field": "date_parsed",
                                "type": "temporal",
                                "scale": {"domain": {"param": "brush"}}
                            },
                            "y": {"field": "total_p_rate", "type": "quantitative"}
                        }
                    },
                    {
                        "mark": {"type": "point", "size": 100, "filled": true, "color": "#1f77b4"},
                        "encoding": {
                            "x": {
                                "field": "date_parsed",
                                "type": "temporal",
                                "scale": {"domain": {"param": "brush"}}
                            },
                            "y": {"field": "total_p_rate", "type": "quantitative"},
                            "tooltip": [
                                {"field": "date_parsed", "type": "temporal", "title": "Date", "format": "%b %Y"},
                                {"field": "total_p_rate", "type": "quantitative", "title": "Sum of State Rates", "format": ".2f"}  // Updated tooltip
                            ]
                        }
                    }
                ]
            },
            {
                "width": "container",
                "height": 60,
                "title": "Use this chart to filter data by time",
                "transform": [
                    {"filter": `datum.sex == '${selectedSex}'`},
                    {"calculate": "toDate(datum.date)", "as": "date_parsed"},
                    {"filter": "year(datum.date_parsed) >= 2012 && year(datum.date_parsed) <= 2022"},
                    {
                        "aggregate": [{
                            "op": "sum",
                            "field": "p_rate",
                            "as": "total_p_rate"
                        }],
                        "groupby": ["date_parsed"]
                    }
                ],
                "params": [
                    {
                        "name": "brush",
                        "select": {"type": "interval", "encodings": ["x"]}
                    }
                ],
                "mark": {"type": "area", "color": "#1f77b4", "opacity": 0.5},
                "encoding": {
                    "x": {
                        "field": "date_parsed",
                        "type": "temporal",
                        "axis": {
                            "title": "Year",
                            "labelAngle": 0,
                            "labelFontSize": 11,
                            "format": "%Y",
                            "tickCount": "year",
                            "labelFontWeight": "bold"
                        }
                    },
                    "y": {
                        "field": "total_p_rate",
                        "type": "quantitative",
                        "axis": {"tickCount": 3, "grid": false},
                        "title": "Cumulative Rate"  // Updated title
                    }
                }
            }
        ],
        "config": {"view": {"strokeWidth": 0}}
    };
}

let lineChartView;

function renderLineChart(selectedSex = 'both') {
    const spec = createLineChartSpec(selectedSex);
    
    vegaEmbed('#line-chart', spec, {
        actions: {
            export: true,
            source: false,
            compiled: false,
            editor: false
        }
    }).then(result => {
        console.log("✓ Line chart loaded successfully with sex:", selectedSex);
        lineChartView = result.view;
        window.lineChartView = result.view;
    }).catch(error => {
        console.error("Line chart error:", error);
        document.getElementById('line-chart').innerHTML = 
            '<p style="color: red; padding: 20px;">Error loading line chart: ' + error.message + '</p>';
    });
}

// Initial render
document.addEventListener('DOMContentLoaded', function() {
    renderLineChart('both');
    
    // Listen for sex filter changes from heatmap
    window.addEventListener('sexFilterChanged', function(event) {
        const selectedSex = event.detail.sex;
        console.log("Line chart updating to sex:", selectedSex);
        renderLineChart(selectedSex);
    });
});