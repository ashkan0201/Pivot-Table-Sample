// Global variables to manage XLSX file handling
// Utility function to check if a cell is non-empty

// Loads and parses XLSX file data into CSV format

// Generates a unique UUID for state saving
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Main jQuery document ready function to initialize the app
$(document).ready(function() {
    // Application state variables
    let parsedData = null; // Parsed data from uploaded file
    let pivotConfig = null; // Configuration for pivot table/chart
    let isDataLoaded = false; // Indicates if data is loaded
    let aData = []; // Stores selected data for export
    let currentFileName = ''; // Name of the current file
    let hasUnsavedChanges = false; // Tracks unsaved changes

    // Function to save pivotConfig to localStorage
    function saveConfig() {
        if (pivotConfig) {
            localStorage.setItem('pivotConfig', JSON.stringify(pivotConfig));
        }
    }

    // Function to load pivotConfig from localStorage
    function loadConfig() {
        const stored = localStorage.getItem('pivotConfig');
        if (stored) {
            pivotConfig = JSON.parse(stored);
        }
    }

    // Intersection observer for lazy loading large datasets
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && isDataLoaded && parsedData && parsedData.length > 1000) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe output and chart-output elements
    observer.observe(document.getElementById('output'));

    // Toggles unsaved changes alert visibility
    function setUnsavedChanges(changed) {
        hasUnsavedChanges = changed;
        if (hasUnsavedChanges) {
            $('#unsavedChangesAlert').removeClass('d-none');
        } else {
            $('#unsavedChangesAlert').addClass('d-none');
        }
    }

    // Applies styles to filtered headers in pivot table
    function applyFilteredHeaderStyles() {
        $('table.pvtTable th.pvtColLabel, table.pvtTable th.pvtRowLabel').css({
            'background-color': '',
            'color': ''
        });
        $('table.pvtTable th.pvtColLabel.pvtFiltered, table.pvtTable th.pvtRowLabel.pvtFiltered').css({
            'background-color': '#fff3cd',
            'color': '#333',
            'font-style': 'italic'
        });
    }

    // Theme toggle handler (light/dark mode)
    $('#themeToggle').on('change', function() {
        $('#fullPageLoader').css('display', 'flex');
        setTimeout(() => {
            const theme = this.checked ? 'dark' : 'light';
            $('body').attr('data-bs-theme', theme);
            const label = $('#themeToggle').next('label');
            if (theme === 'dark') {
                label.html('<i class="fas fa-sun me-2"></i>Light Mode');
            } else {
                label.html('<i class="fas fa-moon me-2"></i>Dark Mode');
            }
            showToast(`Switched to ${theme} mode`, 'success');
            if (isDataLoaded && parsedData) {
                renderPivotTable();
            }
            $('#fullPageLoader').css('display', 'none');
        }, 500);
    });

    // Trigger file input click on upload button
    $('#uploadBtn').on('click', function() {
        $('#fileInput').click();
    });

    // Handle file upload (CSV or XLSX)
    $('#fileInput').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) {
            showToast('No file selected.', 'warning');
            return;
        }
        if (!file.name.endsWith('.csv')) {
            showToast('Please select a valid CSV file.', 'error');
            return;
        }

        localStorage.clear();
        sessionStorage.clear();
        pivotConfig = null;
        parsedData = null;
        aData = [];
        isDataLoaded = false;
        currentFileName = file.name;
        $('#fileName').text(currentFileName);
        $('#fileNameDisplay').removeClass('d-none');
        $('#output').empty().html(`
            <div class="placeholder-message">
                <i class="fas fa-file-upload"></i>
                <p>Please upload a CSV file to start analyzing your data.</p>
            </div>
        `);
        $('#exportButtons').addClass('d-none');
        $('#fullPageLoader').css('display', 'flex');

        setUnsavedChanges(false);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            worker: true,
            complete: function(results) {
                $('#fullPageLoader').css('display', 'none');
                if (results.errors.length > 0) {
                    showToast('CSV parsing errors: ' + results.errors.map(err => err.message).join(', '), 'error');
                    return;
                }
                if (!results.data || results.data.length === 0) {
                    showToast('No data found in CSV.', 'error');
                    return;
                }
                if (results.data.length > 500000) {
                    showToast('CSV exceeds 500,000 rows. Please upload a smaller file or use server-side processing.', 'error');
                    return;
                }
                parsedData = results.data;
                isDataLoaded = true;
                pivotConfig = {
                    rows: [],
                    cols: [],
                    vals: [],
                    aggregatorName: 'Count',
                    rendererName: 'Table',
                    inclusions: {}, // اطمینان از خالی بودن
                    exclusions: {}  // اطمینان از خالی بودن
                };
                console.log('Initial pivotConfig:', pivotConfig); // لاگ برای دیباگ
                saveConfig();
                renderPivotTable();
                $('#exportButtons').removeClass('d-none');
                showToast('File loaded successfully!', 'success');
            },
            error: function(error) {
                $('#fullPageLoader').css('display', 'none');
                showToast('Error parsing CSV: ' + error.message, 'error');
            }
        });
        $(this).val('');
    });

    // Save current state to a user-selected file location
    $('#saveState').on('click', async function() {
        $('#fullPageLoader').css('display', 'flex');
        try {
            const id = generateUUID();
            const timestamp = new Date().toISOString();
            const cleanPivotConfig = {
                rows: pivotConfig?.rows || [],
                cols: pivotConfig?.cols || [],
                vals: pivotConfig?.vals || [],
                aggregatorName: pivotConfig?.aggregatorName || 'Count',
                rendererName: pivotConfig?.rendererName || 'Table',
                rowOrder: pivotConfig?.rowOrder || 'value_z_to_a',
                colOrder: pivotConfig?.colOrder || 'value_z_to_a',
                hiddenAttributes: pivotConfig?.hiddenAttributes || ['$$hashKey'],
                inclusions: pivotConfig?.inclusions || {},
                exclusions: pivotConfig?.exclusions || {}
            };
            const state = {
                pivotConfig: cleanPivotConfig,
                aData: aData,
                parsedData: parsedData,
                currentFileName: currentFileName
            };
            const stateEntry = { id, timestamp, state, signature: "pivot_table_state_v1" };
            const jsonContent = JSON.stringify(stateEntry);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const handle = await window.showSaveFilePicker({
                suggestedName: `${id}.json`,
                types: [{
                    description: 'JSON Files',
                    accept: {'application/json': ['.json']}
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            setUnsavedChanges(false);
            showToast('State saved successfully!', 'success');
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast('Error saving state: ' + err.message, 'error');
            }
        }
        $('#fullPageLoader').css('display', 'none');
    });

    // Button to load states from a selected folder
    $('#loadState').on('click', async function() {
        // Clear both localStorage and sessionStorage before loading state
        localStorage.clear();
        sessionStorage.clear();

        // Explicitly reset pivotConfig to ensure no previous config is used
        pivotConfig = null;

        try {
            const dir = await window.showDirectoryPicker();
            const savedStates = [];
            for await (const [name, handle] of dir.entries()) {
                if (name.endsWith('.json') && handle.kind === 'file') {
                    const file = await handle.getFile();
                    const text = await file.text();
                    try {
                        const stateEntry = JSON.parse(text);
                        if (stateEntry.signature !== "pivot_table_state_v1") {
                            console.warn(`Invalid signature for file ${name}. Skipping.`);
                            continue;
                        }
                        if (!stateEntry.id || !stateEntry.timestamp || !stateEntry.state) {
                            console.warn(`Invalid structure for file ${name}. Skipping.`);
                            continue;
                        }
                        stateEntry.id = name.replace('.json', '');
                        stateEntry.handle = handle;
                        savedStates.push(stateEntry);
                    } catch (err) {
                        console.warn(`Error parsing JSON for file ${name}: ${err.message}. Skipping.`);
                        continue;
                    }
                }
            }
            if (savedStates.length === 0) {
                showToast('No valid saved states found in the selected folder.', 'warning');
            }
            savedStates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const $list = $('#savedStatesList');
            $list.empty();
            if (savedStates.length === 0) {
                $list.append('<li class="list-group-item text-muted"><i class="fas fa-info-circle me-2"></i>No valid saved states</li>');
            } else {
                savedStates.forEach(stateEntry => {
                    const date = new Date(stateEntry.timestamp);
                    const formattedDate = date.toLocaleString('en-GB', { 
                        year: 'numeric', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                    });
                    const state = stateEntry.state;
                    const displayName = `${state.currentFileName || 'Untitled'}`;
                    $list.append(`
                        <li class="list-group-item" data-state-id="${stateEntry.id}">
                            <i class="fas fa-file me-2"></i>
                            <span class="saved-state-name">${displayName}</span> - 
                            <span class="saved-state-date">${formattedDate}</span>
                        </li>
                    `);
                });
            }
            // Attach click handler to load saved state
            $list.off('click', 'li[data-state-id]');
            $list.on('click', 'li[data-state-id]', function() {
                const stateId = $(this).data('state-id');
                loadState(stateId, dir);
                $('#loadStateModal').modal('hide');
            });
            $('#loadStateModal').modal('show');
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast('Error loading states: ' + err.message, 'error');
            }
        }
    });

    // Load a saved state from the selected folder
    async function loadState(stateId, dir) {
        $('#fullPageLoader').css('display', 'flex');
        try {
            const fileName = `${stateId}.json`;
            const fileHandle = await dir.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const text = await file.text();
            const stateEntry = JSON.parse(text);
            if (stateEntry.signature !== "pivot_table_state_v1") {
                showToast('Invalid state file. This file may not be a valid save from this application.', 'error');
                $('#fullPageLoader').css('display', 'none');
                return;
            }
            // Validate structure
            if (!stateEntry.state || !stateEntry.id || !stateEntry.timestamp) {
                showToast('Invalid state file structure.', 'error');
                $('#fullPageLoader').css('display', 'none');
                return;
            }
            const state = stateEntry.state;
            pivotConfig = state.pivotConfig || { rows: [], cols: [], vals: [], aggregatorName: 'Count', rendererName: 'Table' };
            aData = state.aData || [];
            parsedData = state.parsedData;
            currentFileName = state.currentFileName || '';
            isDataLoaded = parsedData && parsedData.length > 0;
            saveConfig(); // Save loaded config to localStorage

            if (currentFileName) {
                $('#fileName').text(currentFileName);
                $('#fileNameDisplay').removeClass('d-none');
            } else {
                $('#fileNameDisplay').addClass('d-none');
            }

            if (isDataLoaded) {
                $('#exportButtons').removeClass('d-none');
                $('#output').removeClass('d-none');
                renderPivotTable();
                setUnsavedChanges(false);
                showToast('State loaded successfully!', 'success');
            } else {
                $('#output').empty().html(`
                    <div class="placeholder-message">
                        <i class="fas fa-file-upload"></i>
                        <p>Please upload a CSV file to start analyzing your data.</p>
                    </div>
                `);
                $('#exportButtons').addClass('d-none');
                showToast('No data in saved state. Please upload a CSV file.', 'warning');
            }
        } catch (err) {
            showToast('Error loading state: ' + err.message, 'error');
        }
        $('#fullPageLoader').css('display', 'none');
    }

    // Renders the pivot table
    function renderPivotTable() {
        loadConfig(); // Load config from localStorage before rendering
        $('#fullPageLoader').css('display', 'flex');
        if (!parsedData || parsedData.length === 0) {
            $('#fullPageLoader').css('display', 'none');
            showToast('No data available to render table.', 'error');
            return;
        }
        $('#output').empty();
        if (!pivotConfig) {
            pivotConfig = { rows: [], cols: [], vals: [], aggregatorName: 'Count', rendererName: 'Table' };
        }
        pivotConfig.rendererName = 'Table';

        // Initialize pivotUI for table rendering
        $('#output').pivotUI(parsedData, {
            rows: pivotConfig.rows || [],
            cols: pivotConfig.cols || [],
            vals: pivotConfig.vals || [],
            aggregatorName: pivotConfig.aggregatorName || 'Count',
            rendererName: 'Table',
            inclusions: pivotConfig.inclusions || {},
            exclusions: pivotConfig.exclusions || {},
            renderers: $.extend(
                $.pivotUtilities.renderers,
                $.pivotUtilities.gchart_renderers,
                $.pivotUtilities.d3_renderers,
                $.pivotUtilities.plotly_renderers,
                $.pivotUtilities.c3_renderers
            ),
            hiddenAttributes: pivotConfig.hiddenAttributes || ['$$hashKey'],
            menuLimit: 500000,
            rendererOptions: {
                table: {
                    clickCallback: function(e, value, filters, pivotData) {
                        aData = [];
                        pivotData.forEachMatchingRecord(filters, function(record) {
                            aData.push({ ...record });
                        });
                        setUnsavedChanges(true);
                        showToast(`Selected ${aData.length} records for export`, 'info');
                    }
                }
            },
            onRefresh: function(config) {
                pivotConfig = { ...config };
                saveConfig(); // Save updated config to localStorage
                setUnsavedChanges(true);
                $('.pvtTable').addClass('table table-striped table-bordered table-hover');
                $('.pvtTable').css({
                    'width': 'auto',
                    'max-width': '100%',
                    'max-height': '100%'
                });
                $('.pvtRendererArea').css({
                    'overflow-x': 'auto',
                    'overflow-y': 'auto',
                    'max-height': '650px'
                });

                // Clear previous drag-and-drop events
                $('.pvtAttr, .pvtRows, .pvtCols, .pvtUnused').each(function() {
                    $(this).removeData('ui-draggable')
                        .removeData('ui-droppable')
                        .removeClass('ui-draggable ui-draggable-dragging ui-droppable ui-droppable-hover ui-droppable-active')
                        .off('.draggable')
                        .off('.droppable')
                        .off('click mousedown touchstart');
                });

                // Apply drag-and-drop functionality
                function applyDragAndDrop() {
                    $('.pvtAttr').each(function() {
                        if (!$(this).hasClass('ui-draggable')) {
                            $(this).draggable({
                                helper: 'clone',
                                appendTo: 'body',
                                containment: 'window',
                                zIndex: 1000,
                                revert: 'invalid',
                                cursor: 'move',
                                start: function(event, ui) {
                                    $(ui.helper).addClass('ui-draggable-dragging').css({
                                        'padding': '8px 12px',
                                        'border-radius': '4px',
                                        'background': '#fff',
                                        'border': '1px solid #007bff',
                                        'color': '#333'
                                    });
                                    console.log('Dragging started:', $(this).text());
                                },
                                stop: function(event, ui) {
                                    $(ui.helper).removeClass('ui-draggable-dragging');
                                }
                            });
                            $(this).on('mousedown touchstart', function(e) {
                                e.stopPropagation();
                                console.log('Mouse down on:', $(this).text());
                            });
                        }
                    });

                    $('.pvtRows, .pvtCols, .pvtUnused').each(function() {
                        if (!$(this).hasClass('ui-droppable')) {
                            $(this).droppable({
                                accept: '.pvtAttr',
                                hoverClass: 'ui-droppable-active',
                                activeClass: 'ui-droppable-active',
                                tolerance: 'intersect',
                                drop: function(event, ui) {
                                    $('#fullPageLoader').css('display', 'flex');
                                    const attr = ui.draggable.text().trim().replace(' ▾', '');
                                    const target = $(this).hasClass('pvtRows') ? 'rows' :
                                                $(this).hasClass('pvtCols') ? 'cols' : 'unused';
                                    console.log('Dropped:', { attr, target });
                                    updatePivotConfig(attr, target);
                                    // Re-render table immediately
                                    $('#output').empty().pivotUI(parsedData, {
                                        ...pivotConfig,
                                        rendererName: 'Table'
                                    }, true);
                                    setTimeout(() => {
                                        $('.pvtTable').addClass('table table-striped table-bordered table-hover');
                                        $('.pvtTable').css({
                                            'width': 'auto',
                                            'max-width': '100%',
                                            'max-height': '100%'
                                        });
                                        $('.pvtRendererArea').css({
                                            'overflow-x': 'auto',
                                            'overflow-y': 'auto',
                                            'max-height': '650px'
                                        });
                                        applyFilteredHeaderStyles();
                                        applyDragAndDrop();
                                        $('#fullPageLoader').css('display', 'none');
                                        console.log('Table rendered:', $('#output .pvtTable').length);
                                        console.log('Draggable elements:', $('.pvtAttr').length);
                                        console.log('Droppable elements:', $('.pvtRows, .pvtCols, .pvtUnused').length);
                                    }, 0);
                                }
                            });
                        }
                    });
                }

                applyDragAndDrop();
                applyFilteredHeaderStyles();
                $('#fullPageLoader').css('display', 'none');
                console.log('Table rendered:', $('#output .pvtTable').length);
                console.log('Draggable elements:', $('.pvtAttr').length);
                console.log('Droppable elements:', $('.pvtRows, .pvtCols, .pvtUnused').length);
            }
        }, true); // Force overwrite to reset previous state
    }

    // Updates pivot configuration when headers are dragged
    function updatePivotConfig(attr, target) {
        if (!pivotConfig) {
            pivotConfig = { rows: [], cols: [], vals: [], aggregatorName: 'Count', rendererName: 'Table' };
        }
        // Remove sorting icon from attribute name
        const cleanAttr = attr.replace(' ▾', '');
        // Remove attribute from rows and cols
        pivotConfig.rows = pivotConfig.rows.filter(item => item !== cleanAttr);
        pivotConfig.cols = pivotConfig.cols.filter(item => item !== cleanAttr);
        // Add attribute to the appropriate target
        if (target === 'rows') {
            pivotConfig.rows.push(cleanAttr);
        } else if (target === 'cols') {
            pivotConfig.cols.push(cleanAttr);
        } else if (target === 'unused') {
            // Attribute is only removed from rows and cols
        }
        // Preserve rendererName based on current view (chart or table)
        pivotConfig.rendererName = 'Table';
        saveConfig(); // Save updated config
        setUnsavedChanges(true);
        console.log('Updated pivotConfig:', pivotConfig);
    }

    // Export pivot table to CSV
    $('#exportCsv').on('click', function() {
        $('#fullPageLoader').css('display', 'flex');
        setTimeout(() => {
            try {
                const $pivotTable = $('#output table.pvtTable');
                if ($pivotTable.length === 0) {
                    showToast('No pivoted data found.', 'warning');
                    $('#fullPageLoader').hide();
                    return;
                }

                const grid = [];
                const skipMap = {};

                $pivotTable.find('tr').each((rowIndex, tr) => {
                    const row = [];
                    let colIndex = 0;

                    $(tr).find('th, td').each((_, cell) => {
                        const $cell = $(cell);
                        const text = $cell.text().trim();
                        const colspan = parseInt($cell.attr('colspan')) || 1;
                        const rowspan = parseInt($cell.attr('rowspan')) || 1;

                        while (skipMap[`${rowIndex},${colIndex}`]) {
                            row.push(skipMap[`${rowIndex},${colIndex}`]);
                            colIndex++;
                        }

                        row.push(text);

                        for (let c = 1; c < colspan; c++) {
                            row.push('');
                            colIndex++;
                        }

                        for (let r = 1; r < rowspan; r++) {
                            for (let c = 0; c < colspan; c++) {
                                skipMap[`${rowIndex + r},${colIndex - (colspan - 1) + c}`] = '';
                            }
                        }

                        colIndex++;
                    });

                    grid.push(row);
                });

                const csvContent = grid.map(r => r.map(cell => (cell.includes(',') ? `"${cell}"` : cell)).join(',')).join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'pivoted_export.csv';
                link.click();

                showToast('Exported pivoted data to CSV with merged cells successfully!', 'success');
            } catch (err) {
                showToast('Error exporting CSV: ' + err.message, 'error');
            }
            $('#fullPageLoader').hide();
        }, 100);
    });

    // Export pivot table to XLSX
    $('#exportXlsx').on('click', function() {
        $('#fullPageLoader').css('display', 'flex');
        setTimeout(() => {
            const $container = $('#output');
            const $table = $container.find('.pvtTable');
            if (!$table.length) {
                showToast('No table found to export. Please ensure Table renderer is selected.', 'warning');
                $('#fullPageLoader').css('display', 'none');
                return;
            }

            try {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.table_to_sheet($table[0], { raw: true });

                const merges = [];
                $table.find('tr').each((r, row) => {
                    $(row).find('th, td').each((c, cell) => {
                        const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
                        const colspan = parseInt(cell.getAttribute('colspan') || '1');
                        if (rowspan > 1 || colspan > 1) {
                            merges.push({
                                s: { r, c },
                                e: { r: r + rowspan - 1, c: c + colspan - 1 }
                            });
                        }
                    });
                });
                ws['!merges'] = merges;

                const range = XLSX.utils.decode_range(ws['!ref']);
                const colWidths = [];
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    let maxWidth = 10;
                    for (let R = range.s.r; R <= range.e.r; ++R) {
                        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
                        if (cell && cell.v) {
                            const len = cell.v.toString().length;
                            if (len > maxWidth) maxWidth = len;
                        }
                    }
                    colWidths.push({ wch: maxWidth + 2 });
                }
                ws['!cols'] = colWidths;

                XLSX.utils.book_append_sheet(wb, ws, 'Pivot Table');
                XLSX.writeFile(wb, 'pivot_export.xlsx');
                showToast('Pivot table exported to Excel successfully!', 'success');
            } catch (err) {
                showToast('Error exporting to XLSX: ' + err.message, 'error');
            }
            $('#fullPageLoader').css('display', 'none');
        }, 100);
    });

    // Export selected raw data to XLSX
    $('#exportRawXlsx').on('click', function() {
        $('#fullPageLoader').css('display', 'flex');
        setTimeout(() => {
            if (aData.length === 0) {
                showToast('No data selected. Please click on a pivot table cell first.', 'warning');
                $('#fullPageLoader').css('display', 'none');
                return;
            }

            try {
                const headers = Object.keys(aData[0]);
                const rows = aData.map(row => {
                    const rowData = {};
                    headers.forEach(header => {
                        rowData[header] = row[header] || '';
                    });
                    return rowData;
                });

                const worksheet = XLSX.utils.json_to_sheet(rows);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'SelectedData');
                XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });

                const colWidths = headers.map(header => ({
                    wch: Math.max(header.length, ...rows.map(row => String(row[header] || '').length)) + 2
                }));
                worksheet['!cols'] = colWidths;

                XLSX.writeFile(workbook, 'selected_raw_data.xlsx');
                showToast('Selected raw data exported to Excel successfully!', 'success');
            } catch (err) {
                showToast('Error exporting to XLSX: ' + err.message, 'error');
            }

            $('#fullPageLoader').css('display', 'none');
        }, 100);
    });

    // Extracts table data for export
    function extractTableData() {
        const $container = $('#output');
        const $table = $container.find('.pvtTable');
        if (!$table.length) {
            showToast('No table found to export. Please ensure Table renderer is selected.', 'warning');
            return null;
        }

        const $thead = $table.find('thead');
        const $tbody = $table.find('tbody');
        const headerRowCount = $thead.find('tr').length;
        const bodyRowCount = $tbody.find('tr').length;

        if (headerRowCount === 0 || bodyRowCount === 0) {
            return null;
        }

        let grid = [];
        let maxCols = 0;

        let headerGrid = [];
        let cityRow = [];
        let ageRow = [];
        let colIndexMap = [];

        $thead.find('tr').each(function(rowIndex) {
            let colIndex = 0;
            if (!headerGrid[rowIndex]) headerGrid[rowIndex] = [];
            $(this).find('th').each(function() {
                const $th = $(this);
                const text = $th.text().trim();
                const colspan = parseInt($th.attr('colspan')) || 1;
                const rowspan = parseInt($th.attr('rowspan')) || 1;

                while (headerGrid[rowIndex][colIndex]) colIndex++;

                if (rowIndex === 0 && !$th.hasClass('pvtAxisLabel')) {
                    for (let c = 0; c < colspan; c++) {
                        cityRow[colIndex + c] = text;
                        colIndexMap[colIndex + c] = text;
                    }
                }

                if (rowIndex === 1 && !$th.hasClass('pvtAxisLabel')) {
                    for (let c = 0; c < colspan; c++) {
                        ageRow[colIndex + c] = text;
                    }
                }

                for (let r = 0; r < rowspan; r++) {
                    if (!headerGrid[rowIndex + r]) headerGrid[rowIndex + r] = [];
                    for (let c = 0; c < colspan; c++) {
                        headerGrid[rowIndex + r][colIndex + c] = text || headerGrid[rowIndex + r][colIndex + c] || '';
                    }
                }
                colIndex += colspan;
            });
            maxCols = Math.max(maxCols, colIndex);
        });

        let finalHeaderGrid = [];
        finalHeaderGrid[0] = ['', ...cityRow.slice(1), 'Totals'];
        finalHeaderGrid[1] = ['Age', ...ageRow.slice(1), ''];
        finalHeaderGrid[2] = ['Name', ...new Array(maxCols - 1).fill(''), ''];

        let bodyGrid = [];
        $tbody.find('tr').each(function(rowIndex) {
            let colIndex = 0;
            const row = new Array(maxCols).fill('');
            $(this).find('th, td').each(function() {
                const $cell = $(this);
                const text = $cell.text().trim();
                const colspan = parseInt($cell.attr('colspan')) || 1;
                const rowspan = parseInt($cell.attr('rowspan')) || 1;

                while (row[colIndex]) colIndex++;

                for (let c = 0; c < colspan; c++) {
                    row[colIndex + c] = (c === 0) ? text : '';
                }
                colIndex += colspan;
            });
            bodyGrid.push(row);
        });

        grid = [...finalHeaderGrid, ...bodyGrid];

        const firstColIsRowLabel = bodyGrid.every(row => row[0] !== '');
        if (firstColIsRowLabel) {
            for (let r = headerRowCount; r < grid.length; r++) {
                grid[r] = [bodyGrid[r - headerRowCount][0], ...grid[r].slice(1)];
            }
        }

        return grid;
    }

    // Displays toast notifications
    function showToast(message, type = 'success') {
        const bgClass = {
            success: 'bg-success',
            error: 'bg-danger',
            info: 'bg-info',
            warning: 'bg-warning'
        }[type] || 'bg-primary';
        const toastHtml = `
            <div class="toast align-items-center text-white ${bgClass} border-0 animate__animated animate__slideInRight" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        const toastElement = $(toastHtml).appendTo('.toast-container');
        const toast = new bootstrap.Toast(toastElement[0], { delay: 5000 });
        toast.show();
    }

    // Initialize without loading saved states automatically
    setUnsavedChanges(false);
});