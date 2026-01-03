# Excel to Interactive Charts

Generate beautiful, interactive HTML dashboards from your Excel time series data with a single button click.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Interactive+S%26P+500+Dashboard)

## Features

- **One-Click Generation**: Add a button to Excel that generates charts instantly
- **Interactive Charts**: Zoom, pan, hover for details, and export to PNG
- **Multiple Visualizations**:
  - Price chart with moving averages (20, 50, 200-day)
  - Trading volume bars
  - Daily returns histogram
  - Rolling volatility indicator
- **Summary Statistics**: Key metrics displayed in a beautiful dashboard
- **Fully Self-Contained**: Single HTML file with no external dependencies
- **Responsive Design**: Works on desktop and mobile browsers

## Quick Start

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or install individually:
```bash
pip install pandas plotly openpyxl
```

### 2. Generate Sample Data (Optional)

If you want to test with sample S&P 500 data:

```bash
python create_sample_data.py
```

This creates `sp500_data.xlsx` with realistic market data.

### 3. Run the Chart Generator

```bash
# Basic usage (looks for sp500_data.xlsx)
python generate_charts.py

# Specify your own Excel file
python generate_charts.py your_data.xlsx

# Custom output and title
python generate_charts.py your_data.xlsx --output my_dashboard.html --title "My Portfolio Analysis"

# Generate without opening browser
python generate_charts.py your_data.xlsx --no-open
```

## Excel Button Integration

### Method 1: Add VBA Button (Recommended)

1. **Open your Excel file** containing the time series data

2. **Enable Developer Tab** (if not visible):
   - File → Options → Customize Ribbon
   - Check "Developer" in the right panel

3. **Open VBA Editor**: Press `Alt+F11`

4. **Insert Module**: Go to Insert → Module

5. **Copy VBA Code**: Open `excel_vba_module.bas` and copy all contents into the module

6. **Add Button**:
   - Close VBA Editor
   - Go to Developer → Insert → Button (Form Control)
   - Draw the button on your sheet
   - Select `GenerateInteractiveCharts` when prompted
   - Right-click button and rename to "Generate Charts"

7. **Save as Macro-Enabled**: Save your file as `.xlsm` (Excel Macro-Enabled Workbook)

### Method 2: Quick VBA Setup

In the VBA Editor, run this one-time setup:

```vba
Sub AddChartButton()
    ' Creates a button automatically
End Sub
```

### Method 3: Keyboard Shortcut

1. In VBA Editor, go to Tools → Macro → Macros
2. Select `GenerateInteractiveCharts`
3. Click Options
4. Assign a shortcut key (e.g., `Ctrl+Shift+G`)

## Excel Data Format

Your Excel file should have columns for time series data. The script automatically detects:

| Column Type | Expected Names |
|-------------|----------------|
| Date | `Date`, `Time`, `Timestamp`, or first column |
| Price | `Close`, `Price`, `Adj Close`, or first numeric column |
| Volume | `Volume` (optional) |

### Example Data Structure

| Date | Open | High | Low | Close | Volume |
|------|------|------|-----|-------|--------|
| 2024-01-02 | 4742.50 | 4751.00 | 4730.25 | 4745.20 | 3500000000 |
| 2024-01-03 | 4745.20 | 4760.80 | 4738.50 | 4755.60 | 3800000000 |

### Minimal Data Structure

At minimum, you need just two columns:

| Date | Close |
|------|-------|
| 2024-01-02 | 4745.20 |
| 2024-01-03 | 4755.60 |

## File Structure

```
ExcelUI/
├── generate_charts.py      # Main chart generation script
├── create_sample_data.py   # Creates sample S&P 500 data
├── excel_vba_module.bas    # VBA code for Excel button
├── requirements.txt        # Python dependencies
├── README.md              # This file
├── sp500_data.xlsx        # Sample data (after running create_sample_data.py)
└── sp500_dashboard.html   # Generated dashboard (after running)
```

## Customization

### Modify Chart Colors

Edit the `colors` dictionary in `generate_charts.py`:

```python
colors = {
    'price': '#2E86AB',      # Main price line
    'ma20': '#F6AE2D',       # 20-day moving average
    'ma50': '#F26419',       # 50-day moving average
    'ma200': '#33658A',      # 200-day moving average
    'volume': '#86BBD8',     # Volume bars
    'returns_pos': '#2ECC71', # Positive returns
    'returns_neg': '#E74C3C', # Negative returns
    'volatility': '#9B59B6'   # Volatility fill
}
```

### Add Custom Indicators

Extend the `create_interactive_charts()` function to add more technical indicators:

```python
# Example: Add Bollinger Bands
df['BB_upper'] = df['MA_20'] + 2 * df[price_col].rolling(20).std()
df['BB_lower'] = df['MA_20'] - 2 * df[price_col].rolling(20).std()
```

## Troubleshooting

### "Python not found" Error

1. Ensure Python is installed: Download from [python.org](https://www.python.org/downloads/)
2. Add Python to PATH during installation
3. Or modify `PYTHON_PATH` in the VBA code to the full path:
   ```vba
   Private Const PYTHON_PATH As String = "C:\Python311\python.exe"
   ```

### "Module not found" Error

Install missing packages:
```bash
pip install pandas plotly openpyxl
```

### Excel Security Warning

When opening a macro-enabled workbook:
1. Click "Enable Content" when prompted
2. Or add the folder to Trusted Locations:
   - File → Options → Trust Center → Trust Center Settings → Trusted Locations

### VBA Not Running

1. Enable macros in Excel settings
2. Check if the script path is correct (should be in same folder as Excel file)
3. Run `TestPythonInstallation` macro to verify Python setup

## License

MIT License - Feel free to use and modify for your projects.
