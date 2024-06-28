function setupWebSocket() {
    try {
        eel._websocket = new WebSocket('ws://localhost:8000/eel?page=' + window.location.pathname.split('/').pop());
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

"setupWebSocket();"
function openProducts() {
    window.location.href = 'products.html';
}

function openOrders() {
    window.location.href = 'orders.html';
}

function openReports() {
    window.location.href = 'reports.html';
}

async function fetchProducts() {
    const products = await eel.get_products()();
    const productTable = document.getElementById('productTable').getElementsByTagName('tbody')[0];

    productTable.innerHTML = ''; // Clear existing rows

    products.forEach(product => {
        const row = productTable.insertRow();
        row.insertCell(0).innerHTML = product[0];
        row.insertCell(1).innerHTML = product[1];
        row.insertCell(2).innerHTML = product[2];
        row.insertCell(3).innerHTML = product[3];
        const actionsCell = row.insertCell(4);
        actionsCell.innerHTML = `<button onclick="editProduct(${product[0]})">Editar</button>
                                 <button onclick="deleteProduct(${product[0]})">Eliminar</button>`;
    });
}

function saveProduct() {
    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;
    const extras = []; // Gather extras from the form

    eel.add_product(name, price, extras)(() => {
        document.getElementById('productForm').reset();
        fetchProducts(); // Refresh the product list
    });
}

function editProduct(productId) {
    // Load the product data into the form for editing
}

function deleteProduct(productId) {
    eel.delete_product(productId)(() => {
        fetchProducts(); // Refresh the product list
    });
}

// Initial fetch of products when the page loads
fetchProducts();
