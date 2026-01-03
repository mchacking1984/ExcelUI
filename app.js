// ============================================
// Main Application Module
// ============================================

// State
let selectedFundId = 0;
let allFundsStats = {};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Calculate stats for all funds
    FUND_DATA.funds.forEach((fund, index) => {
        allFundsStats[index] = getAllFundStats(fund);
    });

    // Set data date
    document.getElementById('dataDate').textContent = formatDate(FUND_DATA.lastUpdate);

    // Initialize UI
    initializeFundSelector();
    initializeNavigation();
    initializeStrategyFilter();
    initializeRankingsControls();

    // Load first fund
    selectFund(0);
});

// Fund Selector
function initializeFundSelector() {
    const searchInput = document.getElementById('fundSearch');
    const dropdown = document.getElementById('fundDropdown');

    // Populate dropdown
    function renderDropdown(filter = '') {
        dropdown.innerHTML = '';
        const filtered = FUND_DATA.funds.filter(f =>
            f.name.toLowerCase().includes(filter.toLowerCase()) ||
            f.strategy.toLowerCase().includes(filter.toLowerCase())
        );

        filtered.forEach(fund => {
            const item = document.createElement('div');
            item.className = 'fund-dropdown-item';
            item.innerHTML = `
                <div class="fund-name">${fund.name}</div>
                <div class="fund-strategy">${fund.strategy}</div>
            `;
            item.addEventListener('click', () => {
                selectFund(fund.id);
                dropdown.classList.remove('show');
                searchInput.value = fund.name;
            });
            dropdown.appendChild(item);
        });
    }

    searchInput.addEventListener('focus', () => {
        renderDropdown(searchInput.value);
        dropdown.classList.add('show');
    });

    searchInput.addEventListener('input', (e) => {
        renderDropdown(e.target.value);
        dropdown.classList.add('show');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.fund-selector')) {
            dropdown.classList.remove('show');
        }
    });
}

