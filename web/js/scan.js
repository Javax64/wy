document.addEventListener("DOMContentLoaded", () => {
    const codeReader = new ZXing.BrowserQRCodeReader();
    const videoElement = document.getElementById('video');
    const messageElement = document.getElementById('message');
    const startButton = document.getElementById('startButton');
    const scannerContainer = document.getElementById('scannerContainer');
    const scanline = document.getElementById('scanline');
    const closeModalButton = document.querySelectorAll('.modal .close');
    const modalMessage = document.getElementById('modalMessage');
    const paymentModal = document.getElementById('paymentModal');
    const cashButton = document.getElementById('cashButton');
    const transferButton = document.getElementById('transferButton');
    const orderCustomerNameElement = document.getElementById('orderCustomerName');
    const orderAdvanceElement = document.getElementById('orderAdvance');
    const orderTotalPriceElement = document.getElementById('orderTotalPrice');
    const orderBalanceElement = document.getElementById('orderBalance');
    const closeScannerModalButton = document.getElementById('closeScannerModal');
    const alertsContainer = document.getElementById('alertsContainer');

    let scannedOrderId = null;
    let currentStream = null;

    startButton.addEventListener('click', openScannerModal);

    closeScannerModalButton.addEventListener('click', closeScannerModal);

    closeModalButton.forEach(button => {
        button.addEventListener('click', closeModal);
    });

    cashButton.addEventListener('click', () => {
        updatePaymentMethod('Efectivo');
    });

    transferButton.addEventListener('click', () => {
        updatePaymentMethod('Transferencia');
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
                if (err.name === "OverconstrainedError" || err.name === "NotFoundError") {
                    currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
                } else {
                    throw err;
                }
            }
            
            videoElement.srcObject = currentStream;
            await videoElement.play();
    
            const track = currentStream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
    
            if (capabilities.zoom) {
                const settings = track.getSettings();
                const maxZoom = capabilities.zoom.max;
                const idealZoom = Math.min(maxZoom, 5);
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
                    scannedOrderId = result.text;
                    console.log(`Scanned Order ID: ${scannedOrderId}`);
                    messageElement.textContent = `Código QR escaneado: ${scannedOrderId}`;
                    fetch(`/mark_as_completed?order_id=${encodeURIComponent(scannedOrderId)}`)
                        .then(response => {
                            console.log(`Response status: ${response.status}`);
                            console.log(`Response content-type: ${response.headers.get('content-type')}`);
                            if (!response.ok) {
                                return response.json().then(err => { throw new Error(err.warning || err.error) });
                            }
                            const contentType = response.headers.get('content-type');
                            if (contentType && contentType.includes('application/json')) {
                                return response.json();
                            } else {
                                throw new Error("Response is not JSON");
                            }
                        })
                        .then(data => {
                            console.log(`Data received: ${JSON.stringify(data)}`);
                            if (data.warning) {
                                showAlert(data.warning, 'warning');
                            } else if (data.customer_name) {
                                updateDeliveryDate();
                                showPaymentModal(data);
                            } else {
                                showAlert('Error al completar el pedido.', 'error');
                            }
                        })
                        .catch(error => {
                            showAlert(`Error: ${error.message}`, 'error');
                            console.error('Error:', error);
                        });
                })
                .catch(err => {
                    console.error('Error decoding QR code:', err);
                    showAlert('Error al escanear el código QR.', 'error');
                });
        } catch (err) {
            console.error('Error accessing camera:', err);
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
        startButton.style.display = 'block';
        codeReader.reset();

        // Restablecer estilos y dimensiones del modal
        scannerContainer.style.width = '';
        scannerContainer.style.height = '';
    }

    function showPaymentModal(orderDetails) {
        paymentModal.style.display = 'block';
        closeScannerModal(); // Cerrar el modal del escáner después de seleccionar el método de pago

        orderCustomerNameElement.textContent = `Pedido de: ${orderDetails.customer_name}`;
        orderAdvanceElement.textContent = `Adelanto: ${orderDetails.down_payment} Bs`;
        orderTotalPriceElement.textContent = `Precio Total: ${orderDetails.total_price} Bs`;
        orderBalanceElement.textContent = `Saldo: ${orderDetails.balance_due} Bs`;

        modalMessage.textContent = `El pedido del cliente ${orderDetails.customer_name} ha sido entregado con éxito. Por favor, seleccione el método de pago.`;
    }

    function updatePaymentMethod(method) {
        fetch(`/update_payment_method`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ order_id: scannedOrderId, payment_method: method })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error) });
            }
            return response.json();
        })
        .then(data => {
            showAlert(`Método de pago actualizado a ${method} para el pedido del cliente ${data.customer_name}.`, 'success');
            closePaymentModal();
        })
        .catch(error => {
            showAlert(`Error: ${error.message}`, 'error');
            console.error('Error:', error);
        });
    }

    function updateDeliveryDate() {
        const now = new Date();
        const boliviaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
        const deliveryDate = boliviaTime.toISOString().split('T')[0];
    
        fetch(`/update_delivery_date`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ order_id: scannedOrderId, delivery_date: deliveryDate })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error) });
            }
            return response.json();
        })
        .then(data => {
            showAlert(`Fecha de entrega actualizada a ${deliveryDate} para el pedido del cliente ${data.customer_name}.`, 'success');
        })
        .catch(error => {
            showAlert(`Error: ${error.message}`, 'error');
            console.error('Error:', error);
            
        });
    }

    function closePaymentModal() {
        paymentModal.style.display = 'none';
    }

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

    function closeModal() {
        modal.style.display = 'none';
        startButton.style.display = 'block';
        scannerContainer.style.display = 'none';
        messageElement.textContent = '';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }
});
