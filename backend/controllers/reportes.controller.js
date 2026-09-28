const pool = require('../config/db');

// ==========================================
// PROCEDIMIENTOS ALMACENADOS ORIGINALES
// ==========================================

// 1. Reporte de Costos Original (Procedimiento)
const getReporteCostos = async (req, res) => {
    try {
        let { id_proyecto, id_usuario, rol } = req.query;
        let paramProyecto = (id_proyecto === 'Todos' || !id_proyecto) ? null : parseInt(id_proyecto);
        let paramGerente = (rol === 'Gerente') ? parseInt(id_usuario) : null;
        
        const result = await pool.query('SELECT * FROM sp_reporte_costos($1, $2)', [paramProyecto, paramGerente]);
        res.json(result.rows);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: error.message }); 
    }
};

// 2. Reporte de Avance Original (Procedimiento)
const getReporteAvance = async (req, res) => {
    try {
        let { id_proyecto, id_usuario, rol } = req.query;
        let paramProyecto = (id_proyecto === 'Todos' || !id_proyecto) ? null : parseInt(id_proyecto);
        let paramGerente = (rol === 'Gerente') ? parseInt(id_usuario) : null;
        
        const result = await pool.query('SELECT * FROM sp_reporte_avance_general($1, $2)', [paramProyecto, paramGerente]);
        res.json(result.rows);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: error.message }); 
    }
};

// ==========================================
// VISTAS NUEVAS ADICIONALES (NUEVOS REPORTES)
// ==========================================

// 3. Reporte Financiero Detallado (Vista)
const getReporteFinancieroView = async (req, res) => {
    try {
        let { id_proyecto, id_usuario, rol } = req.query;
        let paramProyecto = (id_proyecto === 'Todos' || !id_proyecto) ? null : parseInt(id_proyecto);
        let paramGerente = (rol === 'Gerente') ? parseInt(id_usuario) : null;
        
        const query = `
            SELECT v.* FROM vw_reporte_financiero v
            JOIN PROYECTO p ON v.id_proyecto = p.id_proyecto
            WHERE ($1::int IS NULL OR v.id_proyecto = $1)
              AND ($2::int IS NULL OR p.id_gerente = $2)
            ORDER BY v.id_proyecto DESC;
        `;
        const result = await pool.query(query, [paramProyecto, paramGerente]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// 4. Reporte de Cronograma de Tareas (Vista)
const getReporteCronogramaView = async (req, res) => {
    try {
        let { id_proyecto, id_usuario, rol } = req.query;
        let paramProyecto = (id_proyecto === 'Todos' || !id_proyecto) ? null : parseInt(id_proyecto);
        let paramGerente = (rol === 'Gerente') ? parseInt(id_usuario) : null;
        
        const query = `
            SELECT v.* FROM vw_reporte_cronograma_tareas v
            JOIN PROYECTO p ON v.id_proyecto = p.id_proyecto
            WHERE ($1::int IS NULL OR v.id_proyecto = $1)
              AND ($2::int IS NULL OR p.id_gerente = $2)
            ORDER BY v.id_proyecto DESC, v.id_tarea ASC;
        `;
        const result = await pool.query(query, [paramProyecto, paramGerente]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// ==========================================
// NUEVO: REPORTE DE NÓMINA Y RENDIMIENTO
// ==========================================

// 5. Reporte de Nómina de Empleados (Global o por Proyecto con filtro de fechas)
const getReporteNomina = async (req, res) => {
    try {
        // 1. Atrapamos los nuevos parámetros de fecha que envía Vue
        let { id_proyecto, id_usuario, rol, fecha_inicio, fecha_fin } = req.query;
        
        let paramProyecto = (id_proyecto === 'Todos' || !id_proyecto) ? null : parseInt(id_proyecto);
        let paramGerente = (rol === 'Gerente') ? parseInt(id_usuario) : null;
        
        // 2. Si vienen vacíos desde el frontend, los enviamos como null a PostgreSQL
        let paramFechaInicio = fecha_inicio ? fecha_inicio : null;
        let paramFechaFin = fecha_fin ? fecha_fin : null;

        // 3. Ejecutamos la función con los 4 parámetros (Proyecto, Gerente, FechaInicio, FechaFin)
        const result = await pool.query(
            'SELECT * FROM fn_reporte_nomina_global($1, $2, $3, $4)', 
            [paramProyecto, paramGerente, paramFechaInicio, paramFechaFin]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { 
    getReporteCostos, 
    getReporteAvance, 
    getReporteFinancieroView, 
    getReporteCronogramaView,
    getReporteNomina
};