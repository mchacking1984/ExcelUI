// ============================================
// Financial Calculations Module - Ultra Enhanced
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

function covariance(arr1, arr2) {
    if (arr1.length !== arr2.length || arr1.length < 2) return 0;
    const mean1 = mean(arr1);
    const mean2 = mean(arr2);
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
        sum += (arr1[i] - mean1) * (arr2[i] - mean2);
    }
    return sum / (arr1.length - 1);
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

// NEW: Omega Ratio
function omegaRatio(dailyReturns, threshold = 0) {
    const gains = dailyReturns.filter(r => r > threshold).map(r => r - threshold);
    const losses = dailyReturns.filter(r => r <= threshold).map(r => threshold - r);
    const sumGains = gains.reduce((a, b) => a + b, 0);
    const sumLosses = losses.reduce((a, b) => a + b, 0);
    return sumLosses === 0 ? Infinity : sumGains / sumLosses;
}

// NEW: Gain-to-Pain Ratio
function gainToPainRatio(dailyReturns) {
    const gains = dailyReturns.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const losses = Math.abs(dailyReturns.filter(r => r < 0).reduce((a, b) => a + b, 0));
    return losses === 0 ? Infinity : gains / losses;
}

// NEW: Ulcer Index (measures depth and duration of drawdowns)
function ulcerIndex(dailyReturns) {
    const dd = drawdownSeries(dailyReturns);
    const squaredDD = dd.map(d => d * d * 10000); // Convert to percentage squared
    return Math.sqrt(mean(squaredDD));
}

// NEW: Pain Index (average drawdown)
function painIndex(dailyReturns) {
    const dd = drawdownSeries(dailyReturns);
    return Math.abs(mean(dd));
}

// NEW: Treynor Ratio
function treynorRatio(fundReturns, benchmarkReturns) {
    const annRet = annualizedReturn(fundReturns);
    const beta = calculateBeta(fundReturns, benchmarkReturns);
    if (beta === 0) return 0;
    return (annRet - RISK_FREE_RATE) / beta;
}

// NEW: Calculate Alpha (Jensen's Alpha)
function calculateAlpha(fundReturns, benchmarkReturns) {
    const fundAnnRet = annualizedReturn(fundReturns);
    const benchAnnRet = annualizedReturn(benchmarkReturns);
    const beta = calculateBeta(fundReturns, benchmarkReturns);
    return fundAnnRet - (RISK_FREE_RATE + beta * (benchAnnRet - RISK_FREE_RATE));
}

