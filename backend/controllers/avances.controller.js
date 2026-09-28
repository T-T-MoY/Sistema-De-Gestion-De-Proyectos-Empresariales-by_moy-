const pool = require('../config/db');

// 1. Obtener tareas asignadas al usuario que no estén finalizadas
const getMisTareasActivas = async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const result = await pool.query(
            `SELECT id_tarea, titulo 
             FROM TAREA 
             WHERE id_usuario = $1 AND estado IN ('Pendiente', 'En Progreso')
             ORDER BY fecha_inicio ASC`,
            [id_usuario]
        );
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 2. Obtener historial de registros del usuario
const getMisRegistros = async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const result = await pool.query(
            `SELECT ra.*, t.titulo 
             FROM REGISTRO_AVANCE ra
             JOIN TAREA t ON ra.id_tarea = t.id_tarea
             WHERE ra.id_usuario = $1
             ORDER BY ra.fecha_reporte DESC, ra.id_registro DESC LIMIT 50`,
            [id_usuario]
        );
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 3. Registrar Horas y Actualizar Estado
const registrarAvance = async (req, res) => {
    console.log("=== REGISTRO DE AVANCE ===");
    console.log("Body completo:", JSON.stringify(req.body, null, 2));
    console.log("porcentaje_avance recibido:", req.body.porcentaje_avance);
    console.log("Tipo de dato:", typeof req.body.porcentaje_avance);

    const { id_tarea, id_usuario, fecha_reporte, horas_trabajadas, porcentaje_avance, detalle_trabajo } = req.body;

    // --- SANITIZACIÓN EXTREMA ---
    // Obligamos a Javascript a convertir los datos en números reales.
    // Si por algún motivo llega vacío, le asigna 0 automáticamente para evitar el 'null'.
    const horasFinal = parseFloat(horas_trabajadas) || 0;
    const porcentajeFinal = parseInt(porcentaje_avance) || 0;
    const tareaFinal = parseInt(id_tarea) || 0;
    const usuarioFinal = parseInt(id_usuario) || 0;

    try {
        await pool.query('BEGIN'); // Iniciar Transacción

        // Usamos las variables blindadas ($2 y $3)
        await pool.query(
            `INSERT INTO REGISTRO_AVANCE (fecha_reporte, horas_trabajadas, porcentaje_avance, detalle_trabajo, id_tarea, id_usuario)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [fecha_reporte, horasFinal, porcentajeFinal, detalle_trabajo, tareaFinal, usuarioFinal]
        );

        // Lógica automática de actualización de Tarea
        let nuevoEstado = null;
        if (porcentajeFinal === 100) {
            nuevoEstado = 'Finalizada';
        } else if (porcentajeFinal > 0) {
            nuevoEstado = 'En Progreso';
        }

        if (nuevoEstado) {
            await pool.query('UPDATE TAREA SET estado = $1 WHERE id_tarea = $2', [nuevoEstado, tareaFinal]);
        }

        await pool.query('COMMIT'); // Guardar cambios
        res.status(201).json({ message: 'Avance registrado con éxito' });
    } catch (error) {
        await pool.query('ROLLBACK'); // Si algo falla, deshacer todo
        res.status(500).json({ error: error.message });
    }
};
module.exports = { getMisTareasActivas, getMisRegistros, registrarAvance };