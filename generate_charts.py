#!/usr/bin/env python3
"""
Excel to Interactive Charts Generator

This script reads time series data from an Excel file and generates
a self-contained HTML page with interactive Plotly charts.

Usage:
    python generate_charts.py [excel_file] [--output output.html]

If no excel file is specified, it looks for 'sp500_data.xlsx' in the current directory.
"""

import argparse
import os
import sys
import webbrowser
from datetime import datetime
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def read_excel_data(file_path: str) -> pd.DataFrame:
    """Read time series data from Excel file."""
    df = pd.read_excel(file_path)

    # Try to identify the date column
    date_columns = [col for col in df.columns if 'date' in col.lower() or 'time' in col.lower()]
    if date_columns:
        date_col = date_columns[0]
        df[date_col] = pd.to_datetime(df[date_col])
        df = df.sort_values(date_col)
    elif df.columns[0]:
        # Assume first column is date
        df[df.columns[0]] = pd.to_datetime(df[df.columns[0]])
        df = df.sort_values(df.columns[0])

    return df


def calculate_returns(df: pd.DataFrame, price_col: str) -> pd.DataFrame:
    """Calculate daily and cumulative returns."""
    df = df.copy()
    df['Daily_Return'] = df[price_col].pct_change() * 100
    df['Cumulative_Return'] = ((1 + df['Daily_Return'] / 100).cumprod() - 1) * 100
    return df


def calculate_moving_averages(df: pd.DataFrame, price_col: str) -> pd.DataFrame:
    """Calculate moving averages."""
    df = df.copy()
    df['MA_20'] = df[price_col].rolling(window=20).mean()
    df['MA_50'] = df[price_col].rolling(window=50).mean()
    df['MA_200'] = df[price_col].rolling(window=200).mean()
    return df


def calculate_volatility(df: pd.DataFrame, price_col: str) -> pd.DataFrame:
    """Calculate rolling volatility."""
    df = df.copy()
    daily_returns = df[price_col].pct_change()
    df['Volatility_20'] = daily_returns.rolling(window=20).std() * (252 ** 0.5) * 100
    return df


