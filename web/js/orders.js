let currentExtras = [];
let selectedProducts = [];
let editingOrderId = null;
let currentPage = 1;
const ordersPerPage = 15;
let orders = [];
let filteredOrders = [];
let orderIdToDelete = null;



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

// ALERTAS
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
    }, 3000); // Eliminar la alerta después de 3 segundos
}
function showConfirmationModal(orderId) {
    orderIdToDelete = orderId;
    document.getElementById('confirmationModal').style.display = 'block';
}

function closeConfirmationModal() {
    document.getElementById('confirmationModal').style.display = 'none';
    orderIdToDelete = null;
}

function openPrintOptionsModal(orderId, deliveryMethod) {
    const printOptionsModal = document.getElementById('printOptionsModal');
    const printTicketButton = document.getElementById('printTicketButton');
    const printDeliveryTicketButton = document.getElementById('printDeliveryTicketButton');
    const closePrintModalButton = document.getElementById('closePrintModalButton');

    printTicketButton.onclick = () => printTicket(orderId);
    if (deliveryMethod === "Envío") {
        printDeliveryTicketButton.style.display = 'block';
        printDeliveryTicketButton.onclick = () => printDeliveryTicket(orderId);
    } else {
        printDeliveryTicketButton.style.display = 'none';
    }
    closePrintModalButton.onclick = () => closePrintOptionsModal();

    printOptionsModal.style.display = 'block';
}
function closePrintOptionsModal() {
    const printOptionsModal = document.getElementById('printOptionsModal');
    printOptionsModal.style.display = 'none';
}

async function confirmDeleteOrder() {
    if (orderIdToDelete) {
        try {
            await eel.delete_order(orderIdToDelete)();
            fetchOrders(); // Refresh the order list
            showAlert('Pedido eliminado con éxito', 'success');
        } catch (error) {
            showAlert('Error al eliminar el pedido', 'error');
            console.error('Error deleting order:', error);
        }
        closeConfirmationModal();
    }
}
function setupWebSocket() {
    try {
        eel._websocket = new WebSocket('ws://localhost:8099/eel?page=' + window.location.pathname.split('/').pop());
        eel._websocket.onopen = function() {
            console.log("WebSocket connection established");
        };

        eel._websocket.onclose = function() {
            console.log("WebSocket connection closed, reconnecting...");
            setTimeout(setupWebSocket, 5000);
        };

        eel._websocket.onerror = function(error) {
            console.error("WebSocket error:", error);
        };
    } catch (error) {
        console.error('Error setting up WebSocket:', error);
    }
}

setupWebSocket();
function goBack() {
    window.history.back();
}

