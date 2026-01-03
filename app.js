// ============================================
// Main Application Module - Ultra Enhanced
// ============================================

let selectedFundId = 0;
let allFundsStats = {};
let selectedCompare = [0, 1];
let portfolioWeights = {};
let currentDateRange = null;
let tableSort = { column: null, order: 'asc' };

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    recalculateAllStats();
    document.getElementById('dataDate').textContent = formatDate(FUND_DATA.lastUpdate);
    initializeFundSelector();
    initializeNavigation();
    initializeStrategyFilter();
    initializeRankingsControls();
    initializeThemeToggle();
    initializeExportModal();
    initializeDateRange();
    initializeCompareTab();
    initializeCorrelationTab();
    initializePortfolioBuilder();
    initializeStressTesting();
    initializeTableSorting();
    selectFund(0);
});

// Recalculate all stats with current date range
function recalculateAllStats() {
    FUND_DATA.funds.forEach((fund, index) => {
        allFundsStats[index] = getAllFundStats(fund, currentDateRange);
    });
}

// Theme Toggle
function initializeThemeToggle() {
    const btn = document.getElementById('themeToggle');
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        // Redraw charts for theme change
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            selectFund(selectedFundId);
        }, 100);
    });
}

// Export Modal
function initializeExportModal() {
    document.getElementById('exportBtn').addEventListener('click', () => document.getElementById('exportModal').classList.remove('hidden'));
}

function closeExportModal() { document.getElementById('exportModal').classList.add('hidden'); }

