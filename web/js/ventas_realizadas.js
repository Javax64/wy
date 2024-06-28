document.addEventListener('DOMContentLoaded', async function () {
    let currentSaleId = null;
    let currentProducts = [];
    let currentPage = 1;
    const itemsPerPage = 20;
    let salesData = [];

    function showAlert(message, type) {
        const alertsContainer = document.getElementById('alertsContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alertsContainer.appendChild(alert);

        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                alert.remove();
            }, 600);
        }, 3000);
    }

    async function fetchSales() {
        try {
            const sales = await eel.get_sales_exposed()();
           
            // Ordenar las ventas por ID en orden descendente
            salesData = sales.sort((a, b) => b.id - a.id);
            renderSales(currentPage);
            setupPagination();
            updateSalesSummary();
        } catch (error) {
            console.error("Error fetching sales:", error);
        }
    }

    function renderSales(page) {
        const salesTableBody = document.getElementById('salesTable').getElementsByTagName('tbody')[0];
        salesTableBody.innerHTML = '';

        
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, salesData.length);
        for (let i = startIndex; i < endIndex; i++) {
            const venta = salesData[i];
            const row = document.createElement('tr');
            const idCell = document.createElement('td');
            const productsCell = document.createElement('td');
            const totalPriceCell = document.createElement('td');
            const saleDateCell = document.createElement('td');
            const paymentMethodCell = document.createElement('td');
            const actionsCell = document.createElement('td');
    
            idCell.textContent = venta.id;
            productsCell.innerHTML = venta.products.map(p => `${p.product} x${p.quantity}`).join('<br>');
            totalPriceCell.textContent = `${venta.total_price.toFixed(2)} Bs`;
    
            // Verifica y formatea la fecha de venta
            if (venta.sale_date) {
                 // Crear el objeto Date en UTC
                 const saleDate = new Date(venta.sale_date);
                 // Ajustar manualmente la zona horaria
                 const correctedDate = new Date(saleDate.getTime() + saleDate.getTimezoneOffset() * 60000);
                if (!isNaN(saleDate)) {
                    saleDateCell.textContent = correctedDate.toLocaleDateString();
                } else {
                    saleDateCell.textContent = 'Fecha inválida';
                    console.error(`Fecha inválida en la venta con ID ${venta.id}: ${venta.sale_date}`);
                }
            } else {
                saleDateCell.textContent = 'Sin fecha';
                console.error(`Fecha de venta no disponible en la venta con ID ${venta.id}`);
            }
    
            paymentMethodCell.textContent = venta.payment_method;
    
            const editButton = document.createElement('button');
            editButton.textContent = 'Editar';
            editButton.onclick = function () {
                currentProducts = venta.products;
                openEditModal(venta.id, venta.products, venta.payment_method);
            };
    
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Eliminar';
            deleteButton.onclick = function () {
                openDeleteModal(venta.id);
            };
    
            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);
    
            row.appendChild(idCell);
            row.appendChild(productsCell);
            row.appendChild(totalPriceCell);
            row.appendChild(saleDateCell);
            row.appendChild(paymentMethodCell);
            row.appendChild(actionsCell);
    
            salesTableBody.appendChild(row);
        }
    }
    
    
    
    
    function setupPagination() {
        const paginationElement = document.getElementById('pagination');
        paginationElement.innerHTML = '';
        const totalPages = Math.ceil(salesData.length / itemsPerPage);

        const prevButton = document.createElement('button');
        prevButton.textContent = 'Anterior';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = function () {
            if (currentPage > 1) {
                currentPage--;
                renderSales(currentPage);
                setupPagination();
            }
        };
        paginationElement.appendChild(prevButton);

        const pageNumber = document.createElement('span');
        pageNumber.textContent = `Página ${currentPage} de ${totalPages}`;
        paginationElement.appendChild(pageNumber);

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Siguiente';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = function () {
            if (currentPage < totalPages) {
                currentPage++;
                renderSales(currentPage);
                setupPagination();
            }
        };
        paginationElement.appendChild(nextButton);
    }

    async function loadProductNames() {
        try {
            const productNames = await eel.get_product_names_exposed()();
            const filterProductName = document.getElementById('filterProductName');
            filterProductName.innerHTML = '<option value="">Todos</option>';

            productNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                filterProductName.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching product names:", error);
        }
    }

    await fetchSales();
    await loadProductNames();

    const editModal = document.getElementById('editModal');
    const editPaymentMethod = document.getElementById('editPaymentMethod');
    const editAuthorizationCode = document.getElementById('editAuthorizationCode');
    const saveEditButton = document.getElementById('saveEditButton');

    const deleteModal = document.getElementById('deleteModal');
    const authorizationCode = document.getElementById('authorizationCode');
    const confirmDeleteButton = document.getElementById('confirmDeleteButton');

    window.openEditModal = function (saleId, products, paymentMethod) {
        currentSaleId = saleId;
        currentProducts = products;
        editPaymentMethod.value = paymentMethod;
    
        const productTable = document.getElementById('editProductTable');
        productTable.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            const productNameCell = document.createElement('td');
            const productQuantityCell = document.createElement('td');
            const productPriceCell = document.createElement('td');
    
            productNameCell.textContent = product.product;
            productQuantityCell.innerHTML = `<input type="number" value="${product.quantity}" min="1" class="edit-quantity" data-product-id="${product.productId}">`;
            productPriceCell.textContent = product.price.toFixed(2);
    
    
            row.appendChild(productNameCell);
            row.appendChild(productQuantityCell);
            row.appendChild(productPriceCell);
    
            productTable.appendChild(row);
        });
    
        editModal.style.display = 'block';
    }
    
    
    
    
    
    
    
    
    
    
    
    window.closeEditModal = function () {
        editModal.style.display = 'none';
        editAuthorizationCode.value = '';
    };

    window.openDeleteModal = function (saleId) {
        currentSaleId = saleId;
        deleteModal.style.display = 'block';
    };

    window.closeDeleteModal = function () {
        deleteModal.style.display = 'none';
        authorizationCode.value = '';
    };

    saveEditButton.addEventListener('click', async () => {
        const newPaymentMethod = editPaymentMethod.value;
        const authorizationCode = editAuthorizationCode.value;
        const newQuantities = Array.from(document.querySelectorAll('.edit-quantity')).map(input => ({
            productId: parseInt(input.dataset.productId),
            quantity: parseInt(input.value)
        }));
    
    
        const newTotalPrice = newQuantities.reduce((total, item) => {
            const product = currentProducts.find(p => p.productId === item.productId);
            if (product) {
                return total + (product.price * item.quantity);
            } else {
                console.error(`Product with ID ${item.productId} not found in currentProducts`);
                return total;
            }
        }, 0);
    
        
    
        try {
            const result = await eel.update_sale_exposed(currentSaleId, newQuantities, newPaymentMethod, authorizationCode, newTotalPrice)();
            if (result) {
                showAlert('Venta actualizada correctamente', 'success');
                await fetchSales();
                updateSalesSummary();
                closeEditModal();
            } else {
                showAlert('Código de autorización incorrecto o error al actualizar la venta', 'error');
            }
        } catch (error) {
            console.error("Error updating sale:", error);
            showAlert('Error al actualizar la venta', 'error');
        }
    });
    
    
    
    
    
    
    
    confirmDeleteButton.addEventListener('click', async () => {
        const code = authorizationCode.value;
        try {
            const result = await eel.delete_sale_exposed(currentSaleId, code)();
            if (result) {
                showAlert('Venta eliminada con éxito', 'success');
                await fetchSales();
                updateSalesSummary();
                closeDeleteModal();
            } else {
                showAlert('Código de autorización incorrecto o error al eliminar la venta', 'error');
            }
            authorizationCode.value = '';
        } catch (error) {
            console.error("Error deleting sale:", error);
            showAlert('Error al eliminar la venta', 'error');
        }
    });

    const filterElements = [
        document.getElementById('filterDate'),
        document.getElementById('filterStartDate'),
        document.getElementById('filterEndDate'),
        document.getElementById('filterPaymentMethod'),
        document.getElementById('filterProductName')
    ];

    filterElements.forEach(element => {
        element.addEventListener('change', applyFilters);
    });

    async function applyFilters() {
        const filterDate = document.getElementById('filterDate').value;
        const filterStartDate = document.getElementById('filterStartDate').value;
        const filterEndDate = document.getElementById('filterEndDate').value;
        const filterPaymentMethod = document.getElementById('filterPaymentMethod').value;
        const filterProductName = document.getElementById('filterProductName').value;
    
        try {
            const filteredSales = await eel.get_filtered_sales_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)();
    
            // Imprime los datos filtrados para depuración
            console.log(filteredSales);
    
            // Verifica y maneja ventas sin fecha de venta
            filteredSales.forEach(sale => {
                if (!sale.sale_date) {
                    console.error(`Fecha de venta no disponible en la venta con ID ${sale.id}`);
                }
                if (sale.products.length > 0 && typeof sale.products[0].price === 'undefined') {
                    console.error('Precio del producto indefinido en la venta filtrada:', sale);
                }
            });
    
            salesData = filteredSales;
            currentPage = 1;
            renderSales(currentPage);
            setupPagination();
            updateSalesSummary(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName);
        } catch (error) {
            console.error("Error fetching filtered sales:", error);
        }
    }
    
    
    

    function updateSalesSummary(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName) {
        eel.get_daily_sales_total_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)().then(total => {
            const dailySalesElement = document.getElementById('dailySales');
            if (dailySalesElement) {
                dailySalesElement.textContent = `${total.toFixed(2)} Bs`;
            }
        });

        eel.get_weekly_sales_total_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)().then(total => {
            const weeklySalesElement = document.getElementById('weeklySales');
            if (weeklySalesElement) {
                weeklySalesElement.textContent = `${total.toFixed(2)} Bs`;
            }
        });

        eel.get_monthly_sales_total_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)().then(total => {
            const monthlySalesElement = document.getElementById('monthlySales');
            if (monthlySalesElement) {
                monthlySalesElement.textContent = `${total.toFixed(2)} Bs`;
            }
        });

        eel.get_annual_sales_total_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)().then(total => {
            const annualSalesElement = document.getElementById('annualSales');
            if (annualSalesElement) {
                annualSalesElement.textContent = `${total.toFixed(2)} Bs`;
            }
        });

        eel.get_total_sales_exposed_v2(filterDate, filterStartDate, filterEndDate, filterPaymentMethod, filterProductName)().then(total => {
            const totalSalesElement = document.getElementById('totalSales');
            if (totalSalesElement) {
                totalSalesElement.textContent = `${total.toFixed(2)} Bs`;
            }
        });
    }

    updateSalesSummary();
    setInterval(updateSalesSummary, 3600000);

    window.onclick = function (event) {
        if (event.target == editModal) {
            closeEditModal();
        } else if (event.target == deleteModal) {
            closeDeleteModal();
        }
    };
    console.log(salesData);
renderSales(currentPage);
});