async function fetchOrders() {
    try {
        orders = await eel.get_orders()();
        orders = orders.map(order => {
            return {
                id: order.id,
                customer_name: order.customer_name,
                customer_phone: order.customer_phone,
                products: order.products,
                discount: order.discount,
                total_price: order.total_price,
                down_payment: order.down_payment,
                balance_due: order.balance_due,
                start_date: order.start_date,
                delivery_date: order.delivery_date,
                delivery_method: order.delivery_method,
                department: order.department,
                address: order.address,
                carnet: order.carnet,
                branch: order.branch,
                payment_method: order.payment_method,
                completed: order.completed
            };
        });

        console.log("Transformed orders:", orders);  // Log transformed orders
        orders.reverse(); // Invertir la lista de pedidos
        applyFilters(); // Asegurarse de que se apliquen los filtros
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

async function applyFilters() {
    const filterStatus = document.getElementById('filterStatus').value;
    const filterStartDate = document.getElementById('filterStartDate').value || null;
    const filterEndDate = document.getElementById('filterEndDate').value || null;
    const filterMonth = document.getElementById('filterMonth').value || null;
    const filterDateElement = document.getElementById('filterDate'); // Elemento de fecha
    const filterDate = filterDateElement.value ? filterDateElement.value : null; // Usa la fecha solo si el usuario la establece
    const filterText = document.getElementById('filterText').value.toLowerCase() || "";

    console.log("Applying filters with values: ", { filterDate, filterStartDate, filterEndDate, filterMonth });

    filteredOrders = orders.filter(order => {
        let statusMatch = (filterStatus === 'all') || 
                          (filterStatus === 'completed' && order.completed) || 
                          (filterStatus === 'pending' && !order.completed);

        let startDateMatch = !filterStartDate || new Date(order.start_date) >= new Date(filterStartDate);
        let endDateMatch = !filterEndDate || new Date(order.start_date) <= new Date(filterEndDate);
        let monthMatch = !filterMonth || order.start_date.startsWith(filterMonth);
        let exactDateMatch = !filterDate || order.start_date === filterDate; // Verifica aquí si el valor exacto de la fecha coincide
        let textMatch = !filterText || order.customer_name.toLowerCase().includes(filterText) || order.customer_phone.includes(filterText);

        return statusMatch && startDateMatch && endDateMatch && monthMatch && exactDateMatch && textMatch;
    });

    currentPage = 1;
    displayOrders();
    await fetchAdvanceSummaries(filterDate, filterStartDate, filterEndDate, filterMonth); // Actualizar resúmenes
}

function displayOrders() {
    const orderTable = document.getElementById('orderTable').getElementsByTagName('tbody')[0];
    orderTable.innerHTML = ''; // Clear existing rows

    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const ordersToDisplay = filteredOrders.slice(startIndex, endIndex);

    ordersToDisplay.forEach(order => {
        const row = orderTable.insertRow();
        row.insertCell(0).innerHTML = order.id;
        row.insertCell(1).innerHTML = order.customer_name;
        row.insertCell(2).innerHTML = order.customer_phone;
        row.insertCell(3).innerHTML = order.total_price; // Mostrar el precio total en lugar del adelanto
        row.insertCell(4).innerHTML = order.down_payment;
        const completedCell = row.insertCell(5);
        completedCell.innerHTML = order.completed ? "Sí" : "No";
        completedCell.className = order.completed ? 'completed' : 'pending';

        const actionsCell = row.insertCell(6);
        const editButton = `<button class="edit-btn" onclick="editOrder(${order.id})">Editar</button>`;
        const deleteButton = `<button class="delete-btn" onclick="showConfirmationModal(${order.id})">Eliminar</button>`;
        const toggleButton = `<button class="${order.completed ? 'complete-btn' : 'pending-btn'}" onclick="toggleOrderCompletion(${order.id})">${order.completed ? "Entregado" : "Pendiente"}</button>`;

        actionsCell.innerHTML = `${editButton} ${deleteButton} ${toggleButton}`;
    });

    document.getElementById('currentPage').innerText = currentPage;
    document.getElementById('prevPage').disabled = (currentPage === 1);
    document.getElementById('nextPage').disabled = (endIndex >= filteredOrders.length);
}


function changePage(direction) {
    currentPage += direction;
    displayOrders();
}

function resetDeliveryOptions() {
    document.getElementById('deliveryMethod').value = "Entrega en Tienda";
    document.getElementById('deliveryOptionsContainer').innerHTML = '';
}

function openOrderModal() {
    document.getElementById('modalTitle').innerText = 'Nuevo Pedido';
    document.getElementById('orderForm').reset();
    document.getElementById('startDate').value = new Date().toISOString().split('T')[0];
    selectedProducts = [];
    currentExtras = [];
    document.getElementById('extrasContainer').innerHTML = '';
    updateSelectedProductsTable();
    editingOrderId = null;
    resetDeliveryOptions();
    document.getElementById('paymentMethod').value = 'Efectivo';
    document.getElementById('orderModal').style.display = 'block';
    document.getElementById('productQuantity').removeAttribute('required');
    
    const productCombo = document.getElementById('productCombo');
    productCombo.value = '';  // Reset the product combo to default value
    
    const qrCodeImg = document.getElementById('qrCode');
    const defaultImgUrl = 'img/charger.gif';
    qrCodeImg.src = defaultImgUrl;
    qrCodeImg.alt = "Código QR";

    // Hide the print buttons for a new order
    document.getElementById('printTicketButton').style.display = 'none';
    document.getElementById('printDeliveryTicketButton').style.display = 'none';
}


function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
    resetDeliveryOptions();
}

async function printDeliveryTicket(orderId) {
    try {
        console.log("Fetching order by id:", orderId); 
        const order = await eel.get_order_by_id(orderId)();
        console.log("Order data:", order);  
        if (!order) {
            throw new Error('Order data is null or undefined');
        }

        // Obtener la ruta de la imagen optimizada
        const ticketImagePath = await eel.print_delivery_ticket(JSON.stringify(order))();
        if (!ticketImagePath) {
            throw new Error('Failed to generate delivery ticket image');
        }

        // Crear una URL completa para la imagen
        const fullImagePath = window.location.origin + ticketImagePath;

        // Crear una nueva ventana para la impresión
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Print Delivery Ticket</title>
                <style>
                    @page { 
                        size: 7cm auto; /* Configurar el tamaño del papel a 7 cm de ancho */
                        margin: 0; /* Sin márgenes */
                    }
                    body {
                        margin: 0; /* Sin márgenes */
                        display: flex;
                        justify-content: center; /* Centrar la imagen horizontalmente */
                        align-items: flex-start; /* Alinear la imagen al borde superior */
                        height: 100vh; /* Alto completo */
                        padding-top: 0; /* Asegurar que la imagen comience desde la parte superior */
                    }
                    img {
                        width: 7cm; /* Ancho de la imagen a 7 cm */
                        height: auto; /* Mantener la proporción */
                        display: block;
                        image-rendering: crisp-edges; /* Asegurar que la imagen se imprima con bordes nítidos */
                        image-rendering: pixelated; /* Evitar el suavizado de la imagen */
                    }
                </style>
            </head>
            <body>
                <img src="${fullImagePath}" onload="window.print(); window.close();" />
            </body>
            </html>
        `);
        printWindow.document.close();

    } catch (error) {
        console.error('Error printing delivery ticket:', error);
    }
}

async function printTicket(orderId) {
    try {
        console.log("Fetching order by id:", orderId); 
        const order = await eel.get_order_by_id(orderId)();
        console.log("Order data:", order);  
        if (!order) {
            throw new Error('Order data is null or undefined');
        }

        // Añadir el order_id al objeto de pedido
        order.order_id = orderId;

        // Obtener la ruta de la imagen optimizada
        const ticketImagePath = await eel.print_ticket(JSON.stringify(order))();
        if (!ticketImagePath) {
            throw new Error('Failed to generate ticket image');
        }

        // Crear una URL completa para la imagen
        const fullImagePath = window.location.origin + ticketImagePath;

        // Crear una nueva ventana para la impresión
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Print Ticket</title>
                <style>
                    @page { 
                        size: 7cm auto; /* Configurar el tamaño del papel a 7 cm de ancho */
                        margin: 0; /* Sin márgenes */
                    }
                    body {
                        margin: 0; /* Sin márgenes */
                        display: flex;
                        justify-content: center; /* Centrar la imagen horizontalmente */
                        align-items: flex-start; /* Alinear la imagen al borde superior */
                        height: 100vh; /* Alto completo */
                        padding-top: 0; /* Asegurar que la imagen comience desde la parte superior */
                    }
                    img {
                        width: 7cm; /* Ancho de la imagen a 7 cm */
                        height: auto; /* Mantener la proporción */
                        display: block;
                        image-rendering: crisp-edges; /* Asegurar que la imagen se imprima con bordes nítidos */
                        image-rendering: pixelated; /* Evitar el suavizado de la imagen */
                    }
                </style>
            </head>
            <body>
                <img src="${fullImagePath}" onload="window.print(); window.close();" />
            </body>
            </html>
        `);
        printWindow.document.close();

    } catch (error) {
        console.error('Error printing ticket:', error);
    }
}
async function fetchAdvanceSummaries(filterDate, filterStartDate, filterEndDate, filterMonth) {
    try {
        console.log("Fetching advance summaries with filters:", {
            filterDate,
            filterStartDate,
            filterEndDate,
            filterMonth
        });

        const summaries = await eel.fetch_advance_summaries(
            filterDate,
            filterStartDate,
            filterEndDate,
            filterMonth
        )();

        console.log("Received summaries:", summaries);

        // Update the advance summary labels
        document.getElementById("dailyAdvances").innerText = `${summaries.daily_advance} Bs`;
        document.getElementById("weeklyAdvances").innerText = `${summaries.weekly_advance} Bs`;
        document.getElementById("monthlyAdvances").innerText = `${summaries.monthly_advance} Bs`;
        document.getElementById("annualAdvances").innerText = `${summaries.annual_advance} Bs`;
        document.getElementById("cashAdvances").innerText = `${summaries.cash_advance} Bs`;
        document.getElementById("transferAdvances").innerText = `${summaries.transfer_advance} Bs`;
        document.getElementById("totalAdvances").innerText = `${summaries.total_advance} Bs`;
    } catch (error) {
        console.error("Error fetching advance summaries:", error);
    }
}



