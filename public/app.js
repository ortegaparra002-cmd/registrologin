const API_URL = 'http://localhost:3000';

const authSection = document.getElementById('seccion-auth');

const userSection = document.getElementById('seccion-usuario');

const adminSection = document.getElementById('seccion-participante');

let misVotos = new Set();

let coordenadas = { lat: 0, lng: 0 };



function mostrarInterfaz(rol) {

    authSection.style.display = 'none';

    if (rol === 'visitante') {

        userSection.style.display = 'block';

        cargarPuestos();

    } else {

        adminSection.style.display = 'block';

        actualizarRankingParticipante();

        setInterval(actualizarRankingParticipante, 5000);

    }

}

const btnUbicacion = document.getElementById('obtener-ubicacion');

const statusUbicacion = document.getElementById('status-ub');



if (btnUbicacion) {

    btnUbicacion.addEventListener('click', () => {

        if (!navigator.geolocation) {

            statusUbicacion.textContent = "GPS no soportado";

            return;

        }

        statusUbicacion.textContent = "Localizando...";

        navigator.geolocation.getCurrentPosition((pos) => {

            coordenadas.lat = pos.coords.latitude;

            coordenadas.lng = pos.coords.longitude;

            statusUbicacion.textContent = `Ubicación lista: ${coordenadas.lat.toFixed(4)}, ${coordenadas.lng.toFixed(4)}`;

            statusUbicacion.style.color = "green";

        }, () => {

            statusUbicacion.textContent = "Error al obtener ubicación";

            statusUbicacion.style.color = "red";

        });

    });

}

document.getElementById('formulario-registro').addEventListener('submit', async (e) => {

    e.preventDefault();

    const res = await fetch(`${API_URL}/registrar`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

            username: document.getElementById('reg-username').value,

            password: document.getElementById('reg-password').value,

            rol: document.getElementById('reg-rol').value

        })

    });

    const data = await res.json();

    alert(data.message || data.error);

});



document.getElementById('formulario-login').addEventListener('submit', async (e) => {

    e.preventDefault();

    const res = await fetch(`${API_URL}/login`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

            username: document.getElementById('log-username').value,

            password: document.getElementById('log-password').value

        })

    });

    const data = await res.json();

    if (res.ok) {

        localStorage.setItem('token', data.token);

        localStorage.setItem('rol', data.rol);

        localStorage.setItem('username', document.getElementById('log-username').value);

        mostrarInterfaz(data.rol);

    } else { alert(data.error); }

});

async function cargarPuestos() {

    const res = await fetch(`${API_URL}/puestos`);

    const puestos = await res.json();

    const contenedor = document.getElementById('contenedor-puestos');

    contenedor.innerHTML = '';

    const rankingDiv = document.createElement('div');

    rankingDiv.innerHTML = '<h3>Ranking</h3><div id="ranking-list"></div>';

    contenedor.appendChild(rankingDiv);

    const puestosDiv = document.createElement('div');

    puestosDiv.id = 'puestos-grid';

    puestosDiv.innerHTML = '<h3>Puestos</h3>';

    

    puestos.forEach(p => {

        const id = p.id || null;

        const card = document.createElement('div');

        card.id = 'puesto-' + id;

        let imagenHTML = '';

        if (p.imagen_url) {

            imagenHTML = `<img src="${p.imagen_url}" alt="${p.nombre_puesto}" style="width: 100%; max-width: 300px; height: auto; margin-bottom: 10px;">`;

        }

        card.innerHTML = `

            ${imagenHTML}

            <p>Nombre: ${p.nombre_puesto}</p>

            <p>Historia: ${p.biografia}</p>

            <p>Votos: <span class="votos-count-${id}">0</span></p>

            <button onclick="votar(${id})">Votar por este puesto</button>

            <hr>

        `;

        puestosDiv.appendChild(card);

    });

    

    contenedor.appendChild(puestosDiv);

    actualizarRanking();

}



