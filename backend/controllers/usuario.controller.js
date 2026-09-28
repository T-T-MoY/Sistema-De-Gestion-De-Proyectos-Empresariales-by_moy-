const pool = require('../config/db');

// 1. Obtener datos actuales del usuario
const obtenerPerfil = async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const result = await pool.query(
            `SELECT id_usuario, nombre, apellido_paterno, apellido_materno, correo, telefono, rol,
                    especialidad, ci, sexo, fecha_nacimiento, direccion, foto_perfil
             FROM USUARIO WHERE id_usuario = $1`,
            [id_usuario]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Actualizar datos personales
const actualizarPerfil = async (req, res) => {
    const { id_usuario, nombre, apellido_paterno, apellido_materno, telefono, especialidad, direccion } = req.body;
    try {
        await pool.query(
            `UPDATE USUARIO
             SET nombre = $1, apellido_paterno = $2, apellido_materno = $3, telefono = $4, especialidad = $5, direccion = $6
             WHERE id_usuario = $7`,
            [nombre, apellido_paterno, apellido_materno, telefono, especialidad, direccion, id_usuario]
        );
        res.json({ message: "Perfil actualizado correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Cambiar contraseña validando la anterior 
const cambiarPassword = async (req, res) => {
    const { id_usuario, passActual, passNueva } = req.body;
    try {
        // Buscamos la contraseña actual
        const user = await pool.query('SELECT password_hash FROM USUARIO WHERE id_usuario = $1', [id_usuario]);

        // Verificamos si existe y si coincide
        if (user.rows.length === 0 || user.rows[0].password_hash !== passActual) {
            return res.status(401).json({ error: "La contraseña actual es incorrecta." });
        }

        // Si es correcta, actualizamos
        await pool.query('UPDATE USUARIO SET password_hash = $1 WHERE id_usuario = $2', [passNueva, id_usuario]);
        res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Guardar la ruta de la foto en la base de datos 
const subirFotoPerfil = async (req, res) => {
    const { id_usuario } = req.body;

    // req.file contiene el archivo que subió multer
    if (!req.file) return res.status(400).json({ error: "No se subió ninguna imagen" });

    // Armamos la URL pública de la imagen
    const rutaFoto = `http://localhost:3000/uploads/${req.file.filename}`;

    try {
        await pool.query('UPDATE USUARIO SET foto_perfil = $1 WHERE id_usuario = $2', [rutaFoto, id_usuario]);
        res.json({ message: "Foto actualizada", url: rutaFoto });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Exportación de módulos
module.exports = { obtenerPerfil, actualizarPerfil, cambiarPassword, subirFotoPerfil };