async function saveOrder() {
    // Recoger datos del formulario
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const totalPrice = parseFloat(document.getElementById('totalPrice').value) || 0;
    const advance = parseFloat(document.getElementById('advance').value) || 0;
    const balance = parseFloat(document.getElementById('balance').value) || 0;
    const deliveryDate = document.getElementById('deliveryDate').value;
    const deliveryMethod = document.getElementById('deliveryMethod').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const startDate = document.getElementById('startDate').value;
    let department = "", address = "", carnet = "", branch = "";

    if (deliveryMethod === "Envío") {
        department = document.getElementById('department').value;
        address = document.getElementById('address').value;
        carnet = document.getElementById('carnet').value;
        branch = document.getElementById('branch').value;
    }

    // Construir el objeto de datos de pedido
    const orderData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        products: selectedProducts.map(product => ({
            product_id: product.product_id,
            product: product.product,
            extras: product.extras.map(extra => ({
                extra_id: extra.extra_id || extra.id, // Usar extra_id si está disponible, si no usar id
                name: extra.name,
                price: extra.price,
                quantity: extra.quantity
            })),
            quantity: product.quantity,
            price: product.price
        })),
        discount: discount,
        total_price: totalPrice,
        down_payment: advance,
        balance_due: balance,
        start_date: startDate,
        delivery_date: deliveryDate,
        payment_method: paymentMethod,
        delivery_method: deliveryMethod,
        department: department,
        address: address,
        carnet: carnet,
        branch: branch,
        completed: false  // Marcar como pendiente
    };

    // Enviar el objeto de datos de pedido al backend
    try {
        let orderId;
        if (editingOrderId) {
            orderData.id = editingOrderId;
            await eel.update_order(JSON.stringify(orderData))();
            orderId = editingOrderId;
            showAlert('Pedido actualizado con éxito', 'success');
            openPrintOptionsModal(orderId, deliveryMethod);
        } else {
            const quantity = parseFloat(document.getElementById('productQuantity').value);
            if (!selectedProducts.length && isNaN(quantity)) {
                showAlert('Por favor, agregue al menos un producto.', 'error');
                return;
            }
            orderId = await eel.add_order(JSON.stringify(orderData))();
            showAlert('Pedido guardado con éxito', 'success');
            const qrFilename = await eel.generate_qr_code2(orderId)();
            const qrLink = `http://localhost:8099/mark_as_completed?order_id=${qrFilename}`;
            console.log("QR code link:", qrLink); 
            
            showAlert(`Pedido guardado con éxito. Verifica el enlace QR: ${qrLink}`, 'success');
            await handlePrinting(orderId, deliveryMethod);
        }

        closeOrderModal();
        fetchOrders();
    } catch (error) {
        console.error('Error al guardar el pedido:', error);
    }
}







