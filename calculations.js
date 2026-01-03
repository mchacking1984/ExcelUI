// ============================================
// Financial Calculations Module - Enhanced
// ============================================

const TRADING_DAYS_PER_YEAR = 252;
const RISK_FREE_RATE = 0.04; // 4% annual risk-free rate

// ==========================================
// Basic Statistics
// ==========================================

function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
    if (!arr || arr.length < 2) return 0;
    const avg = mean(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(mean(squareDiffs));
}

function sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

function percentile(arr, p) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function median(arr) {
    return percentile(arr, 50);
}

// ==========================================
// Return Calculations
// ==========================================

function cumulativeReturns(dailyReturns) {
    const cumReturns = [];
    let cumReturn = 1;
    for (const ret of dailyReturns) {
        cumReturn *= (1 + ret);
        cumReturns.push(cumReturn - 1);
    }
    return cumReturns;
}

function calculateNAV(dailyReturns, startValue = 100) {
    const nav = [startValue];
    for (const ret of dailyReturns) {
        nav.push(nav[nav.length - 1] * (1 + ret));
    }
    return nav.slice(1);
}

function totalReturn(dailyReturns) {
    if (!dailyReturns || dailyReturns.length === 0) return 0;
    return dailyReturns.reduce((cum, ret) => cum * (1 + ret), 1) - 1;
}

function annualizedReturn(dailyReturns) {
    if (!dailyReturns || dailyReturns.length === 0) return 0;
    const total = totalReturn(dailyReturns);
    const years = dailyReturns.length / TRADING_DAYS_PER_YEAR;
    if (years <= 0) return 0;
    return Math.pow(1 + total, 1 / years) - 1;
}

