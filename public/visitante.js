const listaPuestos = document.getElementById('contenedor-puestos');

let map;
let markers = {};
function inicializarMapa() {
    if (map) return;
    map = L.map('mapa-fritos').setView([5.5, -73.2], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
}
async function cargarPuestos() {
    try {
        const res = await fetch(`${API_URL}/puestos`);
        const puestos = await res.json();
        
        inicializarMapa();
        renderizarPuestos(puestos);
        agregarMarcadores(puestos);
        actualizarRanking();
        
    } catch (error) {
        console.error("Error al cargar puestos:", error);
    }
}
function renderizarPuestos(puestos) {
    listaPuestos.innerHTML = '';
    puestos.forEach(puesto => {
        const card = document.createElement('div');
        card.className = 'puesto-card';
        card.innerHTML = `
            <h3>${puesto.nombre_puesto}</h3>
            <p>${puesto.biografia}</p>
            ${puesto.imagen_url ? `<img src="${puesto.imagen_url}" alt="${puesto.nombre_puesto}" class="puesto-imagen">` : ''}
            <p class="ubicacion">Ubicacion: ${puesto.latitud.toFixed(4)}, ${puesto.longitud.toFixed(4)}</p>
            <button onclick="votarPuesto(${puesto.id})">Votar por este frito</button>
            <hr>
        `;
        listaPuestos.appendChild(card);
    });
}
function agregarMarcadores(puestos) {
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};
    
    if (puestos.length === 0) return;
    let group = new L.featureGroup();
    
    puestos.forEach(puesto => {
        if (puesto.latitud && puesto.longitud) {
            const marker = L.marker([puesto.latitud, puesto.longitud]).bindPopup(`
                <div class="popup-puesto">
                    <h4>${puesto.nombre_puesto}</h4>
                    <p>${puesto.biografia}</p>
                    ${puesto.imagen_url ? `<img src="${puesto.imagen_url}" alt="${puesto.nombre_puesto}" style="width: 100%; max-height: 150px; border-radius: 4px;">` : ''}
                    <button onclick="votarPuesto(${puesto.id})" style="margin-top: 10px;">Votar</button>
                </div>
            `).addTo(map);
            
            markers[puesto.id] = marker;
            group.addLayer(marker);
        }
    });
    
    if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
}
async function votarPuesto(idPuesto) {

    const token = localStorage.getItem('token');

    const rol = localStorage.getItem('rol');



    if (!token || rol !== 'visitante') {

        alert("Solo los visitantes pueden votar");

        return;

    }



    try {

        const res = await fetch(`${API_URL}/votar`, {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json',

                'Authorization': `Bearer ${token}`

            },

            body: JSON.stringify({ idPuesto })

        });



        const data = await res.json();

        alert(data.message || data.error);

    } catch (error) {

        alert("Error al procesar el voto");

    }

}



document.addEventListener('DOMContentLoaded', () => {
    cargarPuestos();
    setInterval(actualizarRanking, 5000);
});