// Navigation
function initializeNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const pageTitles = {
        overview: 'Fund Overview',
        returns: 'Historical Returns',
        charts: 'Analytics & Charts',
        peers: 'Peer Group Analysis',
        rankings: 'Fund Rankings'
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding content
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${tabName}`).classList.add('active');

            // Update page title
            document.getElementById('pageTitle').textContent = pageTitles[tabName];

            // Refresh charts if needed (Plotly resize issue)
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 100);
        });
    });
}

// Strategy filter for peer analysis
function initializeStrategyFilter() {
    const filter = document.getElementById('strategyFilter');
    const strategies = [...new Set(FUND_DATA.funds.map(f => f.strategy))].sort();

    strategies.forEach(strategy => {
        const option = document.createElement('option');
        option.value = strategy;
        option.textContent = strategy;
        filter.appendChild(option);
    });

    filter.addEventListener('change', () => {
        renderPeerTable(filter.value);
        renderRiskReturnChart('chartRiskReturn', getFilteredStats(filter.value), selectedFundId);
    });
}

// Rankings controls
function initializeRankingsControls() {
    const metricSelect = document.getElementById('rankingMetric');
    const orderSelect = document.getElementById('rankingOrder');

    const updateRankings = () => {
        const metric = metricSelect.value;
        const order = orderSelect.value;

        document.getElementById('rankingChartTitle').textContent =
            `Fund Rankings by ${getMetricLabel(metric)}`;

        renderRankingsChart('chartRankings', allFundsStats, metric, order);
        renderRankingsTable(metric, order);
    };

    metricSelect.addEventListener('change', updateRankings);
    orderSelect.addEventListener('change', updateRankings);
}

// Get filtered stats based on strategy
function getFilteredStats(strategy) {
    if (strategy === 'all') return allFundsStats;

    const filtered = {};
    FUND_DATA.funds.forEach((fund, index) => {
        if (fund.strategy === strategy) {
            filtered[index] = allFundsStats[index];
        }
    });
    return filtered;
}

// Select a fund and update all views
function selectFund(fundId) {
    selectedFundId = fundId;
    const fund = FUND_DATA.funds[fundId];
    const stats = allFundsStats[fundId];

    // Update header
    document.getElementById('selectedFundName').textContent = fund.name;
    document.getElementById('headerAum').textContent = fund.aum;
    document.getElementById('headerStrategy').textContent = fund.strategy;
    document.getElementById('fundSearch').value = fund.name;

    // Update overview stats
    updateOverviewStats(stats);

    // Render charts
    renderCumulativeChart('chartCumulative', fund, stats);
    renderDistributionChart('chartDistribution', fund);
    renderYearlyReturnsChart('chartYearlyReturns', fund, stats);

    // Render analytics charts
    renderDrawdownChart('chartDrawdown', fund);
    renderRollingReturnChart('chartRollingReturn', fund);
    renderRollingVolChart('chartRollingVol', fund);
    renderRollingSharpeChart('chartRollingSharpe', fund);
    renderRollingBetaChart('chartRollingBeta', fund);

    // Render tables
    renderMonthlyReturnsTable(stats);
    renderPeerTable(document.getElementById('strategyFilter').value);
    renderRiskReturnChart('chartRiskReturn', getFilteredStats(document.getElementById('strategyFilter').value), selectedFundId);

    // Render rankings
    const metric = document.getElementById('rankingMetric').value;
    const order = document.getElementById('rankingOrder').value;
    renderRankingsChart('chartRankings', allFundsStats, metric, order);
    renderRankingsTable(metric, order);
}

// Update overview statistics display
function updateOverviewStats(stats) {
    document.getElementById('statTotalReturn').textContent = formatPercent(stats.totalReturn, 1);
    document.getElementById('statTotalReturnSub').textContent = `Since inception`;

    document.getElementById('statAnnReturn').textContent = formatPercent(stats.annReturn, 1);
    document.getElementById('statAnnVol').textContent = formatPercent(stats.annVol, 1);
    document.getElementById('statSharpe').textContent = formatNumber(stats.sharpe, 2);
    document.getElementById('statSortino').textContent = formatNumber(stats.sortino, 2);
    document.getElementById('statMaxDD').textContent = formatPercent(stats.maxDD, 1);
    document.getElementById('statMaxDDDate').textContent = formatDate(stats.maxDDDate);
    document.getElementById('statCalmar').textContent = formatNumber(stats.calmar, 2);
    document.getElementById('statWinRate').textContent = formatPercent(stats.winRate, 1);

    // Color coding for return
    const totalReturnEl = document.getElementById('statTotalReturn');
    if (stats.totalReturn >= 0) {
        totalReturnEl.style.color = '';
    } else {
        totalReturnEl.style.color = '#ef4444';
    }
}

// Render monthly returns table
function renderMonthlyReturnsTable(stats) {
    const table = document.getElementById('monthlyReturnsTable');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = Object.keys(stats.monthlyReturns).sort().reverse();

    // Header
    thead.innerHTML = `
        <tr>
            <th>Year</th>
            ${months.map(m => `<th>${m}</th>`).join('')}
            <th>YTD</th>
        </tr>
    `;

    // Body
    tbody.innerHTML = years.map(year => {
        const yearData = stats.monthlyReturns[year];
        const ytd = stats.ytdReturns[year];

        const cells = months.map((_, monthIdx) => {
            const value = yearData[monthIdx];
            if (value === undefined) return '<td>-</td>';

            const pct = (value * 100).toFixed(1);
            const className = value >= 0 ? 'positive' : 'negative';
            return `<td class="${className}">${pct}</td>`;
        }).join('');

        const ytdPct = (ytd * 100).toFixed(1);
        const ytdClass = ytd >= 0 ? 'positive' : 'negative';

        return `
            <tr>
                <td>${year}</td>
                ${cells}
                <td class="${ytdClass}">${ytdPct}</td>
            </tr>
        `;
    }).join('');
}

// Render peer comparison table
function renderPeerTable(strategyFilter = 'all') {
    const table = document.getElementById('peerTable');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    // Header
    thead.innerHTML = `
        <tr>
            <th class="sortable" data-col="name">Fund</th>
            <th class="sortable" data-col="strategy">Strategy</th>
            <th class="sortable" data-col="annReturn">Ann. Return</th>
            <th class="sortable" data-col="annVol">Ann. Vol</th>
            <th class="sortable" data-col="sharpe">Sharpe</th>
            <th class="sortable" data-col="sortino">Sortino</th>
            <th class="sortable" data-col="maxDD">Max DD</th>
            <th class="sortable" data-col="calmar">Calmar</th>
            <th class="sortable" data-col="ytdReturn">YTD</th>
        </tr>
    `;

    // Get current year's YTD
    const currentYear = new Date().getFullYear();

    // Build rows
    const rows = FUND_DATA.funds
        .filter(f => strategyFilter === 'all' || f.strategy === strategyFilter)
        .map(fund => {
            const stats = allFundsStats[fund.id];
            const ytd = stats.ytdReturns[currentYear] || 0;

            return {
                id: fund.id,
                name: fund.name,
                strategy: fund.strategy,
                annReturn: stats.annReturn,
                annVol: stats.annVol,
                sharpe: stats.sharpe,
                sortino: stats.sortino,
                maxDD: stats.maxDD,
                calmar: stats.calmar,
                ytdReturn: ytd
            };
        });

    // Sort by Sharpe by default
    rows.sort((a, b) => b.sharpe - a.sharpe);

    tbody.innerHTML = rows.map(row => {
        const isSelected = row.id === selectedFundId;
        return `
            <tr class="${isSelected ? 'highlight-row' : ''}" data-fund-id="${row.id}">
                <td class="fund-name-cell">${row.name}</td>
                <td>${row.strategy}</td>
                <td class="${row.annReturn >= 0 ? 'positive' : 'negative'}">${formatPercent(row.annReturn, 1)}</td>
                <td>${formatPercent(row.annVol, 1)}</td>
                <td class="${row.sharpe >= 1 ? 'positive' : ''}">${formatNumber(row.sharpe, 2)}</td>
                <td class="${row.sortino >= 1 ? 'positive' : ''}">${formatNumber(row.sortino, 2)}</td>
                <td class="negative">${formatPercent(row.maxDD, 1)}</td>
                <td class="${row.calmar >= 1 ? 'positive' : ''}">${formatNumber(row.calmar, 2)}</td>
                <td class="${row.ytdReturn >= 0 ? 'positive' : 'negative'}">${formatPercent(row.ytdReturn, 1)}</td>
            </tr>
        `;
    }).join('');

    // Add click handlers
    tbody.querySelectorAll('tr').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            const fundId = parseInt(row.dataset.fundId);
            selectFund(fundId);
        });
    });

    // Add sort handlers
    thead.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            sortPeerTable(th.dataset.col);
        });
    });
}

// Sort peer table
let currentSort = { col: 'sharpe', dir: 'desc' };

function sortPeerTable(col) {
    const thead = document.querySelector('#peerTable thead');
    const tbody = document.querySelector('#peerTable tbody');

    // Toggle direction if same column
    if (currentSort.col === col) {
        currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc';
    } else {
        currentSort.col = col;
        currentSort.dir = 'desc';
    }

    // Update header classes
    thead.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.col === col) {
            th.classList.add(currentSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });

    // Sort rows
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
        const aVal = getCellValue(a, col);
        const bVal = getCellValue(b, col);

        if (typeof aVal === 'string') {
            return currentSort.dir === 'asc'
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }

        return currentSort.dir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    rows.forEach(row => tbody.appendChild(row));
}

function getCellValue(row, col) {
    const fundId = parseInt(row.dataset.fundId);
    const fund = FUND_DATA.funds[fundId];
    const stats = allFundsStats[fundId];
    const currentYear = new Date().getFullYear();

    switch (col) {
        case 'name': return fund.name;
        case 'strategy': return fund.strategy;
        case 'annReturn': return stats.annReturn;
        case 'annVol': return stats.annVol;
        case 'sharpe': return stats.sharpe;
        case 'sortino': return stats.sortino;
        case 'maxDD': return stats.maxDD;
        case 'calmar': return stats.calmar;
        case 'ytdReturn': return stats.ytdReturns[currentYear] || 0;
        default: return 0;
    }
}

// Render rankings table
function renderRankingsTable(metric, order) {
    const table = document.getElementById('rankingsTable');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const currentYear = new Date().getFullYear();

    thead.innerHTML = `
        <tr>
            <th>Rank</th>
            <th>Fund</th>
            <th>Strategy</th>
            <th>${getMetricLabel(metric)}</th>
        </tr>
    `;

    const data = FUND_DATA.funds.map(fund => {
        const stats = allFundsStats[fund.id];
        let value = stats[metric];

        if (metric === 'ytdReturn') {
            value = stats.ytdReturns[currentYear] || 0;
        }

        return {
            id: fund.id,
            name: fund.name,
            strategy: fund.strategy,
            value: value
        };
    });

    data.sort((a, b) => order === 'desc' ? b.value - a.value : a.value - b.value);

    const formatSuffix = ['annReturn', 'annVol', 'maxDD', 'ytdReturn', 'totalReturn'].includes(metric);

    tbody.innerHTML = data.map((row, index) => {
        const isSelected = row.id === selectedFundId;
        const displayValue = formatSuffix
            ? formatPercent(row.value, 2)
            : formatNumber(row.value, 2);

        return `
            <tr class="${isSelected ? 'highlight-row' : ''}" data-fund-id="${row.id}">
                <td>${index + 1}</td>
                <td class="fund-name-cell">${row.name}</td>
                <td>${row.strategy}</td>
                <td>${displayValue}</td>
            </tr>
        `;
    }).join('');

    // Add click handlers
    tbody.querySelectorAll('tr').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            const fundId = parseInt(row.dataset.fundId);
            selectFund(fundId);
        });
    });
}

// Helper function (also in charts.js but needed here)
function getMetricLabel(metric) {
    const labels = {
        annReturn: 'Annualized Return',
        annVol: 'Annualized Volatility',
        sharpe: 'Sharpe Ratio',
        sortino: 'Sortino Ratio',
        maxDD: 'Max Drawdown',
        calmar: 'Calmar Ratio',
        ytdReturn: 'YTD Return',
        totalReturn: 'Total Return'
    };
    return labels[metric] || metric;
}