function annualizedVolatility(dailyReturns) {
    if (!dailyReturns || dailyReturns.length < 2) return 0;
    return standardDeviation(dailyReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

// ==========================================
// Risk-Adjusted Returns
// ==========================================

function sharpeRatio(dailyReturns) {
    const annRet = annualizedReturn(dailyReturns);
    const annVol = annualizedVolatility(dailyReturns);
    if (annVol === 0) return 0;
    return (annRet - RISK_FREE_RATE) / annVol;
}

function sortinoRatio(dailyReturns) {
    const annRet = annualizedReturn(dailyReturns);
    const dailyRf = RISK_FREE_RATE / TRADING_DAYS_PER_YEAR;
    const downside = dailyReturns.filter(r => r < dailyRf);
    if (downside.length === 0) return Infinity;
    const downsideVol = standardDeviation(downside) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    if (downsideVol === 0) return Infinity;
    return (annRet - RISK_FREE_RATE) / downsideVol;
}

function calmarRatio(dailyReturns) {
    const annRet = annualizedReturn(dailyReturns);
    const maxDD = Math.abs(maxDrawdown(dailyReturns));
    if (maxDD === 0) return Infinity;
    return annRet / maxDD;
}

function informationRatio(fundReturns, benchmarkReturns) {
    if (fundReturns.length !== benchmarkReturns.length) return 0;
    const excessReturns = fundReturns.map((r, i) => r - benchmarkReturns[i]);
    const avgExcess = mean(excessReturns) * TRADING_DAYS_PER_YEAR;
    const trackingError = standardDeviation(excessReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    if (trackingError === 0) return 0;
    return avgExcess / trackingError;
}

// ==========================================
// Drawdown Analysis
// ==========================================

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

function maxDrawdown(dailyReturns) {
    if (!dailyReturns || dailyReturns.length === 0) return 0;
    const dd = drawdownSeries(dailyReturns);
    return Math.min(...dd);
}

function maxDrawdownWithDate(dailyReturns, dates) {
    const dd = drawdownSeries(dailyReturns);
    const minDD = Math.min(...dd);
    const idx = dd.indexOf(minDD);
    return {
        value: minDD,
        date: dates[idx]
    };
}

function averageDrawdown(dailyReturns) {
    const dd = drawdownSeries(dailyReturns);
    const negDD = dd.filter(d => d < 0);
    return negDD.length > 0 ? mean(negDD) : 0;
}

function drawdownDuration(dailyReturns, dates) {
    const dd = drawdownSeries(dailyReturns);
    let maxDuration = 0;
    let currentDuration = 0;
    let maxDurationStart = 0;
    let currentStart = 0;

    for (let i = 0; i < dd.length; i++) {
        if (dd[i] < 0) {
            if (currentDuration === 0) currentStart = i;
            currentDuration++;
        } else {
            if (currentDuration > maxDuration) {
                maxDuration = currentDuration;
                maxDurationStart = currentStart;
            }
            currentDuration = 0;
        }
    }

    if (currentDuration > maxDuration) {
        maxDuration = currentDuration;
    }

    return {
        days: maxDuration,
        tradingDays: maxDuration,
        months: Math.round(maxDuration / 21)
    };
}

function recoveryTime(dailyReturns) {
    const dd = drawdownSeries(dailyReturns);
    let maxRecovery = 0;
    let inDrawdown = false;
    let drawdownStart = 0;

    for (let i = 0; i < dd.length; i++) {
        if (dd[i] < -0.001 && !inDrawdown) {
            inDrawdown = true;
            drawdownStart = i;
        } else if (dd[i] >= -0.001 && inDrawdown) {
            const recovery = i - drawdownStart;
            if (recovery > maxRecovery) maxRecovery = recovery;
            inDrawdown = false;
        }
    }

    return {
        days: maxRecovery,
        months: Math.round(maxRecovery / 21)
    };
}

// ==========================================
// Value at Risk (VaR) & CVaR
// ==========================================

function valueAtRisk(dailyReturns, confidence = 0.95) {
    // Historical VaR
    return percentile(dailyReturns, (1 - confidence) * 100);
}

function conditionalVaR(dailyReturns, confidence = 0.95) {
    // Expected Shortfall - average of returns below VaR
    const var_threshold = valueAtRisk(dailyReturns, confidence);
    const tailReturns = dailyReturns.filter(r => r <= var_threshold);
    return tailReturns.length > 0 ? mean(tailReturns) : var_threshold;
}

function monthlyVaR(dailyReturns, confidence = 0.95) {
    // Scale daily VaR to monthly (approximately)
    const dailyVar = valueAtRisk(dailyReturns, confidence);
    return dailyVar * Math.sqrt(21); // ~21 trading days per month
}

// ==========================================
// Distribution Statistics
// ==========================================

function skewness(arr) {
    if (!arr || arr.length < 3) return 0;
    const n = arr.length;
    const avg = mean(arr);
    const std = standardDeviation(arr);
    if (std === 0) return 0;

    const sum = arr.reduce((acc, val) => acc + Math.pow((val - avg) / std, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
}

function kurtosis(arr) {
    if (!arr || arr.length < 4) return 0;
    const n = arr.length;
    const avg = mean(arr);
    const std = standardDeviation(arr);
    if (std === 0) return 0;

    const sum = arr.reduce((acc, val) => acc + Math.pow((val - avg) / std, 4), 0);
    const excess = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum -
                   (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    return excess;
}

// ==========================================
// Win/Loss Statistics
// ==========================================

function winRate(dailyReturns) {
    const positive = dailyReturns.filter(r => r > 0).length;
    return positive / dailyReturns.length;
}

function profitLossRatio(dailyReturns) {
    const gains = dailyReturns.filter(r => r > 0);
    const losses = dailyReturns.filter(r => r < 0);
    if (losses.length === 0) return Infinity;
    const avgGain = gains.length > 0 ? mean(gains) : 0;
    const avgLoss = losses.length > 0 ? Math.abs(mean(losses)) : 1;
    return avgGain / avgLoss;
}

function bestWorstPeriods(dailyReturns) {
    return {
        bestDay: Math.max(...dailyReturns),
        worstDay: Math.min(...dailyReturns),
        daysAbove2Pct: dailyReturns.filter(r => r > 0.02).length,
        daysBelow2Pct: dailyReturns.filter(r => r < -0.02).length
    };
}

// ==========================================
// Capture Ratios
// ==========================================

function upCaptureRatio(fundReturns, benchmarkReturns) {
    const upDays = benchmarkReturns.map((r, i) => r > 0 ? i : -1).filter(i => i >= 0);
    if (upDays.length === 0) return 0;

    const fundUp = upDays.map(i => fundReturns[i]);
    const benchUp = upDays.map(i => benchmarkReturns[i]);

    const fundReturn = totalReturn(fundUp);
    const benchReturn = totalReturn(benchUp);

    return benchReturn !== 0 ? fundReturn / benchReturn : 0;
}

function downCaptureRatio(fundReturns, benchmarkReturns) {
    const downDays = benchmarkReturns.map((r, i) => r < 0 ? i : -1).filter(i => i >= 0);
    if (downDays.length === 0) return 0;

    const fundDown = downDays.map(i => fundReturns[i]);
    const benchDown = downDays.map(i => benchmarkReturns[i]);

    const fundReturn = totalReturn(fundDown);
    const benchReturn = totalReturn(benchDown);

    return benchReturn !== 0 ? fundReturn / benchReturn : 0;
}

function captureRatio(fundReturns, benchmarkReturns) {
    const up = upCaptureRatio(fundReturns, benchmarkReturns);
    const down = downCaptureRatio(fundReturns, benchmarkReturns);
    return down !== 0 ? up / down : Infinity;
}

// ==========================================
// Correlation & Beta
// ==========================================

function correlation(arr1, arr2) {
    if (arr1.length !== arr2.length || arr1.length < 2) return 0;

    const mean1 = mean(arr1);
    const mean2 = mean(arr2);
    const std1 = standardDeviation(arr1);
    const std2 = standardDeviation(arr2);

    if (std1 === 0 || std2 === 0) return 0;

    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
        sum += (arr1[i] - mean1) * (arr2[i] - mean2);
    }

    return sum / ((arr1.length - 1) * std1 * std2);
}

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

function correlationMatrix(fundsReturns) {
    const n = fundsReturns.length;
    const matrix = [];

    for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = 1;
            } else if (j < i) {
                matrix[i][j] = matrix[j][i];
            } else {
                matrix[i][j] = correlation(fundsReturns[i], fundsReturns[j]);
            }
        }
    }

    return matrix;
}

// ==========================================
// Rolling Calculations
// ==========================================

function rollingCalculation(dailyReturns, window, calcFn) {
    const results = [];
    for (let i = window - 1; i < dailyReturns.length; i++) {
        const slice = dailyReturns.slice(i - window + 1, i + 1);
        results.push(calcFn(slice));
    }
    return results;
}

function rollingReturn(dailyReturns, window = 252) {
    return rollingCalculation(dailyReturns, window, annualizedReturn);
}

function rollingVolatility(dailyReturns, window = 252) {
    return rollingCalculation(dailyReturns, window, annualizedVolatility);
}

function rollingSharpe(dailyReturns, window = 252) {
    return rollingCalculation(dailyReturns, window, sharpeRatio);
}

function rollingBeta(fundReturns, benchmarkReturns, window = 252) {
    const results = [];
    for (let i = window - 1; i < fundReturns.length; i++) {
        const fundSlice = fundReturns.slice(i - window + 1, i + 1);
        const benchSlice = benchmarkReturns.slice(i - window + 1, i + 1);
        results.push(calculateBeta(fundSlice, benchSlice));
    }
    return results;
}

function rollingCorrelation(fundReturns, benchmarkReturns, window = 252) {
    const results = [];
    for (let i = window - 1; i < fundReturns.length; i++) {
        const fundSlice = fundReturns.slice(i - window + 1, i + 1);
        const benchSlice = benchmarkReturns.slice(i - window + 1, i + 1);
        results.push(correlation(fundSlice, benchSlice));
    }
    return results;
}

// ==========================================
// Monthly/Yearly Aggregation
// ==========================================

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

    const result = {};
    for (const key of Object.keys(monthly)) {
        const { year, month, returns } = monthly[key];
        const monthlyRet = returns.reduce((cum, r) => cum * (1 + r), 1) - 1;
        if (!result[year]) result[year] = {};
        result[year][month] = monthlyRet;
    }

    return result;
}

function getMonthlyReturnsArray(dailyReturns, dates) {
    const monthly = monthlyReturns(dailyReturns, dates);
    const result = [];

    for (const year of Object.keys(monthly).sort()) {
        for (const month of Object.keys(monthly[year]).sort((a, b) => a - b)) {
            result.push(monthly[year][month]);
        }
    }

    return result;
}

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

// ==========================================
// Portfolio Calculations
// ==========================================

function portfolioReturn(weights, returns) {
    // returns is array of daily returns arrays for each fund
    const n = returns[0].length;
    const portfolioReturns = [];

    for (let i = 0; i < n; i++) {
        let dayReturn = 0;
        for (let j = 0; j < weights.length; j++) {
            dayReturn += weights[j] * returns[j][i];
        }
        portfolioReturns.push(dayReturn);
    }

    return portfolioReturns;
}

function portfolioVolatility(weights, covarianceMatrix) {
    let variance = 0;
    const n = weights.length;

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            variance += weights[i] * weights[j] * covarianceMatrix[i][j];
        }
    }

    return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

