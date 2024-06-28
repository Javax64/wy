let currentExtras = [];
let editingProductId = null;
let productIdToDelete = null;

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

async function fetchProducts() {
    const products = await eel.get_products()();
    const productTable = document.getElementById('productTable').getElementsByTagName('tbody')[0];

    productTable.innerHTML = ''; // Clear existing rows

    const activeProducts = products.filter(product => product.active === 1);
    const inactiveProducts = products.filter(product => product.active === 0);

    const renderProducts = (products) => {
        products.forEach(product => {
            const row = productTable.insertRow();
            row.insertCell(0).innerHTML = product.id;
            row.insertCell(1).innerHTML = product.name;
            row.insertCell(2).innerHTML = product.price;
            row.insertCell(3).innerHTML = product.extras.filter(extra => extra.active !== 2).map(extra => `
                <span>${extra.name}: ${extra.price}</span>
            `).join(', ');
            const actionsCell = row.insertCell(4);
            actionsCell.innerHTML = `
                <button onclick="editProduct(${product.id})">Editar</button>
                <button onclick="toggleProductActive(${product.id})" style="background-color: ${product.active ? 'green' : 'red'}">${product.active ? 'Activado' : 'Desactivado'}</button>
                <button onclick="showProductDeleteModal(${product.id})">Eliminar</button>
            `;
        });
    };

    renderProducts(activeProducts);
    renderProducts(inactiveProducts);
}

async function toggleProductActive(productId) {
    await eel.toggle_product_active(productId)();
    fetchProducts(); // Refresh the product list
}

async function toggleExtraActive(extraId) {
    await eel.toggle_extra_active(extraId)();
    fetchProducts(); // Refresh the product list
}


function goBack() {
    window.history.back();
}

function saveProduct() {
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);

    if (!name || isNaN(price)) {
        showModal('Por favor, ingrese un nombre y un precio válidos para el producto.');
        return;
    }

    if (editingProductId) {
        console.log('Saving product with existing ID:', editingProductId, 'with extras:', currentExtras);
        eel.update_product(editingProductId, name, price, currentExtras)(() => {
            resetForm();
            fetchProducts();
        });
    } else {
        console.log('Adding new product with extras:', currentExtras);
        eel.add_product(name, price, currentExtras)(() => {
            resetForm();
            fetchProducts();
        });
    }
}

function editProduct(productId) {
    eel.get_product_by_id(productId)((product) => {
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        currentExtras = product.extras.filter(extra => extra.active !== 2); // Exclude extras with active = 2
        updateExtrasTable();

        editingProductId = productId;
        document.getElementById('formTitle').innerText = 'Editando Producto';
    });
}

function addExtra() {
    const name = document.getElementById('extraName').value;
    const price = parseFloat(document.getElementById('extraPrice').value);

    if (!name || isNaN(price)) {
        showModal('Por favor, ingrese un nombre y un precio válidos para el extra.');
        return;
    }

    currentExtras.push({ name, price, active: true });
    document.getElementById('extraForm').reset();
    updateExtrasTable();
}

function updateExtrasTable() {
    const extraTable = document.getElementById('extraTable').getElementsByTagName('tbody')[0];
    extraTable.innerHTML = '';

    currentExtras.filter(extra => extra.active !== 2).forEach((extra, index) => {
        const row = extraTable.insertRow();
        row.insertCell(0).innerHTML = extra.name;
        row.insertCell(1).innerHTML = extra.price;
        row.insertCell(2).innerHTML = `
            <button onclick="toggleExtra(${index}, ${extra.id})" class="${extra.active ? 'btn-active' : 'btn-inactive'}">${extra.active ? 'Activado' : 'Desactivado'}</button>
            <button onclick="showExtraDeleteModal(${extra.id})">Eliminar</button>
        `;
    });
}
async function toggleExtra(index, extraId) {
    console.log('Toggling extra:', index, 'with ID:', extraId);
    currentExtras[index].active = currentExtras[index].active === 1 ? 0 : 1;
    await toggleExtraActive(extraId);
    updateExtrasTable();
}
async function deleteProduct(productId) {
    await eel.delete_product(productId)();
    fetchProducts(); // Refresh the product list
}

function removeExtra(index) {
    currentExtras.splice(index, 1);
    updateExtrasTable();
}
async function deleteExtra(extraId) {
    await eel.delete_extra(extraId)();
    fetchProducts(); // Refresh the product list
}

function resetForm() {
    document.getElementById('productForm').reset();
    currentExtras = [];
    updateExtrasTable();
    editingProductId = null;
    document.getElementById('formTitle').innerText = 'Gestión de Productos';
}

function showModal(message) {
    document.getElementById('modalMessage').innerText = message;
    document.getElementById('modal').style.display = "block";
}

function closeModal() {
    document.getElementById('modal').style.display = "none";
}
function showProductDeleteModal(productId) {
    productIdToDelete = productId;
    document.getElementById('confirmationMessage').innerText = "¿Está seguro de que desea eliminar este producto?";
    document.getElementById('confirmationModal').style.display = 'block';
}

function showExtraDeleteModal(extraId) {
    extraIdToDelete = extraId;
    document.getElementById('confirmationMessage').innerText = "¿Está seguro de que desea eliminar este extra?";
    document.getElementById('confirmationModal').style.display = 'block';
}
document.getElementById('confirmDeleteButton').addEventListener('click', () => {
    if (productIdToDelete !== null) {
        deleteProduct(productIdToDelete);
        productIdToDelete = null;
    } else if (extraIdToDelete !== null) {
        deleteExtra(extraIdToDelete);
        extraIdToDelete = null;
    }
    closeConfirmationModal();
});
function closeConfirmationModal() {
    document.getElementById('confirmationModal').style.display = 'none';
}


// Initial fetch of products when the page loads
fetchProducts();
