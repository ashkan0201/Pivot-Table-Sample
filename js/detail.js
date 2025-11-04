// detail.js (new file for detail.html)
$(document).ready(function() {
    let selectedData = [];
    let hasUnsavedChanges = false;

    // Theme toggle handler (light/dark mode) - similar to main script
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
            renderDetailTable();
            $('#fullPageLoader').css('display', 'none');
        }, 500);
    });

    // Load selected data from sessionStorage
    function loadSelectedData() {
        const storedData = sessionStorage.getItem('selectedData');
        if (storedData) {
            selectedData = JSON.parse(storedData);
            sessionStorage.removeItem('selectedData'); // Clear after loading to avoid reuse
            if (selectedData.length > 0) {
                $('#exportButtons').removeClass('d-none');
                renderDetailTable();
                showToast(`Loaded ${selectedData.length} records`, 'success');
            } else {
                showToast('No data available.', 'warning');
            }
        } else {
            showToast('No selected data found. Please select from the main pivot table.', 'error');
        }
    }

    // Render the detail table with selected data
    function renderDetailTable() {
        $('#fullPageLoader').css('display', 'flex');
        $('#detailOutput').empty();

        if (selectedData.length === 0) {
            $('#detailOutput').html(`
                <div class="placeholder-message">
                    <i class="fas fa-info-circle"></i>
                    <p>No data selected.</p>
                </div>
            `);
            $('#fullPageLoader').css('display', 'none');
            return;
        }

        // Create table
        const $table = $('<table class="table table-striped table-bordered table-hover pvtTable">');
        const headers = Object.keys(selectedData[0]);

        // Header row
        const $thead = $('<thead>');
        const $headerRow = $('<tr>');
        headers.forEach(header => {
            $headerRow.append(`<th>${header}</th>`);
        });
        $thead.append($headerRow);
        $table.append($thead);

        // Body rows
        const $tbody = $('<tbody>');
        selectedData.forEach(row => {
            const $row = $('<tr>');
            headers.forEach(header => {
                $row.append(`<td>${row[header] || ''}</td>`);
            });
            $tbody.append($row);
        });
        $table.append($tbody);

        $('#detailOutput').append($table);
        $('#detailOutput').css({
            'overflow-x': 'auto',
            'overflow-y': 'auto',
            'max-height': '650px'
        });
        $('#fullPageLoader').css('display', 'none');
    }

    // Export selected raw data to XLSX - similar to main script
    $('#exportRawXlsx').on('click', function() {
        $('#fullPageLoader').css('display', 'flex');
        setTimeout(() => {
            if (selectedData.length === 0) {
                showToast('No data selected.', 'warning');
                $('#fullPageLoader').css('display', 'none');
                return;
            }

            try {
                const headers = Object.keys(selectedData[0]);
                const rows = selectedData.map(row => {
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

    // Displays toast notifications - similar to main script
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

    // Initialize
    loadSelectedData();
});