function covarianceMatrix(fundsReturns) {
    const n = fundsReturns.length;
    const matrix = [];

    for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = Math.pow(standardDeviation(fundsReturns[i]), 2);
            } else if (j < i) {
                matrix[i][j] = matrix[j][i];
            } else {
                const corr = correlation(fundsReturns[i], fundsReturns[j]);
                const std1 = standardDeviation(fundsReturns[i]);
                const std2 = standardDeviation(fundsReturns[j]);
                matrix[i][j] = corr * std1 * std2;
            }
        }
    }

    return matrix;
}

// Simple optimization using gradient descent
function optimizeForSharpe(fundsReturns, iterations = 1000) {
    const n = fundsReturns.length;
    let weights = Array(n).fill(1 / n);
    const covMatrix = covarianceMatrix(fundsReturns);
    const expectedReturns = fundsReturns.map(r => annualizedReturn(r));

    for (let iter = 0; iter < iterations; iter++) {
        const lr = 0.01 / (1 + iter * 0.001);

        // Calculate gradients (simplified)
        const portfolioRet = portfolioReturn(weights, fundsReturns);
        const currentSharpe = sharpeRatio(portfolioRet);

        for (let i = 0; i < n; i++) {
            const delta = 0.01;
            const newWeights = [...weights];
            newWeights[i] += delta;

            // Normalize
            const sum = newWeights.reduce((a, b) => a + b, 0);
            for (let j = 0; j < n; j++) newWeights[j] /= sum;

            const newPortfolioRet = portfolioReturn(newWeights, fundsReturns);
            const newSharpe = sharpeRatio(newPortfolioRet);

            weights[i] += lr * (newSharpe - currentSharpe) / delta;
        }

        // Normalize and enforce non-negative
        weights = weights.map(w => Math.max(0, w));
        const sum = weights.reduce((a, b) => a + b, 0);
        weights = weights.map(w => w / sum);
    }

    return weights;
}

