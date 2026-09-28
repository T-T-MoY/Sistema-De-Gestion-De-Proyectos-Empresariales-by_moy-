const pool = require('../config/db');

/**
 * DASHBOARD ADMIN
 */
const getDashboardAdmin = async (req, res) => {
    try {
        // 1. Tus KPIs originales
        const resultKpis = await pool.query('SELECT * FROM fn_dashboard_admin();');
        if (resultKpis.rows.length === 0) return res.status(404).json({ message: "Sin datos" });
        const kpisBase = resultKpis.rows[0];

        // 2. Gráfico 1: Estado
        const qEstado = await pool.query("SELECT estado, COUNT(*) as cantidad FROM PROYECTO GROUP BY estado");
        
        // 3. Gráfico 2: Costos 
        const qCostos = await pool.query(`
            SELECT p.nombre_proyecto, p.presupuesto_total, r.costo_total as costo_real 
            FROM PROYECTO p 
            INNER JOIN sp_reporte_costos() r ON p.nombre_proyecto = r.proyecto 
            WHERE p.estado != 'Cancelado' 
            ORDER BY p.id_proyecto DESC LIMIT 5
        `);

        // 4. Gráfico 3: Productividad 
        const qProd = await pool.query(`
            SELECT TO_CHAR(fecha_reporte, 'DD/MM/YYYY') as fecha, SUM(horas_trabajadas) as horas 
            FROM REGISTRO_AVANCE 
            GROUP BY fecha_reporte 
            ORDER BY fecha_reporte DESC 
            LIMIT 7
        `);
        
        // Invertimos el resultado para que el gráfico de líneas vaya del día más antiguo al más reciente
        const productividadHistorica = qProd.rows.reverse();

        res.status(200).json({
            ...kpisBase, 
            graficos: {
                estado: qEstado.rows,
                costos: qCostos.rows,
                productividad: productividadHistorica
            }
        });
    } catch (error) {
        console.error('Error en Admin:', error);
        res.status(500).json({ message: 'Error interno de BD', error: error.message });
    }
};

/**
 * DASHBOARD GERENTE 
 */
const getDashboardGerente = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "Se requiere el ID del gerente." });

        const resultKpis = await pool.query('SELECT * FROM fn_dashboard_gerente($1);', [id]);
        if (resultKpis.rows.length === 0) return res.status(404).json({ message: "Sin datos" });
        const kpisBase = resultKpis.rows[0];

        const qEstado = await pool.query("SELECT estado, COUNT(*) as cantidad FROM PROYECTO WHERE id_gerente = $1 GROUP BY estado", [id]);
        
        // MAGIA 2: Le pasamos el ID del gerente a tu función de costos
        const qCostos = await pool.query(`
            SELECT p.nombre_proyecto, p.presupuesto_total, r.costo_total as costo_real 
            FROM PROYECTO p 
            INNER JOIN sp_reporte_costos(NULL, $1) r ON p.nombre_proyecto = r.proyecto 
            WHERE p.id_gerente = $1 AND p.estado != 'Cancelado' 
            ORDER BY p.id_proyecto DESC LIMIT 5
        `, [id]);

        res.status(200).json({
            ...kpisBase, 
            graficos: {
                estado: qEstado.rows,
                costos: qCostos.rows,
                productividad: []
            }
        });
    } catch (error) {
        console.error('Error en Gerente:', error);
        res.status(500).json({ message: 'Error interno de BD', error: error.message });
    }
};

/**
 * DASHBOARD EMPLEADO
 */
const getDashboardEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "Se requiere el ID del empleado." });

        const result = await pool.query('SELECT * FROM fn_dashboard_empleado($1);', [id]);
        if (result.rows.length > 0) {
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).json({ message: "No se encontraron datos." });
        }
    } catch (error) {
        console.error('Error en Empleado:', error);
        res.status(500).json({ message: 'Error interno', error: error.message });
    }
};

module.exports = { getDashboardAdmin, getDashboardGerente, getDashboardEmpleado };