// ============================================
// Plotly Charts Module - Ultra Enhanced
// ============================================

const COLORS = {
    primary: '#2d5d8a',
    secondary: '#00b4d8',
    accent: '#48cae4',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    gray: '#6b7280',
    light: '#e5e7eb',
    benchmark: '#9ca3af',
    purple: '#8b5cf6',
    pink: '#ec4899',
    palette: ['#2d5d8a', '#00b4d8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316']
};

const commonLayout = {
    font: { family: 'Inter, sans-serif', size: 12, color: '#374151' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    margin: { t: 20, r: 20, b: 50, l: 60 },
    hovermode: 'x unified',
    showlegend: true,
    legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1 },
    xaxis: { gridcolor: '#f3f4f6', linecolor: '#e5e7eb', tickfont: { size: 11 } },
    yaxis: { gridcolor: '#f3f4f6', linecolor: '#e5e7eb', tickfont: { size: 11 }, zeroline: true, zerolinecolor: '#e5e7eb' }
};

const plotConfig = { displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'], responsive: true };

// Update layout for dark mode
function getLayout(customLayout = {}) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const base = { ...commonLayout };
    if (isDark) {
        base.font.color = '#e5e7eb';
        base.xaxis.gridcolor = '#374151';
        base.xaxis.linecolor = '#4b5563';
        base.yaxis.gridcolor = '#374151';
        base.yaxis.linecolor = '#4b5563';
        base.yaxis.zerolinecolor = '#4b5563';
    }
    return { ...base, ...customLayout };
}

