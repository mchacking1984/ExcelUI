#!/usr/bin/env python3
"""
Create sample S&P 500 data for testing the chart generator.
This creates a realistic-looking time series with price, volume, and calculated metrics.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta


def generate_sp500_data(start_date: str = '2023-01-01', end_date: str = '2024-12-31',
                         initial_price: float = 3800.0) -> pd.DataFrame:
    """Generate realistic S&P 500 time series data."""

    # Create date range (business days only)
    dates = pd.date_range(start=start_date, end=end_date, freq='B')

    n = len(dates)

    # Generate realistic price movements using geometric Brownian motion
    np.random.seed(42)  # For reproducibility

    # Parameters
    mu = 0.0003  # Daily drift (roughly 7.5% annual return)
    sigma = 0.012  # Daily volatility (roughly 19% annual)

    # Generate returns with some autocorrelation and volatility clustering
    returns = np.random.normal(mu, sigma, n)

    # Add some momentum
    for i in range(1, n):
        returns[i] += 0.1 * returns[i-1]

    # Add occasional larger moves (fat tails)
    large_moves = np.random.choice(n, size=int(n * 0.02), replace=False)
    returns[large_moves] *= np.random.uniform(2, 4, len(large_moves)) * np.sign(returns[large_moves])

    # Calculate prices
    prices = initial_price * np.cumprod(1 + returns)

    # Generate volume (correlated with absolute returns)
    base_volume = 4_000_000_000
    volume_noise = np.random.lognormal(0, 0.3, n)
    volume = base_volume * volume_noise * (1 + 5 * np.abs(returns))
    volume = volume.astype(int)

    # Calculate Open, High, Low prices
    daily_range = np.abs(np.random.normal(0, sigma * 0.5, n))

    opens = prices * (1 + np.random.uniform(-0.002, 0.002, n))
    highs = np.maximum(opens, prices) * (1 + daily_range)
    lows = np.minimum(opens, prices) * (1 - daily_range)

    # Create DataFrame
    df = pd.DataFrame({
        'Date': dates,
        'Open': opens.round(2),
        'High': highs.round(2),
        'Low': lows.round(2),
        'Close': prices.round(2),
        'Adj Close': prices.round(2),
        'Volume': volume
    })

    return df


def main():
    print("Generating sample S&P 500 data...")

    df = generate_sp500_data()

    # Save to Excel
    output_file = 'sp500_data.xlsx'
    df.to_excel(output_file, index=False, sheet_name='S&P 500')

    print(f"Created {output_file} with {len(df)} rows of data")
    print(f"Date range: {df['Date'].iloc[0].strftime('%Y-%m-%d')} to {df['Date'].iloc[-1].strftime('%Y-%m-%d')}")
    print(f"Price range: ${df['Close'].min():,.2f} - ${df['Close'].max():,.2f}")

    # Display sample
    print("\nFirst 5 rows:")
    print(df.head().to_string(index=False))


if __name__ == '__main__':
    main()