def create_interactive_charts(df: pd.DataFrame, title: str = "S&P 500 Analysis") -> str:
    """Create interactive HTML charts using Plotly."""

    # Identify columns
    date_col = None
    price_col = None
    volume_col = None

    for col in df.columns:
        col_lower = col.lower()
        if 'date' in col_lower or 'time' in col_lower:
            date_col = col
        elif 'close' in col_lower or 'price' in col_lower or 'adj' in col_lower:
            price_col = col
        elif 'volume' in col_lower:
            volume_col = col

    # Fallback: use first column as date, second as price
    if date_col is None:
        date_col = df.columns[0]
    if price_col is None:
        # Find first numeric column that's not volume
        for col in df.columns[1:]:
            if df[col].dtype in ['float64', 'int64'] and 'volume' not in col.lower():
                price_col = col
                break

    if price_col is None:
        raise ValueError("Could not identify price column in the data")

    # Calculate additional metrics
    df = calculate_returns(df, price_col)
    df = calculate_moving_averages(df, price_col)
    df = calculate_volatility(df, price_col)

    # Create figure with subplots
    has_volume = volume_col is not None
    num_rows = 4 if has_volume else 3
    row_heights = [0.4, 0.2, 0.2, 0.2] if has_volume else [0.5, 0.25, 0.25]

    subplot_titles = [
        f'{title} - Price & Moving Averages',
        'Trading Volume' if has_volume else 'Daily Returns (%)',
        'Daily Returns (%)' if has_volume else 'Rolling Volatility (20-day)',
        'Rolling Volatility (20-day)' if has_volume else None
    ]
    subplot_titles = [t for t in subplot_titles if t]

    fig = make_subplots(
        rows=num_rows,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.05,
        subplot_titles=subplot_titles,
        row_heights=row_heights
    )

    # Color scheme
    colors = {
        'price': '#2E86AB',
        'ma20': '#F6AE2D',
        'ma50': '#F26419',
        'ma200': '#33658A',
        'volume': '#86BBD8',
        'returns_pos': '#2ECC71',
        'returns_neg': '#E74C3C',
        'volatility': '#9B59B6'
    }

    # 1. Price chart with moving averages
    fig.add_trace(
        go.Scatter(
            x=df[date_col],
            y=df[price_col],
            mode='lines',
            name=price_col,
            line=dict(color=colors['price'], width=2),
            hovertemplate='%{x}<br>Price: $%{y:,.2f}<extra></extra>'
        ),
        row=1, col=1
    )

    # Add moving averages
    fig.add_trace(
        go.Scatter(
            x=df[date_col],
            y=df['MA_20'],
            mode='lines',
            name='20-day MA',
            line=dict(color=colors['ma20'], width=1.5, dash='dot'),
            hovertemplate='%{x}<br>MA20: $%{y:,.2f}<extra></extra>'
        ),
        row=1, col=1
    )

    fig.add_trace(
        go.Scatter(
            x=df[date_col],
            y=df['MA_50'],
            mode='lines',
            name='50-day MA',
            line=dict(color=colors['ma50'], width=1.5, dash='dot'),
            hovertemplate='%{x}<br>MA50: $%{y:,.2f}<extra></extra>'
        ),
        row=1, col=1
    )

    fig.add_trace(
        go.Scatter(
            x=df[date_col],
            y=df['MA_200'],
            mode='lines',
            name='200-day MA',
            line=dict(color=colors['ma200'], width=1.5, dash='dash'),
            hovertemplate='%{x}<br>MA200: $%{y:,.2f}<extra></extra>'
        ),
        row=1, col=1
    )

    current_row = 2

    # 2. Volume chart (if available)
    if has_volume:
        fig.add_trace(
            go.Bar(
                x=df[date_col],
                y=df[volume_col],
                name='Volume',
                marker_color=colors['volume'],
                hovertemplate='%{x}<br>Volume: %{y:,.0f}<extra></extra>'
            ),
            row=current_row, col=1
        )
        current_row += 1

    # 3. Daily returns
    return_colors = [colors['returns_pos'] if r >= 0 else colors['returns_neg']
                     for r in df['Daily_Return'].fillna(0)]

    fig.add_trace(
        go.Bar(
            x=df[date_col],
            y=df['Daily_Return'],
            name='Daily Return',
            marker_color=return_colors,
            hovertemplate='%{x}<br>Return: %{y:.2f}%<extra></extra>'
        ),
        row=current_row, col=1
    )
    current_row += 1

    # 4. Rolling volatility
    fig.add_trace(
        go.Scatter(
            x=df[date_col],
            y=df['Volatility_20'],
            mode='lines',
            name='20-day Volatility',
            fill='tozeroy',
            line=dict(color=colors['volatility'], width=2),
            fillcolor='rgba(155, 89, 182, 0.3)',
            hovertemplate='%{x}<br>Volatility: %{y:.2f}%<extra></extra>'
        ),
        row=current_row, col=1
    )

    # Update layout
    fig.update_layout(
        title=dict(
            text=f'<b>{title}</b><br><sup>Interactive Financial Dashboard</sup>',
            x=0.5,
            font=dict(size=24)
        ),
        height=900,
        showlegend=True,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
        hovermode='x unified',
        template='plotly_white',
        font=dict(family="Arial, sans-serif"),
        margin=dict(l=60, r=40, t=120, b=60)
    )

    # Update axes
    fig.update_xaxes(
        rangeslider=dict(visible=False),
        rangeselector=dict(
            buttons=list([
                dict(count=1, label="1M", step="month", stepmode="backward"),
                dict(count=3, label="3M", step="month", stepmode="backward"),
                dict(count=6, label="6M", step="month", stepmode="backward"),
                dict(count=1, label="YTD", step="year", stepmode="todate"),
                dict(count=1, label="1Y", step="year", stepmode="backward"),
                dict(step="all", label="All")
            ]),
            bgcolor='#f8f9fa',
            activecolor='#2E86AB'
        ),
        row=1, col=1
    )

    fig.update_yaxes(title_text="Price ($)", row=1, col=1)
    if has_volume:
        fig.update_yaxes(title_text="Volume", row=2, col=1)
        fig.update_yaxes(title_text="Return (%)", row=3, col=1)
        fig.update_yaxes(title_text="Volatility (%)", row=4, col=1)
    else:
        fig.update_yaxes(title_text="Return (%)", row=2, col=1)
        fig.update_yaxes(title_text="Volatility (%)", row=3, col=1)

    # Generate HTML
    html_content = generate_html_template(fig, df, date_col, price_col, title)

    return html_content


