const pool = require('../config/db');

// 1. Obtener todas las alertas/notificaciones de un usuario específico
const getAlertasUsuario = async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const result = await pool.query(
            `SELECT id_notificacion, tipo_alerta, titulo, mensaje, 
                    fecha_generacion, leido, id_referencia, nivel_prioridad
             FROM NOTIFICACION
             WHERE id_usuario = $1
             ORDER BY fecha_generacion DESC`,
            [id_usuario]
        );
        res.json(result.rows);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// 2. Marcar todas las notificaciones de un usuario como leídas (Para la Toolbar o la vista)
const marcarTodasLeidas = async (req, res) => {
    const { id_usuario } = req.params;
    try {
        await pool.query(
            `UPDATE NOTIFICACION 
             SET leido = true 
             WHERE id_usuario = $1`,
            [id_usuario]
        );
        res.json({ message: 'Todas las alertas marcadas como leídas' });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

module.exports = { getAlertasUsuario, marcarTodasLeidas };