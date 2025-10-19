$(document).ready(function() {
    let parsedData = null;
    let isChartVisible = false;
    let pivotConfig = null;
    let isDataLoaded = false;

    // Set up IntersectionObserver for applying animation
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

    observer.observe(document.getElementById('output'));
    observer.observe(document.getElementById('chart-output'));

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
                renderPivotChart();
            }
            $('#fullPageLoader').css('display', 'none');
        }, 500);
    });

    $('#uploadBtn').on('click', function() {
        $('#fileInput').click();
    });

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
        parsedData = null;
        isDataLoaded = false;
        $('#output').empty().html(`
            <div class="placeholder-message">
                <i class="fas fa-file-upload"></i>
                <p>Please upload a CSV file to start analyzing your data.</p>
            </div>
        `);
        $('#chart-output').empty().addClass('d-none');
        $('#exportButtons, #toggleChart').addClass('d-none');
        $('#fullPageLoader').css('display', 'flex');
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            worker: true,
            complete: function(results) {
                $('#fullPageLoader').css('display', 'none');
                if (results.errors.length > 0) {
                    showToast('CSV parsing errors: ' + results.errors.map(err => {
                        if (err.type === 'Quotes') return 'Invalid quotes in CSV.';
                        if (err.type === 'Delimiter') return 'Invalid delimiter detected.';
                        return err.message;
                    }).join(', '), 'error');
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
                renderPivotTable();
                renderPivotChart();
                $('#exportButtons, #toggleChart').removeClass('d-none');
                showToast('File loaded successfully!', 'success');
            },
            error: function(error) {
                $('#fullPageLoader').css('display', 'none');
                showToast('Error parsing CSV: ' + error.message, 'error');
            }
        });
        $(this).val('');
    });

    function renderPivotTable() {
        $('#fullPageLoader').css('display', 'flex');
        setTimeout(() => {
            $('#output').empty().pivotUI(parsedData, {
                rows: [],
                cols: [],
                vals: [],
                aggregatorName: 'Count',
                rendererName: 'Table',
                renderers: $.extend(
                    $.pivotUtilities.renderers,
                    $.pivotUtilities.gchart_renderers,
                    $.pivotUtilities.d3_renderers,
                    $.pivotUtilities.plotly_renderers,
                    $.pivotUtilities.c3_renderers
                ),
                hiddenAttributes: ['$$hashKey'],
                menuLimit: 500000,
                onRefresh: function(config) {
                    pivotConfig = config;
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

                    $('.pvtAttr').draggable('destroy').droppable('destroy');
                    $('.pvtRows, .pvtCols, .pvtUnused').droppable('destroy');

                    $('.pvtAttr').draggable({
                        helper: 'clone',
                        appendTo: 'body',
                        containment: 'window',
                        zIndex: 1000,
                        revert: 'invalid',
                        start: function(event, ui) {
                            $(ui.helper).addClass('ui-draggable-dragging');
                        }
                    });

                    $('.pvtRows, .pvtCols, .pvtUnused').droppable({
                        accept: '.pvtAttr',
                        hoverClass: 'ui-droppable-active',
                        activeClass: 'ui-droppable-active',
                        drop: function(event, ui) {
                            $('#fullPageLoader').css('display', 'flex');
                            const attr = ui.draggable.text().trim();
                            const target = $(this).hasClass('pvtRows') ? 'rows' : $(this).hasClass('pvtCols') ? 'cols' : 'unused';
                            updatePivotConfig(attr, target);
                            $('#output').pivotUI(parsedData, pivotConfig, true);
                            $('#fullPageLoader').css('display', 'none');
                        }
                    });

                    $('#fullPageLoader').css('display', 'none');
                }
            });
            $('#fullPageLoader').css('display', 'none');
        }, 100);
    }

    function updatePivotConfig(attr, target) {
        if (!pivotConfig) {
            pivotConfig = { rows: [], cols: [], vals: [], hiddenAttributes: [] };
        }
        pivotConfig.rows = pivotConfig.rows.filter(item => item !== attr);
        pivotConfig.cols = pivotConfig.cols.filter(item => item !== attr);
        if (target === 'rows') {
            pivotConfig.rows.push(attr);
        } else if (target === 'cols') {
            pivotConfig.cols.push(attr);
        }
    }

    function renderPivotChart() {
        $('#fullPageLoader').css('display', 'flex');
        setTimeout(() => {
            console.log('Parsed Data:', parsedData); // For debugging data
            if (!parsedData || parsedData.length === 0) {
                showToast('No data available to display chart!', 'error');
                $('#fullPageLoader').css('display', 'none');
                return;
            }
            const derivers = $.pivotUtilities.derivers;
            const renderers = $.extend(
                $.pivotUtilities.renderers,
                $.pivotUtilities.c3_renderers,
                $.pivotUtilities.plotly_renderers
            );
            $('#chart-output').empty().pivotUI(parsedData, {
                renderers: renderers,
                cols: ["Party"],
                rows: ["Province"],
                aggregatorName: "Count",
                rendererName: "Horizontal Stacked Bar Chart",
                rowOrder: "value_z_to_a",
                colOrder: "value_z_to_a",
                rendererOptions: {
                    c3: {
                        data: {
                            colors: {
                                Liberal: '#dc3912',
                                Conservative: '#3366cc',
                                NDP: '#ff9900',
                                Green: '#109618',
                                'Bloc Quebecois': '#990099'
                            }
                        }
                    }
                },
                onRefresh: function(config) {
                    pivotConfig = config;
                    $('.pvtRendererArea').css({
                        'max-width': '100%',
                        'overflow-x': 'auto',
                        'overflow-y': 'auto',
                        'max-height': '650px'
                    });
                    $('#fullPageLoader').css('display', 'none');
                }
            });
            $('#fullPageLoader').css('display', 'none');
        }, 100);
    }

    $('#toggleChart').on('click', function() {
        $('#fullPageLoader').css('display', 'flex');
        setTimeout(() => {
            isChartVisible = !isChartVisible;
            if (isChartVisible) {
                $('#output').addClass('d-none');
                $('#chart-output').removeClass('d-none');
                $(this).html('<i class="fas fa-table me-2"></i>Show Table View');
                renderPivotChart();
                $('.pvtRenderer').val('Horizontal Stacked Bar Chart').trigger('change');
                showToast('Switched to Chart View', 'info');
            } else {
                $('#output').removeClass('d-none');
                $('#chart-output').addClass('d-none');
                $(this).html('<i class="fas fa-chart-bar me-2"></i>Show Chart View');
                renderPivotTable();
                $('.pvtRenderer').val('Table').trigger('change');
                showToast('Switched to Table View', 'info');
            }
            $('#fullPageLoader').css('display', 'none');
        }, 100);
    });

    $('#exportCsv').on('click', function () {
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

    $('#exportXlsx').on('click', function() {
        $('#fullPageLoader').css('display', 'flex');
        setTimeout(() => {
            const $container = isChartVisible ? $('#chart-output') : $('#output');
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

    function extractTableData() {
        const $container = isChartVisible ? $('#chart-output') : $('#output');
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
});