// ============================================
// Financial Calculations Module
// ============================================

const TRADING_DAYS_PER_YEAR = 252;
const RISK_FREE_RATE = 0.04; // 4% annual risk-free rate

// Basic statistics
function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
    const avg = mean(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(mean(squareDiffs));
}

function sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

// Cumulative returns from daily returns
function cumulativeReturns(dailyReturns) {
    const cumReturns = [];
    let cumReturn = 1;
    for (const ret of dailyReturns) {
        cumReturn *= (1 + ret);
        cumReturns.push(cumReturn - 1);
    }
    return cumReturns;
}

// NAV series from daily returns (starting at 100)
function calculateNAV(dailyReturns, startValue = 100) {
    const nav = [startValue];
    for (const ret of dailyReturns) {
        nav.push(nav[nav.length - 1] * (1 + ret));
    }
    return nav.slice(1);
}

// Total return
function totalReturn(dailyReturns) {
    return dailyReturns.reduce((cum, ret) => cum * (1 + ret), 1) - 1;
}

// Annualized return
function annualizedReturn(dailyReturns) {
    const total = totalReturn(dailyReturns);
    const years = dailyReturns.length / TRADING_DAYS_PER_YEAR;
    return Math.pow(1 + total, 1 / years) - 1;
}

// Annualized volatility
function annualizedVolatility(dailyReturns) {
    return standardDeviation(dailyReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

// Sharpe ratio
function sharpeRatio(dailyReturns) {
    const annRet = annualizedReturn(dailyReturns);
    const annVol = annualizedVolatility(dailyReturns);
    return (annRet - RISK_FREE_RATE) / annVol;
}

// Sortino ratio (only downside volatility)
function sortinoRatio(dailyReturns) {
    const annRet = annualizedReturn(dailyReturns);
    const dailyRf = RISK_FREE_RATE / TRADING_DAYS_PER_YEAR;
    const downside = dailyReturns.filter(r => r < dailyRf);
    if (downside.length === 0) return Infinity;
    const downsideVol = standardDeviation(downside) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    return (annRet - RISK_FREE_RATE) / downsideVol;
}

// Drawdown series
function drawdownSeries(dailyReturns) {
    const nav = calculateNAV(dailyReturns);
    const drawdowns = [];
    let peak = nav[0];

    for (const value of nav) {
        if (value > peak) peak = value;
        drawdowns.push((value - peak) / peak);
    }
    return drawdowns;
}

// Maximum drawdown
function maxDrawdown(dailyReturns) {
    const dd = drawdownSeries(dailyReturns);
    return Math.min(...dd);
}

// Maximum drawdown with date
function maxDrawdownWithDate(dailyReturns, dates) {
    const dd = drawdownSeries(dailyReturns);
    const minDD = Math.min(...dd);
    const idx = dd.indexOf(minDD);
    return {
        value: minDD,
        date: dates[idx]
    };
}

// Calmar ratio (annualized return / max drawdown)
function calmarRatio(dailyReturns) {
    const annRet = annualizedReturn(dailyReturns);
    const maxDD = Math.abs(maxDrawdown(dailyReturns));
    return maxDD === 0 ? Infinity : annRet / maxDD;
}

// Win rate (percentage of positive days)
function winRate(dailyReturns) {
    const positive = dailyReturns.filter(r => r > 0).length;
    return positive / dailyReturns.length;
}

// Rolling calculations
function rollingCalculation(dailyReturns, window, calcFn) {
    const results = [];
    for (let i = window - 1; i < dailyReturns.length; i++) {
        const slice = dailyReturns.slice(i - window + 1, i + 1);
        results.push(calcFn(slice));
    }
    return results;
}

// Rolling return (annualized)
function rollingReturn(dailyReturns, window = 252) {
    return rollingCalculation(dailyReturns, window, annualizedReturn);
}

// Rolling volatility (annualized)
function rollingVolatility(dailyReturns, window = 252) {
    return rollingCalculation(dailyReturns, window, annualizedVolatility);
}

// Rolling Sharpe ratio
function rollingSharpe(dailyReturns, window = 252) {
    return rollingCalculation(dailyReturns, window, sharpeRatio);
}

// Rolling beta
function rollingBeta(fundReturns, benchmarkReturns, window = 252) {
    const results = [];
    for (let i = window - 1; i < fundReturns.length; i++) {
        const fundSlice = fundReturns.slice(i - window + 1, i + 1);
        const benchSlice = benchmarkReturns.slice(i - window + 1, i + 1);
        results.push(calculateBeta(fundSlice, benchSlice));
    }
    return results;
}

// Beta calculation
function calculateBeta(fundReturns, benchmarkReturns) {
    const n = fundReturns.length;
    const fundMean = mean(fundReturns);
    const benchMean = mean(benchmarkReturns);

    let covariance = 0;
    let benchVariance = 0;

    for (let i = 0; i < n; i++) {
        covariance += (fundReturns[i] - fundMean) * (benchmarkReturns[i] - benchMean);
        benchVariance += Math.pow(benchmarkReturns[i] - benchMean, 2);
    }

    return benchVariance === 0 ? 0 : covariance / benchVariance;
}

// Monthly returns aggregation
function monthlyReturns(dailyReturns, dates) {
    const monthly = {};

    for (let i = 0; i < dailyReturns.length; i++) {
        const date = dates[i];
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}`;

        if (!monthly[key]) {
            monthly[key] = { year, month, returns: [] };
        }
        monthly[key].returns.push(dailyReturns[i]);
    }

    // Convert to monthly returns
    const result = {};
    for (const key of Object.keys(monthly)) {
        const { year, month, returns } = monthly[key];
        const monthlyRet = returns.reduce((cum, r) => cum * (1 + r), 1) - 1;
        if (!result[year]) result[year] = {};
        result[year][month] = monthlyRet;
    }

    return result;
}

// YTD returns by year
function ytdReturns(dailyReturns, dates) {
    const yearly = {};

    for (let i = 0; i < dailyReturns.length; i++) {
        const year = dates[i].getFullYear();
        if (!yearly[year]) yearly[year] = [];
        yearly[year].push(dailyReturns[i]);
    }

    const result = {};
    for (const year of Object.keys(yearly)) {
        result[year] = totalReturn(yearly[year]);
    }

    return result;
}

// Get all stats for a fund
function getAllFundStats(fund) {
    const returns = fund.dailyReturns;
    const dates = fund.dates;
    const maxDDInfo = maxDrawdownWithDate(returns, dates);

    return {
        totalReturn: totalReturn(returns),
        annReturn: annualizedReturn(returns),
        annVol: annualizedVolatility(returns),
        sharpe: sharpeRatio(returns),
        sortino: sortinoRatio(returns),
        maxDD: maxDDInfo.value,
        maxDDDate: maxDDInfo.date,
        calmar: calmarRatio(returns),
        winRate: winRate(returns),
        beta: calculateBeta(returns, fund.benchmarkReturns),
        monthlyReturns: monthlyReturns(returns, dates),
        ytdReturns: ytdReturns(returns, dates)
    };
}

// Format helpers
function formatPercent(value, decimals = 2) {
    if (value === null || value === undefined || !isFinite(value)) return '-';
    return (value * 100).toFixed(decimals) + '%';
}

function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || !isFinite(value)) return '-';
    return value.toFixed(decimals);
}

function formatDate(date) {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