async function handlePrinting(orderId, deliveryMethod) {
    try {
        // Imprimir el ticket principal
        await printTicket(orderId);
        
        // Esperar un breve período para asegurarse de que la primera impresión se complete
        await waitForPrint();

        // Imprimir el ticket de entrega si es necesario
        if (deliveryMethod === "Envío") {
            await printDeliveryTicket(orderId);
        }
    } catch (error) {
        console.error('Error during printing:', error);
    }
}

function waitForPrint() {
    return new Promise(resolve => {
        // Esperar 3 segundos para asegurarse de que la impresión se haya completado
        setTimeout(resolve,3000);
    });
}

async function editOrder(orderId) {
    try {
        const order = await eel.get_order_by_id(orderId)();
        console.log('Order fetched for edit:', order);

        document.getElementById('modalTitle').innerText = 'Editar Pedido';
        document.getElementById('customerName').value = order.customer_name;
        document.getElementById('customerPhone').value = order.customer_phone;
        document.getElementById('discount').value = order.discount;
        document.getElementById('totalPrice').value = order.total_price;
        document.getElementById('advance').value = order.down_payment;
        document.getElementById('balance').value = order.balance_due;
        document.getElementById('deliveryDate').value = order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '';
        document.getElementById('startDate').value = order.start_date ? new Date(order.start_date).toISOString().split('T')[0] : '';
        document.getElementById('deliveryMethod').value = order.delivery_method;
        document.getElementById('paymentMethod').value = order.payment_method || 'Transferencia';

        // Clear selected products and extras
        selectedProducts = [];
        currentExtras = [];
        document.getElementById('extrasContainer').innerHTML = '';

        // Load selected products
        selectedProducts = order.products.map(product => {
            console.log('Processing product:', product);
            const uniqueExtras = [];
            const extraIds = new Set();

            product.extras.forEach(extra => {
                if (!extraIds.has(extra.extra_id)) {
                    extraIds.add(extra.extra_id);
                    uniqueExtras.push({ ...extra });
                }
            });

            return {
                product_id: product.product_id,
                product: product.product_name,
                extras: uniqueExtras,
                quantity: product.quantity,
                price: product.price
            };
        });

        console.log('Selected products after processing:', selectedProducts);

        // Update the product combo box and extras
        updateSelectedProductsTable();

        if (order.delivery_method === "Envío") {
            toggleDeliveryOptions();
            document.getElementById('department').value = order.department;
            document.getElementById('address').value = order.address;
            document.getElementById('carnet').value = order.carnet;
            document.getElementById('branch').value = order.branch;
        } else {
            resetDeliveryOptions();
        }

        editingOrderId = orderId;
        document.getElementById('orderModal').style.display = 'block';
        document.getElementById('productQuantity').removeAttribute('required');
        updateQRCode();
        document.getElementById('printTicketButton').style.display = 'block';
        document.getElementById('printDeliveryTicketButton').style.display = (order.delivery_method === "Envío") ? 'block' : 'none';
    } catch (error) {
        console.error('Error editing order:', error);
    }
}