function renderCumulativeChart(elementId, fund, stats) {
    const nav = calculateNAV(fund.dailyReturns);
    const benchNav = calculateNAV(fund.benchmarkReturns);
    const traces = [
        { x: fund.dates, y: nav, type: 'scatter', mode: 'lines', name: fund.name, line: { color: COLORS.primary, width: 2 } },
        { x: fund.dates, y: benchNav, type: 'scatter', mode: 'lines', name: 'S&P 500', line: { color: COLORS.benchmark, width: 1.5, dash: 'dot' } }
    ];
    const layout = getLayout({
        yaxis: { ...commonLayout.yaxis, title: 'NAV', tickformat: ',.0f' },
        xaxis: { ...commonLayout.xaxis, rangeselector: { buttons: [
            { count: 6, label: '6M', step: 'month', stepmode: 'backward' },
            { count: 1, label: '1Y', step: 'year', stepmode: 'backward' },
            { count: 3, label: '3Y', step: 'year', stepmode: 'backward' },
            { step: 'all', label: 'ALL' }
        ]}}
    });
    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

function renderDistributionChart(elementId, fund) {
    const monthly = monthlyReturns(fund.dailyReturns, fund.dates);
    const monthlyVals = [];
    Object.values(monthly).forEach(year => Object.values(year).forEach(v => monthlyVals.push(v * 100)));
    const traces = [{ x: monthlyVals, type: 'histogram', nbinsx: 25, marker: { color: COLORS.primary, line: { color: 'white', width: 1 } } }];
    Plotly.newPlot(elementId, traces, getLayout({ showlegend: false, xaxis: { ...commonLayout.xaxis, title: 'Monthly Return (%)' }, yaxis: { ...commonLayout.yaxis, title: 'Count' } }), plotConfig);
}

function renderYearlyReturnsChart(elementId, fund, stats) {
    const ytd = stats.ytdReturns;
    const years = Object.keys(ytd).sort();
    const values = years.map(y => ytd[y] * 100);
    const traces = [{ x: years, y: values, type: 'bar', marker: { color: values.map(v => v >= 0 ? COLORS.success : COLORS.danger) }, text: values.map(v => v.toFixed(1) + '%'), textposition: 'outside' }];
    Plotly.newPlot(elementId, traces, getLayout({ showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Return (%)' }, bargap: 0.3 }), plotConfig);
}

function renderDrawdownChart(elementId, fund) {
    const dd = drawdownSeries(fund.dailyReturns).map(d => d * 100);
    const traces = [{ x: fund.dates, y: dd, type: 'scatter', mode: 'lines', fill: 'tozeroy', line: { color: COLORS.danger, width: 1 }, fillcolor: 'rgba(239, 68, 68, 0.3)' }];
    Plotly.newPlot(elementId, traces, getLayout({ showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Drawdown (%)' } }), plotConfig);
}

function renderRollingReturnChart(elementId, fund) {
    const rolling = rollingReturn(fund.dailyReturns, 252).map(r => r * 100);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{ x: dates, y: rolling, type: 'scatter', mode: 'lines', line: { color: COLORS.primary, width: 2 } }],
        getLayout({ showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Return (%)', zeroline: true, zerolinecolor: COLORS.gray } }), plotConfig);
}

function renderRollingVolChart(elementId, fund) {
    const rolling = rollingVolatility(fund.dailyReturns, 252).map(v => v * 100);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{ x: dates, y: rolling, type: 'scatter', mode: 'lines', fill: 'tozeroy', line: { color: COLORS.warning, width: 2 }, fillcolor: 'rgba(245, 158, 11, 0.2)' }],
        getLayout({ showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Volatility (%)' } }), plotConfig);
}

function renderRollingSharpeChart(elementId, fund) {
    const rolling = rollingSharpe(fund.dailyReturns, 252);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{ x: dates, y: rolling, type: 'scatter', mode: 'lines', line: { color: COLORS.secondary, width: 2 } }],
        getLayout({ showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Sharpe Ratio', zeroline: true } }), plotConfig);
}

function renderRollingBetaChart(elementId, fund) {
    const rolling = rollingBeta(fund.dailyReturns, fund.benchmarkReturns, 252);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{ x: dates, y: rolling, type: 'scatter', mode: 'lines', line: { color: COLORS.accent, width: 2 } }],
        getLayout({ showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Beta' } }), plotConfig);
}

function renderRollingCorrelationChart(elementId, fund) {
    const rolling = rollingCorrelation(fund.dailyReturns, fund.benchmarkReturns, 252);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{ x: dates, y: rolling, type: 'scatter', mode: 'lines', fill: 'tozeroy', line: { color: COLORS.primary, width: 2 }, fillcolor: 'rgba(45, 93, 138, 0.2)' }],
        getLayout({ showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Correlation', range: [-1, 1] } }), plotConfig);
}

// NEW: Rolling Alpha Chart
function renderRollingAlphaChart(elementId, fund) {
    const rolling = rollingAlpha(fund.dailyReturns, fund.benchmarkReturns, 252).map(a => a * 100);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{
        x: dates,
        y: rolling,
        type: 'scatter',
        mode: 'lines',
        fill: 'tozeroy',
        line: { color: COLORS.success, width: 2 },
        fillcolor: 'rgba(16, 185, 129, 0.2)'
    }], getLayout({ showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Alpha (%)', zeroline: true } }), plotConfig);
}

// NEW: Rolling Information Ratio Chart
function renderRollingIRChart(elementId, fund) {
    const rolling = rollingInformationRatio(fund.dailyReturns, fund.benchmarkReturns, 252);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{
        x: dates,
        y: rolling,
        type: 'scatter',
        mode: 'lines',
        line: { color: COLORS.purple, width: 2 }
    }], getLayout({ showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Information Ratio', zeroline: true } }), plotConfig);
}

function renderRiskReturnChart(elementId, allFundsStats, selectedFundId) {
    const x = [], y = [], text = [], colors = [], sizes = [];
    for (const [id, stats] of Object.entries(allFundsStats)) {
        x.push(stats.annVol * 100); y.push(stats.annReturn * 100); text.push(FUND_DATA.funds[id].name);
        colors.push(parseInt(id) === selectedFundId ? COLORS.secondary : COLORS.primary);
        sizes.push(parseInt(id) === selectedFundId ? 16 : 10);
    }
    Plotly.newPlot(elementId, [{ x, y, mode: 'markers+text', type: 'scatter', text, textposition: 'top center', textfont: { size: 9 }, marker: { size: sizes, color: colors, line: { color: 'white', width: 2 } } }],
        getLayout({ showlegend: false, xaxis: { ...commonLayout.xaxis, title: 'Volatility (%)' }, yaxis: { ...commonLayout.yaxis, title: 'Return (%)' } }), plotConfig);
}

function renderRankingsChart(elementId, allFundsStats, metric, order) {
    const currentYear = new Date().getFullYear();
    const data = Object.entries(allFundsStats).map(([id, stats]) => ({
        name: FUND_DATA.funds[id].name,
        value: metric === 'ytdReturn' ? (stats.ytdReturns[currentYear] || 0) * 100 :
               ['annReturn', 'annVol', 'maxDD'].includes(metric) ? stats[metric] * 100 : stats[metric]
    }));
    data.sort((a, b) => order === 'desc' ? b.value - a.value : a.value - b.value);
    const isNegativeMetric = metric === 'maxDD' || metric === 'annVol';
    Plotly.newPlot(elementId, [{ y: data.map(d => d.name), x: data.map(d => d.value), type: 'bar', orientation: 'h',
        marker: { color: data.map(d => isNegativeMetric ? (Math.abs(d.value) < Math.abs(mean(data.map(x => x.value))) ? COLORS.success : COLORS.danger) : (d.value >= 0 ? COLORS.primary : COLORS.danger)) },
        text: data.map(d => d.value.toFixed(2)), textposition: 'outside' }],
        getLayout({ showlegend: false, margin: { ...commonLayout.margin, l: 160 }, bargap: 0.2 }), plotConfig);
}

function renderCorrelationMatrix(elementId, period = 'all') {
    const fundNames = FUND_DATA.funds.map(f => f.name.split(' ').slice(0, 2).join(' '));

    // Filter returns by period
    let returns = FUND_DATA.funds.map(f => f.dailyReturns);
    if (period !== 'all') {
        const days = period === '1y' ? 252 : period === '3y' ? 756 : returns[0].length;
        returns = returns.map(r => r.slice(-days));
    }

    const matrix = correlationMatrix(returns);

    // Create annotation text
    const annotations = [];
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            annotations.push({
                x: fundNames[j],
                y: fundNames[i],
                text: matrix[i][j].toFixed(2),
                showarrow: false,
                font: { size: 9, color: Math.abs(matrix[i][j]) > 0.5 ? 'white' : 'black' }
            });
        }
    }

    Plotly.newPlot(elementId, [{
        z: matrix,
        x: fundNames,
        y: fundNames,
        type: 'heatmap',
        colorscale: [[0, '#ef4444'], [0.5, '#ffffff'], [1, '#10b981']],
        zmin: -1,
        zmax: 1,
        hovertemplate: '%{x}<br>%{y}<br>Corr: %{z:.2f}<extra></extra>',
        showscale: true,
        colorbar: { title: 'Correlation', titleside: 'right' }
    }], getLayout({
        margin: { t: 50, r: 80, b: 120, l: 120 },
        xaxis: { tickangle: -45, side: 'bottom' },
        yaxis: { autorange: 'reversed' },
        annotations: annotations
    }), plotConfig);
}

function renderVaRDistribution(elementId, fund, stats) {
    const rets = fund.dailyReturns.map(r => r * 100);
    const var95 = stats.var95 * 100, var99 = stats.var99 * 100;
    const paramVar = stats.parametricVar95 * 100;

    Plotly.newPlot(elementId, [
        { x: rets, type: 'histogram', nbinsx: 50, marker: { color: COLORS.primary }, name: 'Returns' }
    ], getLayout({
        showlegend: false,
        shapes: [
            { type: 'line', x0: var95, x1: var95, y0: 0, y1: 1, yref: 'paper', line: { color: COLORS.warning, width: 2, dash: 'dash' } },
            { type: 'line', x0: var99, x1: var99, y0: 0, y1: 1, yref: 'paper', line: { color: COLORS.danger, width: 2, dash: 'dash' } },
            { type: 'line', x0: paramVar, x1: paramVar, y0: 0, y1: 1, yref: 'paper', line: { color: COLORS.purple, width: 2, dash: 'dot' } }
        ],
        annotations: [
            { x: var95, y: 1, yref: 'paper', text: 'Hist 95%', showarrow: false, font: { size: 10 } },
            { x: var99, y: 0.9, yref: 'paper', text: 'Hist 99%', showarrow: false, font: { size: 10 } },
            { x: paramVar, y: 0.8, yref: 'paper', text: 'Param 95%', showarrow: false, font: { size: 10, color: COLORS.purple } }
        ],
        xaxis: { ...commonLayout.xaxis, title: 'Daily Return (%)' }
    }), plotConfig);
}

function renderUnderwaterChart(elementId, fund) {
    const dd = drawdownSeries(fund.dailyReturns).map(d => d * 100);
    Plotly.newPlot(elementId, [{ x: fund.dates, y: dd, type: 'scatter', mode: 'lines', fill: 'tozeroy', line: { color: COLORS.danger }, fillcolor: 'rgba(239, 68, 68, 0.5)' }],
        getLayout({ showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Drawdown (%)' } }), plotConfig);
}

// NEW: Drawdown Periods Chart (timeline of major drawdowns)
function renderDrawdownPeriodsChart(elementId, fund, stats) {
    const periods = stats.drawdownPeriods || getDrawdownPeriods(fund.dailyReturns, fund.dates);

    if (!periods || periods.length === 0) {
        Plotly.newPlot(elementId, [], getLayout({ annotations: [{ text: 'No significant drawdowns', showarrow: false, x: 0.5, y: 0.5, xref: 'paper', yref: 'paper' }] }), plotConfig);
        return;
    }

    const traces = periods.slice(0, 10).map((p, i) => ({
        x: [p.peakDate, p.troughDate, p.recoveryDate || fund.dates[fund.dates.length - 1]],
        y: [0, p.drawdown * 100, p.recovered ? 0 : p.drawdown * 100 * 0.5],
        type: 'scatter',
        mode: 'lines+markers',
        name: `DD ${i + 1}: ${(p.drawdown * 100).toFixed(1)}%`,
        line: { width: 2 },
        marker: { size: 8 }
    }));

    Plotly.newPlot(elementId, traces, getLayout({
        yaxis: { ...commonLayout.yaxis, title: 'Drawdown (%)', range: [Math.min(...periods.map(p => p.drawdown * 100)) * 1.1, 5] },
        legend: { orientation: 'v', x: 1.02, y: 1 }
    }), plotConfig);
}

// NEW: Regime Chart
function renderRegimeChart(elementId, fund) {
    const regimes = detectRegimes(fund.benchmarkReturns, fund.dates);
    const regimeColors = { bull: COLORS.success, bear: COLORS.danger, crisis: COLORS.warning, sideways: COLORS.gray };

    // Group consecutive regimes
    const segments = [];
    let current = { regime: regimes[0].regime, start: 0 };

    for (let i = 1; i < regimes.length; i++) {
        if (regimes[i].regime !== current.regime) {
            segments.push({ ...current, end: i - 1 });
            current = { regime: regimes[i].regime, start: i };
        }
    }
    segments.push({ ...current, end: regimes.length - 1 });

    const shapes = segments.map(s => ({
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: regimes[s.start].date,
        x1: regimes[s.end].date,
        y0: 0,
        y1: 1,
        fillcolor: regimeColors[s.regime],
        opacity: 0.2,
        line: { width: 0 }
    }));

    const nav = calculateNAV(fund.dailyReturns);
    const dates = fund.dates.slice(-regimes.length);
    const navSlice = nav.slice(-regimes.length);

    Plotly.newPlot(elementId, [{
        x: dates,
        y: navSlice,
        type: 'scatter',
        mode: 'lines',
        name: fund.name,
        line: { color: COLORS.primary, width: 2 }
    }], getLayout({
        shapes,
        yaxis: { ...commonLayout.yaxis, title: 'NAV' },
        annotations: [
            { x: 0.02, y: 0.98, xref: 'paper', yref: 'paper', text: '■ Bull', font: { color: COLORS.success, size: 10 }, showarrow: false },
            { x: 0.12, y: 0.98, xref: 'paper', yref: 'paper', text: '■ Bear', font: { color: COLORS.danger, size: 10 }, showarrow: false },
            { x: 0.22, y: 0.98, xref: 'paper', yref: 'paper', text: '■ Crisis', font: { color: COLORS.warning, size: 10 }, showarrow: false },
            { x: 0.34, y: 0.98, xref: 'paper', yref: 'paper', text: '■ Sideways', font: { color: COLORS.gray, size: 10 }, showarrow: false }
        ]
    }), plotConfig);
}

function renderComparisonPerformance(elementId, fundIds) {
    const traces = fundIds.map((id, i) => {
        const fund = FUND_DATA.funds[id];
        return { x: fund.dates, y: calculateNAV(fund.dailyReturns), type: 'scatter', mode: 'lines', name: fund.name, line: { color: COLORS.palette[i % COLORS.palette.length], width: 2 } };
    });
    Plotly.newPlot(elementId, traces, getLayout({ yaxis: { ...commonLayout.yaxis, title: 'NAV' } }), plotConfig);
}

function renderComparisonDrawdown(elementId, fundIds) {
    const traces = fundIds.map((id, i) => {
        const fund = FUND_DATA.funds[id];
        return { x: fund.dates, y: drawdownSeries(fund.dailyReturns).map(d => d * 100), type: 'scatter', mode: 'lines', name: fund.name, line: { color: COLORS.palette[i % COLORS.palette.length], width: 2 } };
    });
    Plotly.newPlot(elementId, traces, getLayout({ yaxis: { ...commonLayout.yaxis, title: 'Drawdown (%)' } }), plotConfig);
}

function renderComparisonRolling(elementId, fundIds) {
    const traces = fundIds.map((id, i) => {
        const fund = FUND_DATA.funds[id];
        return { x: fund.dates.slice(251), y: rollingReturn(fund.dailyReturns, 252).map(r => r * 100), type: 'scatter', mode: 'lines', name: fund.name, line: { color: COLORS.palette[i % COLORS.palette.length], width: 2 } };
    });
    Plotly.newPlot(elementId, traces, getLayout({ yaxis: { ...commonLayout.yaxis, title: '12M Return (%)' } }), plotConfig);
}

function renderSharpeSortinoChart(elementId, allFundsStats, selectedFundId) {
    const x = [], y = [], text = [], colors = [], sizes = [];
    for (const [id, stats] of Object.entries(allFundsStats)) {
        x.push(stats.sharpe); y.push(stats.sortino); text.push(FUND_DATA.funds[id].name.split(' ').slice(0, 2).join(' '));
        colors.push(parseInt(id) === selectedFundId ? COLORS.secondary : COLORS.primary);
        sizes.push(parseInt(id) === selectedFundId ? 14 : 10);
    }
    Plotly.newPlot(elementId, [{ x, y, mode: 'markers+text', type: 'scatter', text, textposition: 'top center', textfont: { size: 9 }, marker: { size: sizes, color: colors } }],
        getLayout({ showlegend: false, xaxis: { ...commonLayout.xaxis, title: 'Sharpe Ratio' }, yaxis: { ...commonLayout.yaxis, title: 'Sortino Ratio' } }), plotConfig);
}

function renderStrategyBoxplot(elementId, allFundsStats) {
    const strategies = [...new Set(FUND_DATA.funds.map(f => f.strategy))];
    const traces = strategies.map(strategy => {
        const fundIds = FUND_DATA.funds.filter(f => f.strategy === strategy).map(f => f.id);
        const returns = fundIds.map(id => allFundsStats[id].annReturn * 100);
        return { y: returns, type: 'box', name: strategy.split('/')[0], marker: { color: COLORS.palette[strategies.indexOf(strategy) % COLORS.palette.length] } };
    });
    Plotly.newPlot(elementId, traces, getLayout({ yaxis: { ...commonLayout.yaxis, title: 'Annual Return (%)' } }), plotConfig);
}

function renderPortfolioPie(elementId, weights, fundIds) {
    const labels = fundIds.map(id => FUND_DATA.funds[id].name.split(' ').slice(0, 2).join(' '));
    const values = weights.filter(w => w > 0.001);
    const filteredLabels = labels.filter((_, i) => weights[i] > 0.001);
    Plotly.newPlot(elementId, [{ values, labels: filteredLabels, type: 'pie', marker: { colors: COLORS.palette }, textinfo: 'label+percent', textposition: 'outside' }],
        getLayout({ showlegend: false }), plotConfig);
}

function renderPortfolioPerformance(elementId, portfolioReturns, dates) {
    const nav = calculateNAV(portfolioReturns);
    const benchNav = calculateNAV(FUND_DATA.benchmark.returns);
    // Match lengths
    const minLen = Math.min(nav.length, benchNav.length, dates.length);
    Plotly.newPlot(elementId, [
        { x: dates.slice(0, minLen), y: nav.slice(0, minLen), type: 'scatter', mode: 'lines', name: 'Portfolio', line: { color: COLORS.primary, width: 2 } },
        { x: dates.slice(0, minLen), y: benchNav.slice(0, minLen), type: 'scatter', mode: 'lines', name: 'S&P 500', line: { color: COLORS.benchmark, dash: 'dot' } }
    ], getLayout({ yaxis: { ...commonLayout.yaxis, title: 'NAV' } }), plotConfig);
}

// NEW: Full Efficient Frontier with random portfolios
function renderEfficientFrontier(elementId, portfolioPoint, allFundsStats) {
    const fundReturns = FUND_DATA.funds.map(f => f.dailyReturns);
    const frontier = generateEfficientFrontier(fundReturns, 100);

    const allPoints = frontier.allPoints;
    const efficientPoints = frontier.frontier;

    // Individual funds
    const fundPoints = Object.entries(allFundsStats).map(([id, stats]) => ({
        x: stats.annVol * 100,
        y: stats.annReturn * 100,
        name: FUND_DATA.funds[id].name.split(' ').slice(0, 2).join(' ')
    }));

    Plotly.newPlot(elementId, [
        // Random portfolios (gray dots)
        {
            x: allPoints.map(p => p.vol * 100),
            y: allPoints.map(p => p.ret * 100),
            mode: 'markers',
            type: 'scatter',
            name: 'Random Portfolios',
            marker: { color: COLORS.light, size: 4, opacity: 0.5 }
        },
        // Efficient frontier (line)
        {
            x: efficientPoints.map(p => p.vol * 100),
            y: efficientPoints.map(p => p.ret * 100),
            mode: 'lines+markers',
            type: 'scatter',
            name: 'Efficient Frontier',
            line: { color: COLORS.secondary, width: 2 },
            marker: { size: 6 }
        },
        // Individual funds
        {
            x: fundPoints.map(p => p.x),
            y: fundPoints.map(p => p.y),
            mode: 'markers',
            type: 'scatter',
            name: 'Individual Funds',
            marker: { color: COLORS.primary, size: 8 },
            text: fundPoints.map(p => p.name),
            hoverinfo: 'text+x+y'
        },
        // Your portfolio (star)
        {
            x: [portfolioPoint.vol * 100],
            y: [portfolioPoint.ret * 100],
            mode: 'markers',
            type: 'scatter',
            name: 'Your Portfolio',
            marker: { color: COLORS.warning, size: 18, symbol: 'star' }
        }
    ], getLayout({
        xaxis: { ...commonLayout.xaxis, title: 'Volatility (%)' },
        yaxis: { ...commonLayout.yaxis, title: 'Return (%)' }
    }), plotConfig);
}

// NEW: Enhanced Monte Carlo with confidence bands
function renderMonteCarloChart(elementId, mcResults, months) {
    const traces = [];

    // Confidence band (5th to 95th percentile)
    const x = Array.from({ length: months + 1 }, (_, i) => i);
    const upper = [], lower = [], median = [];

    for (let m = 0; m <= months; m++) {
        const vals = mcResults.paths.map(p => p[m]).sort((a, b) => a - b);
        lower.push(vals[Math.floor(vals.length * 0.05)]);
        median.push(vals[Math.floor(vals.length * 0.5)]);
        upper.push(vals[Math.floor(vals.length * 0.95)]);
    }

    // Shaded confidence band
    traces.push({
        x: [...x, ...x.reverse()],
        y: [...upper, ...lower.reverse()],
        fill: 'toself',
        fillcolor: 'rgba(0, 180, 216, 0.2)',
        line: { color: 'transparent' },
        name: '90% Confidence',
        showlegend: true,
        type: 'scatter'
    });

    // Median line
    traces.push({
        x: Array.from({ length: months + 1 }, (_, i) => i),
        y: median,
        type: 'scatter',
        mode: 'lines',
        name: 'Median',
        line: { color: COLORS.primary, width: 3 }
    });

    // Sample paths
    const sampleIndices = [0, Math.floor(mcResults.paths.length * 0.25), Math.floor(mcResults.paths.length * 0.75), mcResults.paths.length - 1];
    const pathNames = ['Worst', '25th %ile', '75th %ile', 'Best'];
    const pathColors = [COLORS.danger, COLORS.warning, COLORS.success, COLORS.success];

    sampleIndices.forEach((idx, i) => {
        traces.push({
            x: Array.from({ length: months + 1 }, (_, j) => j),
            y: mcResults.paths[idx],
            type: 'scatter',
            mode: 'lines',
            name: pathNames[i],
            line: { color: pathColors[i], width: 1, dash: 'dot' },
            opacity: 0.7
        });
    });

    Plotly.newPlot(elementId, traces, getLayout({
        xaxis: { ...commonLayout.xaxis, title: 'Month' },
        yaxis: { ...commonLayout.yaxis, title: 'NAV' }
    }), plotConfig);
}

function renderReturnsHeatmap(elementId, stats) {
    const monthly = stats.monthlyReturns;
    const years = Object.keys(monthly).sort();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const z = years.map(year => months.map((_, m) => monthly[year] && monthly[year][m] !== undefined ? monthly[year][m] * 100 : null));

    // Add annotations
    const annotations = [];
    for (let i = 0; i < years.length; i++) {
        for (let m = 0; m < 12; m++) {
            const val = z[i][m];
            if (val !== null) {
                annotations.push({
                    x: months[m],
                    y: years[i],
                    text: val.toFixed(1),
                    showarrow: false,
                    font: { size: 9, color: Math.abs(val) > 3 ? 'white' : 'black' }
                });
            }
        }
    }

    Plotly.newPlot(elementId, [{ z, x: months, y: years, type: 'heatmap', colorscale: [[0, '#ef4444'], [0.5, '#ffffff'], [1, '#10b981']], zmid: 0, showscale: true }],
        getLayout({ margin: { ...commonLayout.margin, l: 80 }, annotations }), plotConfig);
}

// NEW: Dendrogram (simplified hierarchical clustering visualization)
function renderDendrogram(elementId) {
    const fundNames = FUND_DATA.funds.map(f => f.name.split(' ').slice(0, 2).join(' '));
    const returns = FUND_DATA.funds.map(f => f.dailyReturns);
    const corrMatrix = correlationMatrix(returns);

    // Convert correlation to distance (1 - |corr|)
    const distMatrix = corrMatrix.map(row => row.map(c => 1 - Math.abs(c)));

    // Simple hierarchical clustering (single linkage)
    const n = fundNames.length;
    const clusters = fundNames.map((name, i) => ({ members: [i], name }));
    const merges = [];

    // Clone distance matrix
    const dist = distMatrix.map(row => [...row]);

    while (clusters.length > 1) {
        // Find minimum distance
        let minDist = Infinity, minI = 0, minJ = 1;
        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                // Average linkage distance between clusters
                let d = 0, count = 0;
                for (const mi of clusters[i].members) {
                    for (const mj of clusters[j].members) {
                        d += dist[mi][mj];
                        count++;
                    }
                }
                d /= count;
                if (d < minDist) {
                    minDist = d;
                    minI = i;
                    minJ = j;
                }
            }
        }

        // Merge clusters
        const newCluster = {
            members: [...clusters[minI].members, ...clusters[minJ].members],
            name: `(${clusters[minI].name}, ${clusters[minJ].name})`,
            distance: minDist
        };
        merges.push({ i: minI, j: minJ, dist: minDist, members: [...newCluster.members] });

        clusters.splice(minJ, 1);
        clusters.splice(minI, 1);
        clusters.push(newCluster);
    }

    // Create bar chart showing distances
    const sortedFunds = merges[merges.length - 1]?.members || Array.from({ length: n }, (_, i) => i);
    const sortedNames = sortedFunds.map(i => fundNames[i]);

    // Calculate average distance to others for each fund
    const avgDist = sortedFunds.map(i => {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            if (i !== j) sum += distMatrix[i][j];
        }
        return sum / (n - 1);
    });

    Plotly.newPlot(elementId, [{
        y: sortedNames,
        x: avgDist,
        type: 'bar',
        orientation: 'h',
        marker: {
            color: avgDist.map(d => d < 0.3 ? COLORS.success : d < 0.5 ? COLORS.warning : COLORS.danger)
        },
        text: avgDist.map(d => (1 - d).toFixed(2)),
        textposition: 'outside',
        hovertemplate: '%{y}<br>Avg Correlation: %{text}<extra></extra>'
    }], getLayout({
        margin: { ...commonLayout.margin, l: 140 },
        xaxis: { ...commonLayout.xaxis, title: 'Avg Distance (1 - |Corr|)', range: [0, 1] },
        yaxis: { ...commonLayout.yaxis },
        showlegend: false
    }), plotConfig);
}

// NEW: Alpha-Beta Scatter
function renderAlphaBetaChart(elementId, allFundsStats, selectedFundId) {
    const x = [], y = [], text = [], colors = [], sizes = [];
    for (const [id, stats] of Object.entries(allFundsStats)) {
        x.push(stats.beta);
        y.push(stats.alpha * 100);
        text.push(FUND_DATA.funds[id].name.split(' ').slice(0, 2).join(' '));
        colors.push(parseInt(id) === selectedFundId ? COLORS.secondary : COLORS.primary);
        sizes.push(parseInt(id) === selectedFundId ? 14 : 10);
    }

    Plotly.newPlot(elementId, [
        // Zero alpha line
        { x: [-0.5, 1.5], y: [0, 0], type: 'scatter', mode: 'lines', line: { color: COLORS.gray, dash: 'dash', width: 1 }, showlegend: false },
        // Scatter
        { x, y, mode: 'markers+text', type: 'scatter', text, textposition: 'top center', textfont: { size: 9 }, marker: { size: sizes, color: colors }, showlegend: false }
    ], getLayout({
        showlegend: false,
        xaxis: { ...commonLayout.xaxis, title: 'Beta', zeroline: true },
        yaxis: { ...commonLayout.yaxis, title: 'Alpha (%)', zeroline: true }
    }), plotConfig);
}

// NEW: Factor Stress Test Chart
function renderFactorStressChart(elementId, stressResults) {
    const names = stressResults.map(s => s.name);
    const returns = stressResults.map(s => s.expectedFundReturn * 100);
    const marketMoves = stressResults.map(s => s.marketMove * 100);

    Plotly.newPlot(elementId, [
        {
            name: 'Market Move',
            y: names,
            x: marketMoves,
            type: 'bar',
            orientation: 'h',
            marker: { color: COLORS.benchmark }
        },
        {
            name: 'Expected Fund Return',
            y: names,
            x: returns,
            type: 'bar',
            orientation: 'h',
            marker: { color: returns.map(r => r >= 0 ? COLORS.success : COLORS.danger) }
        }
    ], getLayout({
        barmode: 'group',
        margin: { ...commonLayout.margin, l: 120 },
        xaxis: { ...commonLayout.xaxis, title: 'Return (%)' }
    }), plotConfig);
}

function getMetricLabel(metric) {
    return { annReturn: 'Ann. Return (%)', annVol: 'Ann. Volatility (%)', sharpe: 'Sharpe Ratio', sortino: 'Sortino Ratio', maxDD: 'Max Drawdown (%)', calmar: 'Calmar Ratio', ytdReturn: 'YTD Return (%)', omega: 'Omega Ratio', alpha: 'Alpha (%)', informationRatio: 'Information Ratio' }[metric] || metric;
}