function riskParityWeights(fundsReturns) {
    const vols = fundsReturns.map(r => annualizedVolatility(r));
    const invVols = vols.map(v => v > 0 ? 1 / v : 0);
    const sum = invVols.reduce((a, b) => a + b, 0);
    return invVols.map(v => v / sum);
}

function minVolatilityWeights(fundsReturns) {
    // Simple min vol using inverse variance
    const vars = fundsReturns.map(r => Math.pow(annualizedVolatility(r), 2));
    const invVars = vars.map(v => v > 0 ? 1 / v : 0);
    const sum = invVars.reduce((a, b) => a + b, 0);
    return invVars.map(v => v / sum);
}

// ==========================================
// Monte Carlo Simulation
// ==========================================

function monteCarloSimulation(dailyReturns, months = 12, simulations = 500) {
    const monthlyRets = [];
    const daysPerMonth = 21;

    // Convert daily to monthly returns
    for (let i = 0; i < dailyReturns.length; i += daysPerMonth) {
        const slice = dailyReturns.slice(i, i + daysPerMonth);
        if (slice.length >= daysPerMonth * 0.8) {
            monthlyRets.push(totalReturn(slice));
        }
    }

    const results = [];

    for (let sim = 0; sim < simulations; sim++) {
        let cumReturn = 1;
        const path = [100];

        for (let m = 0; m < months; m++) {
            // Random sample from historical monthly returns
            const randomIdx = Math.floor(Math.random() * monthlyRets.length);
            cumReturn *= (1 + monthlyRets[randomIdx]);
            path.push(100 * cumReturn);
        }

        results.push({
            finalReturn: cumReturn - 1,
            path: path
        });
    }

    // Sort by final return
    results.sort((a, b) => a.finalReturn - b.finalReturn);

    return {
        paths: results.map(r => r.path),
        finalReturns: results.map(r => r.finalReturn),
        median: results[Math.floor(simulations / 2)].finalReturn,
        percentile5: results[Math.floor(simulations * 0.05)].finalReturn,
        percentile95: results[Math.floor(simulations * 0.95)].finalReturn,
        probLoss: results.filter(r => r.finalReturn < 0).length / simulations
    };
}