async function actualizarRanking() {

    const res = await fetch(`${API_URL}/ranking-fritos`);

    const ranking = await res.json();

    const rankingList = document.getElementById('ranking-list');

    

    if (!ranking || ranking.length === 0) {

        rankingList.innerHTML = '<p>Sin votos aún</p>';

        return;

    }

    

    let html = '<ol>';

    ranking.slice(0, 10).forEach(item => {

        html += `<li>${item.nombre} - ${item.votos} votos</li>`;

    });

    html += '</ol>';

    rankingList.innerHTML = html;

    ranking.forEach(item => {

        const contador = document.querySelector('.votos-count-' + item.id);

        if (contador) {

            contador.textContent = item.votos;

        }

    });

}



async function actualizarRankingParticipante() {

    const rankingDiv = document.getElementById('ranking-participante');

    if (!rankingDiv) return;

    

    const res = await fetch(`${API_URL}/ranking-fritos`);

    const ranking = await res.json();

    

    if (!ranking || ranking.length === 0) {

        rankingDiv.innerHTML = '<p>Sin votos aún</p>';

        return;

    }

    

    let html = '<ol>';

    ranking.slice(0, 10).forEach(item => {

        html += `<li>${item.nombre} - ${item.votos} votos</li>`;

    });

    html += '</ol>';

    rankingDiv.innerHTML = html;

}

const formPuesto = document.getElementById('form-crear-puesto');

if (formPuesto) {

    formPuesto.onsubmit = async (e) => {

        e.preventDefault();

        const formData = new FormData();

        formData.append('nombre_puesto', document.getElementById('nombre-puesto').value);

        formData.append('biografia', document.getElementById('bio-puesto').value);

        formData.append('latitud', coordenadas.lat);

        formData.append('longitud', coordenadas.lng);

       

        const fileInput = document.getElementById('input-foto');

        if (fileInput.files[0]) {

            formData.append('imagen', fileInput.files[0]);

        }



        const res = await fetch(`${API_URL}/crear-puesto`, {

            method: 'POST',

            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },

            body: formData

        });

       

        const data = await res.json();

        if (res.ok) {

            alert("¡Puesto creado!");

            const puestoData = data.puesto;

            let detallesPuesto = `

                <div style="border: 1px solid #ccc; padding: 15px; margin: 10px 0; background: #f9f9f9;">

                    <h4>Tu Puesto:</h4>

                    <p><strong>Nombre:</strong> ${puestoData.nombre_puesto}</p>

                    <p><strong>Biografía:</strong> ${puestoData.biografia}</p>

            `;

            

            if (puestoData.imagen_url) {

                detallesPuesto += `<img src="${puestoData.imagen_url}" alt="${puestoData.nombre_puesto}" style="width: 100%; max-width: 300px; height: auto; margin: 10px 0;">`;

            }

            

            detallesPuesto += `</div>`;

            

            document.getElementById('seccion-qr').innerHTML = `

                <h3>Tu Código QR:</h3>

                <img id="qr-resultado" src="${data.qr}" alt="Codigo QR" style="width: 200px; height: 200px;">

                ${detallesPuesto}

            `;

            document.getElementById('seccion-qr').style.display = 'block';

        } else {

            alert("Error: " + data.error);

        }

    };

}

async function votar(idPuesto) {

    console.log("Votando por puesto:", idPuesto);

    

    const res = await fetch(`${API_URL}/votar`, {

        method: 'POST',

        headers: {

            'Content-Type': 'application/json',

            'Authorization': `Bearer ${localStorage.getItem('token')}`

        },

        body: JSON.stringify({ idPuesto: idPuesto })

    });

    const data = await res.json();

    console.log("Respuesta:", data);

    

    if (res.ok) {

        console.log("Voto registrado exitosamente");

        actualizarRanking();

    } else {

        alert("No se pudo votar: " + (data.error || "Intenta de nuevo"));

    }

}



document.querySelectorAll('.btn-logout').forEach(btn => {

    btn.addEventListener('click', () => {

        localStorage.clear();

        window.location.reload();

    });

});