function exportToCSV(type) {
    const fund = FUND_DATA.funds[selectedFundId];
    const stats = allFundsStats[selectedFundId];
    let csv = '', filename = '';

    if (type === 'returns') {
        csv = 'Year,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,YTD\n';
        Object.keys(stats.monthlyReturns).sort().reverse().forEach(year => {
            const row = [year];
            for (let m = 0; m < 12; m++) row.push(stats.monthlyReturns[year][m] !== undefined ? (stats.monthlyReturns[year][m] * 100).toFixed(2) : '');
            row.push((stats.ytdReturns[year] * 100).toFixed(2));
            csv += row.join(',') + '\n';
        });
        filename = `${fund.name.replace(/\s+/g, '_')}_monthly_returns.csv`;
    } else if (type === 'stats') {
        csv = 'Metric,Value\n';
        csv += `Total Return,${formatPercent(stats.totalReturn)}\n`;
        csv += `Annualized Return,${formatPercent(stats.annReturn)}\n`;
        csv += `Annualized Volatility,${formatPercent(stats.annVol)}\n`;
        csv += `Sharpe Ratio,${formatNumber(stats.sharpe)}\n`;
        csv += `Sortino Ratio,${formatNumber(stats.sortino)}\n`;
        csv += `Omega Ratio,${formatNumber(stats.omega)}\n`;
        csv += `Calmar Ratio,${formatNumber(stats.calmar)}\n`;
        csv += `Max Drawdown,${formatPercent(stats.maxDD)}\n`;
        csv += `Alpha,${formatPercent(stats.alpha)}\n`;
        csv += `Beta,${formatNumber(stats.beta)}\n`;
        csv += `Information Ratio,${formatNumber(stats.informationRatio)}\n`;
        csv += `Tracking Error,${formatPercent(stats.trackingError)}\n`;
        csv += `VaR 95%,${formatPercent(stats.var95)}\n`;
        csv += `CVaR 95%,${formatPercent(stats.cvar95)}\n`;
        csv += `Skewness,${formatNumber(stats.skewness)}\n`;
        csv += `Kurtosis,${formatNumber(stats.kurtosis)}\n`;
        filename = `${fund.name.replace(/\s+/g, '_')}_statistics.csv`;
    } else if (type === 'daily') {
        csv = 'Date,Return\n';
        fund.dates.forEach((d, i) => csv += `${d.toISOString().split('T')[0]},${(fund.dailyReturns[i] * 100).toFixed(4)}\n`);
        filename = `${fund.name.replace(/\s+/g, '_')}_daily_returns.csv`;
    } else if (type === 'peer') {
        csv = 'Fund,Strategy,Ann Return,Ann Vol,Sharpe,Sortino,Max DD,Calmar,Alpha,Beta,Information Ratio\n';
        FUND_DATA.funds.forEach((f, i) => {
            const s = allFundsStats[i];
            csv += `${f.name},${f.strategy},${(s.annReturn*100).toFixed(2)},${(s.annVol*100).toFixed(2)},${s.sharpe.toFixed(2)},${s.sortino.toFixed(2)},${(s.maxDD*100).toFixed(2)},${s.calmar.toFixed(2)},${(s.alpha*100).toFixed(2)},${s.beta.toFixed(2)},${s.informationRatio.toFixed(2)}\n`;
        });
        filename = 'peer_comparison.csv';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    closeExportModal();
}

// Date Range - NOW WORKS!
function initializeDateRange() {
    const select = document.getElementById('dateRangeSelect');
    const custom = document.getElementById('customDateRange');
    const applyBtn = document.getElementById('applyDateRange');

    select.addEventListener('change', () => {
        custom.classList.toggle('hidden', select.value !== 'custom');
        if (select.value !== 'custom') {
            applyDateRange(select.value);
        }
    });

    applyBtn.addEventListener('click', () => {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        if (start && end) {
            currentDateRange = { startDate: new Date(start), endDate: new Date(end) };
            recalculateAllStats();
            selectFund(selectedFundId);
        }
    });
}

function applyDateRange(selection) {
    if (selection === 'all') {
        currentDateRange = null;
    } else {
        currentDateRange = getDateRangeFromSelection(selection, FUND_DATA.dates);
    }
    recalculateAllStats();
    selectFund(selectedFundId);
}

// Fund Selector
function initializeFundSelector() {
    const input = document.getElementById('fundSearch');
    const dropdown = document.getElementById('fundDropdown');
    function render(filter = '') {
        dropdown.innerHTML = '';
        FUND_DATA.funds.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()) || f.strategy.toLowerCase().includes(filter.toLowerCase()))
            .forEach(fund => {
                const item = document.createElement('div');
                item.className = 'fund-dropdown-item';
                item.innerHTML = `<div class="fund-name">${fund.name}</div><div class="fund-strategy">${fund.strategy}</div>`;
                item.addEventListener('click', () => { selectFund(fund.id); dropdown.classList.remove('show'); input.value = fund.name; });
                dropdown.appendChild(item);
            });
    }
    input.addEventListener('focus', () => { render(input.value); dropdown.classList.add('show'); });
    input.addEventListener('input', (e) => { render(e.target.value); dropdown.classList.add('show'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.fund-selector')) dropdown.classList.remove('show'); });
}

// Navigation
function initializeNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const titles = { overview: 'Fund Overview', returns: 'Historical Returns', risk: 'Risk Analysis', charts: 'Analytics', compare: 'Compare Funds', correlation: 'Correlations', peers: 'Peer Analysis', portfolio: 'Portfolio Builder', stress: 'Stress Testing', rankings: 'Rankings' };
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
            document.getElementById('pageTitle').textContent = titles[tab.dataset.tab];
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        });
    });
}

// Strategy Filter
function initializeStrategyFilter() {
    const filter = document.getElementById('strategyFilter');
    [...new Set(FUND_DATA.funds.map(f => f.strategy))].sort().forEach(s => {
        const opt = document.createElement('option'); opt.value = s; opt.textContent = s; filter.appendChild(opt);
    });
    filter.addEventListener('change', () => { renderPeerTable(filter.value); renderRiskReturnChart('chartRiskReturn', getFilteredStats(filter.value), selectedFundId); });
}

// Rankings
function initializeRankingsControls() {
    const metric = document.getElementById('rankingMetric');
    const order = document.getElementById('rankingOrder');

    // Add more metrics
    const additionalMetrics = [
        { value: 'omega', label: 'Omega Ratio' },
        { value: 'alpha', label: 'Alpha' },
        { value: 'informationRatio', label: 'Information Ratio' }
    ];
    additionalMetrics.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.value;
        opt.textContent = m.label;
        metric.appendChild(opt);
    });

    const update = () => {
        document.getElementById('rankingChartTitle').textContent = `Fund Rankings by ${getMetricLabel(metric.value)}`;
        renderRankingsChart('chartRankings', allFundsStats, metric.value, order.value);
        renderRankingsTable(metric.value, order.value);
    };
    metric.addEventListener('change', update);
    order.addEventListener('change', update);
}

