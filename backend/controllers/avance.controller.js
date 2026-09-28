// backend/controllers/avance.controller.js
const db = require('../config/db');

// ==========================================
// Registrar horas trabajadas 
// ==========================================
const registrarAvance = async (req, res) => {
    try {
        // Recibimos los datos desde el formulario del Frontend
        const { horas_trabajadas, detalle_trabajo, id_tarea, id_usuario } = req.body;

        // Validamos que no envíen datos vacíos
        if (!horas_trabajadas || !id_tarea || !id_usuario) {
            return res.status(400).json({ error: "Faltan datos obligatorios (horas, tarea o usuario)" });
        }

        // Hacemos el INSERT. La fecha_reporte se pone sola en Postgres (CURRENT_DATE)
        // Y el Trigger 'trg_descontar_presupuesto' se ejecutará mágicamente en el fondo.
        const query = `
            INSERT INTO REGISTRO_AVANCE (horas_trabajadas, detalle_trabajo, id_tarea, id_usuario) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        const values = [horas_trabajadas, detalle_trabajo, id_tarea, id_usuario];
        
        const { rows } = await db.query(query, values);
        
        res.status(201).json({
            mensaje: "Horas registradas exitosamente. El presupuesto del proyecto ha sido actualizado por el motor de BD.",
            avance_registrado: rows[0]
        });
    } catch (error) {
        console.error("Error al registrar avance:", error);
        res.status(500).json({ error: "Error interno al registrar las horas" });
    }
};

// ==========================================
// Obtener el historial de avances de una tarea
// ==========================================
const obtenerAvancesPorTarea = async (req, res) => {
    try {
        const { id_tarea } = req.params;

        const query = `
            SELECT r.id_registro, r.fecha_reporte, r.horas_trabajadas, r.detalle_trabajo, u.nombre_completo as empleado
            FROM REGISTRO_AVANCE r
            JOIN USUARIO u ON r.id_usuario = u.id_usuario
            WHERE r.id_tarea = $1
            ORDER BY r.fecha_reporte DESC;
        `;
        const { rows } = await db.query(query, [id_tarea]);
        
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener avances:", error);
        res.status(500).json({ error: "Error al cargar el historial de la tarea" });
    }
};

module.exports = {
    registrarAvance,
    obtenerAvancesPorTarea
};