const jwt = require('jsonwebtoken');


const authenticateToken = (req, res, next) => {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    if (token == null) {
        return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT error de verificación:', err);
            return res.status(403).json({ error: 'Token inválido o expirado' });
        }

        req.user = user;
        next(); 
    });
};

module.exports = authenticateToken;