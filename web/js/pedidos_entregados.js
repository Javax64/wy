let currentPage = 1;
const ordersPerPage = 15;
let orders = [];
let filteredOrders = [];

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

function showAlert(message, type = 'error') {
    const alertsContainer = document.getElementById('alertsContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerText = message;
    alertsContainer.appendChild(alert);
    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => {
            alert.remove();
        }, 600);
    }, 3000);
}

async function fetchOrders() {
    try {
        orders = await eel.get_completed_orders2()();
        orders.reverse();
        applyFilters();
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

function applyFilters() {
    const filterStartDate = document.getElementById('filterStartDate').value;
    const filterEndDate = document.getElementById('filterEndDate').value;
    const filterMonth = document.getElementById('filterMonth').value;
    const filterDate = document.getElementById('filterDate').value;
    const filterText = document.getElementById('filterText').value.toLowerCase();

    console.log(`Applying filters - StartDate: ${filterStartDate}, EndDate: ${filterEndDate}, Month: ${filterMonth}, Date: ${filterDate}, Text: ${filterText}`);

    filteredOrders = orders.filter(order => {
        let startDateMatch = !filterStartDate || new Date(order.delivery_date) >= new Date(filterStartDate);
        let endDateMatch = !filterEndDate || new Date(order.delivery_date) <= new Date(filterEndDate);
        let monthMatch = !filterMonth || order.delivery_date.startsWith(filterMonth);
        let exactDateMatch = !filterDate || order.delivery_date === filterDate;
        let textMatch = !filterText || order.customer_name.toLowerCase().includes(filterText) || order.customer_phone.includes(filterText);

        return startDateMatch && endDateMatch && monthMatch && exactDateMatch && textMatch;
    });

    currentPage = 1;
    displayOrders();
    calculateSales(filterDate, filterStartDate, filterEndDate, filterMonth, filterText);
}

function displayOrders() {
    const orderTable = document.getElementById('orderTable').getElementsByTagName('tbody')[0];
    orderTable.innerHTML = '';

    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const ordersToDisplay = filteredOrders.slice(startIndex, endIndex);

    ordersToDisplay.forEach(order => {
        const row = orderTable.insertRow();
        row.insertCell(0).innerHTML = order.id;
        row.insertCell(1).innerHTML = order.customer_name;
        row.insertCell(2).innerHTML = order.customer_phone;
        row.insertCell(3).innerHTML = order.total_price;
        row.insertCell(4).innerHTML = order.balance_due;
        row.insertCell(5).innerHTML = order.delivery_date;
        row.insertCell(6).innerHTML = order.payment_method;
    });

    document.getElementById('currentPage').innerText = currentPage;
    document.getElementById('prevPage').disabled = (currentPage === 1);
    document.getElementById('nextPage').disabled = (endIndex >= filteredOrders.length);
}

function changePage(direction) {
    currentPage += direction;
    displayOrders();
}

async function calculateSales(filterDate, filterStartDate, filterEndDate, filterMonth, filterText) {
    const now = new Date();
    let startOfDay;

    if (filterDate) {
        const dateParts = filterDate.split('-');
        startOfDay = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    } else {
        startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfYear = new Date(startOfDay.getFullYear(), 0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    console.log('filterDate:', filterDate);
    console.log('startOfDay:', startOfDay);
    console.log('startOfWeek:', startOfWeek);
    console.log('startOfMonth:', startOfMonth);
    console.log('startOfYear:', startOfYear);

    let dailySales = 0, weeklySales = 0, monthlySales = 0, annualSales = 0;
    let transferSales = 0, cashSales = 0, totalSales = 0;

    filteredOrders.forEach(order => {
        const orderDate = new Date(order.delivery_date);
        orderDate.setHours(0, 0, 0, 0);
        const balanceDue = parseFloat(order.balance_due) || 0;

        console.log('orderDate:', orderDate);
        console.log('balanceDue:', balanceDue);

        totalSales += balanceDue;

        if (orderDate.getTime() === startOfDay.getTime()) {
            dailySales += balanceDue;
            console.log('dailySales updated:', dailySales);
        }

        if (orderDate >= startOfWeek) weeklySales += balanceDue;
        if (orderDate >= startOfMonth) monthlySales += balanceDue;
        if (orderDate >= startOfYear) annualSales += balanceDue;
        if (order.payment_method === 'Transferencia') transferSales += balanceDue;
        if (order.payment_method === 'Efectivo') cashSales += balanceDue;
    });

    console.log('dailySales final:', dailySales);
    console.log('weeklySales final:', weeklySales);
    console.log('monthlySales final:', monthlySales);
    console.log('annualSales final:', annualSales);
    console.log('transferSales final:', transferSales);
    console.log('cashSales final:', cashSales);
    console.log('totalSales final:', totalSales);

    document.getElementById('dailySales').innerText = dailySales.toFixed(2) + ' Bs';
    document.getElementById('weeklySales').innerText = weeklySales.toFixed(2) + ' Bs';
    document.getElementById('monthlySales').innerText = monthlySales.toFixed(2) + ' Bs';
    document.getElementById('annualSales').innerText = annualSales.toFixed(2) + ' Bs';
    document.getElementById('transferSales').innerText = transferSales.toFixed(2) + ' Bs';
    document.getElementById('cashSales').innerText = cashSales.toFixed(2) + ' Bs';
    document.getElementById('totalSales').innerText = totalSales.toFixed(2) + ' Bs';
}



document.getElementById('filterStartDate').addEventListener('input', applyFilters);
document.getElementById('filterEndDate').addEventListener('input', applyFilters);
document.getElementById('filterMonth').addEventListener('input', applyFilters);
document.getElementById('filterDate').addEventListener('input', applyFilters);
document.getElementById('filterText').addEventListener('input', applyFilters);

document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
document.getElementById('nextPage').addEventListener('click', () => changePage(1));

fetchOrders();