async function updateProductExtras() {
    const productCombo = document.getElementById('productCombo');
    productCombo.value = '';  // Reset the product combo to default value

    if (selectedProducts.length > 0) {
        const firstProduct = selectedProducts[0];
        productCombo.value = firstProduct.product;  // Set the combo to the first product

        // Load the extras for the first product
        await loadExtras(firstProduct.product);

        // Select the extras that are part of the order
        const extrasContainer = document.getElementById('extrasContainer');
        firstProduct.extras.forEach(extra => {
            const checkbox = extrasContainer.querySelector(`input[type="checkbox"][value="${extra.name}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
}






async function deleteOrder(orderId) {
    try {
        await eel.delete_order(orderId)();
        fetchOrders(); 
    } catch (error) {
        console.error('Error deleting order:', error);
    }
}

async function toggleOrderCompletion(orderId) {
    try {
        await eel.toggle_order_completion(orderId)();
        fetchOrders(); 
        showAlert('Estado del pedido actualizado con éxito', 'success');
    } catch (error) {
        showAlert('Error al actualizar el estado del pedido', 'error');
        console.error('Error toggling order completion:', error);
    }
}

async function loadExtras(productName) {
    try {
        if (!productName) return;
        const extras = await eel.get_extras_by_product_name(productName)();
        const extrasContainer = document.getElementById('extrasContainer');
        extrasContainer.innerHTML = '';

        extras.forEach(extra => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `extra_${extra.name}`;
            checkbox.value = extra.name;
            checkbox.dataset.price = extra.price;
            checkbox.dataset.id = extra.extra_id; // Asegúrate de que el ID del extra se asigna aquí

            const label = document.createElement('label');
            label.htmlFor = `extra_${extra.name}`;
            label.innerText = `${extra.name} (${extra.price} Bs)`;

            const div = document.createElement('div');
            div.appendChild(label);
            div.appendChild(checkbox);

            extrasContainer.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading extras:', error);
    }
}






document.getElementById('productCombo').addEventListener('change', function() {
    const productName = this.value;
    loadExtras(productName);
});

async function addProduct() {
    const productCombo = document.getElementById('productCombo');
    const productName = productCombo.value;
    const productID = productCombo.selectedOptions[0].dataset.id;
    const quantityInput = document.getElementById('productQuantity');
    const quantity = parseFloat(quantityInput.value);

    if (!productName || (!editingOrderId && isNaN(quantity))) {
        showAlert('Por favor, ingrese un producto y una cantidad válidos.', 'error');
        return;
    }

    const selectedExtras = [];
    const extrasContainer = document.getElementById('extrasContainer');
    extrasContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(extra => {
        selectedExtras.push({
            extra_id: parseInt(extra.dataset.id, 10),  // Asegúrate de que el ID del extra se pasa correctamente como entero
            name: extra.value,
            price: parseFloat(extra.dataset.price),
            quantity: 1
        });
    });

    const productPrice = parseFloat(productCombo.selectedOptions[0].dataset.price);
    const extrasPrice = selectedExtras.reduce((total, extra) => total + extra.price, 0);
    const totalPrice = (productPrice + extrasPrice) * quantity;

    const newProduct = {
        product: productName,
        product_id: productID,
        extras: selectedExtras,
        quantity: quantity,
        price: totalPrice
    };

    // Aquí aseguramos que cada producto, incluso con el mismo nombre, se maneje como una entrada única
    selectedProducts.push(newProduct);

    updateSelectedProductsTable();
    updateTotalPrice();
    showAlert('Producto agregado con éxito', 'success');
    quantityInput.value = '';
}








function updateSelectedProductsTable() {
    const selectedProductsTable = document.getElementById('selectedProductsTable').getElementsByTagName('tbody')[0];
    selectedProductsTable.innerHTML = '';

    selectedProducts.forEach((product, index) => {
        console.log('Updating table for product:', product);

        const row = selectedProductsTable.insertRow();
        row.insertCell(0).innerHTML = product.product;
        row.insertCell(1).innerHTML = product.extras.map(extra => `${extra.name} (${extra.price} Bs)`).join(', ');
        row.insertCell(2).innerHTML = product.quantity;
        row.insertCell(3).innerHTML = product.price;
        row.insertCell(4).innerHTML = `<button onclick="removeProduct(${index})">Eliminar</button>`;
    });

    console.log('Selected products table updated:', selectedProducts);
}


function removeProduct(index) {
    selectedProducts.splice(index, 1);
    updateSelectedProductsTable();
    updateTotalPrice();
}

function updateTotalPrice() {
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const totalPrice = selectedProducts.reduce((total, product) => total + product.price, 0) - discount;
    document.getElementById('totalPrice').value = totalPrice.toFixed(2);
    updateBalance();
}

function updateBalance() {
    const totalPrice = parseFloat(document.getElementById('totalPrice').value) || 0;
    const advance = parseFloat(document.getElementById('advance').value) || 0;
    const balance = totalPrice - advance;
    document.getElementById('balance').value = balance.toFixed(2);
}

function toggleDeliveryOptions() {
    const deliveryMethod = document.getElementById('deliveryMethod').value;
    const deliveryOptionsContainer = document.getElementById('deliveryOptionsContainer');
    const printDeliveryTicketButton = document.getElementById('printDeliveryTicketButton');
    
    if (deliveryMethod === "Envío") {
        deliveryOptionsContainer.innerHTML = `
            <div class="modal-column">
                <label for="department">Departamento:</label>
                <select id="department" name="department" required>
                    <option value="La Paz">La Paz</option>
                    <option value="Cochabamba">Cochabamba</option>
                    <option value="Santa Cruz">Santa Cruz</option>
                    <option value="Oruro">Oruro</option>
                    <option value="Potosí">Potosí</option>
                    <option value="Chuquisaca">Chuquisaca</option>
                    <option value="Tarija">Tarija</option>
                    <option value="Beni">Beni</option>
                    <option value="Sucre">Sucre</option>
                    <option value="Pando">Pando</option>
                </select>
            </div>
            <div class="modal-column">
                <label for="address">Dirección:</label>
                <input type="text" id="address" name="address">
            </div>
            <div class="modal-column">
                <label for="carnet">Carnet:</label>
                <input type="text" id="carnet" name="carnet">
            </div>
            <div class="modal-column">
                <label for="branch">Sucursal:</label>
                <input type="text" id="branch" name="branch">
            </div>
        `;
        printDeliveryTicketButton.style.display = 'block';
    } else {
        deliveryOptionsContainer.innerHTML = '';
        printDeliveryTicketButton.style.display = 'none';
    }
}

async function updateQRCode() {
    const customerPhone = document.getElementById('customerPhone').value;
    const qrCodeImg = document.getElementById('qrCode');
    const defaultImgUrl = 'img/charger.gif'; 

    if (!customerPhone) {
        qrCodeImg.src = defaultImgUrl;
        return;
    }
    try {
        const qrUrl = await eel.generate_qr_code(customerPhone)();
        if (qrUrl) {
            qrCodeImg.src = qrUrl;
        } else {
            qrCodeImg.src = defaultImgUrl;
        }
    } catch (error) {
        console.error('Error generating QR code:', error);
        qrCodeImg.src = defaultImgUrl; 
    }
}

document.getElementById('customerPhone').addEventListener('input', updateQRCode);

async function loadInitialData() {
    try {
        const productCombo = document.getElementById('productCombo');
        const products = await eel.get_products2()();
        
        console.log("Products:", products);

        for (let product of products) {
            const productName = product.name;
            const price = await eel.get_product_price_by_name(productName)();
            console.log(`Product: ${productName}, Price: ${price}`);

            const option = document.createElement('option');
            option.value = productName;
            option.text = productName;
            option.dataset.price = price;
            option.dataset.id = product.id; // Add product ID for use in addProduct function
            productCombo.appendChild(option);
        }

        await fetchOrders(); // Ensure orders are fetched correctly
        await fetchAdvanceSummaries(); // Llamar a la función aquí al cargar la página
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}


document.getElementById('productCombo').addEventListener('change', function() {
    const productName = this.value;
    loadExtras(productName);
});


async function calculateAdvances(filterDate, filterStartDate, filterEndDate, filterMonth, filterText) {
    const now = new Date();
    let startOfDay, endOfDay;

    if (filterDate) {
        startOfDay = new Date(filterDate);
        startOfDay.setHours(0, 0, 0, 0);
        endOfDay = new Date(filterDate);
        endOfDay.setHours(23, 59, 59, 999);
    } else {
        startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startOfDay.setHours(0, 0, 0, 0);
        endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endOfDay.setHours(23, 59, 59, 999);
    }

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfYear = new Date(startOfDay.getFullYear(), 0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    console.log('filterDate:', filterDate);
    console.log('startOfDay:', startOfDay);
    console.log('endOfDay:', endOfDay);
    console.log('startOfWeek:', startOfWeek);
    console.log('startOfMonth:', startOfMonth);
    console.log('startOfYear:', startOfYear);

    let dailyAdvances = 0, weeklyAdvances = 0, monthlyAdvances = 0, annualAdvances = 0;
    let transferAdvances = 0, cashAdvances = 0, totalAdvances = 0;

    const orders = await eel.fetch_orders()();
    
    orders.forEach(order => {
        const orderDate = new Date(order.start_date); // Asegúrate de que estamos obteniendo la fecha correcta del pedido
        orderDate.setHours(0, 0, 0, 0);
        const orderTimestamp = orderDate.getTime();
        
        console.log('orderDate:', orderDate, 'orderTimestamp:', orderTimestamp);
        
        if (orderTimestamp >= startOfDay.getTime() && orderTimestamp <= endOfDay.getTime()) {
            console.log(`Matched daily advance for order:`, order);
            dailyAdvances += order.down_payment; // Asegúrate de que estamos obteniendo el avance correcto del pedido
        } else {
            console.log(`Order did not match daily advance:`, order);
        }

        if (orderTimestamp >= startOfWeek.getTime() && orderTimestamp <= endOfDay.getTime()) {
            weeklyAdvances += order.down_payment;
            console.log(`Matched weekly advance for order:`, order);
        }

        if (orderTimestamp >= startOfMonth.getTime() && orderTimestamp <= endOfDay.getTime()) {
            monthlyAdvances += order.down_payment;
            console.log(`Matched monthly advance for order:`, order);
        }

        if (orderTimestamp >= startOfYear.getTime() && orderTimestamp <= endOfDay.getTime()) {
            annualAdvances += order.down_payment;
            console.log(`Matched annual advance for order:`, order);
        }

        if (order.payment_method === 'Transferencia') {
            transferAdvances += order.down_payment;
        } else if (order.payment_method === 'Efectivo') {
            cashAdvances += order.down_payment;
        }

        totalAdvances += order.down_payment;
    });


    document.getElementById('dailyAdvances').innerText = `${dailyAdvances} Bs`;
    document.getElementById('weeklyAdvances').innerText = `${weeklyAdvances} Bs`;
    document.getElementById('monthlyAdvances').innerText = `${monthlyAdvances} Bs`;
    document.getElementById('annualAdvances').innerText = `${annualAdvances} Bs`;
    document.getElementById('transferAdvances').innerText = `${transferAdvances} Bs`;
    document.getElementById('cashAdvances').innerText = `${cashAdvances} Bs`;
    document.getElementById('totalAdvances').innerText = `${totalAdvances} Bs`;

    console.log('dailyAdvances final:', dailyAdvances);
    console.log('weeklyAdvances final:', weeklyAdvances);
    console.log('monthlyAdvances final:', monthlyAdvances);
    console.log('annualAdvances final:', annualAdvances);
    console.log('transferAdvances final:', transferAdvances);
    console.log('cashAdvances final:', cashAdvances);
    console.log('totalAdvances final:', totalAdvances);
}

document.getElementById('filterStatus').addEventListener('change', applyFilters);
document.getElementById('filterStartDate').addEventListener('input', applyFilters);
document.getElementById('filterEndDate').addEventListener('input', applyFilters);
document.getElementById('filterMonth').addEventListener('input', applyFilters);
document.getElementById('filterDate').addEventListener('input', applyFilters);
document.getElementById('filterText').addEventListener('input', applyFilters);
document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
document.getElementById('nextPage').addEventListener('click', () => changePage(1));
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    applyFilters(); // Llamar a applyFilters al cargar la página
});