// Compare Tab
function initializeCompareTab() {
    const container = document.getElementById('compareCheckboxes');
    FUND_DATA.funds.forEach(fund => {
        const label = document.createElement('label');
        label.className = 'compare-checkbox';
        label.innerHTML = `<input type="checkbox" value="${fund.id}" ${fund.id < 2 ? 'checked' : ''}> ${fund.name}`;
        container.appendChild(label);
    });
    document.getElementById('updateComparison').addEventListener('click', updateComparison);
}

function updateComparison() {
    const checked = [...document.querySelectorAll('#compareCheckboxes input:checked')].map(c => parseInt(c.value)).slice(0, 5);
    if (checked.length < 2) return alert('Select at least 2 funds');
    selectedCompare = checked;
    renderComparisonPerformance('chartComparePerformance', checked);
    renderComparisonDrawdown('chartCompareDrawdown', checked);
    renderComparisonRolling('chartCompareRolling', checked);
    renderCompareStatsTable(checked);
}

function renderCompareStatsTable(fundIds) {
    const table = document.getElementById('compareStatsTable');
    const metrics = ['annReturn', 'annVol', 'sharpe', 'sortino', 'omega', 'maxDD', 'calmar', 'alpha', 'beta', 'informationRatio'];
    const labels = { annReturn: 'Ann. Return', annVol: 'Ann. Vol', sharpe: 'Sharpe', sortino: 'Sortino', omega: 'Omega', maxDD: 'Max DD', calmar: 'Calmar', alpha: 'Alpha', beta: 'Beta', informationRatio: 'Info Ratio' };
    table.querySelector('thead').innerHTML = '<tr><th>Metric</th>' + fundIds.map(id => `<th>${FUND_DATA.funds[id].name.split(' ').slice(0,2).join(' ')}</th>`).join('') + '</tr>';
    table.querySelector('tbody').innerHTML = metrics.map(m => {
        return '<tr><td>' + labels[m] + '</td>' + fundIds.map(id => {
            const v = allFundsStats[id][m];
            return `<td class="${m === 'maxDD' ? 'negative' : v >= 0 ? '' : 'negative'}">${['annReturn','annVol','maxDD','alpha'].includes(m) ? formatPercent(v) : formatNumber(v)}</td>`;
        }).join('') + '</tr>';
    }).join('');
}

// Correlation Tab - NOW WORKS WITH PERIOD FILTER
function initializeCorrelationTab() {
    const select = document.getElementById('correlationPeriod');
    select.addEventListener('change', (e) => {
        renderCorrelationMatrix('chartCorrelationMatrix', e.target.value);
        renderCorrelationTable(e.target.value);
        renderDendrogram('chartDendrogram');
    });
}

function renderCorrelationTable(period = 'all') {
    const table = document.getElementById('correlationTable');
    const fundNames = FUND_DATA.funds.map(f => f.name.split(' ').slice(0, 2).join(' '));

    let returns = FUND_DATA.funds.map(f => f.dailyReturns);
    if (period !== 'all') {
        const days = period === '1y' ? 252 : period === '3y' ? 756 : returns[0].length;
        returns = returns.map(r => r.slice(-days));
    }

    const matrix = correlationMatrix(returns);

    // Build header
    table.querySelector('thead').innerHTML = '<tr><th></th>' + fundNames.map(n => `<th>${n}</th>`).join('') + '</tr>';

    // Build body
    table.querySelector('tbody').innerHTML = matrix.map((row, i) => {
        return '<tr><td class="fund-name-cell">' + fundNames[i] + '</td>' +
            row.map((val, j) => {
                const color = val === 1 ? '' : val > 0.5 ? 'positive' : val < -0.5 ? 'negative' : '';
                return `<td class="${color}">${val.toFixed(2)}</td>`;
            }).join('') + '</tr>';
    }).join('');
}

