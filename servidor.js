require('dotenv').config();

const express = require('express');

const cors = require('cors');

const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

const path = require('path');

const QRCode = require('qrcode');

const { createClient } = require('@supabase/supabase-js');

const authenticateToken = require('./middleware/autenticacion_middleware');

const multer = require('multer');



const app = express();

const upload = multer({ storage: multer.memoryStorage() });



app.use(express.json());

app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));



const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const port = process.env.PORT || 3000;

app.post('/registrar', async (req, res) => {

    try {

        const { username, password, rol } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const { error } = await supabase.from('usuarios').insert([{ username, password: hashedPassword, rol }]);

        if (error) return res.status(400).json({ error: 'Error al registrar usuario: ' + error.message });

        res.status(201).json({ message: 'Registrado correctamente' });

    } catch (e) { res.status(500).json({ error: 'Error interno' }); }

});



app.post('/login', async (req, res) => {

    const { username, password } = req.body;

    const { data: user } = await supabase.from('usuarios').select('*').eq('username', username).single();

    if (!user || !(await bcrypt.compare(password, user.password))) {

        return res.status(401).json({ error: 'Credenciales inválidas' });

    }

    const token = jwt.sign({ username: user.username, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, rol: user.rol });

});

app.post('/crear-puesto', authenticateToken, upload.single('imagen'), async (req, res) => {

    try {

        if (req.user.rol !== 'participante') return res.status(403).json({ error: 'Solo participantes' });



        const { nombre_puesto, biografia } = req.body;

        const latitud = parseFloat(req.body.latitud) || 0;

        const longitud = parseFloat(req.body.longitud) || 0;

        const file = req.file;

        let imagenUrl = null;
        if (file) {

            const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;

            const { error: storageError } = await supabase.storage.from('fritos').upload(fileName, file.buffer, {

                contentType: file.mimetype,

                upsert: true

            });

           

            if (storageError) {

                console.error("DETALLE ERROR STORAGE:", storageError);

            } else {

                const { data } = supabase.storage.from('fritos').getPublicUrl(fileName);

                imagenUrl = data.publicUrl;

            }

        }
        const qrImage = await QRCode.toDataURL(`http://localhost:3000/perfil?puesto=${req.user.username}`);



const { data, error: dbError } = await supabase.from('puestos').insert([{

            id_usuario: req.user.username,

            nombre_puesto,

            biografia,

            latitud,

            longitud,

            imagen_url: imagenUrl,

            qr_code: qrImage

        }]).select();



        if (dbError) {

            console.error("DETALLE ERROR DB:", dbError);

            return res.status(400).json({ error: `Error en DB: ${dbError.message} (${dbError.hint || 'Sin detalles extra'})` });

        }



        res.status(201).json({ message: "Puesto creado", qr: qrImage, puesto: data[0] });



    } catch (e) {

        console.error("ERROR CRITICO SERVIDOR:", e);

        res.status(500).json({ error: 'Fallo total en el servidor: ' + e.message });

    }

});



app.get('/puestos', async (req, res) => {

    const { data } = await supabase.from('puestos').select('*');

    res.json(data || []);

});



app.post('/votar', authenticateToken, async (req, res) => {

    try {

        const { idPuesto } = req.body;

        console.log(`[VOTO] Usuario: ${req.user.username}, Puesto: ${idPuesto}`);

        const { data: puesto, error: errorPuesto } = await supabase

            .from('puestos')

            .select('*')

            .eq('id', idPuesto)

            .single();

        

        if (errorPuesto || !puesto) {

            console.log("[VOTO] ERROR: Puesto no encontrado");

            return res.status(400).json({ error: 'Puesto no existe' });

        }

        const { data: votoExistente, error: errorVotoCheck } = await supabase

            .from('votos')

            .select('*')

            .eq('username', req.user.username);

        

        if (votoExistente && votoExistente.length > 0) {

            console.log("[VOTO] ERROR: Usuario ya votó");

            return res.status(400).json({ error: 'Ya has votado una vez. Solo se permite un voto por usuario.' });

        }

        const { data, error } = await supabase.from('votos').insert([{ 

            id_puesto: idPuesto, 

            username: req.user.username 

        }]).select();

        

        if (error) {

            console.log("[VOTO] ERROR en insert:", error);

            return res.status(400).json({ error: 'Error al votar: ' + error.message });

        }

        

        console.log("[VOTO] Exitoso - Data:", data);

        res.json({ message: 'Voto registrado', data: data });

    } catch (e) {

        console.error("[VOTO] Error crítico:", e);

        res.status(500).json({ error: 'Error: ' + e.message });

    }

});



app.get('/ranking-fritos', async (req, res) => {

    try {

        const { data: puestos } = await supabase.from('puestos').select('*');

        if (!puestos) return res.json([]);

        const { data: votos } = await supabase.from('votos').select('id_puesto');

        const conteoVotos = {};

        if (votos) {

            votos.forEach(v => {

                conteoVotos[v.id_puesto] = (conteoVotos[v.id_puesto] || 0) + 1;

            });

        }

        const ranking = puestos.map(puesto => ({

            id: puesto.id,

            nombre: puesto.nombre_puesto,

            votos: conteoVotos[puesto.id] || 0,

            imagen: puesto.imagen_url,

            usuario: puesto.id_usuario

        })).sort((a, b) => b.votos - a.votos);

        res.json(ranking);

    } catch (e) {

        console.error("Error en ranking:", e);

        res.status(500).json({ error: e.message });

    }

});



app.get('/perfil', async (req, res) => {

    const username = req.query.puesto;

    const { data: puesto } = await supabase.from('puestos').select('*').eq('id_usuario', username).single();

    const { data: votos } = await supabase.from('votos').select('id').eq('id_puesto', puesto.id);

    res.send(`

        <h1>${puesto.nombre_puesto}</h1>

        <p>Usuario: ${puesto.id_usuario}</p>

        <p>Historia: ${puesto.biografia}</p>

        <p>Votos: ${votos ? votos.length : 0}</p>

        <p>Ubicacion: ${puesto.latitud}, ${puesto.longitud}</p>

        ${puesto.imagen_url ? `<img src="${puesto.imagen_url}" style="max-width:100%;">` : ''}

    `);

});



app.listen(port, () => console.log(`Servidor corriendo en puerto ${port}`));