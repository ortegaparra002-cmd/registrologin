const registerForm = document.getElementById('formulario-registro');
const loginForm = document.getElementById('formulario-login');

const messageElement = document.getElementById('mensaje');

const botonAccesoProtegido = document.getElementById('acceso-protegido');
const parrafoMensajeProtegido = document.getElementById('mensaje-protegido');
const API_URL = 'https://registrologin-5.onrender.com';


registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;

    const res = await fetch(`${API_URL}/registrar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    messageElement.textContent = data.message || data.error;
    if (res.ok) {
        registerForm.reset();
    }
});


loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('log-username').value;
    const password = document.getElementById('log-password').value;

    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    messageElement.textContent = data.message || data.error;
    if (res.ok) {
        localStorage.setItem('token', data.token);
        loginForm.reset();
    
        alert('¡Login exitoso!');
    }
});


botonAccesoProtegido.addEventListener('click', async () => {
    const token = localStorage.getItem('token');


    if (!token) {
        parrafoMensajeProtegido.textContent = 'Tu debes iniciar sesión para acceder a este recurso';
        parrafoMensajeProtegido.style.color = 'red';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/recurso-protegido`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (res.ok) {
            parrafoMensajeProtegido.textContent = data.message + ' ' + data.data;
            parrafoMensajeProtegido.style.color = 'green';
        } else {
            parrafoMensajeProtegido.textContent = 'Acceso fallido al recurso protegido';
            parrafoMensajeProtegido.style.color = 'red';
            localStorage.removeItem('token');
        }
    } catch (error) {
        console.error('Error al acceder al recurso protegido:', error);
        parrafoMensajeProtegido.textContent = 'Error de red o servidor no disponible';
        parrafoMensajeProtegido.style.color = 'red';
    }
});