// Portfolio Builder
function initializePortfolioBuilder() {
    const container = document.getElementById('portfolioAllocations');
    FUND_DATA.funds.forEach(fund => {
        const div = document.createElement('div');
        div.className = 'allocation-input';
        div.innerHTML = `<label>${fund.name.split(' ').slice(0,2).join(' ')}</label><input type="number" min="0" max="100" value="0" data-fund="${fund.id}">%`;
        container.appendChild(div);
        portfolioWeights[fund.id] = 0;
    });

    container.addEventListener('input', () => {
        let total = 0;
        container.querySelectorAll('input').forEach(inp => { portfolioWeights[inp.dataset.fund] = parseFloat(inp.value) || 0; total += portfolioWeights[inp.dataset.fund]; });
        const el = document.getElementById('totalAllocation');
        el.textContent = total.toFixed(0) + '%';
        el.className = 'allocation-total' + (total === 100 ? '' : total > 100 ? ' error' : ' warning');
    });

    document.getElementById('equalWeight').addEventListener('click', () => {
        const n = FUND_DATA.funds.length, w = (100 / n).toFixed(1);
        container.querySelectorAll('input').forEach(inp => inp.value = w);
        container.dispatchEvent(new Event('input'));
    });

    document.getElementById('optimizeSharpe').addEventListener('click', () => {
        const returns = FUND_DATA.funds.map(f => f.dailyReturns);
        const weights = optimizeForSharpe(returns);
        container.querySelectorAll('input').forEach((inp, i) => inp.value = (weights[i] * 100).toFixed(1));
        container.dispatchEvent(new Event('input'));
    });

    document.getElementById('riskParity').addEventListener('click', () => {
        const returns = FUND_DATA.funds.map(f => f.dailyReturns);
        const weights = riskParityWeights(returns);
        container.querySelectorAll('input').forEach((inp, i) => inp.value = (weights[i] * 100).toFixed(1));
        container.dispatchEvent(new Event('input'));
    });

    document.getElementById('optimizeMinVol').addEventListener('click', () => {
        const returns = FUND_DATA.funds.map(f => f.dailyReturns);
        const weights = minVolatilityWeights(returns);
        container.querySelectorAll('input').forEach((inp, i) => inp.value = (weights[i] * 100).toFixed(1));
        container.dispatchEvent(new Event('input'));
    });

    document.getElementById('calculatePortfolio').addEventListener('click', calculatePortfolio);
}

function calculatePortfolio() {
    const weights = FUND_DATA.funds.map((_, i) => (portfolioWeights[i] || 0) / 100);
    const total = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1) > 0.01) return alert('Weights must sum to 100%');

    const returns = FUND_DATA.funds.map(f => f.dailyReturns);
    const portRets = portfolioReturn(weights, returns);
    const portStats = {
        ret: annualizedReturn(portRets),
        vol: annualizedVolatility(portRets),
        sharpe: sharpeRatio(portRets),
        maxDD: maxDrawdown(portRets)
    };

    document.getElementById('portfolioReturn').textContent = formatPercent(portStats.ret);
    document.getElementById('portfolioVol').textContent = formatPercent(portStats.vol);
    document.getElementById('portfolioSharpe').textContent = formatNumber(portStats.sharpe);
    document.getElementById('portfolioMaxDD').textContent = formatPercent(portStats.maxDD);

    const fundIds = FUND_DATA.funds.map(f => f.id);
    renderPortfolioPie('chartPortfolioPie', weights, fundIds);
    renderPortfolioPerformance('chartPortfolioPerformance', portRets, FUND_DATA.funds[0].dates);
    renderEfficientFrontier('chartEfficientFrontier', portStats, allFundsStats);

    document.getElementById('portfolioResults').classList.remove('hidden');
}

// Stress Testing
function initializeStressTesting() {
    document.getElementById('runMonteCarlo').addEventListener('click', runMonteCarlo);
}

function runMonteCarlo() {
    const fund = FUND_DATA.funds[selectedFundId];
    const months = parseInt(document.getElementById('mcHorizon').value);
    const sims = parseInt(document.getElementById('mcSimulations').value);
    const results = monteCarloSimulation(fund.dailyReturns, months, sims);

    document.getElementById('mcMedian').textContent = formatPercent(results.median);
    document.getElementById('mc5th').textContent = formatPercent(results.percentile5);
    document.getElementById('mc95th').textContent = formatPercent(results.percentile95);
    document.getElementById('mcProbLoss').textContent = formatPercent(results.probLoss);

    renderMonteCarloChart('chartMonteCarlo', results, months);
    document.getElementById('monteCarloResults').classList.remove('hidden');
}

