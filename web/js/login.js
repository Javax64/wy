async function iniciarSesion() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const response = await eel.iniciar_sesion(username, password)();
    console.log("Respuesta de iniciar_sesion:", response);
    if (response.status === 'success') {
        document.cookie = `sesion_id=${response.sesion_id}; path=/`;
        console.log("Cookie sesion_id establecida:", document.cookie);
        if (response.role === 'admin') {
            window.location.href = 'index.html';
        } else {
            window.location.href = 'Admin_ventas.html';
        }
    } else {
        alert('Inicio de sesión fallido');
    }
}

function getCookie(name) {
    let cookieArr = document.cookie.split(";");
    for (let i = 0; i < cookieArr.length; i++) {
        let cookiePair = cookieArr[i].split("=");
        if (name === cookiePair[0].trim()) {
            return decodeURIComponent(cookiePair[1]);
        }
    }
    return null;
}
async function cerrarSesion() {
    const sesion_id = getCookie('sesion_id');
    if (sesion_id) {
        const response = await eel.cerrar_sesion(sesion_id)();
        if (response.status === 'success') {
            document.cookie = 'sesion_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            window.location.href = 'login.html';
        } else {
            alert('Error al cerrar sesión');
        }
    } else {
        window.location.href = 'login.html';
    }
}

async function verificarAccesoAdmin() {
    console.log("Verificando acceso...");

    const sesion_id = getCookie('sesion_id');
    console.log("sesion_id:", sesion_id);

    if (!sesion_id) {
        console.log("No se encontró sesion_id. Redirigiendo a login.html");
        window.location.href = 'login.html';
        return;
    }

    const response = await eel.obtener_rol_usuario(sesion_id)();
    console.log("Rol del usuario:", response.role);

    if (response.role !== 'admin') {
        console.log("Rol no autorizado. Redirigiendo a login.html");
        window.location.href = 'login.html';
    } else {
        console.log("Acceso autorizado. Mostrando contenido.");
        document.body.style.visibility = 'visible';
        document.body.style.opacity = '1';
    }
}

async function verificarAccesoGeneral() {
    console.log("Verificando acceso...");

    const sesion_id = getCookie('sesion_id');
    console.log("sesion_id:", sesion_id);

    if (!sesion_id) {
        console.log("No se encontró sesion_id. Redirigiendo a login.html");
        window.location.href = 'login.html';
        return;
    }

    const response = await eel.obtener_rol_usuario(sesion_id)();
    console.log("Rol del usuario:", response.role);

    if (response.role !== 'admin' && response.role !== 'user') {
        console.log("Rol no autorizado. Redirigiendo a login.html");
        window.location.href = 'login.html';
    } else {
        console.log("Acceso autorizado. Mostrando contenido.");
        document.body.style.visibility = 'visible';
        document.body.style.opacity = '1';
    }
}