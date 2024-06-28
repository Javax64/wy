async function fetchData() {
    try {
        const totalSales = await eel.get_total_sales()();
        const monthlySales = await eel.get_monthly_sales()();
        const topProducts = await eel.get_top_products()();

        document.getElementById('totalTarget').innerText = `$${totalSales.totalTarget}`;
        document.getElementById('totalActual').innerText = `$${totalSales.totalActual}`;

        createActivityChart();
        createMonthlySalesChart(monthlySales);
        createPipelineChart();
        createQuotaChart();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function createActivityChart() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['John', 'Jane', 'Alex', 'Chris'],
            datasets: [{
                label: 'Meeting',
                data: [30, 20, 40, 50],
                backgroundColor: '#007BFF'
            }, {
                label: 'Call summary',
                data: [20, 30, 20, 40],
                backgroundColor: '#28a745'
            }, {
                label: 'Demo',
                data: [40, 30, 50, 30],
                backgroundColor: '#ffc107'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

function createMonthlySalesChart(data) {
    const ctx = document.getElementById('monthlySalesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Ventas Mensuales',
                data: data.values,
                backgroundColor: '#28a745'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function createPipelineChart() {
    const ctx = document.getElementById('pipelineChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Lead', 'Proposal', 'Negotiation'],
            datasets: [{
                data: [115, 90, 56],
                backgroundColor: ['#007BFF', '#ffc107', '#28a745']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

function createQuotaChart() {
    const ctx = document.getElementById('quotaChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['John', 'Jane', 'Alex', 'Chris'],
            datasets: [{
                label: 'Quota',
                data: [300, 400, 320, 280],
                backgroundColor: '#17a2b8'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', fetchData);