function updateStressScenarios(stats) {
    const beta = stats.beta;
    const alpha = stats.alpha || 0;

    // More accurate stress estimates using beta
    const scenarios = [
        { name: 'COVID-19 Crash', move: -0.339 },
        { name: '2022 Bear Market', move: -0.254 },
        { name: 'Q4 2018 Selloff', move: -0.198 },
        { name: 'Hypothetical -20%', move: -0.20 }
    ];

    document.getElementById('stressCovid').textContent = formatPercent(alpha + beta * scenarios[0].move);
    document.getElementById('stress2022').textContent = formatPercent(alpha + beta * scenarios[1].move);
    document.getElementById('stressQ42018').textContent = formatPercent(alpha + beta * scenarios[2].move);
    document.getElementById('stressCustom').textContent = formatPercent(alpha + beta * scenarios[3].move);

    document.querySelectorAll('.scenario-value').forEach(el => {
        const text = el.textContent;
        if (text && text !== '-') {
            const val = parseFloat(text);
            el.classList.toggle('negative', val < 0);
            el.classList.toggle('positive', val > 0);
        }
    });
}

// Table Sorting
function initializeTableSorting() {
    document.querySelectorAll('.data-table.sortable').forEach(table => {
        table.querySelectorAll('th.sortable').forEach((th, colIndex) => {
            th.addEventListener('click', () => sortTable(table, colIndex, th));
        });
    });
}

