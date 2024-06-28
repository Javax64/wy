document.addEventListener("DOMContentLoaded", async function () {
    const startScanButton = document.getElementById('startScanButton');
    const videoElement = document.getElementById('video');
    const scannerContainer = document.getElementById('scannerContainer');
    const scanline = document.getElementById('scanline');
    const closeScannerModalButton = document.getElementById('closeScannerModal');
    const selectedProductsTable = document.getElementById('selectedProductsTable').getElementsByTagName('tbody')[0];
    const totalPriceElement = document.getElementById('totalPrice');
    const completeSaleButton = document.getElementById('completeSaleButton');
    const confirmationModal = document.getElementById('confirmationModal');
    const paymentModal = document.getElementById('paymentModal');
    const confirmationText = document.getElementById('confirmationText');
    const confirmButton = document.getElementById('confirmButton');
    const cancelButton = document.getElementById('cancelButton');
    const exitConfirmationModal = document.getElementById('exitConfirmationModal');
    const exitConfirmButton = document.getElementById('exitConfirmButton');
    const exitCancelButton = document.getElementById('exitCancelButton');
    const menuButton = document.querySelector('header .admin-button');
    const alertsContainer = document.getElementById('alertsContainer');
    let products = [];
    let total = 0;
    let productToDelete = null;
    let codeReader = new ZXing.BrowserQRCodeReader();
    let currentStream = null;
    let paymentMethod = '';

    startScanButton.addEventListener('click', openScannerModal);
    closeScannerModalButton.addEventListener('click', closeScannerModal);
    cancelButton.addEventListener('click', closeConfirmationModal);
    exitCancelButton.addEventListener('click', closeExitConfirmationModal);

    menuButton.addEventListener('click', (event) => {
        if (products.length > 0) {
            event.preventDefault();
            openExitConfirmationModal(menuButton.href);
        }
    });

    // Eventos para cerrar los otros modales
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    async function openScannerModal() {
        closeScannerModal();
        scannerContainer.style.display = 'block';
        scanline.style.display = 'block';
    
        try {
            const constraints = {
                video: {
                    facingMode: { exact: "environment" },
                    zoom: { ideal: 5 }
                }
            };
            
            try {
                currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                // If facingMode: "environment" fails, try the default camera
                if (err.name === "OverconstrainedError" || err.name === "NotFoundError") {
                    currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
                } else {
                    throw err;
                }
            }
    
            videoElement.srcObject = currentStream;
            await videoElement.play();
    
            // Apply zoom and focus if supported
            const track = currentStream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
    
            if (capabilities.zoom) {
                const settings = track.getSettings();
                const maxZoom = capabilities.zoom.max;
                const idealZoom = Math.min(maxZoom, 5); // Adjust zoom as needed
                track.applyConstraints({ advanced: [{ zoom: idealZoom }] });
            }
    
            if (capabilities.focusMode) {
                track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
            }
    
            const regionOfInterest = {
                sx: videoElement.videoWidth * 0.1,
                sy: videoElement.videoHeight * 0.1,
                sw: videoElement.videoWidth * 0.8,
                sh: videoElement.videoHeight * 0.8
            };
    
            codeReader.decodeOnceFromVideoDevice(undefined, 'video', regionOfInterest)
                .then(result => {
                    const qrCode = result.text;
                    const productId = qrCode.split(':')[1];
                    addProductToSale(productId);
                    closeScannerModal();
                    showAlert('Producto añadido correctamente.', 'success');
                })
                .catch(err => {
                    console.error(err);
                    showAlert('Error al escanear el código QR.', 'error');
                });
        } catch (err) {
            console.error('Error al acceder a la cámara:', err);
            showAlert('Error al acceder a la cámara.', 'error');
        }
    }

    function closeScannerModal() {
        if (currentStream) {
            const tracks = currentStream.getTracks();
            tracks.forEach(track => track.stop());
            currentStream = null;
        }
        videoElement.pause();
        videoElement.srcObject = null;
        scannerContainer.style.display = 'none';
        scanline.style.display = 'none';
        if (codeReader) {
            codeReader.reset();
        }
    }

    async function addProductToSale(productId) {
        const product = await eel.get_product_by_id_exposed_ventas2(productId)();  // Llama a la función de Python
        if (!product) {
            showAlert('Producto no encontrado.', 'error');
            return;
        }
        const existingProduct = products.find(p => p.id === product.id);
        if (existingProduct) {
            existingProduct.quantity++;
        } else {
            product.quantity = 1;
            products.push(product);
        }
        updateProductTable();
        updateTotalPrice();
    }

    function updateProductTable() {
        selectedProductsTable.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            row.id = `productRow-${product.id}`;
            const nameCell = document.createElement('td');
            nameCell.className = 'product-name';
            nameCell.textContent = product.name;
            const quantityCell = document.createElement('td');
            quantityCell.className = 'product-quantity';
            quantityCell.textContent = product.quantity;
            const priceCell = document.createElement('td');
            priceCell.className = 'product-price';
            priceCell.textContent = (product.price * product.quantity).toFixed(2);
            const actionsCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Eliminar';
            deleteButton.onclick = function () {
                openConfirmationModal(product.id);
            };
            actionsCell.appendChild(deleteButton);
            row.appendChild(nameCell);
            row.appendChild(quantityCell);
            row.appendChild(priceCell);
            row.appendChild(actionsCell);
            selectedProductsTable.appendChild(row);
        });
    }

    function updateTotalPrice() {
        total = products.reduce((acc, product) => acc + (product.price * product.quantity), 0);
        totalPriceElement.textContent = `Total: ${total.toFixed(2)} Bs`;
    }

    completeSaleButton.addEventListener('click', () => {
        if (products.length === 0) {
            showAlert('No hay productos en la venta.', 'error');
            return;
        }
        openPaymentModal();
    });

    function openPaymentModal() {
        paymentModal.style.display = 'block';
    }

    function closePaymentModal() {
        paymentModal.style.display = 'none';
    }

    async function confirmSale(paymentMethod) {
        console.log("Productos para la venta:", products);
        console.log("Total de la venta:", total);
        try {
            const result = await eel.complete_sale(products, total, paymentMethod)();
            console.log("Resultado de complete_sale:", result);
            if (result) {
                showAlert('Venta completada con éxito.', 'success');
                products = [];
                updateProductTable();
                updateTotalPrice();
                closePaymentModal();
            } else {
                showAlert('Error al completar la venta.', 'error');
            }
        } catch (error) {
            console.error("Error al completar la venta:", error);
            showAlert('Error al completar la venta.', 'error');
        }
    }

    document.getElementById('paymentTransfer').addEventListener('click', () => {
        paymentMethod = 'Transferencia';
        confirmSale(paymentMethod);
    });

    document.getElementById('paymentCash').addEventListener('click', () => {
        paymentMethod = 'Efectivo';
        confirmSale(paymentMethod);
    });

    function openConfirmationModal(productId) {
        productToDelete = productId;
        confirmationModal.style.display = 'block';
    }

    function closeConfirmationModal() {
        confirmationModal.style.display = 'none';
    }

    function openExitConfirmationModal(href) {
        exitConfirmationModal.style.display = 'block';
        exitConfirmButton.onclick = () => {
            window.location.href = href;
        };
    }

    function closeExitConfirmationModal() {
        exitConfirmationModal.style.display = 'none';
    }

    window.confirmDeleteProduct = function() {
        products = products.filter(p => p.id !== productToDelete);
        updateProductTable();
        updateTotalPrice();
        closeConfirmationModal();
    }

    window.onclick = function (event) {
        if (event.target == confirmationModal) {
            closeConfirmationModal();
        } else if (event.target == scannerContainer) {
            closeScannerModal();
        } else if (event.target == paymentModal) {
            closePaymentModal();
        } else if (event.target == exitConfirmationModal) {
            closeExitConfirmationModal();
        }
    };

    function showAlert(message, type) {
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
});
