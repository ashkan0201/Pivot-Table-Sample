# Modern Pivot Table UI

## Overview
The **Modern Pivot Table UI** is a web-based application designed for analyzing and visualizing large datasets from CSV files (up to 500,000 rows). It provides an interactive interface to create pivot tables and charts, with features like drag-and-drop functionality, dark/light mode switching, and export options for CSV and XLSX formats. The application uses modern libraries such as PivotTable.js, Plotly, and Bootstrap to deliver a responsive and visually appealing experience.

Developed by **Ashkan Norouzi** &copy; 2025.
 
## Features
- **CSV File Upload**: Upload CSV files with background processing for efficient handling of large datasets.
- **Interactive Pivot Table**: Create customizable pivot tables with drag-and-drop functionality to organize data by rows, columns, and values.
- **Chart Visualization**: Generate charts (e.g., horizontal stacked bar charts) using Plotly and C3 renderers.
- **Dark/Light Mode**: Toggle between dark and light themes for better accessibility and user preference.
- **Export Options**: Export pivot tables to CSV or XLSX formats, preserving merged cells.
- **Responsive Design**: Optimized for various screen sizes with a modern, animated UI.
- **Error Handling**: Displays toast notifications for user actions and errors.

## Screenshot
![Modern Pivot Table UI Screenshot](screenshot.png)

## Installation
1. Clone or download the repository to your local machine.
2. Ensure you have a modern web browser (e.g., Chrome, Firefox, Edge).
3. Place all project files (`index.html`, `styles.css`, `script.js`, `LICENSE`) in a single directory.
4. Open `index.html` in your web browser. No server is required as the application uses CDN-hosted libraries.

## Usage
1. **Open the Application**: Launch `index.html` in a web browser.
2. **Upload a CSV File**:
   - Click the "Upload" button or select a CSV file (`.csv` extension) via the file input.
   - The application supports CSV files with up to 500,000 rows.
3. **Analyze Data**:
   - Use the pivot table interface to drag and drop fields into rows, columns, or values.
   - Select different aggregators (e.g., Count, Sum) and renderers (e.g., Table, Bar Chart).
4. **Toggle Views**:
   - Click "Show Chart View" to switch to chart visualization.
   - Click "Show Table View" to return to the pivot table.
5. **Export Data**:
   - Use the "Export Pivoted to CSV" or "Export Pivoted to XLSX" buttons to download your pivot table data.
6. **Switch Themes**:
   - Toggle the "Dark Mode" switch to change between light and dark themes.

## Example CSV File
To test the application, you can use a CSV file with headers like:
```csv
Province,Party,Age,Name
Ontario,Liberal,30,John
Quebec,Conservative,25,Jane
... 