def generate_html_template(fig, df: pd.DataFrame, date_col: str, price_col: str, title: str) -> str:
    """Generate a complete HTML page with the chart and summary statistics."""

    # Calculate summary statistics
    latest_price = df[price_col].iloc[-1]
    start_price = df[price_col].iloc[0]
    total_return = ((latest_price / start_price) - 1) * 100
    max_price = df[price_col].max()
    min_price = df[price_col].min()
    avg_price = df[price_col].mean()
    volatility = df['Volatility_20'].iloc[-1] if 'Volatility_20' in df.columns else 0

    date_range = f"{df[date_col].iloc[0].strftime('%Y-%m-%d')} to {df[date_col].iloc[-1].strftime('%Y-%m-%d')}"

    # Get the plotly chart div
    chart_div = fig.to_html(full_html=False, include_plotlyjs='cdn', config={
        'displayModeBar': True,
        'displaylogo': False,
        'modeBarButtonsToRemove': ['lasso2d', 'select2d'],
        'toImageButtonOptions': {
            'format': 'png',
            'filename': f'{title.replace(" ", "_")}_chart',
            'height': 900,
            'width': 1600,
            'scale': 2
        }
    })

    html_template = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Interactive Dashboard</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            color: #ffffff;
        }}

        .container {{
            max-width: 1600px;
            margin: 0 auto;
            padding: 20px;
        }}

        header {{
            text-align: center;
            padding: 30px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 30px;
        }}

        h1 {{
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #00d4ff, #7b2cbf);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }}

        .subtitle {{
            color: #888;
            font-size: 1rem;
        }}

        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}

        .stat-card {{
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            border: 1px solid rgba(255,255,255,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }}

        .stat-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 10px 40px rgba(0,212,255,0.2);
        }}

        .stat-label {{
            font-size: 0.85rem;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }}

        .stat-value {{
            font-size: 1.8rem;
            font-weight: 600;
            color: #00d4ff;
        }}

        .stat-value.positive {{
            color: #2ecc71;
        }}

        .stat-value.negative {{
            color: #e74c3c;
        }}

        .chart-container {{
            background: rgba(255,255,255,0.98);
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            margin-bottom: 30px;
        }}

        footer {{
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9rem;
        }}

        footer a {{
            color: #00d4ff;
            text-decoration: none;
        }}

        .date-range {{
            background: rgba(255,255,255,0.1);
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            margin-top: 15px;
            font-size: 0.9rem;
        }}

        @media (max-width: 768px) {{
            h1 {{
                font-size: 1.8rem;
            }}

            .stats-grid {{
                grid-template-columns: repeat(2, 1fr);
            }}

            .stat-value {{
                font-size: 1.4rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>{title}</h1>
            <p class="subtitle">Interactive Financial Dashboard</p>
            <div class="date-range">📅 {date_range}</div>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Latest Price</div>
                <div class="stat-value">${latest_price:,.2f}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Return</div>
                <div class="stat-value {'positive' if total_return >= 0 else 'negative'}">{total_return:+.2f}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">52-Week High</div>
                <div class="stat-value">${max_price:,.2f}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">52-Week Low</div>
                <div class="stat-value">${min_price:,.2f}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average Price</div>
                <div class="stat-value">${avg_price:,.2f}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Current Volatility</div>
                <div class="stat-value">{volatility:.2f}%</div>
            </div>
        </div>

        <div class="chart-container">
            {chart_div}
        </div>

        <footer>
            <p>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} |
            Data points: {len(df):,} |
            <a href="#" onclick="window.print()">Print Report</a></p>
        </footer>
    </div>
</body>
</html>'''

    return html_template


def main():
    parser = argparse.ArgumentParser(
        description='Generate interactive charts from Excel time series data'
    )
    parser.add_argument(
        'excel_file',
        nargs='?',
        default='sp500_data.xlsx',
        help='Path to the Excel file (default: sp500_data.xlsx)'
    )
    parser.add_argument(
        '--output', '-o',
        default='sp500_dashboard.html',
        help='Output HTML file (default: sp500_dashboard.html)'
    )
    parser.add_argument(
        '--title', '-t',
        default='S&P 500 Analysis',
        help='Chart title (default: S&P 500 Analysis)'
    )
    parser.add_argument(
        '--no-open',
        action='store_true',
        help='Do not automatically open the HTML file in browser'
    )

    args = parser.parse_args()

    # Check if input file exists
    if not os.path.exists(args.excel_file):
        print(f"Error: File '{args.excel_file}' not found.")
        sys.exit(1)

    print(f"Reading data from: {args.excel_file}")
    df = read_excel_data(args.excel_file)
    print(f"Loaded {len(df)} rows of data")

    print("Generating interactive charts...")
    html_content = create_interactive_charts(df, args.title)

    # Write HTML file
    output_path = Path(args.output)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"Dashboard saved to: {output_path.absolute()}")

    # Open in browser
    if not args.no_open:
        webbrowser.open(f'file://{output_path.absolute()}')
        print("Opening in default browser...")

    return str(output_path.absolute())


if __name__ == '__main__':
    main()
