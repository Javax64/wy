async function fetchDashboardData() {
    try {
        const [totalSales, monthlySales, weeklySales, dailySales, annualSales, topProducts, orderStatus, topCustomers, paymentMethods] = await Promise.all([
            eel.get_total_sales_exposed()(),
            eel.get_monthly_sales_exposed()(),
            eel.get_weekly_sales_exposed()(),
            eel.get_daily_sales_exposed()(),
            eel.get_annual_sales_exposed()(),
            eel.get_top_products_exposed()(),
            eel.get_order_status_exposed()(),
            eel.get_top_customers_exposed()(),
            eel.get_payment_methods_exposed()()
        ]);

        console.log('Fetched topCustomers:', topCustomers); // Debugging line
        console.log('Fetched paymentMethods:', paymentMethods); // Debugging line

        document.getElementById('totalSales').textContent = `Bs ${totalSales.toFixed(2)}`;
        document.getElementById('completedOrders').textContent = orderStatus.completed;
        document.getElementById('pendingOrders').textContent = orderStatus.pending;

        renderMonthlySalesChart(monthlySales);
        renderWeeklySalesChart(weeklySales);
        renderDailySalesChart(dailySales);
        renderAnnualSalesChart(annualSales);
        renderTopProductsChart(topProducts);
        renderOrderStatusChart(orderStatus);
        renderTopCustomersChart(topCustomers);
        renderPaymentMethodsChart(paymentMethods);

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

function renderMonthlySalesChart(monthlySales) {
    const ctx = document.getElementById('monthlySalesChart');
    if (!ctx) {
        console.error('Element with id "monthlySalesChart" not found.');
        return;
    }
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: monthlySales.months,
            datasets: [{
                label: 'Ventas Mensuales',
                data: monthlySales.sales,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Ventas Mensuales'
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutBounce'
            }
        }
    });
}

function renderWeeklySalesChart(weeklySales) {
    const ctx = document.getElementById('weeklySalesChart');
    if (!ctx) {
        console.error('Element with id "weeklySalesChart" not found.');
        return;
    }
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: weeklySales.weeks,
            datasets: [{
                label: 'Ventas Semanales',
                data: weeklySales.sales,
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Ventas Semanales'
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutBounce'
            }
        }
    });
}

function renderDailySalesChart(dailySales) {
    const ctx = document.getElementById('dailySalesChart');
    if (!ctx) {
        console.error('Element with id "dailySalesChart" not found.');
        return;
    }
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: dailySales.dates,
            datasets: [{
                label: 'Ventas Diarias',
                data: dailySales.sales,
                backgroundColor: 'rgba(255, 159, 64, 0.6)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Ventas Diarias'
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutBounce'
            }
        }
    });
}

function renderAnnualSalesChart(annualSales) {
    const ctx = document.getElementById('annualSalesChart');
    if (!ctx) {
        console.error('Element with id "annualSalesChart" not found.');
        return;
    }
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: annualSales.years,
            datasets: [{
                label: 'Ventas Anuales',
                data: annualSales.sales,
                backgroundColor: 'rgba(255, 206, 86, 0.6)',
                borderColor: 'rgba(255, 206, 86, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Ventas Anuales'
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutBounce'
            }
        }
    });
}

function renderOrderStatusChart(orderStatus) {
    const ctx = document.getElementById('orderStatusChart');
    if (!ctx) {
        console.error('Element with id "orderStatusChart" not found.');
        return;
    }
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Completados', 'Pendientes'],
            datasets: [{
                data: [orderStatus.completed, orderStatus.pending],
                backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'],
                borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Estado de los Pedidos'
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutBounce'
            }
        }
    });
}

function renderTopProductsChart(topProducts) {
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) {
        console.error('Element with id "topProductsChart" not found.');
        return;
    }
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: topProducts.products,
            datasets: [{
                label: 'Productos Más Vendidos',
                data: topProducts.sales,
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Productos Más Vendidos'
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutBounce'
            }
        }
    });
}

function renderTopCustomersChart(topCustomers) {
    const ctx = document.getElementById('topCustomersChart');
    if (!ctx) {
        console.error('Element with id "topCustomersChart" not found.');
        return;
    }
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: topCustomers.customers,
            datasets: [{
                label: 'Clientes Principales',
                data: topCustomers.orders,
                backgroundColor: 'rgba(255, 206, 86, 0.6)',
                borderColor: 'rgba(255, 206, 86, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Clientes Principales'
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutBounce'
            }
        }
    });
}

function renderPaymentMethodsChart(paymentMethods) {
    const ctx = document.getElementById('paymentMethodsChart');
    if (!ctx) {
        console.error('Element with id "paymentMethodsChart" not found.');
        return;
    }
    new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: paymentMethods.methods,
            datasets: [{
                data: paymentMethods.amounts,
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(153, 102, 255, 0.6)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Métodos de Pago'
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutBounce'
            }
        }
    });
}
function showDetails(elementId) {
    const content = document.getElementById(elementId).innerHTML;
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = `<span class="close" onclick="closeModal()">&times;</span>` + content;
    const modal = document.getElementById('detailsModal');
    modal.style.display = "block";
}

function closeModal() {
    const modal = document.getElementById('detailsModal');
    modal.style.display = "none";
}

// Close the modal when the user clicks anywhere outside of the modal
window.onclick = function(event) {
    const modal = document.getElementById('detailsModal');
    if (event.target === modal) {
        modal.style.display = "none";
    }
}


fetchDashboardData();
