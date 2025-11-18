/* detail.js – Neon DataTable with Single Sticky Header */
$(document).ready(function () {
    let selectedData = [];
    let dataTable = null;
    const $loader = $('#fullPageLoader');

    /* -------------------------------------------------
       Theme Toggle
    ------------------------------------------------- */
    $('#themeToggle').on('change', function () {
        $loader.css('display', 'flex');
        setTimeout(() => {
            const isDark = this.checked;
            $('body').attr('data-bs-theme', isDark ? 'dark' : 'light');
            const $label = $(this).next('label');
            $label.html(isDark
                ? '<i class="fas fa-sun me-2"></i>Light Mode'
                : '<i class="fas fa-moon me-2"></i>Dark Mode');

            showToast(`Switched to ${isDark ? 'dark' : 'light'} mode`, 'success');
            if (dataTable) dataTable.draw();
            $loader.hide();
        }, 500);
    });

    /* -------------------------------------------------
       Load Data
    ------------------------------------------------- */
    function loadSelectedData() {
        const raw = sessionStorage.getItem('selectedData');
        if (!raw) {
            showToast('No data selected. Return to pivot.', 'error');
            renderPlaceholder('No data selected.');
            return;
        }

        try {
            selectedData = JSON.parse(raw);
            sessionStorage.removeItem('selectedData');
        } catch (e) {
            showToast('Invalid data.', 'error');
            return;
        }

        if (selectedData.length === 0) {
            showToast('Empty selection.', 'warning');
            renderPlaceholder('No records.');
            return;
        }

        $('#exportButtons').removeClass('d-none');
        renderDataTable();
        showToast(`Loaded ${selectedData.length} record(s)`, 'success');
    }

    function renderPlaceholder(msg) {
        $('#detailOutput').html(`
            <div class="placeholder-message">
                <i class="fas fa-info-circle"></i>
                <p>${msg}</p>
            </div>
        `);
        $loader.hide();
    }

    /* -------------------------------------------------
       Render Neon DataTable – SINGLE HEADER
    ------------------------------------------------- */
    function renderDataTable() {
        $loader.show();
        $('#detailOutput').empty();

        const headers = Object.keys(selectedData[0]);
        const columns = [
            { 
                title: '#', 
                data: null, 
                orderable: false, 
                className: 'text-center neon-glow', 
                width: '60px' 
            }
        ];
        headers.forEach(h => columns.push({
            title: h,
            data: h,
            defaultContent: '',
            className: 'text-truncate neon-cell'
        }));

        const $table = $('<table>', {
            id: 'detailTable',
            class: 'table table-striped table-hover display nowrap w-100 neon-table'
        });

        $('#detailOutput').append($table);

        dataTable = $table.DataTable({
            data: selectedData,
            columns: columns,
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
            responsive: false,
            scrollX: true,
            scrollY: '650px',
            scrollCollapse: true,
            autoWidth: false,
            paging: true,
            ordering: true,
            info: true,
            searching: true,
            fixedHeader: false,
            scroller: false,

            columnDefs: [
                {
                    targets: '_all',
                    className: 'text-truncate neon-cell',
                    width: '150px',
                    maxWidth: '200px',
                    minWidth: '80px'
                },
                {
                    targets: 0,
                    orderable: false,
                    width: '60px',
                    className: 'text-center',
                    render: (data, type, row, meta) => 
                        `<span class="neon-number">${meta.row + meta.settings._iDisplayStart + 1}</span>`
                }
            ],

            dom: '<"neon-controls"B><"row"<"col-md-6"l><"col-md-6"f>>rtip',

            buttons: [
                { extend: 'copy', text: '<i class="fas fa-copy"></i>', className: 'btn-neon btn-neon-copy' },
                { extend: 'csv', text: '<i class="fas fa-file-csv"></i>', className: 'btn-neon btn-neon-csv' },
                { extend: 'excel', text: '<i class="fas fa-file-excel"></i>', className: 'btn-neon btn-neon-excel' }
            ],

            order: [],
            language: {
                search: "",
                searchPlaceholder: "Search records...",
                lengthMenu: "Show _MENU_",
                info: "_START_–_END_ of _TOTAL_",
                paginate: {
                    next: '<i class="fas fa-chevron-right"></i>',
                    previous: '<i class="fas fa-chevron-left"></i>'
                }
            },
            initComplete: function () {
                $('.dataTables_scrollHead').remove();
                const $wrapper = $table.closest('.dataTables_wrapper');
                $wrapper.find('.dataTables_scrollHead').remove();
                const $scrollBody = $('.dataTables_scrollBody');
                $scrollBody.css({
                    'max-height': '650px',
                    'overflow': 'auto',
                    'position': 'relative',
                    'border-top': 'none'
                });
                const $thead = $('#detailTable thead');
                $thead.css({
                    'position': 'sticky',
                    'top': 0,
                    'z-index': 10,
                    'background': 'inherit'
                });
                $scrollBody.on('scroll', function () {
                    const scrollLeft = $(this).scrollLeft();
                    $thead.parent().scrollLeft(scrollLeft);
                });
                $('.dataTables_filter input').addClass('form-control neon-search');
                $('.dataTables_length select').addClass('form-select neon-select');
            },

            drawCallback: function () {
                $('.dataTables_scrollHead').remove();
            }
        });

        $loader.hide();
    }

    /* -------------------------------------------------
       Toast
    ------------------------------------------------- */
    function showToast(msg, type = 'success') {
        const bg = { success: 'bg-success', error: 'bg-danger', warning: 'bg-warning' }[type] || 'bg-info';
        const $toast = $(`
            <div class="toast align-items-center text-white ${bg} border-0 neon-toast animate__animated animate__slideInRight">
                <div class="d-flex">
                    <div class="toast-body">${msg}</div>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
            </div>`).appendTo('.toast-container');

        new bootstrap.Toast($toast[0], { delay: 4000 }).show();
    }

    /* -------------------------------------------------
       Init
    ------------------------------------------------- */
    loadSelectedData();
});