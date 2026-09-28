// backend/controllers/auth.controller.js
const db = require('../config/db');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const usuario = await db.query(
            `SELECT id_usuario, nombre, apellido_paterno, apellido_materno, correo, rol, ci, especialidad, telefono, foto_perfil
             FROM usuario
             WHERE correo = $1 AND password_hash = $2 AND activo = true`,
            [email, password]
        );

        if (usuario.rows.length > 0) {
            const user = usuario.rows[0];
            res.json({
                success: true,
                id_usuario: user.id_usuario,
                nombre_completo: user.nombre,
                nombre: user.nombre,
                apellido_paterno: user.apellido_paterno,
                apellido_materno: user.apellido_materno || '',
                correo: user.correo,
                rol: user.rol,
                ci: user.ci || '',
                especialidad: user.especialidad || '',
                telefono: user.telefono || '',
                foto_perfil: user.foto_perfil || ''
            });
        } else {
            res.status(401).json({ success: false, mensaje: "Credenciales incorrectas" });
        }
    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ success: false, mensaje: "Error interno del servidor" });
    }
};
module.exports = { login };