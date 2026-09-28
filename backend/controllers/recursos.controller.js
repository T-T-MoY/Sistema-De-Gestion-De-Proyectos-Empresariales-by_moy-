const pool = require('../config/db');

// ==========================================
// 1. CRUD DEL CATÁLOGO DE RECURSOS (Tus funciones)
// ==========================================

const getRecursos = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM RECURSO_MATERIAL ORDER BY id_recurso DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const crearRecurso = async (req, res) => {
    const { nombre_recurso, descripcion, unidad_medida, costo_unitario, categoria } = req.body;
    try {
        await pool.query(
            `INSERT INTO RECURSO_MATERIAL (nombre_recurso, descripcion, unidad_medida, costo_unitario, categoria) 
             VALUES ($1, $2, $3, $4, $5)`,
            [nombre_recurso, descripcion, unidad_medida, parseFloat(costo_unitario), categoria]
        );
        res.status(201).json({ message: 'Recurso guardado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const actualizarRecurso = async (req, res) => {
    const { id } = req.params;
    const { nombre_recurso, descripcion, unidad_medida, costo_unitario, categoria } = req.body;
    try {
        await pool.query(
            `UPDATE RECURSO_MATERIAL 
             SET nombre_recurso = $1, descripcion = $2, unidad_medida = $3, costo_unitario = $4, categoria = $5 
             WHERE id_recurso = $6`,
            [nombre_recurso, descripcion, unidad_medida, parseFloat(costo_unitario), categoria, id]
        );
        res.json({ message: 'Recurso actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const eliminarRecurso = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM RECURSO_MATERIAL WHERE id_recurso = $1', [id]);
        res.json({ message: 'Recurso eliminado del catálogo' });
    } catch (error) {
        if (error.code === '23503') {
            res.status(400).json({ error: 'Acción bloqueada: Este recurso ya está siendo utilizado en uno o más proyectos.' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

// ==========================================
// 2. GESTIÓN DE RECURSOS EN PROYECTOS
// ==========================================

const getRecursosProyecto = async (req, res) => {
    const { id_proyecto } = req.params;
    try {
        const result = await pool.query(
            `SELECT u.id_recurso, r.nombre_recurso, r.unidad_medida, r.costo_unitario, 
                    u.cantidad_usada, u.fecha_uso, u.observacion,
                    (u.cantidad_usada * r.costo_unitario) AS costo_total
             FROM UTILIZA u
             JOIN RECURSO_MATERIAL r ON u.id_recurso = r.id_recurso
             WHERE u.id_proyecto = $1`,
            [id_proyecto]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const asignarRecurso = async (req, res) => {
    const { id_proyecto } = req.params;
    const { id_recurso, cantidad_usada, observacion } = req.body;
    try {
        await pool.query(
            `INSERT INTO UTILIZA (id_proyecto, id_recurso, cantidad_usada, fecha_uso, observacion)
             VALUES ($1, $2, $3, CURRENT_DATE, $4)
             ON CONFLICT (id_proyecto, id_recurso) 
             DO UPDATE SET cantidad_usada = UTILIZA.cantidad_usada + EXCLUDED.cantidad_usada,
                           observacion = EXCLUDED.observacion`,
            [id_proyecto, id_recurso, cantidad_usada, observacion]
        );
        res.json({ message: "Recurso asignado exitosamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// 4. Retirar un recurso por completo de un proyecto
const retirarRecurso = async (req, res) => {
    const { id_proyecto, id_recurso } = req.params;
    try {
        await pool.query(
            'DELETE FROM UTILIZA WHERE id_proyecto = $1 AND id_recurso = $2',
            [id_proyecto, id_recurso]
        );
        res.json({ message: "Recurso retirado del proyecto exitosamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const actualizarRecursoProyecto = async (req, res) => {
    const { id_proyecto, id_recurso } = req.params;
    const { cantidad_usada, observacion } = req.body;
    try {
        await pool.query(
            `UPDATE UTILIZA 
             SET cantidad_usada = $1, observacion = $2, fecha_uso = CURRENT_DATE 
             WHERE id_proyecto = $3 AND id_recurso = $4`,
            [cantidad_usada, observacion, id_proyecto, id_recurso]
        );
        res.json({ message: "Asignación actualizada correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


module.exports = {
    getRecursos, crearRecurso, actualizarRecurso, eliminarRecurso,
    getRecursosProyecto, asignarRecurso, retirarRecurso,actualizarRecursoProyecto
};