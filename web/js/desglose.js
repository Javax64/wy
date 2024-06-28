document.addEventListener('DOMContentLoaded', function () {
    var ctxSales = document.getElementById('salesChart').getContext('2d');
    var ctxAdvances = document.getElementById('advancesChart').getContext('2d');
    var ctxCompletedOrders = document.getElementById('completedOrdersChart').getContext('2d');
    var ctxGlobal = document.getElementById('globalChart').getContext('2d');

  

    var salesChart = new Chart(ctxSales, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Ventas',
                data: [],
                borderColor: '#3bbabe',
                backgroundColor: 'rgba(59, 186, 190, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        display: true
                    }
                }
            }
        }
    });

    var advancesChart = new Chart(ctxAdvances, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Adelantos de Pedidos',
                data: [],
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        display: true
                    }
                }
            }
        }
    });

    var completedOrdersChart = new Chart(ctxCompletedOrders, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Pedidos Completados',
                data: [],
                borderColor: '#36a2eb',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        display: true
                    }
                }
            }
        }
    });

    var globalChart = new Chart(ctxGlobal, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Global',
                data: [],
                borderColor: '#8e5ea2',
                backgroundColor: 'rgba(142, 94, 162, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        display: true
                    }
                }
            }
        }
    });

    eel.get_products2()().then(function (products) {
        var productSelect = document.getElementById('product');
        productSelect.innerHTML = '<option value="all">Todos</option>';
        products.forEach(function (product) {
            var option = document.createElement('option');
            option.value = product.name;  // Asegúrate de acceder a la propiedad correcta del objeto
            option.textContent = product.name;  // Asegúrate de acceder a la propiedad correcta del objeto
            productSelect.appendChild(option);
        });
        applyFilters(); // Llamar a applyFilters después de cargar los productos
    }).catch(function (error) {
        console.error('Error fetching products:', error);
    });

    document.getElementById('filterForm').addEventListener('submit', function (e) {
        e.preventDefault();
        applyFilters();
    });

    document.getElementById('filterForm').addEventListener('submit', function (e) {
        e.preventDefault();
        applyFilters();
    });

    function applyFilters() {
        var product = document.getElementById('product').value;
        var startDate = document.getElementById('startDate').value;
        var endDate = document.getElementById('endDate').value;
        var exactDate = document.getElementById('exactDate').value;
        var month = document.getElementById('month').value;
        var groupBy = document.getElementById('groupBy').value;
        var paymentMethod = document.getElementById('paymentMethod').value.toLowerCase();
    
        console.log("Applying filters with values:", {
            product: product,
            startDate: startDate,
            endDate: endDate,
            exactDate: exactDate,
            month: month,
            groupBy: groupBy,
            paymentMethod: paymentMethod
        });
    
        eel.get_filtered_data(product, startDate, endDate, exactDate, month, groupBy, paymentMethod)().then(function (data) {
            console.log('Filtered Data:', data);
            updateCharts(data, product, startDate, endDate, exactDate, month);
            updateTotals(data);
        }).catch(function (error) {
            console.error('Error fetching filtered data:', error);
        });
    }
    
    
    
    

    function updateCharts(data, product, startDate, endDate, exactDate, month) {
        salesChart.data.labels = data.sales.labels;
        salesChart.data.datasets[0].data = data.sales.values;
        salesChart.update();
    
        advancesChart.data.labels = data.advances.labels;
        advancesChart.data.datasets[0].data = data.advances.values;
        advancesChart.update();
    
        if (product && product !== 'all') {
            completedOrdersChart.data.labels = [];
            completedOrdersChart.data.datasets[0].data = [];
            document.getElementById('totalCompletedOrders').textContent = 'Total: 0.00';
        } else {
            completedOrdersChart.data.labels = data.completedOrders.labels;
            completedOrdersChart.data.datasets[0].data = data.completedOrders.values;
            completedOrdersChart.update();
            document.getElementById('totalCompletedOrders').textContent = 'Total: ' + data.completedOrders.values.reduce((a, b) => a + b, 0).toFixed(2);
        }
    
        globalChart.data.labels = data.global.labels;
        globalChart.data.datasets[0].data = data.global.values;
        globalChart.update();
    
        // Update totals
        document.getElementById('totalSales').textContent = 'Total: ' + data.sales.values.reduce((a, b) => a + b, 0).toFixed(2);
        document.getElementById('totalAdvances').textContent = 'Total: ' + data.advances.values.reduce((a, b) => a + b, 0).toFixed(2);
        document.getElementById('totalGlobal').textContent = 'Total: ' + data.global.values.reduce((a, b) => a + b, 0).toFixed(2);
    }
    
    
    
    
    

    function updateTotals(data) {
        // Update Sales Totals in chart-container
        var totalSalesLabel = document.getElementById('totalSales');
        if (totalSalesLabel) {
            var totalSalesValue = data.sales.values.reduce((a, b) => a + b, 0).toFixed(2);
            totalSalesLabel.textContent = 'Total: ' + totalSalesValue;
        }
    
        // Update Advances Totals in chart-container
        var totalAdvancesLabel = document.getElementById('totalAdvances');
        if (totalAdvancesLabel) {
            var totalAdvancesValue = data.advances.values.reduce((a, b) => a + b, 0).toFixed(2);
            totalAdvancesLabel.textContent = 'Total: ' + totalAdvancesValue;
        }
    
        // Update Completed Orders Totals in chart-container
        var totalCompletedOrdersLabel = document.getElementById('totalCompletedOrders');
        if (totalCompletedOrdersLabel) {
            var totalCompletedOrdersValue = data.completedOrders.values.reduce((a, b) => a + b, 0).toFixed(2);
            totalCompletedOrdersLabel.textContent = 'Total: ' + totalCompletedOrdersValue;
        }
    
        // Update Global Totals in chart-container
        var totalGlobalLabel = document.getElementById('totalGlobal');
        if (totalGlobalLabel) {
            var totalGlobalValue = data.global.values.reduce((a, b) => a + b, 0).toFixed(2);
            totalGlobalLabel.textContent = 'Total: ' + totalGlobalValue;
        }
    
        // Update Sales Totals in total-container
        var totalSalesValueElem = document.getElementById('totalSalesValue');
        var totalSalesCashElem = document.getElementById('totalSalesCash');
        var totalSalesTransferElem = document.getElementById('totalSalesTransfer');
    
        if (totalSalesValueElem && totalSalesCashElem && totalSalesTransferElem) {
            totalSalesValueElem.textContent = totalSalesValue;
            totalSalesCashElem.textContent = data.sales.cash.toFixed(2);
            totalSalesTransferElem.textContent = data.sales.transfer.toFixed(2);
        } else {
            console.error('One or more sales total elements not found');
        }
    
        // Update Advances Totals in total-container
        var totalAdvancesValueElem = document.getElementById('totalAdvancesValue');
        var totalAdvancesCashElem = document.getElementById('totalAdvancesCash');
        var totalAdvancesTransferElem = document.getElementById('totalAdvancesTransfer');
    
        if (totalAdvancesValueElem && totalAdvancesCashElem && totalAdvancesTransferElem) {
            totalAdvancesValueElem.textContent = totalAdvancesValue;
            totalAdvancesCashElem.textContent = data.advances.cash.toFixed(2);
            totalAdvancesTransferElem.textContent = data.advances.transfer.toFixed(2);
        } else {
            console.error('One or more advances total elements not found');
        }
    
        // Update Completed Orders Totals in total-container
        var totalCompletedOrdersValueElem = document.getElementById('totalCompletedOrdersValue');
        var totalCompletedOrdersCashElem = document.getElementById('totalCompletedOrdersCash');
        var totalCompletedOrdersTransferElem = document.getElementById('totalCompletedOrdersTransfer');
    
        if (totalCompletedOrdersValueElem && totalCompletedOrdersCashElem && totalCompletedOrdersTransferElem) {
            totalCompletedOrdersValueElem.textContent = totalCompletedOrdersValue;
            totalCompletedOrdersCashElem.textContent = data.completedOrders.cash.toFixed(2);
            totalCompletedOrdersTransferElem.textContent = data.completedOrders.transfer.toFixed(2);
        } else {
            console.error('One or more completed orders total elements not found');
        }
    }
    
    
});

function toggleSidebar() {
    var sidebar = document.getElementById("sidebar");
    var mainContent = document.getElementById("main-content");
    sidebar.classList.toggle("active");
    if (sidebar.classList.contains("active")) {
        mainContent.classList.add("expanded");
    } else {
        mainContent.classList.remove("expanded");
    }
}

function toggleFilters() {
    var filters = document.getElementById("filters");
    filters.classList.toggle("active");
}
