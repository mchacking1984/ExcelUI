// ============================================
// Plotly Charts Module
// ============================================

// Color palette
const COLORS = {
    primary: '#2d5d8a',
    secondary: '#00b4d8',
    accent: '#48cae4',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    gray: '#6b7280',
    light: '#e5e7eb',
    benchmark: '#9ca3af'
};

// Common layout settings
const commonLayout = {
    font: {
        family: 'Inter, sans-serif',
        size: 12,
        color: '#374151'
    },
    paper_bgcolor: 'white',
    plot_bgcolor: 'white',
    margin: { t: 20, r: 20, b: 50, l: 60 },
    hovermode: 'x unified',
    showlegend: true,
    legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.02,
        xanchor: 'right',
        x: 1,
        bgcolor: 'rgba(255,255,255,0.8)'
    },
    xaxis: {
        gridcolor: '#f3f4f6',
        linecolor: '#e5e7eb',
        tickfont: { size: 11 }
    },
    yaxis: {
        gridcolor: '#f3f4f6',
        linecolor: '#e5e7eb',
        tickfont: { size: 11 },
        zeroline: true,
        zerolinecolor: '#e5e7eb'
    }
};

const plotConfig = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    responsive: true
};

// Cumulative performance chart
function renderCumulativeChart(elementId, fund, stats) {
    const nav = calculateNAV(fund.dailyReturns);
    const benchNav = calculateNAV(fund.benchmarkReturns);
    const dates = fund.dates;

    const traces = [
        {
            x: dates,
            y: nav,
            type: 'scatter',
            mode: 'lines',
            name: fund.name,
            line: { color: COLORS.primary, width: 2 },
            hovertemplate: '%{y:.2f}<extra>' + fund.name + '</extra>'
        },
        {
            x: dates,
            y: benchNav,
            type: 'scatter',
            mode: 'lines',
            name: 'S&P 500',
            line: { color: COLORS.benchmark, width: 1.5, dash: 'dot' },
            hovertemplate: '%{y:.2f}<extra>S&P 500</extra>'
        }
    ];

    const layout = {
        ...commonLayout,
        yaxis: {
            ...commonLayout.yaxis,
            title: 'NAV (Starting = 100)',
            tickformat: ',.0f'
        },
        xaxis: {
            ...commonLayout.xaxis,
            rangeslider: { visible: false },
            rangeselector: {
                buttons: [
                    { count: 6, label: '6M', step: 'month', stepmode: 'backward' },
                    { count: 1, label: '1Y', step: 'year', stepmode: 'backward' },
                    { count: 3, label: '3Y', step: 'year', stepmode: 'backward' },
                    { step: 'all', label: 'ALL' }
                ],
                bgcolor: '#f9fafb',
                activecolor: '#00b4d8'
            }
        }
    };

    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

// Monthly returns distribution
function renderDistributionChart(elementId, fund) {
    // Convert to monthly returns for histogram
    const monthly = monthlyReturns(fund.dailyReturns, fund.dates);
    const monthlyVals = [];
    for (const year of Object.keys(monthly)) {
        for (const month of Object.keys(monthly[year])) {
            monthlyVals.push(monthly[year][month] * 100);
        }
    }

    const traces = [{
        x: monthlyVals,
        type: 'histogram',
        nbinsx: 30,
        marker: {
            color: monthlyVals.map(v => v >= 0 ? COLORS.success : COLORS.danger),
            line: { color: 'white', width: 1 }
        },
        hovertemplate: 'Return: %{x:.1f}%<br>Count: %{y}<extra></extra>'
    }];

    const layout = {
        ...commonLayout,
        showlegend: false,
        xaxis: {
            ...commonLayout.xaxis,
            title: 'Monthly Return (%)'
        },
        yaxis: {
            ...commonLayout.yaxis,
            title: 'Frequency'
        },
        bargap: 0.05
    };

    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

// Yearly returns bar chart
function renderYearlyReturnsChart(elementId, fund, stats) {
    const ytd = stats.ytdReturns;
    const years = Object.keys(ytd).sort();
    const values = years.map(y => ytd[y] * 100);

    const traces = [{
        x: years,
        y: values,
        type: 'bar',
        marker: {
            color: values.map(v => v >= 0 ? COLORS.success : COLORS.danger),
            line: { color: 'white', width: 1 }
        },
        text: values.map(v => v.toFixed(1) + '%'),
        textposition: 'outside',
        hovertemplate: '%{x}: %{y:.2f}%<extra></extra>'
    }];

    const layout = {
        ...commonLayout,
        showlegend: false,
        xaxis: {
            ...commonLayout.xaxis,
            title: 'Year'
        },
        yaxis: {
            ...commonLayout.yaxis,
            title: 'Return (%)',
            zeroline: true,
            zerolinecolor: COLORS.gray,
            zerolinewidth: 1
        },
        bargap: 0.3
    };

    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

// Drawdown chart
function renderDrawdownChart(elementId, fund) {
    const dd = drawdownSeries(fund.dailyReturns).map(d => d * 100);
    const dates = fund.dates;

    const traces = [{
        x: dates,
        y: dd,
        type: 'scatter',
        mode: 'lines',
        fill: 'tozeroy',
        name: 'Drawdown',
        line: { color: COLORS.danger, width: 1 },
        fillcolor: 'rgba(239, 68, 68, 0.3)',
        hovertemplate: '%{y:.2f}%<extra>Drawdown</extra>'
    }];

    const layout = {
        ...commonLayout,
        showlegend: false,
        xaxis: {
            ...commonLayout.xaxis,
            rangeslider: { visible: false }
        },
        yaxis: {
            ...commonLayout.yaxis,
            title: 'Drawdown (%)',
            tickformat: ',.1f'
        }
    };

    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

// Rolling return chart
function renderRollingReturnChart(elementId, fund) {
    const rolling = rollingReturn(fund.dailyReturns, 252).map(r => r * 100);
    const dates = fund.dates.slice(251);

    const traces = [{
        x: dates,
        y: rolling,
        type: 'scatter',
        mode: 'lines',
        name: '12M Rolling Return',
        line: { color: COLORS.primary, width: 2 },
        hovertemplate: '%{y:.2f}%<extra>Rolling Return</extra>'
    }];

    const layout = {
        ...commonLayout,
        showlegend: false,
        yaxis: {
            ...commonLayout.yaxis,
            title: 'Annualized Return (%)',
            tickformat: ',.1f',
            zeroline: true,
            zerolinecolor: COLORS.gray
        }
    };

    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

// Rolling volatility chart
function renderRollingVolChart(elementId, fund) {
    const rolling = rollingVolatility(fund.dailyReturns, 252).map(v => v * 100);
    const dates = fund.dates.slice(251);

    const traces = [{
        x: dates,
        y: rolling,
        type: 'scatter',
        mode: 'lines',
        fill: 'tozeroy',
        name: '12M Rolling Vol',
        line: { color: COLORS.warning, width: 2 },
        fillcolor: 'rgba(245, 158, 11, 0.2)',
        hovertemplate: '%{y:.2f}%<extra>Rolling Volatility</extra>'
    }];

    const layout = {
        ...commonLayout,
        showlegend: false,
        yaxis: {
            ...commonLayout.yaxis,
            title: 'Annualized Volatility (%)',
            tickformat: ',.1f'
        }
    };

    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

// Rolling Sharpe chart
function renderRollingSharpeChart(elementId, fund) {
    const rolling = rollingSharpe(fund.dailyReturns, 252);
    const dates = fund.dates.slice(251);

    const traces = [{
        x: dates,
        y: rolling,
        type: 'scatter',
        mode: 'lines',
        name: '12M Rolling Sharpe',
        line: { color: COLORS.secondary, width: 2 },
        hovertemplate: '%{y:.2f}<extra>Rolling Sharpe</extra>'
    }];

    const layout = {
        ...commonLayout,
        showlegend: false,
        yaxis: {
            ...commonLayout.yaxis,
            title: 'Sharpe Ratio',
            zeroline: true,
            zerolinecolor: COLORS.gray
        }
    };

    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

// Rolling Beta chart
function renderRollingBetaChart(elementId, fund) {
    const rolling = rollingBeta(fund.dailyReturns, fund.benchmarkReturns, 252);
    const dates = fund.dates.slice(251);

    const traces = [{
        x: dates,
        y: rolling,
        type: 'scatter',
        mode: 'lines',
        name: '12M Rolling Beta',
        line: { color: COLORS.accent, width: 2 },
        hovertemplate: '%{y:.2f}<extra>Rolling Beta</extra>'
    }];

    const layout = {
        ...commonLayout,
        showlegend: false,
        yaxis: {
            ...commonLayout.yaxis,
            title: 'Beta to S&P 500',
            zeroline: true,
            zerolinecolor: COLORS.gray
        }
    };

    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

// Risk-Return scatter plot
function renderRiskReturnChart(elementId, allFundsStats, selectedFundId) {
    const x = [];
    const y = [];
    const text = [];
    const colors = [];
    const sizes = [];

    for (const [id, stats] of Object.entries(allFundsStats)) {
        const fund = FUND_DATA.funds[id];
        x.push(stats.annVol * 100);
        y.push(stats.annReturn * 100);
        text.push(fund.name);
        colors.push(parseInt(id) === selectedFundId ? COLORS.secondary : COLORS.primary);
        sizes.push(parseInt(id) === selectedFundId ? 16 : 10);
    }

    const traces = [{
        x: x,
        y: y,
        mode: 'markers+text',
        type: 'scatter',
        text: text,
        textposition: 'top center',
        textfont: { size: 10, color: COLORS.gray },
        marker: {
            size: sizes,
            color: colors,
            line: { color: 'white', width: 2 }
        },
        hovertemplate: '<b>%{text}</b><br>Return: %{y:.2f}%<br>Volatility: %{x:.2f}%<extra></extra>'
    }];

    // Add efficient frontier line (simplified)
    const sortedByVol = x.map((v, i) => ({ vol: v, ret: y[i] }))
        .sort((a, b) => a.vol - b.vol);

    const layout = {
        ...commonLayout,
        showlegend: false,
        xaxis: {
            ...commonLayout.xaxis,
            title: 'Annualized Volatility (%)'
        },
        yaxis: {
            ...commonLayout.yaxis,
            title: 'Annualized Return (%)'
        },
        annotations: [{
            x: RISK_FREE_RATE * 0,
            y: RISK_FREE_RATE * 100,
            text: 'Risk-Free Rate (4%)',
            showarrow: false,
            font: { size: 10, color: COLORS.gray }
        }],
        shapes: [{
            type: 'line',
            x0: 0,
            x1: Math.max(...x) * 1.1,
            y0: RISK_FREE_RATE * 100,
            y1: RISK_FREE_RATE * 100,
            line: { color: COLORS.light, width: 1, dash: 'dash' }
        }]
    };

    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

// Rankings horizontal bar chart
function renderRankingsChart(elementId, allFundsStats, metric, order) {
    const data = [];

    for (const [id, stats] of Object.entries(allFundsStats)) {
        const fund = FUND_DATA.funds[id];
        let value = stats[metric];

        // Convert to percentage for display
        if (['annReturn', 'annVol', 'maxDD', 'ytdReturn', 'totalReturn'].includes(metric)) {
            value = value * 100;
        }

        data.push({
            name: fund.name,
            value: value,
            strategy: fund.strategy
        });
    }

    // Sort
    data.sort((a, b) => order === 'desc' ? b.value - a.value : a.value - b.value);

    const isNegativeMetric = metric === 'maxDD' || metric === 'annVol';
    const formatSuffix = ['annReturn', 'annVol', 'maxDD', 'ytdReturn', 'totalReturn'].includes(metric) ? '%' : '';

    const traces = [{
        y: data.map(d => d.name),
        x: data.map(d => d.value),
        type: 'bar',
        orientation: 'h',
        marker: {
            color: data.map(d => {
                if (isNegativeMetric) {
                    return Math.abs(d.value) < Math.abs(mean(data.map(x => x.value))) ? COLORS.success : COLORS.danger;
                }
                return d.value >= 0 ? COLORS.primary : COLORS.danger;
            }),
            line: { color: 'white', width: 1 }
        },
        text: data.map(d => d.value.toFixed(2) + formatSuffix),
        textposition: 'outside',
        hovertemplate: '<b>%{y}</b><br>Value: %{x:.2f}' + formatSuffix + '<extra></extra>'
    }];

    const layout = {
        ...commonLayout,
        showlegend: false,
        margin: { t: 20, r: 80, b: 50, l: 180 },
        xaxis: {
            ...commonLayout.xaxis,
            title: getMetricLabel(metric)
        },
        yaxis: {
            ...commonLayout.yaxis,
            automargin: true
        },
        bargap: 0.2
    };

    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

// Helper to get metric labels
function getMetricLabel(metric) {
    const labels = {
        annReturn: 'Annualized Return (%)',
        annVol: 'Annualized Volatility (%)',
        sharpe: 'Sharpe Ratio',
        sortino: 'Sortino Ratio',
        maxDD: 'Max Drawdown (%)',
        calmar: 'Calmar Ratio',
        ytdReturn: 'YTD Return (%)',
        totalReturn: 'Total Return (%)'
    };
    return labels[metric] || metric;
}
