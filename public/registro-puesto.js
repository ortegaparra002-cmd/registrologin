const formularioPuesto = document.getElementById('form-crear-puesto');
const btnUbicacion = document.getElementById('obtener-ubicacion');
const statusUbicacion = document.getElementById('status-ub');


if (btnUbicacion) {
    btnUbicacion.addEventListener('click', () => {
        if (!navigator.geolocation) {
            statusUbicacion.textContent = "Tu navegador no soporta geolocalización";
            return;
        }

        statusUbicacion.textContent = "Localizando...";
        navigator.geolocation.getCurrentPosition((pos) => {
            coordenadas.lat = pos.coords.latitude;
            coordenadas.lng = pos.coords.longitude;
            statusUbicacion.textContent = `Ubicación lista: ${coordenadas.lat.toFixed(4)}, ${coordenadas.lng.toFixed(4)}`;
            statusUbicacion.style.color = "green";
        }, () => {
            statusUbicacion.textContent = "No se pudo obtener la ubicación";
            statusUbicacion.style.color = "red";
        });
    });
}

if (formularioPuesto) {
    formularioPuesto.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!coordenadas.lat || !coordenadas.lng) {
            alert("Por favor, obtén tu ubicación primero");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert("No hay sesión activa. Por favor, inicia sesión.");
            return;
        }
        const formData = new FormData();
        formData.append('nombre_puesto', document.getElementById('nombre-puesto').value);
        formData.append('biografia', document.getElementById('bio-puesto').value);
        formData.append('latitud', coordenadas.lat);
        formData.append('longitud', coordenadas.lng);
        const inputFoto = document.getElementById('input-foto'); 
        if (inputFoto && inputFoto.files[0]) {
            formData.append('imagen', inputFoto.files[0]);
        }

        try {
            const res = await fetch(`${API_URL}/crear-puesto`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                alert("¡Puesto creado con éxito!");
                if (data.qr) {
                    document.getElementById('qr-resultado').src = data.qr;
                    document.getElementById('seccion-qr').style.display = 'block';
                }
            } else {
                
                alert("Error: " + (data.error || "No se pudo crear el puesto"));
                console.error("Error detallado:", data);
            }
        } catch (error) {
            console.error("Error en la petición:", error);
            alert("Error de conexión con el servidor");
        }
    });
}