// ==========================================
// Stress Testing
// ==========================================

function stressTestReturn(dailyReturns, dates, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const periodReturns = dailyReturns.filter((_, i) => {
        const date = dates[i];
        return date >= start && date <= end;
    });

    return totalReturn(periodReturns);
}

function hypotheticalStress(beta, marketMove) {
    // Simple linear estimate based on beta
    return beta * marketMove;
}

// ==========================================
// Get All Stats
// ==========================================

function getAllFundStats(fund) {
    const returns = fund.dailyReturns;
    const dates = fund.dates;
    const benchReturns = fund.benchmarkReturns;
    const maxDDInfo = maxDrawdownWithDate(returns, dates);
    const monthlyRets = getMonthlyReturnsArray(returns, dates);
    const bwPeriods = bestWorstPeriods(returns);
    const ddDuration = drawdownDuration(returns, dates);
    const recovery = recoveryTime(returns);

    return {
        // Basic returns
        totalReturn: totalReturn(returns),
        annReturn: annualizedReturn(returns),
        annVol: annualizedVolatility(returns),

        // Risk-adjusted
        sharpe: sharpeRatio(returns),
        sortino: sortinoRatio(returns),
        calmar: calmarRatio(returns),

        // Drawdown
        maxDD: maxDDInfo.value,
        maxDDDate: maxDDInfo.date,
        avgDD: averageDrawdown(returns),
        maxDDDuration: ddDuration,
        recoveryTime: recovery,

        // VaR
        var95: valueAtRisk(returns, 0.95),
        var99: valueAtRisk(returns, 0.99),
        varMonthly95: monthlyVaR(returns, 0.95),
        cvar95: conditionalVaR(returns, 0.95),
        cvar99: conditionalVaR(returns, 0.99),

        // Distribution
        skewness: skewness(returns),
        kurtosis: kurtosis(returns),

        // Win/Loss
        winRate: winRate(returns),
        bestDay: bwPeriods.bestDay,
        worstDay: bwPeriods.worstDay,
        daysBelow2Pct: bwPeriods.daysBelow2Pct,

        // Benchmark relative
        beta: calculateBeta(returns, benchReturns),
        correlation: correlation(returns, benchReturns),
        upCapture: upCaptureRatio(returns, benchReturns),
        downCapture: downCaptureRatio(returns, benchReturns),
        captureRatio: captureRatio(returns, benchReturns),

        // Monthly
        monthlyReturns: monthlyReturns(returns, dates),
        ytdReturns: ytdReturns(returns, dates),
        bestMonth: monthlyRets.length > 0 ? Math.max(...monthlyRets) : 0,
        worstMonth: monthlyRets.length > 0 ? Math.min(...monthlyRets) : 0,
        avgMonthlyReturn: mean(monthlyRets),
        positiveMonths: monthlyRets.filter(r => r > 0).length,
        totalMonths: monthlyRets.length
    };
}

// ==========================================
// Format Helpers
// ==========================================

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
