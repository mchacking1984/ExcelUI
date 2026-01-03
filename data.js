// ============================================
// Hedge Fund Data Generation Module
// ============================================

const FUND_PROFILES = [
    { name: "Apex Alpha Fund", strategy: "Long/Short Equity", mu: 0.00035, sigma: 0.012, beta: 0.4 },
    { name: "Quantum Global Macro", strategy: "Global Macro", mu: 0.00030, sigma: 0.015, beta: 0.3 },
    { name: "Meridian Arbitrage", strategy: "Market Neutral", mu: 0.00020, sigma: 0.006, beta: 0.05 },
    { name: "Titan Multi-Strategy", strategy: "Multi-Strategy", mu: 0.00028, sigma: 0.010, beta: 0.25 },
    { name: "Horizon Event Driven", strategy: "Event Driven", mu: 0.00032, sigma: 0.013, beta: 0.35 },
    { name: "Atlas Systematic", strategy: "CTA/Managed Futures", mu: 0.00025, sigma: 0.014, beta: 0.1 },
    { name: "Pinnacle Credit", strategy: "Credit", mu: 0.00022, sigma: 0.008, beta: 0.2 },
    { name: "Vertex Long Biased", strategy: "Long/Short Equity", mu: 0.00040, sigma: 0.016, beta: 0.6 },
    { name: "Nova Relative Value", strategy: "Market Neutral", mu: 0.00018, sigma: 0.005, beta: 0.02 },
    { name: "Summit Macro Alpha", strategy: "Global Macro", mu: 0.00033, sigma: 0.018, beta: 0.35 },
    { name: "Catalyst Special Sits", strategy: "Event Driven", mu: 0.00029, sigma: 0.011, beta: 0.3 },
    { name: "Omega Quant", strategy: "CTA/Managed Futures", mu: 0.00023, sigma: 0.012, beta: 0.08 },
    { name: "Sterling Fixed Income", strategy: "Credit", mu: 0.00015, sigma: 0.004, beta: 0.1 },
    { name: "Phoenix Distressed", strategy: "Event Driven", mu: 0.00038, sigma: 0.020, beta: 0.4 },
    { name: "Vanguard Select", strategy: "Long/Short Equity", mu: 0.00030, sigma: 0.011, beta: 0.45 },
    { name: "Eclipse Volatility", strategy: "Multi-Strategy", mu: 0.00020, sigma: 0.009, beta: -0.1 },
    { name: "Aurora Statistical Arb", strategy: "Market Neutral", mu: 0.00016, sigma: 0.004, beta: 0.01 },
    { name: "Zenith Opportunistic", strategy: "Multi-Strategy", mu: 0.00032, sigma: 0.014, beta: 0.38 },
    { name: "Paladin Activist", strategy: "Event Driven", mu: 0.00035, sigma: 0.017, beta: 0.5 },
    { name: "Citadel Diversified", strategy: "Multi-Strategy", mu: 0.00027, sigma: 0.009, beta: 0.22 }
];

const FUND_AUM = [
    "$8.2B", "$12.5B", "$3.8B", "$15.1B", "$6.4B",
    "$4.2B", "$7.8B", "$2.9B", "$5.5B", "$9.3B",
    "$4.7B", "$6.1B", "$11.2B", "$3.2B", "$8.7B",
    "$2.4B", "$4.9B", "$7.3B", "$5.8B", "$14.6B"
];

// Seeded random number generator for reproducibility
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    nextGaussian() {
        let u1 = this.next();
        let u2 = this.next();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
}

// Generate business days for the last 5 years
function generateBusinessDays(yearsBack = 5) {
    const dates = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - yearsBack);

    let current = new Date(startDate);
    while (current <= endDate) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // Skip weekends
            dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// Generate S&P 500 benchmark data
function generateBenchmarkData(dates, seed = 42) {
    const rng = new SeededRandom(seed);
    const returns = [];
    const mu = 0.0004; // ~10% annual
    const sigma = 0.011; // ~17.5% annual vol

    for (let i = 0; i < dates.length; i++) {
        // Add some regime changes
        let adjSigma = sigma;
        const month = dates[i].getMonth();
        const year = dates[i].getFullYear();

        // Simulate higher vol periods
        if ((year === 2022 && month >= 0 && month <= 9) ||
            (year === 2020 && month >= 1 && month <= 4)) {
            adjSigma = sigma * 2;
        }

        let ret = mu + adjSigma * rng.nextGaussian();

        // Add some fat tails
        if (rng.next() < 0.02) {
            ret *= (rng.next() < 0.5) ? 2.5 : -2.5;
        }

        returns.push(ret);
    }

    return returns;
}

// Generate fund returns with correlation to benchmark
function generateFundReturns(profile, dates, benchmarkReturns, seed) {
    const rng = new SeededRandom(seed);
    const returns = [];
    const { mu, sigma, beta } = profile;

    for (let i = 0; i < dates.length; i++) {
        const benchRet = benchmarkReturns[i];

        // Fund return = alpha + beta * benchmark + idiosyncratic
        const alpha = mu - beta * 0.0004; // Risk-free adjusted alpha
        const idiosyncratic = sigma * Math.sqrt(1 - beta * beta * 0.3) * rng.nextGaussian();

        let ret = alpha + beta * benchRet + idiosyncratic;

        // Strategy-specific adjustments
        if (profile.strategy === "CTA/Managed Futures") {
            // Trend following - do better in trending markets
            if (i > 20) {
                const recentTrend = benchmarkReturns.slice(i-20, i).reduce((a,b) => a+b, 0);
                ret += Math.abs(recentTrend) * 0.1;
            }
        }

        if (profile.strategy === "Market Neutral") {
            // Very low correlation
            ret = mu + sigma * rng.nextGaussian();
        }

        // Add some fat tails
        if (rng.next() < 0.015) {
            ret *= (rng.next() < 0.4) ? 2 : -2;
        }

        returns.push(ret);
    }

    return returns;
}

// Main data generation function
function generateAllFundData() {
    const dates = generateBusinessDays(5);
    const benchmarkReturns = generateBenchmarkData(dates, 12345);

    const funds = FUND_PROFILES.map((profile, index) => {
        const returns = generateFundReturns(profile, dates, benchmarkReturns, 1000 + index * 100);

        return {
            id: index,
            name: profile.name,
            strategy: profile.strategy,
            aum: FUND_AUM[index],
            dates: dates,
            dailyReturns: returns,
            benchmarkReturns: benchmarkReturns
        };
    });

    return {
        funds: funds,
        dates: dates,
        benchmark: {
            name: "S&P 500",
            returns: benchmarkReturns
        },
        lastUpdate: dates[dates.length - 1]
    };
}

// Export data
const FUND_DATA = generateAllFundData();