// NEW: Tracking Error
function trackingError(fundReturns, benchmarkReturns) {
    if (fundReturns.length !== benchmarkReturns.length) return 0;
    const excessReturns = fundReturns.map((r, i) => r - benchmarkReturns[i]);
    return standardDeviation(excessReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
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

// NEW: Get all significant drawdown periods
function getDrawdownPeriods(dailyReturns, dates, threshold = -0.05) {
    const dd = drawdownSeries(dailyReturns);
    const nav = calculateNAV(dailyReturns);
    const periods = [];
    let inDrawdown = false;
    let start = 0;
    let peak = nav[0];
    let peakDate = dates[0];
    let trough = nav[0];
    let troughIdx = 0;

    for (let i = 0; i < dd.length; i++) {
        if (nav[i] > peak) {
            peak = nav[i];
            peakDate = dates[i];
        }

        if (dd[i] < threshold && !inDrawdown) {
            inDrawdown = true;
            start = i;
            trough = nav[i];
            troughIdx = i;
        } else if (inDrawdown) {
            if (nav[i] < trough) {
                trough = nav[i];
                troughIdx = i;
            }
            if (dd[i] >= -0.001) {
                // Recovered
                periods.push({
                    peakDate: peakDate,
                    troughDate: dates[troughIdx],
                    recoveryDate: dates[i],
                    drawdown: (trough - peak) / peak,
                    durationToTrough: troughIdx - start,
                    recoveryDuration: i - troughIdx,
                    totalDuration: i - start,
                    recovered: true
                });
                inDrawdown = false;
                peak = nav[i];
                peakDate = dates[i];
            }
        }
    }

    // Handle ongoing drawdown
    if (inDrawdown) {
        periods.push({
            peakDate: peakDate,
            troughDate: dates[troughIdx],
            recoveryDate: null,
            drawdown: (trough - peak) / peak,
            durationToTrough: troughIdx - start,
            recoveryDuration: null,
            totalDuration: dd.length - start,
            recovered: false
        });
    }

    return periods.sort((a, b) => a.drawdown - b.drawdown);
}

// ==========================================
// Value at Risk (VaR) & CVaR
// ==========================================

function valueAtRisk(dailyReturns, confidence = 0.95) {
    return percentile(dailyReturns, (1 - confidence) * 100);
}

function conditionalVaR(dailyReturns, confidence = 0.95) {
    const var_threshold = valueAtRisk(dailyReturns, confidence);
    const tailReturns = dailyReturns.filter(r => r <= var_threshold);
    return tailReturns.length > 0 ? mean(tailReturns) : var_threshold;
}

function monthlyVaR(dailyReturns, confidence = 0.95) {
    const dailyVar = valueAtRisk(dailyReturns, confidence);
    return dailyVar * Math.sqrt(21);
}

// NEW: Parametric VaR (assuming normal distribution)
function parametricVaR(dailyReturns, confidence = 0.95) {
    const mu = mean(dailyReturns);
    const sigma = standardDeviation(dailyReturns);
    const zScores = { 0.95: -1.645, 0.99: -2.326 };
    const z = zScores[confidence] || -1.645;
    return mu + z * sigma;
}

// NEW: Cornish-Fisher VaR (adjusted for skewness and kurtosis)
function cornishFisherVaR(dailyReturns, confidence = 0.95) {
    const mu = mean(dailyReturns);
    const sigma = standardDeviation(dailyReturns);
    const s = skewness(dailyReturns);
    const k = kurtosis(dailyReturns);
    const zScores = { 0.95: -1.645, 0.99: -2.326 };
    const z = zScores[confidence] || -1.645;

    // Cornish-Fisher expansion
    const cfZ = z + (z*z - 1) * s / 6 + (z*z*z - 3*z) * k / 24 - (2*z*z*z - 5*z) * s*s / 36;
    return mu + cfZ * sigma;
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

// NEW: Calculate consecutive wins/losses
function consecutiveStats(dailyReturns) {
    let maxWins = 0, maxLosses = 0;
    let currentWins = 0, currentLosses = 0;

    for (const ret of dailyReturns) {
        if (ret > 0) {
            currentWins++;
            currentLosses = 0;
            maxWins = Math.max(maxWins, currentWins);
        } else if (ret < 0) {
            currentLosses++;
            currentWins = 0;
            maxLosses = Math.max(maxLosses, currentLosses);
        } else {
            currentWins = 0;
            currentLosses = 0;
        }
    }

    return { maxConsecutiveWins: maxWins, maxConsecutiveLosses: maxLosses };
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

// NEW: Tail Dependence (lower tail correlation)
function lowerTailDependence(arr1, arr2, quantile = 0.1) {
    const threshold1 = percentile(arr1, quantile * 100);
    const threshold2 = percentile(arr2, quantile * 100);

    const joint = arr1.filter((r, i) => r <= threshold1 && arr2[i] <= threshold2).length;
    const marginal = arr1.filter(r => r <= threshold1).length;

    return marginal === 0 ? 0 : joint / marginal;
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

// NEW: Rolling Alpha
function rollingAlpha(fundReturns, benchmarkReturns, window = 252) {
    const results = [];
    for (let i = window - 1; i < fundReturns.length; i++) {
        const fundSlice = fundReturns.slice(i - window + 1, i + 1);
        const benchSlice = benchmarkReturns.slice(i - window + 1, i + 1);
        results.push(calculateAlpha(fundSlice, benchSlice));
    }
    return results;
}

// NEW: Rolling Information Ratio
function rollingInformationRatio(fundReturns, benchmarkReturns, window = 252) {
    const results = [];
    for (let i = window - 1; i < fundReturns.length; i++) {
        const fundSlice = fundReturns.slice(i - window + 1, i + 1);
        const benchSlice = benchmarkReturns.slice(i - window + 1, i + 1);
        results.push(informationRatio(fundSlice, benchSlice));
    }
    return results;
}

// ==========================================
// Regime Detection
// ==========================================

// NEW: Detect market regimes (bull/bear/sideways)
function detectRegimes(benchmarkReturns, dates, window = 63) {
    const regimes = [];
    const rollingRet = rollingReturn(benchmarkReturns, window);
    const rollingVol = rollingVolatility(benchmarkReturns, window);

    for (let i = 0; i < rollingRet.length; i++) {
        const ret = rollingRet[i];
        const vol = rollingVol[i];

        let regime;
        if (ret > 0.1 && vol < 0.2) {
            regime = 'bull';
        } else if (ret < -0.05) {
            regime = 'bear';
        } else if (vol > 0.25) {
            regime = 'crisis';
        } else {
            regime = 'sideways';
        }

        regimes.push({
            date: dates[i + window - 1],
            regime: regime,
            return: ret,
            volatility: vol
        });
    }

    return regimes;
}

// NEW: Calculate performance by regime
function performanceByRegime(fundReturns, benchmarkReturns, dates) {
    const regimes = detectRegimes(benchmarkReturns, dates);
    const results = {
        bull: { returns: [], avgReturn: 0, count: 0 },
        bear: { returns: [], avgReturn: 0, count: 0 },
        crisis: { returns: [], avgReturn: 0, count: 0 },
        sideways: { returns: [], avgReturn: 0, count: 0 }
    };

    const offset = dates.length - regimes.length;

    for (let i = 0; i < regimes.length; i++) {
        const fundIdx = i + offset;
        if (fundIdx < fundReturns.length) {
            const regime = regimes[i].regime;
            results[regime].returns.push(fundReturns[fundIdx]);
            results[regime].count++;
        }
    }

    for (const regime of Object.keys(results)) {
        if (results[regime].returns.length > 0) {
            results[regime].avgReturn = annualizedReturn(results[regime].returns);
            results[regime].volatility = annualizedVolatility(results[regime].returns);
            results[regime].sharpe = sharpeRatio(results[regime].returns);
        }
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

function optimizeForSharpe(fundsReturns, iterations = 1000) {
    const n = fundsReturns.length;
    let weights = Array(n).fill(1 / n);
    const covMatrix = covarianceMatrix(fundsReturns);
    const expectedReturns = fundsReturns.map(r => annualizedReturn(r));

    for (let iter = 0; iter < iterations; iter++) {
        const lr = 0.01 / (1 + iter * 0.001);
        const portfolioRet = portfolioReturn(weights, fundsReturns);
        const currentSharpe = sharpeRatio(portfolioRet);

        for (let i = 0; i < n; i++) {
            const delta = 0.01;
            const newWeights = [...weights];
            newWeights[i] += delta;

            const sum = newWeights.reduce((a, b) => a + b, 0);
            for (let j = 0; j < n; j++) newWeights[j] /= sum;

            const newPortfolioRet = portfolioReturn(newWeights, fundsReturns);
            const newSharpe = sharpeRatio(newPortfolioRet);

            weights[i] += lr * (newSharpe - currentSharpe) / delta;
        }

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
    const vars = fundsReturns.map(r => Math.pow(annualizedVolatility(r), 2));
    const invVars = vars.map(v => v > 0 ? 1 / v : 0);
    const sum = invVars.reduce((a, b) => a + b, 0);
    return invVars.map(v => v / sum);
}

// NEW: Maximum Diversification Portfolio
function maxDiversificationWeights(fundsReturns) {
    const vols = fundsReturns.map(r => annualizedVolatility(r));
    const corrMatrix = correlationMatrix(fundsReturns);
    const n = fundsReturns.length;

    // Simple heuristic: weight inversely by average correlation
    const avgCorr = vols.map((_, i) => {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            if (i !== j) sum += Math.abs(corrMatrix[i][j]);
        }
        return sum / (n - 1);
    });

    const invCorr = avgCorr.map(c => 1 / (c + 0.01));
    const invVol = vols.map(v => v > 0 ? 1 / v : 0);
    const combined = invCorr.map((c, i) => c * invVol[i]);
    const total = combined.reduce((a, b) => a + b, 0);

    return combined.map(c => c / total);
}

// NEW: Generate efficient frontier points
function generateEfficientFrontier(fundsReturns, numPoints = 50) {
    const n = fundsReturns.length;
    const points = [];

    // Generate random portfolios
    for (let p = 0; p < numPoints * 10; p++) {
        const weights = [];
        let sum = 0;
        for (let i = 0; i < n; i++) {
            const w = Math.random();
            weights.push(w);
            sum += w;
        }
        // Normalize
        for (let i = 0; i < n; i++) weights[i] /= sum;

        const portRets = portfolioReturn(weights, fundsReturns);
        const ret = annualizedReturn(portRets);
        const vol = annualizedVolatility(portRets);
        const sharpe = sharpeRatio(portRets);

        points.push({ weights, ret, vol, sharpe });
    }

    // Sort by return and find efficient frontier (highest return for each vol level)
    points.sort((a, b) => a.vol - b.vol);

    const frontier = [];
    let maxRet = -Infinity;
    for (const point of points) {
        if (point.ret > maxRet) {
            frontier.push(point);
            maxRet = point.ret;
        }
    }

    return { allPoints: points, frontier };
}

// ==========================================
// Monte Carlo Simulation
// ==========================================

function monteCarloSimulation(dailyReturns, months = 12, simulations = 500) {
    const monthlyRets = [];
    const daysPerMonth = 21;

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
            const randomIdx = Math.floor(Math.random() * monthlyRets.length);
            cumReturn *= (1 + monthlyRets[randomIdx]);
            path.push(100 * cumReturn);
        }

        results.push({
            finalReturn: cumReturn - 1,
            path: path
        });
    }

    results.sort((a, b) => a.finalReturn - b.finalReturn);

    return {
        paths: results.map(r => r.path),
        finalReturns: results.map(r => r.finalReturn),
        median: results[Math.floor(simulations / 2)].finalReturn,
        percentile5: results[Math.floor(simulations * 0.05)].finalReturn,
        percentile25: results[Math.floor(simulations * 0.25)].finalReturn,
        percentile75: results[Math.floor(simulations * 0.75)].finalReturn,
        percentile95: results[Math.floor(simulations * 0.95)].finalReturn,
        probLoss: results.filter(r => r.finalReturn < 0).length / simulations,
        expectedReturn: mean(results.map(r => r.finalReturn)),
        volatility: standardDeviation(results.map(r => r.finalReturn))
    };
}

// NEW: Bootstrap confidence intervals
function bootstrapStats(dailyReturns, numBootstraps = 1000) {
    const stats = {
        sharpe: [],
        annReturn: [],
        maxDD: []
    };

    const n = dailyReturns.length;

    for (let b = 0; b < numBootstraps; b++) {
        const sample = [];
        for (let i = 0; i < n; i++) {
            sample.push(dailyReturns[Math.floor(Math.random() * n)]);
        }

        stats.sharpe.push(sharpeRatio(sample));
        stats.annReturn.push(annualizedReturn(sample));
        stats.maxDD.push(maxDrawdown(sample));
    }

    return {
        sharpe: {
            mean: mean(stats.sharpe),
            ci95: [percentile(stats.sharpe, 2.5), percentile(stats.sharpe, 97.5)]
        },
        annReturn: {
            mean: mean(stats.annReturn),
            ci95: [percentile(stats.annReturn, 2.5), percentile(stats.annReturn, 97.5)]
        },
        maxDD: {
            mean: mean(stats.maxDD),
            ci95: [percentile(stats.maxDD, 2.5), percentile(stats.maxDD, 97.5)]
        }
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
    return beta * marketMove;
}

// NEW: Factor-based stress testing
function factorStressTest(fundReturns, benchmarkReturns, scenarios) {
    const beta = calculateBeta(fundReturns, benchmarkReturns);
    const alpha = calculateAlpha(fundReturns, benchmarkReturns);
    const annVol = annualizedVolatility(fundReturns);

    return scenarios.map(scenario => ({
        name: scenario.name,
        marketMove: scenario.marketMove,
        expectedFundReturn: alpha / 12 + beta * scenario.marketMove + (scenario.volMultiplier || 1) * annVol * (scenario.volShock || 0),
        beta: beta
    }));
}

// ==========================================
// Data Filtering by Date Range
// ==========================================

function filterByDateRange(dailyReturns, dates, startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    const filteredReturns = [];
    const filteredDates = [];

    for (let i = 0; i < dates.length; i++) {
        if (dates[i] >= start && dates[i] <= end) {
            filteredReturns.push(dailyReturns[i]);
            filteredDates.push(dates[i]);
        }
    }

    return { returns: filteredReturns, dates: filteredDates };
}

function getDateRangeFromSelection(selection, dates) {
    const now = new Date();
    const lastDate = dates[dates.length - 1];
    let startDate = dates[0];

    switch (selection) {
        case 'ytd':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        case '1y':
            startDate = new Date(now);
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        case '3y':
            startDate = new Date(now);
            startDate.setFullYear(startDate.getFullYear() - 3);
            break;
        case '5y':
            startDate = new Date(now);
            startDate.setFullYear(startDate.getFullYear() - 5);
            break;
        case 'all':
        default:
            startDate = dates[0];
    }

    return { startDate, endDate: lastDate };
}

// ==========================================
// Get All Stats
// ==========================================

function getAllFundStats(fund, dateRange = null) {
    let returns = fund.dailyReturns;
    let dates = fund.dates;
    let benchReturns = fund.benchmarkReturns;

    if (dateRange && dateRange.startDate) {
        const filtered = filterByDateRange(returns, dates, dateRange.startDate, dateRange.endDate);
        const filteredBench = filterByDateRange(benchReturns, dates, dateRange.startDate, dateRange.endDate);
        returns = filtered.returns;
        dates = filtered.dates;
        benchReturns = filteredBench.returns;
    }

    if (returns.length === 0) {
        return null;
    }

    const maxDDInfo = maxDrawdownWithDate(returns, dates);
    const monthlyRets = getMonthlyReturnsArray(returns, dates);
    const bwPeriods = bestWorstPeriods(returns);
    const ddDuration = drawdownDuration(returns, dates);
    const recovery = recoveryTime(returns);
    const consec = consecutiveStats(returns);

    return {
        // Basic returns
        totalReturn: totalReturn(returns),
        annReturn: annualizedReturn(returns),
        annVol: annualizedVolatility(returns),

        // Risk-adjusted
        sharpe: sharpeRatio(returns),
        sortino: sortinoRatio(returns),
        calmar: calmarRatio(returns),
        omega: omegaRatio(returns),
        gainToPain: gainToPainRatio(returns),
        ulcerIndex: ulcerIndex(returns),
        treynor: treynorRatio(returns, benchReturns),

        // Drawdown
        maxDD: maxDDInfo.value,
        maxDDDate: maxDDInfo.date,
        avgDD: averageDrawdown(returns),
        maxDDDuration: ddDuration,
        recoveryTime: recovery,
        painIndex: painIndex(returns),

        // VaR
        var95: valueAtRisk(returns, 0.95),
        var99: valueAtRisk(returns, 0.99),
        varMonthly95: monthlyVaR(returns, 0.95),
        cvar95: conditionalVaR(returns, 0.95),
        cvar99: conditionalVaR(returns, 0.99),
        parametricVar95: parametricVaR(returns, 0.95),
        cfVar95: cornishFisherVaR(returns, 0.95),

        // Distribution
        skewness: skewness(returns),
        kurtosis: kurtosis(returns),

        // Win/Loss
        winRate: winRate(returns),
        bestDay: bwPeriods.bestDay,
        worstDay: bwPeriods.worstDay,
        daysBelow2Pct: bwPeriods.daysBelow2Pct,
        maxConsecutiveWins: consec.maxConsecutiveWins,
        maxConsecutiveLosses: consec.maxConsecutiveLosses,
        profitLossRatio: profitLossRatio(returns),

        // Benchmark relative
        beta: calculateBeta(returns, benchReturns),
        alpha: calculateAlpha(returns, benchReturns),
        correlation: correlation(returns, benchReturns),
        informationRatio: informationRatio(returns, benchReturns),
        trackingError: trackingError(returns, benchReturns),
        upCapture: upCaptureRatio(returns, benchReturns),
        downCapture: downCaptureRatio(returns, benchReturns),
        captureRatio: captureRatio(returns, benchReturns),
        tailDependence: lowerTailDependence(returns, benchReturns),

        // Monthly
        monthlyReturns: monthlyReturns(returns, dates),
        ytdReturns: ytdReturns(returns, dates),
        bestMonth: monthlyRets.length > 0 ? Math.max(...monthlyRets) : 0,
        worstMonth: monthlyRets.length > 0 ? Math.min(...monthlyRets) : 0,
        avgMonthlyReturn: mean(monthlyRets),
        positiveMonths: monthlyRets.filter(r => r > 0).length,
        totalMonths: monthlyRets.length,

        // Drawdown periods
        drawdownPeriods: getDrawdownPeriods(returns, dates)
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

function formatDateShort(date) {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
}
