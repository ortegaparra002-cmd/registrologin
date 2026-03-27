require('dotenv').config();

const express = require('express');
const cors = require('cors');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { createClient } = require('@supabase/supabase-js');
const authenticateToken = require('./middleware/autenticacion_middleware');
const app = express();
app.use(express.json()); 
app.use(cors()); 

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const port = 3000;
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

app.use(cors());

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

app.post('/registrar', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'El nombre de usuario y contraseña son requeridos' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const { data, error } = await supabase
            .from('usuarios')
            .insert([{ username, password: hashedPassword }]);

        if (error) {
            console.error('Error durante el registro:', error);
            return res.status(500).json({ error: 'El registro de usuario falló' });
        }

        res.status(201).json({ message: 'Usuario registrado correctamente' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const { data: users, error } = await supabase
            .from('usuarios')
            .select('password')
            .eq('username', username)
            .single();

        if (error || !users) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, users.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const token = jwt.sign({ username: username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Inicio de sesión exitoso!', token });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


app.get('/recurso-protegido', authenticateToken, (req, res) => {
    res.status(200).json({
        message: `Bienvenido al recurso protegido, ${req.user.username}!`,
        data: 'Esta información es sólo para usuarios autenticados'
    });
});