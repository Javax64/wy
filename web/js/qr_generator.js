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

document.addEventListener('DOMContentLoaded', async function () {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const openButton = document.querySelector('.open-btn');
    const closeButton = document.querySelector('.close-btn');
    const productSelect = document.getElementById('productId');
    const modal = document.getElementById('confirmationModal');
    const confirmationText = document.getElementById('confirmationText');
    const confirmButton = document.getElementById('confirmButton');
    const cancelButton = document.getElementById('cancelButton');
    const alertsContainer = document.getElementById('alertsContainer');
    const reduceStockModal = document.getElementById('reduceStockModal');
    const reduceProductIdInput = document.getElementById('reduceProductId');
    const reduceQuantityInput = document.getElementById('reduceQuantity');
    const authorizationCodeInput = document.getElementById('authorizationCode');
    const printOnlyQRButton = document.getElementById('printOnlyQRButton');
    const openScannerButton = document.getElementById('openScannerButton');
    const scannerModal = document.getElementById('scannerModal');
    const passwordModal = document.getElementById('passwordModal');
    const videoElement = document.getElementById('video');
    const scanline = document.getElementById('scanline');
    const closeScannerModalButton = document.getElementById('closeScannerModal');
    const closeScannerModalButton2 = document.getElementById('closeScannerModalButton');
    const closePasswordModalButton = document.getElementById('closePasswordModal');
    const passwordForm = document.getElementById('passwordForm');
    const scannedProductsList = document.getElementById('scannedProductsList');
    const scanButton = document.getElementById('scanButton');
    let correctPassword;
    correctPassword = await eel.obtener_contraseña_segura()();
    let currentStream = null;
    let codeReader = new ZXing.BrowserQRCodeReader();
    let isScanning = false;
    let productCount = {};
    
    

    const products = await eel.get_products_for_qr()();
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.text = product.name;
        productSelect.appendChild(option);
    });

    const stock = await eel.get_stock_exposed()();
    const stockTableBody = document.getElementById('stockTable').getElementsByTagName('tbody')[0];
    stock.forEach(item => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;
        const quantityCell = document.createElement('td');
        quantityCell.textContent = item.quantity;
        const actionsCell = document.createElement('td');
        const reduceButton = document.createElement('button');
        reduceButton.textContent = 'Reducir Stock';
        reduceButton.onclick = function () {
            openReduceStockModal(item.id, item.name);
        };
        actionsCell.appendChild(reduceButton);
        row.appendChild(nameCell);
        row.appendChild(quantityCell);
        row.appendChild(actionsCell);
        stockTableBody.appendChild(row);
    });

    window.addEventListener('click', function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

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
    
    document.getElementById('qrForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const productId = document.getElementById('productId').value;
        const quantity = parseInt(document.getElementById('quantity').value, 10);

        const selectedProduct = productSelect.options[productSelect.selectedIndex].text;
        confirmationText.textContent = `¿Confirma que desea generar e imprimir ${quantity} códigos QR para el producto "${selectedProduct}"?`;
        confirmButton.onclick = async function () {
            modal.style.display = 'none';

            try {
                const qrCodes = await eel.generate_qr_for_product(productId, quantity)();
                const combinedImagePath = await eel.print_qr_for_product(productId, qrCodes)();

                if (combinedImagePath) {
                    const fullImagePath = window.location.origin + combinedImagePath;

                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                        <html>
                        <head>
                            <title>Print QR Codes</title>
                            <style>
                                @page { 
                                    size: 7cm auto;
                                    margin: 0;
                                }
                                body {
                                    margin: 0;
                                    display: flex;
                                    justify-content: center;
                                    align-items: flex-start;
                                    height: 100vh;
                                    padding-top: 0;
                                }
                                img {
                                    width: 6.5cm;
                                    height: auto;
                                    display: block;
                                    image-rendering: crisp-edges;
                                    image-rendering: pixelated;
                                }
                            </style>
                        </head>
                        <body>
                            <img src="${fullImagePath}" onload="window.print(); window.close();" />
                        </body>
                        </html>
                    `);
                    printWindow.document.close();
                }

                showAlert('Códigos QR generados e impresos correctamente.', 'success');

                const updatedStock = await eel.get_stock_exposed()();
                stockTableBody.innerHTML = '';
                updatedStock.forEach(item => {
                    const row = document.createElement('tr');
                    const nameCell = document.createElement('td');
                    nameCell.textContent = item.name;
                    const quantityCell = document.createElement('td');
                    quantityCell.textContent = item.quantity;
                    const actionsCell = document.createElement('td');
                    const reduceButton = document.createElement('button');
                    reduceButton.textContent = 'Reducir Stock';
                    reduceButton.onclick = function () {
                        openReduceStockModal(item.id, item.name);
                    };
                    actionsCell.appendChild(reduceButton);
                    row.appendChild(nameCell);
                    row.appendChild(quantityCell);
                    row.appendChild(actionsCell);
                    stockTableBody.appendChild(row);
                });
            } catch (error) {
                showAlert('Error al generar o imprimir los códigos QR.', 'error');
            }
        };

        modal.style.display = 'block';
    });

    printOnlyQRButton.addEventListener('click', async function () {
        const productId = document.getElementById('productId').value;
        const quantity = parseInt(document.getElementById('quantity').value, 10);

        try {
            const qrCodes = await eel.generate_qr_for_product(productId, quantity)();
            const combinedImagePath = await eel.print_qr_for_product_no_stock(productId, qrCodes)();

            if (combinedImagePath) {
                const fullImagePath = window.location.origin + combinedImagePath;

                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Print QR Codes</title>
                        <style>
                            @page { 
                                size: 7cm auto;
                                margin: 0;
                            }
                            body {
                                margin: 0;
                                display: flex;
                                justify-content: center;
                                align-items: flex-start;
                                height: 100vh;
                                padding-top: 0;
                            }
                            img {
                                width: 6.5cm;
                                height: auto;
                                display: block;
                                image-rendering: crisp-edges;
                                image-rendering: pixelated;
                            }
                        </style>
                    </head>
                    <body>
                        <img src="${fullImagePath}" onload="window.print(); window.close();" />
                        </body>
                        </html>
                `);
                printWindow.document.close();
            }

            showAlert('Códigos QR generados e impresos correctamente.', 'success');
        } catch (error) {
            showAlert('Error al generar o imprimir los códigos QR.', 'error');
        }
    });

    openScannerButton.addEventListener('click', function() {
        passwordModal.style.display = 'block';
    });

    closePasswordModalButton.addEventListener('click', function() {
        passwordModal.style.display = 'none';
        document.getElementById('scannerPassword').value = '';
    });

    passwordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const enteredPassword = document.getElementById('scannerPassword').value;

        if (enteredPassword === correctPassword) {
            passwordModal.style.display = 'none';
            document.getElementById('scannerPassword').value = '';
            openScannerModal();
        } else {
            showAlert('Clave incorrecta.', 'error');
            document.getElementById('scannerPassword').value = '';
        }
    });

    closeScannerModalButton.addEventListener('click', closeScannerModal);
    closeScannerModalButton2.addEventListener('click', closeScannerModal);
    scanButton.addEventListener('click', startScanning);

    async function openScannerModal() {
        scannerModal.style.display = 'block';
        scanline.style.display = 'block';
    
        try {
            const constraints = {
                video: {
                    facingMode: { exact: "environment" },
                    zoom: { ideal: 1 }
                }
            };
    
            try {
                currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                // If facingMode: "environment" fails, try the default camera
                if (err.name === "OverconstrainedError") {
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
                const idealZoom = Math.min(maxZoom, 4); // Adjust zoom as needed
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
                    showAlert('Pulsa el boton Escanear!.', 'success');
                });
        } catch (err) {
            console.error('Error al acceder a la cámara:', err);
            showAlert('Error al acceder a la cámara.', 'error');
        }
    }
    
    async function startScanning() {
        if (isScanning) return;
        isScanning = true;
        scanButton.disabled = true;
        scanButton.textContent = "Escaneando...";

        try {
            codeReader.decodeOnceFromVideoDevice(undefined, videoElement).then(async result => {
                if (result) {
                    const qrCode = result.text;
                    const productId = qrCode.split(':')[1];
                    const product = await eel.get_product_by_id_exposed_ventas(productId)();

                    if (product) {
                        await eel.add_to_stock(productId)();
                        if (!productCount[productId]) {
                            productCount[productId] = { name: product.name, count: 0 };
                        }
                        productCount[productId].count++;
                        updateScannedProductsList();
                        showAlert(`Producto ${product.name} añadido al stock.`, 'success');
                    } else {
                        showAlert('Producto no encontrado.', 'error');
                    }
                }
                scanButton.disabled = false;
                scanButton.textContent = "Escanear";
                isScanning = false;
            }).catch(err => {
                console.error(err);
                showAlert('Error al escanear el código QR2.', 'error');
                scanButton.disabled = false;
                scanButton.textContent = "Escanear";
                isScanning = false;
            });
        } catch (err) {
            console.error('Error al escanear el código QR3:', err);
            showAlert('Error al escanear el código QR4:', 'error');
            scanButton.disabled = false;
            scanButton.textContent = "Escanear";
            isScanning = false;
        }
    }

    function updateScannedProductsList() {
        scannedProductsList.innerHTML = '';
        for (const [productId, { name, count }] of Object.entries(productCount)) {
            const scannedItem = document.createElement('div');
            scannedItem.textContent = `${name}: ${count}`;
            scannedProductsList.appendChild(scannedItem);
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
        scannerModal.style.display = 'none';
        scanline.style.display = 'none';
        if (codeReader) {
            codeReader.reset();
        }
        isScanning = false;
        productCount = {}; // Reset product count
        updateStockTable();
    }
    

    async function updateStockTable() {
        const updatedStock = await eel.get_stock_exposed()();
        stockTableBody.innerHTML = '';
        updatedStock.forEach(item => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            nameCell.textContent = item.name;
            const quantityCell = document.createElement('td');
            quantityCell.textContent = item.quantity;
            const actionsCell = document.createElement('td');
            const reduceButton = document.createElement('button');
            reduceButton.textContent = 'Reducir Stock';
            reduceButton.onclick = function () {
                openReduceStockModal(item.id, item.name);
            };
            actionsCell.appendChild(reduceButton);
            row.appendChild(nameCell);
            row.appendChild(quantityCell);
            row.appendChild(actionsCell);
            stockTableBody.appendChild(row);
        });
    }

    function openReduceStockModal(productId, productName) {
        reduceProductIdInput.value = productId;
        document.getElementById('reduceStockModal').style.display = 'block';
    }

    window.closeReduceStockModal = function () {
        document.getElementById('reduceStockModal').style.display = 'none';
    };

    window.reduceStock = async function () {
        const productId = reduceProductIdInput.value;
        const quantity = parseInt(reduceQuantityInput.value, 10);
        const authorizationCode = authorizationCodeInput.value;

        try {
            const success = await eel.reduce_stock(productId, quantity, authorizationCode)();

            if (success) {
                showAlert('Stock reducido correctamente.', 'success');
                closeReduceStockModal();
                const updatedStock = await eel.get_stock_exposed()();
                stockTableBody.innerHTML = '';
                updatedStock.forEach(item => {
                    const row = document.createElement('tr');
                    const nameCell = document.createElement('td');
                    nameCell.textContent = item.name;
                    const quantityCell = document.createElement('td');
                    quantityCell.textContent = item.quantity;
                    const actionsCell = document.createElement('td');
                    const reduceButton = document.createElement('button');
                    reduceButton.textContent = 'Reducir Stock';
                    reduceButton.onclick = function () {
                        openReduceStockModal(item.id, item.name);
                    };
                    actionsCell.appendChild(reduceButton);
                    row.appendChild(nameCell);
                    row.appendChild(quantityCell);
                    row.appendChild(actionsCell);
                    stockTableBody.appendChild(row);
                });
            } else {
                showAlert('Código de autorización incorrecto o error al reducir el stock.', 'error');
            }
            authorizationCodeInput.value = "";
        } catch (error) {
            showAlert('Error al reducir el stock.', 'error');
            authorizationCodeInput.value = "";
        }
    };
    
});
function closeConfirmationModal() {
    document.getElementById('confirmationModal').style.display = 'none';
}
