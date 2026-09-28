const pool = require('../config/db');

// Listar miembros de un proyecto
const getMiembros = async (req, res) => {
    try {
        const { id_proyecto } = req.params;
        const result = await pool.query('SELECT * FROM fn_obtener_equipo_proyecto($1)', [id_proyecto]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Asignar empleado (INSERT)
const asignarMiembro = async (req, res) => {
    try {
        const { id_proyecto, id_usuario, rol_en_proyecto } = req.body;
        await pool.query(
            'INSERT INTO ES_MIEMBRO (id_proyecto, id_usuario, rol_en_proyecto) VALUES ($1, $2, $3)',
            [id_proyecto, id_usuario, rol_en_proyecto]
        );
        res.status(201).json({ message: 'Miembro asignado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Quitar empleado (DELETE)
const quitarMiembro = async (req, res) => {
    try {
        const { id_proyecto, id_usuario } = req.params;
        await pool.query('DELETE FROM ES_MIEMBRO WHERE id_proyecto = $1 AND id_usuario = $2', [id_proyecto, id_usuario]);
        res.json({ message: 'Miembro eliminado del proyecto' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- FUNCIONES EXTRAS PARA LOS SELECTS DINÁMICOS DEL HTML ---

// Obtener Proyectos filtrados por ROL
const getProyectosCombo = async (req, res) => {
    try {
        const { rol, id } = req.query;
        let query = "";
        let valores = [];

        if (rol === 'Admin') {
            query = "SELECT id_proyecto, nombre_proyecto FROM PROYECTO WHERE estado != 'Cancelado' ORDER BY id_proyecto DESC";
        } else if (rol === 'Gerente') {
            query = "SELECT id_proyecto, nombre_proyecto FROM PROYECTO WHERE estado != 'Cancelado' AND id_gerente = $1 ORDER BY id_proyecto DESC";
            valores = [id];
        } else {
            // Empleado
            query = `SELECT p.id_proyecto, p.nombre_proyecto 
                     FROM PROYECTO p JOIN ES_MIEMBRO em ON p.id_proyecto = em.id_proyecto 
                     WHERE p.estado != 'Cancelado' AND em.id_usuario = $1 ORDER BY p.id_proyecto DESC`;
            valores = [id];
        }

        const result = await pool.query(query, valores);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// NUEVO: Asignar Tarea desde la vista de equipo
const asignarTarea = async (req, res) => {
    try {
        const { titulo, descripcion, fecha_inicio, fecha_fin_estimada, horas_estimadas, prioridad, id_proyecto, id_usuario } = req.body;
        
        await pool.query(
            `INSERT INTO TAREA (titulo, descripcion, fecha_inicio, fecha_fin_estimada, horas_estimadas, prioridad, id_proyecto, id_usuario) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [titulo, descripcion, fecha_inicio, fecha_fin_estimada, horas_estimadas, prioridad, id_proyecto, id_usuario]
        );
        res.status(201).json({ message: 'Tarea asignada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



// Obtener Empleados para el Modal
const getEmpleadosCombo = async (req, res) => {
    try {
        const result = await pool.query("SELECT id_usuario, (nombre || ' ' || apellido_paterno) AS nombre, especialidad FROM USUARIO WHERE rol = 'Empleado'");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};




// ==========================================
// NUEVO: FUNCIONES PARA EDITAR/BORRAR TAREAS
// ==========================================

// 1. Obtener lista de tareas de un empleado específico en un proyecto
const getTareasEmpleado = async (req, res) => {
    try {
        const { id_proyecto, id_usuario } = req.params;
        const result = await pool.query(
            'SELECT * FROM TAREA WHERE id_proyecto = $1 AND id_usuario = $2 ORDER BY id_tarea DESC',
            [id_proyecto, id_usuario]
        );
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 2. Actualizar una tarea
const actualizarTarea = async (req, res) => {
    try {
        const { id_tarea } = req.params;
        const { titulo, descripcion, fecha_inicio, fecha_fin_estimada, horas_estimadas, prioridad } = req.body;
        
        await pool.query(
            `UPDATE TAREA SET titulo=$1, descripcion=$2, fecha_inicio=$3, fecha_fin_estimada=$4, horas_estimadas=$5, prioridad=$6 WHERE id_tarea=$7`,
            [titulo, descripcion, fecha_inicio, fecha_fin_estimada, horas_estimadas, prioridad, id_tarea]
        );
        res.json({ message: 'Tarea actualizada exitosamente' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 3. Eliminar una tarea
const eliminarTarea = async (req, res) => {
    try {
        const { id_tarea } = req.params;
        await pool.query('DELETE FROM TAREA WHERE id_tarea = $1', [id_tarea]);
        res.json({ message: 'Tarea eliminada' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// No olvides actualizar tu export para incluirlas:
module.exports = { 
    getMiembros, asignarMiembro, quitarMiembro, 
    getProyectosCombo, getEmpleadosCombo, asignarTarea,
    getTareasEmpleado, actualizarTarea, eliminarTarea
};