function sortTable(table, colIndex, th) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // Toggle order
    const currentOrder = th.classList.contains('sort-asc') ? 'asc' : th.classList.contains('sort-desc') ? 'desc' : 'none';
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';

    // Remove sort classes from all headers
    table.querySelectorAll('th').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
    th.classList.add(`sort-${newOrder}`);

    // Sort rows
    rows.sort((a, b) => {
        let aVal = a.cells[colIndex].textContent.replace('%', '').replace(',', '');
        let bVal = b.cells[colIndex].textContent.replace('%', '').replace(',', '');

        // Check if numeric
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return newOrder === 'asc' ? aNum - bNum : bNum - aNum;
        }
        return newOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

// Select Fund
function selectFund(fundId) {
    selectedFundId = fundId;
    const fund = FUND_DATA.funds[fundId];
    const stats = allFundsStats[fundId];

    if (!stats) {
        console.error('No stats for fund', fundId);
        return;
    }

    document.getElementById('selectedFundName').textContent = fund.name;
    document.getElementById('headerAum').textContent = fund.aum;
    document.getElementById('headerStrategy').textContent = fund.strategy;
    document.getElementById('fundSearch').value = fund.name;

    updateOverviewStats(stats);
    updateRiskStats(stats);
    updateStressScenarios(stats);

    // Charts - Overview
    renderCumulativeChart('chartCumulative', fund, stats);
    renderDistributionChart('chartDistribution', fund);
    renderYearlyReturnsChart('chartYearlyReturns', fund, stats);

    // Charts - Risk
    renderDrawdownChart('chartDrawdown', fund);
    renderVaRDistribution('chartVaRDistribution', fund, stats);
    renderUnderwaterChart('chartUnderwater', fund);
    renderDrawdownPeriodsChart('chartDrawdownPeriods', fund, stats);

    // Charts - Analytics
    renderRollingReturnChart('chartRollingReturn', fund);
    renderRollingVolChart('chartRollingVol', fund);
    renderRollingSharpeChart('chartRollingSharpe', fund);
    renderRollingBetaChart('chartRollingBeta', fund);
    renderRollingCorrelationChart('chartRollingCorrelation', fund);

    // Charts - Returns
    renderReturnsHeatmap('chartReturnsHeatmap', stats);

    // Charts - Peer Analysis
    renderRiskReturnChart('chartRiskReturn', getFilteredStats(document.getElementById('strategyFilter').value), selectedFundId);
    renderSharpeSortinoChart('chartSharpeSortino', allFundsStats, selectedFundId);
    renderStrategyBoxplot('chartStrategyBoxplot', allFundsStats);

    // Charts - Correlation
    const correlationPeriod = document.getElementById('correlationPeriod').value;
    renderCorrelationMatrix('chartCorrelationMatrix', correlationPeriod);
    renderCorrelationTable(correlationPeriod);
    renderDendrogram('chartDendrogram');

    // Tables
    renderMonthlyReturnsTable(stats);
    renderPeerTable(document.getElementById('strategyFilter').value);

    // Rankings
    const metric = document.getElementById('rankingMetric').value;
    renderRankingsChart('chartRankings', allFundsStats, metric, document.getElementById('rankingOrder').value);
    renderRankingsTable(metric, document.getElementById('rankingOrder').value);

    // Update comparison if tab is active
    updateComparison();
}

function updateOverviewStats(stats) {
    document.getElementById('statTotalReturn').textContent = formatPercent(stats.totalReturn, 1);
    document.getElementById('statTotalReturnSub').textContent = 'Since inception';
    document.getElementById('statAnnReturn').textContent = formatPercent(stats.annReturn, 1);
    document.getElementById('statAnnVol').textContent = formatPercent(stats.annVol, 1);
    document.getElementById('statSharpe').textContent = formatNumber(stats.sharpe, 2);
    document.getElementById('statSortino').textContent = formatNumber(stats.sortino, 2);
    document.getElementById('statMaxDD').textContent = formatPercent(stats.maxDD, 1);
    document.getElementById('statMaxDDDate').textContent = formatDate(stats.maxDDDate);
    document.getElementById('statCalmar').textContent = formatNumber(stats.calmar, 2);
    document.getElementById('statWinRate').textContent = formatPercent(stats.winRate, 1);

    // Quick stats
    document.getElementById('statBestMonth').textContent = formatPercent(stats.bestMonth, 1);
    document.getElementById('statWorstMonth').textContent = formatPercent(stats.worstMonth, 1);
    document.getElementById('statAvgMonth').textContent = formatPercent(stats.avgMonthlyReturn, 2);
    document.getElementById('statPosMonths').textContent = `${stats.positiveMonths}/${stats.totalMonths}`;
    document.getElementById('statBeta').textContent = formatNumber(stats.beta, 2);
    document.getElementById('statCorrelation').textContent = formatNumber(stats.correlation, 2);

    // Ranks
    const ranks = Object.entries(allFundsStats).sort((a, b) => b[1].annReturn - a[1].annReturn);
    const rank = ranks.findIndex(([id]) => parseInt(id) === selectedFundId) + 1;
    document.getElementById('statAnnReturnRank').textContent = `Rank ${rank}/${ranks.length}`;
}

function updateRiskStats(stats) {
    document.getElementById('var95').textContent = formatPercent(stats.var95, 2);
    document.getElementById('var99').textContent = formatPercent(stats.var99, 2);
    document.getElementById('varMonthly95').textContent = formatPercent(stats.varMonthly95, 2);
    document.getElementById('cvar95').textContent = formatPercent(stats.cvar95, 2);
    document.getElementById('cvar99').textContent = formatPercent(stats.cvar99, 2);
    document.getElementById('skewness').textContent = formatNumber(stats.skewness, 2);
    document.getElementById('kurtosis').textContent = formatNumber(stats.kurtosis, 2);
    document.getElementById('riskMaxDD').textContent = formatPercent(stats.maxDD, 2);
    document.getElementById('avgDD').textContent = formatPercent(stats.avgDD, 2);
    document.getElementById('maxDDDuration').textContent = `${stats.maxDDDuration.months}mo`;
    document.getElementById('recoveryTime').textContent = `${stats.recoveryTime.months}mo`;
    document.getElementById('upCapture').textContent = formatPercent(stats.upCapture, 0);
    document.getElementById('downCapture').textContent = formatPercent(stats.downCapture, 0);
    document.getElementById('captureRatio').textContent = formatNumber(stats.captureRatio, 2);
    document.getElementById('worstDay').textContent = formatPercent(stats.worstDay, 2);
    document.getElementById('bestDay').textContent = formatPercent(stats.bestDay, 2);
    document.getElementById('daysBelow2').textContent = stats.daysBelow2Pct;
}

function getFilteredStats(strategy) {
    if (strategy === 'all') return allFundsStats;
    const filtered = {};
    FUND_DATA.funds.forEach((f, i) => { if (f.strategy === strategy) filtered[i] = allFundsStats[i]; });
    return filtered;
}

function renderMonthlyReturnsTable(stats) {
    const table = document.getElementById('monthlyReturnsTable');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = Object.keys(stats.monthlyReturns).sort().reverse();
    table.querySelector('thead').innerHTML = `<tr><th>Year</th>${months.map(m => `<th>${m}</th>`).join('')}<th>YTD</th></tr>`;
    table.querySelector('tbody').innerHTML = years.map(year => {
        const cells = months.map((_, m) => {
            const v = stats.monthlyReturns[year][m];
            return v !== undefined ? `<td class="${v >= 0 ? 'positive' : 'negative'}">${(v * 100).toFixed(1)}</td>` : '<td>-</td>';
        }).join('');
        const ytd = stats.ytdReturns[year];
        return `<tr><td>${year}</td>${cells}<td class="${ytd >= 0 ? 'positive' : 'negative'}">${(ytd * 100).toFixed(1)}</td></tr>`;
    }).join('');
}

function renderPeerTable(filter = 'all') {
    const table = document.getElementById('peerTable');
    const currentYear = new Date().getFullYear();
    table.querySelector('thead').innerHTML = '<tr><th class="sortable">Fund</th><th>Strategy</th><th class="sortable">Ann. Return</th><th class="sortable">Ann. Vol</th><th class="sortable">Sharpe</th><th class="sortable">Sortino</th><th class="sortable">Max DD</th><th class="sortable">Alpha</th><th class="sortable">Beta</th><th class="sortable">YTD</th></tr>';

    const rows = FUND_DATA.funds.filter(f => filter === 'all' || f.strategy === filter).map(fund => {
        const s = allFundsStats[fund.id];
        return { id: fund.id, name: fund.name, strategy: fund.strategy, ...s, ytd: s.ytdReturns[currentYear] || 0 };
    }).sort((a, b) => b.sharpe - a.sharpe);

    table.querySelector('tbody').innerHTML = rows.map(r => `
        <tr class="${r.id === selectedFundId ? 'highlight-row' : ''}" data-fund-id="${r.id}" style="cursor:pointer">
            <td class="fund-name-cell">${r.name}</td><td>${r.strategy}</td>
            <td class="${r.annReturn >= 0 ? 'positive' : 'negative'}">${formatPercent(r.annReturn, 1)}</td>
            <td>${formatPercent(r.annVol, 1)}</td>
            <td class="${r.sharpe >= 1 ? 'positive' : ''}">${formatNumber(r.sharpe, 2)}</td>
            <td>${formatNumber(r.sortino, 2)}</td>
            <td class="negative">${formatPercent(r.maxDD, 1)}</td>
            <td class="${r.alpha >= 0 ? 'positive' : 'negative'}">${formatPercent(r.alpha, 1)}</td>
            <td>${formatNumber(r.beta, 2)}</td>
            <td class="${r.ytd >= 0 ? 'positive' : 'negative'}">${formatPercent(r.ytd, 1)}</td>
        </tr>
    `).join('');

    table.querySelector('tbody').querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => selectFund(parseInt(row.dataset.fundId)));
    });

    // Re-initialize sorting for this table
    table.querySelectorAll('th.sortable').forEach((th, colIndex) => {
        th.onclick = () => sortTable(table, colIndex, th);
    });
}

