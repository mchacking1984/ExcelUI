// ============================================
// Plotly Charts Module - Enhanced
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
    palette: ['#2d5d8a', '#00b4d8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
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

function renderCumulativeChart(elementId, fund, stats) {
    const nav = calculateNAV(fund.dailyReturns);
    const benchNav = calculateNAV(fund.benchmarkReturns);
    const traces = [
        { x: fund.dates, y: nav, type: 'scatter', mode: 'lines', name: fund.name, line: { color: COLORS.primary, width: 2 } },
        { x: fund.dates, y: benchNav, type: 'scatter', mode: 'lines', name: 'S&P 500', line: { color: COLORS.benchmark, width: 1.5, dash: 'dot' } }
    ];
    const layout = { ...commonLayout, yaxis: { ...commonLayout.yaxis, title: 'NAV', tickformat: ',.0f' },
        xaxis: { ...commonLayout.xaxis, rangeselector: { buttons: [
            { count: 6, label: '6M', step: 'month', stepmode: 'backward' },
            { count: 1, label: '1Y', step: 'year', stepmode: 'backward' },
            { count: 3, label: '3Y', step: 'year', stepmode: 'backward' },
            { step: 'all', label: 'ALL' }
        ]}}};
    Plotly.newPlot(elementId, traces, layout, plotConfig);
}

function renderDistributionChart(elementId, fund) {
    const monthly = monthlyReturns(fund.dailyReturns, fund.dates);
    const monthlyVals = [];
    Object.values(monthly).forEach(year => Object.values(year).forEach(v => monthlyVals.push(v * 100)));
    const traces = [{ x: monthlyVals, type: 'histogram', nbinsx: 25, marker: { color: COLORS.primary, line: { color: 'white', width: 1 } } }];
    Plotly.newPlot(elementId, traces, { ...commonLayout, showlegend: false, xaxis: { ...commonLayout.xaxis, title: 'Monthly Return (%)' }, yaxis: { ...commonLayout.yaxis, title: 'Count' } }, plotConfig);
}

function renderYearlyReturnsChart(elementId, fund, stats) {
    const ytd = stats.ytdReturns;
    const years = Object.keys(ytd).sort();
    const values = years.map(y => ytd[y] * 100);
    const traces = [{ x: years, y: values, type: 'bar', marker: { color: values.map(v => v >= 0 ? COLORS.success : COLORS.danger) }, text: values.map(v => v.toFixed(1) + '%'), textposition: 'outside' }];
    Plotly.newPlot(elementId, traces, { ...commonLayout, showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Return (%)' }, bargap: 0.3 }, plotConfig);
}

function renderDrawdownChart(elementId, fund) {
    const dd = drawdownSeries(fund.dailyReturns).map(d => d * 100);
    const traces = [{ x: fund.dates, y: dd, type: 'scatter', mode: 'lines', fill: 'tozeroy', line: { color: COLORS.danger, width: 1 }, fillcolor: 'rgba(239, 68, 68, 0.3)' }];
    Plotly.newPlot(elementId, traces, { ...commonLayout, showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Drawdown (%)' } }, plotConfig);
}

function renderRollingReturnChart(elementId, fund) {
    const rolling = rollingReturn(fund.dailyReturns, 252).map(r => r * 100);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{ x: dates, y: rolling, type: 'scatter', mode: 'lines', line: { color: COLORS.primary, width: 2 } }],
        { ...commonLayout, showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Return (%)', zeroline: true, zerolinecolor: COLORS.gray } }, plotConfig);
}

function renderRollingVolChart(elementId, fund) {
    const rolling = rollingVolatility(fund.dailyReturns, 252).map(v => v * 100);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{ x: dates, y: rolling, type: 'scatter', mode: 'lines', fill: 'tozeroy', line: { color: COLORS.warning, width: 2 }, fillcolor: 'rgba(245, 158, 11, 0.2)' }],
        { ...commonLayout, showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Volatility (%)' } }, plotConfig);
}

function renderRollingSharpeChart(elementId, fund) {
    const rolling = rollingSharpe(fund.dailyReturns, 252);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{ x: dates, y: rolling, type: 'scatter', mode: 'lines', line: { color: COLORS.secondary, width: 2 } }],
        { ...commonLayout, showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Sharpe Ratio', zeroline: true } }, plotConfig);
}

function renderRollingBetaChart(elementId, fund) {
    const rolling = rollingBeta(fund.dailyReturns, fund.benchmarkReturns, 252);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{ x: dates, y: rolling, type: 'scatter', mode: 'lines', line: { color: COLORS.accent, width: 2 } }],
        { ...commonLayout, showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Beta' } }, plotConfig);
}

function renderRollingCorrelationChart(elementId, fund) {
    const rolling = rollingCorrelation(fund.dailyReturns, fund.benchmarkReturns, 252);
    const dates = fund.dates.slice(251);
    Plotly.newPlot(elementId, [{ x: dates, y: rolling, type: 'scatter', mode: 'lines', fill: 'tozeroy', line: { color: COLORS.primary, width: 2 }, fillcolor: 'rgba(45, 93, 138, 0.2)' }],
        { ...commonLayout, showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Correlation', range: [-1, 1] } }, plotConfig);
}

function renderRiskReturnChart(elementId, allFundsStats, selectedFundId) {
    const x = [], y = [], text = [], colors = [], sizes = [];
    for (const [id, stats] of Object.entries(allFundsStats)) {
        x.push(stats.annVol * 100); y.push(stats.annReturn * 100); text.push(FUND_DATA.funds[id].name);
        colors.push(parseInt(id) === selectedFundId ? COLORS.secondary : COLORS.primary);
        sizes.push(parseInt(id) === selectedFundId ? 16 : 10);
    }
    Plotly.newPlot(elementId, [{ x, y, mode: 'markers+text', type: 'scatter', text, textposition: 'top center', textfont: { size: 9 }, marker: { size: sizes, color: colors, line: { color: 'white', width: 2 } } }],
        { ...commonLayout, showlegend: false, xaxis: { ...commonLayout.xaxis, title: 'Volatility (%)' }, yaxis: { ...commonLayout.yaxis, title: 'Return (%)' } }, plotConfig);
}

function renderRankingsChart(elementId, allFundsStats, metric, order) {
    const data = Object.entries(allFundsStats).map(([id, stats]) => ({
        name: FUND_DATA.funds[id].name, value: ['annReturn', 'annVol', 'maxDD', 'ytdReturn'].includes(metric) ? stats[metric] * 100 : stats[metric]
    }));
    data.sort((a, b) => order === 'desc' ? b.value - a.value : a.value - b.value);
    const isNegativeMetric = metric === 'maxDD' || metric === 'annVol';
    Plotly.newPlot(elementId, [{ y: data.map(d => d.name), x: data.map(d => d.value), type: 'bar', orientation: 'h',
        marker: { color: data.map(d => isNegativeMetric ? (Math.abs(d.value) < Math.abs(mean(data.map(x => x.value))) ? COLORS.success : COLORS.danger) : (d.value >= 0 ? COLORS.primary : COLORS.danger)) },
        text: data.map(d => d.value.toFixed(2)), textposition: 'outside' }],
        { ...commonLayout, showlegend: false, margin: { ...commonLayout.margin, l: 160 }, bargap: 0.2 }, plotConfig);
}

function renderCorrelationMatrix(elementId, period = 'all') {
    const fundNames = FUND_DATA.funds.map(f => f.name.split(' ').slice(0, 2).join(' '));
    const returns = FUND_DATA.funds.map(f => f.dailyReturns);
    const matrix = correlationMatrix(returns);
    Plotly.newPlot(elementId, [{ z: matrix, x: fundNames, y: fundNames, type: 'heatmap', colorscale: [[0, '#ef4444'], [0.5, '#ffffff'], [1, '#10b981']], zmin: -1, zmax: 1, hovertemplate: '%{x}<br>%{y}<br>Corr: %{z:.2f}<extra></extra>' }],
        { ...commonLayout, margin: { t: 50, r: 50, b: 120, l: 120 }, xaxis: { tickangle: -45 }, yaxis: { autorange: 'reversed' } }, plotConfig);
}

function renderVaRDistribution(elementId, fund, stats) {
    const rets = fund.dailyReturns.map(r => r * 100);
    const var95 = stats.var95 * 100, var99 = stats.var99 * 100;
    Plotly.newPlot(elementId, [
        { x: rets, type: 'histogram', nbinsx: 50, marker: { color: COLORS.primary }, name: 'Returns' }
    ], { ...commonLayout, showlegend: false, shapes: [
        { type: 'line', x0: var95, x1: var95, y0: 0, y1: 1, yref: 'paper', line: { color: COLORS.warning, width: 2, dash: 'dash' } },
        { type: 'line', x0: var99, x1: var99, y0: 0, y1: 1, yref: 'paper', line: { color: COLORS.danger, width: 2, dash: 'dash' } }
    ], annotations: [
        { x: var95, y: 1, yref: 'paper', text: '95% VaR', showarrow: false, font: { size: 10 } },
        { x: var99, y: 0.9, yref: 'paper', text: '99% VaR', showarrow: false, font: { size: 10 } }
    ]}, plotConfig);
}

function renderUnderwaterChart(elementId, fund) {
    const dd = drawdownSeries(fund.dailyReturns).map(d => d * 100);
    Plotly.newPlot(elementId, [{ x: fund.dates, y: dd, type: 'scatter', mode: 'lines', fill: 'tozeroy', line: { color: COLORS.danger }, fillcolor: 'rgba(239, 68, 68, 0.5)' }],
        { ...commonLayout, showlegend: false, yaxis: { ...commonLayout.yaxis, title: 'Drawdown (%)' } }, plotConfig);
}

function renderComparisonPerformance(elementId, fundIds) {
    const traces = fundIds.map((id, i) => {
        const fund = FUND_DATA.funds[id];
        return { x: fund.dates, y: calculateNAV(fund.dailyReturns), type: 'scatter', mode: 'lines', name: fund.name, line: { color: COLORS.palette[i % COLORS.palette.length], width: 2 } };
    });
    Plotly.newPlot(elementId, traces, { ...commonLayout, yaxis: { ...commonLayout.yaxis, title: 'NAV' } }, plotConfig);
}

function renderComparisonDrawdown(elementId, fundIds) {
    const traces = fundIds.map((id, i) => {
        const fund = FUND_DATA.funds[id];
        return { x: fund.dates, y: drawdownSeries(fund.dailyReturns).map(d => d * 100), type: 'scatter', mode: 'lines', name: fund.name, line: { color: COLORS.palette[i % COLORS.palette.length], width: 2 } };
    });
    Plotly.newPlot(elementId, traces, { ...commonLayout, yaxis: { ...commonLayout.yaxis, title: 'Drawdown (%)' } }, plotConfig);
}

function renderComparisonRolling(elementId, fundIds) {
    const traces = fundIds.map((id, i) => {
        const fund = FUND_DATA.funds[id];
        return { x: fund.dates.slice(251), y: rollingReturn(fund.dailyReturns, 252).map(r => r * 100), type: 'scatter', mode: 'lines', name: fund.name, line: { color: COLORS.palette[i % COLORS.palette.length], width: 2 } };
    });
    Plotly.newPlot(elementId, traces, { ...commonLayout, yaxis: { ...commonLayout.yaxis, title: '12M Return (%)' } }, plotConfig);
}

function renderSharpeSortinoChart(elementId, allFundsStats, selectedFundId) {
    const x = [], y = [], text = [], colors = [], sizes = [];
    for (const [id, stats] of Object.entries(allFundsStats)) {
        x.push(stats.sharpe); y.push(stats.sortino); text.push(FUND_DATA.funds[id].name.split(' ').slice(0, 2).join(' '));
        colors.push(parseInt(id) === selectedFundId ? COLORS.secondary : COLORS.primary);
        sizes.push(parseInt(id) === selectedFundId ? 14 : 10);
    }
    Plotly.newPlot(elementId, [{ x, y, mode: 'markers+text', type: 'scatter', text, textposition: 'top center', textfont: { size: 9 }, marker: { size: sizes, color: colors } }],
        { ...commonLayout, showlegend: false, xaxis: { ...commonLayout.xaxis, title: 'Sharpe Ratio' }, yaxis: { ...commonLayout.yaxis, title: 'Sortino Ratio' } }, plotConfig);
}

function renderStrategyBoxplot(elementId, allFundsStats) {
    const strategies = [...new Set(FUND_DATA.funds.map(f => f.strategy))];
    const traces = strategies.map(strategy => {
        const fundIds = FUND_DATA.funds.filter(f => f.strategy === strategy).map(f => f.id);
        const returns = fundIds.map(id => allFundsStats[id].annReturn * 100);
        return { y: returns, type: 'box', name: strategy.split('/')[0], marker: { color: COLORS.palette[strategies.indexOf(strategy) % COLORS.palette.length] } };
    });
    Plotly.newPlot(elementId, traces, { ...commonLayout, yaxis: { ...commonLayout.yaxis, title: 'Annual Return (%)' } }, plotConfig);
}

function renderPortfolioPie(elementId, weights, fundIds) {
    const labels = fundIds.map(id => FUND_DATA.funds[id].name.split(' ').slice(0, 2).join(' '));
    const values = weights.filter(w => w > 0.001);
    const filteredLabels = labels.filter((_, i) => weights[i] > 0.001);
    Plotly.newPlot(elementId, [{ values, labels: filteredLabels, type: 'pie', marker: { colors: COLORS.palette }, textinfo: 'label+percent', textposition: 'outside' }],
        { ...commonLayout, showlegend: false }, plotConfig);
}

function renderPortfolioPerformance(elementId, portfolioReturns, dates) {
    const nav = calculateNAV(portfolioReturns);
    const benchNav = calculateNAV(FUND_DATA.benchmark.returns);
    Plotly.newPlot(elementId, [
        { x: dates, y: nav, type: 'scatter', mode: 'lines', name: 'Portfolio', line: { color: COLORS.primary, width: 2 } },
        { x: dates, y: benchNav, type: 'scatter', mode: 'lines', name: 'S&P 500', line: { color: COLORS.benchmark, dash: 'dot' } }
    ], { ...commonLayout, yaxis: { ...commonLayout.yaxis, title: 'NAV' } }, plotConfig);
}

function renderEfficientFrontier(elementId, portfolioPoint, allFundsStats) {
    const fundPoints = Object.entries(allFundsStats).map(([id, stats]) => ({
        x: stats.annVol * 100, y: stats.annReturn * 100, name: FUND_DATA.funds[id].name.split(' ').slice(0, 2).join(' ')
    }));
    Plotly.newPlot(elementId, [
        { x: fundPoints.map(p => p.x), y: fundPoints.map(p => p.y), mode: 'markers', type: 'scatter', name: 'Individual Funds', marker: { color: COLORS.gray, size: 8 }, text: fundPoints.map(p => p.name), hoverinfo: 'text+x+y' },
        { x: [portfolioPoint.vol * 100], y: [portfolioPoint.ret * 100], mode: 'markers', type: 'scatter', name: 'Your Portfolio', marker: { color: COLORS.secondary, size: 16, symbol: 'star' } }
    ], { ...commonLayout, xaxis: { ...commonLayout.xaxis, title: 'Volatility (%)' }, yaxis: { ...commonLayout.yaxis, title: 'Return (%)' } }, plotConfig);
}

function renderMonteCarloChart(elementId, mcResults, months) {
    const traces = [];
    const samplePaths = [0, Math.floor(mcResults.paths.length * 0.05), Math.floor(mcResults.paths.length * 0.5), Math.floor(mcResults.paths.length * 0.95), mcResults.paths.length - 1];
    const pathColors = [COLORS.danger, COLORS.warning, COLORS.primary, COLORS.warning, COLORS.success];
    const pathNames = ['Worst', '5th %ile', 'Median', '95th %ile', 'Best'];
    samplePaths.forEach((idx, i) => {
        traces.push({ y: mcResults.paths[idx], type: 'scatter', mode: 'lines', name: pathNames[i], line: { color: pathColors[i], width: i === 2 ? 3 : 1.5 } });
    });
    Plotly.newPlot(elementId, traces, { ...commonLayout, xaxis: { ...commonLayout.xaxis, title: 'Month' }, yaxis: { ...commonLayout.yaxis, title: 'NAV' } }, plotConfig);
}

function renderReturnsHeatmap(elementId, stats) {
    const monthly = stats.monthlyReturns;
    const years = Object.keys(monthly).sort();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const z = years.map(year => months.map((_, m) => monthly[year] && monthly[year][m] !== undefined ? monthly[year][m] * 100 : null));
    Plotly.newPlot(elementId, [{ z, x: months, y: years, type: 'heatmap', colorscale: [[0, '#ef4444'], [0.5, '#ffffff'], [1, '#10b981']], zmid: 0 }],
        { ...commonLayout, margin: { ...commonLayout.margin, l: 80 } }, plotConfig);
}

function getMetricLabel(metric) {
    return { annReturn: 'Ann. Return (%)', annVol: 'Ann. Volatility (%)', sharpe: 'Sharpe Ratio', sortino: 'Sortino Ratio', maxDD: 'Max Drawdown (%)', calmar: 'Calmar Ratio', ytdReturn: 'YTD Return (%)' }[metric] || metric;
}
