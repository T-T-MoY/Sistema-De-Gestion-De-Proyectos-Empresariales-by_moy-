const pool = require('../config/db');

// 1. Obtener todas las tareas de un proyecto con el nombre de su responsable
const getTareasTablero = async (req, res) => {
    try {
        const { id_proyecto } = req.params;
        // Concatenamos nombre y apellido para no romper el frontend
        const result = await pool.query(`
            SELECT t.*, (u.nombre || ' ' || u.apellido_paterno) AS nombre_responsable
            FROM TAREA t
                     LEFT JOIN USUARIO u ON t.id_usuario = u.id_usuario
            WHERE t.id_proyecto = $1
            ORDER BY t.id_tarea DESC
        `, [id_proyecto]);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 2. Cambiar el estado de una tarea
const actualizarEstadoTarea = async (req, res) => {
    try {
        const { id_tarea } = req.params;
        const { estado } = req.body;
        await pool.query('UPDATE TAREA SET estado = $1 WHERE id_tarea = $2', [estado, id_tarea]);
        res.json({ message: 'Estado actualizado' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 3. Obtener comentarios de una tarea específica
const getComentariosTarea = async (req, res) => {
    try {
        const { id_tarea } = req.params;
        const result = await pool.query(`
            SELECT c.id_comentario, c.contenido AS comentario, c.fecha_comentario,
                   u.id_usuario, (u.nombre || ' ' || u.apellido_paterno) AS nombre_autor
            FROM COMENTARIO c
                     JOIN USUARIO u ON c.id_usuario = u.id_usuario
            WHERE c.id_tarea = $1
            ORDER BY c.fecha_comentario ASC
        `, [id_tarea]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error en BD:", error.message);
        res.status(500).json({ error: error.message });
    }
};

// 4. Agregar un nuevo comentario
const agregarComentario = async (req, res) => {
    try {
        const { id_tarea, id_usuario, comentario } = req.body;
        // Insertamos en la columna 'contenido' de la tabla de tu compañero
        await pool.query(
            'INSERT INTO COMENTARIO (contenido, id_tarea, id_usuario) VALUES ($1, $2, $3)',
            [comentario, id_tarea, id_usuario]
        );
        res.status(201).json({ message: 'Comentario guardado' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { getTareasTablero, actualizarEstadoTarea, getComentariosTarea, agregarComentario };