function renderRankingsTable(metric, order) {
    const table = document.getElementById('rankingsTable');
    const currentYear = new Date().getFullYear();
    table.querySelector('thead').innerHTML = '<tr><th>Rank</th><th>Fund</th><th>Strategy</th><th>' + getMetricLabel(metric) + '</th></tr>';

    const data = FUND_DATA.funds.map(f => {
        const s = allFundsStats[f.id];
        let value;
        if (metric === 'ytdReturn') {
            value = s.ytdReturns[currentYear] || 0;
        } else {
            value = s[metric];
        }
        return { id: f.id, name: f.name, strategy: f.strategy, value };
    }).sort((a, b) => order === 'desc' ? b.value - a.value : a.value - b.value);

    const isPct = ['annReturn', 'annVol', 'maxDD', 'ytdReturn', 'alpha'].includes(metric);
    table.querySelector('tbody').innerHTML = data.map((r, i) => `
        <tr class="${r.id === selectedFundId ? 'highlight-row' : ''}" data-fund-id="${r.id}" style="cursor:pointer">
            <td>${i + 1}</td><td class="fund-name-cell">${r.name}</td><td>${r.strategy}</td>
            <td>${isPct ? formatPercent(r.value, 2) : formatNumber(r.value, 2)}</td>
        </tr>
    `).join('');

    table.querySelector('tbody').querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => selectFund(parseInt(row.dataset.fundId)));
    });
}
