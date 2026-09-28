const pool = require('../config/db');

// SELECT (Leer todos con filtro de ROLES y Modo Depuración)
const getProyectos = async (req, res) => {
    try {
        const { rol, id } = req.query; 
        
        console.log(`➡️ Solicitud de Proyectos - ROL: ${rol} | ID: ${id}`);
        
        // VALIDACIÓN DE SEGURIDAD
        if ((rol === 'Gerente' || rol === 'Empleado') && (!id || id === 'undefined' || isNaN(id))) {
            return res.status(400).json({ 
                error: "El ID del usuario es inválido o se perdió la sesión. Por favor, cierra sesión y vuelve a entrar." 
            });
        }
        
        let query = 'SELECT * FROM fn_obtener_proyectos()'; 
        let valores = [];

        if (rol === 'Gerente') {
            query = `
                SELECT f.* FROM fn_obtener_proyectos() f
                JOIN PROYECTO p ON f.id = p.id_proyecto
                WHERE p.id_gerente = $1
            `;
            valores = [id];
        } else if (rol === 'Empleado') {
            query = `
                SELECT f.* FROM fn_obtener_proyectos() f
                JOIN ES_MIEMBRO m ON f.id = m.id_proyecto
                WHERE m.id_usuario = $1
            `;
            valores = [id];
        }

        const result = await pool.query(query, valores);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('💥 ERROR SQL EN getProyectos:', error.message);
        res.status(500).json({ message: 'Error al obtener proyectos', error: error.message });
    }
};

// INSERT (Crear nuevo)
const createProyecto = async (req, res) => {
    try {
        console.log("➡️ Datos recibidos del Frontend:", req.body);

        // EXTRAEMOS LAS NUEVAS FECHAS DEL BODY
        const { nombre, descripcion, id_cliente, id_gerente, fecha_inicio, fecha_fin_estimada, fecha_fin_real, presupuesto, estado } = req.body;
        
        const query = `
            INSERT INTO PROYECTO (
                nombre_proyecto, 
                descripcion, 
                id_cliente, 
                id_gerente, 
                fecha_inicio, 
                fecha_fin_estimada, 
                fecha_fin_real,
                presupuesto_total, 
                estado
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;
        
        // AÑADIMOS LAS VARIABLES AL ARREGLO EN ORDEN EXACTO
        const valores = [nombre, descripcion, id_cliente, id_gerente, fecha_inicio, fecha_fin_estimada, fecha_fin_real, presupuesto, estado];
        
        const result = await pool.query(query, valores);
        
        res.status(201).json({ 
            message: 'Proyecto creado exitosamente', 
            proyecto: result.rows[0] 
        });

    } catch (error) {
        console.error('💥 ERROR REAL DE POSTGRESQL:', error.message);
        res.status(500).json({ 
            error: error.message,
            detalle: 'Revisa la consola de Node.js para más información'
        });
    }
};

// UPDATE (Actualizar)
const updateProyecto = async (req, res) => {
    try {
        const { id } = req.params;
        // EXTRAEMOS LAS NUEVAS FECHAS
        const { nombre, descripcion, id_cliente, id_gerente, fecha_inicio, fecha_fin_estimada, fecha_fin_real, presupuesto, estado } = req.body;
        
        await pool.query(
            `UPDATE PROYECTO 
             SET nombre_proyecto = $1, 
                 descripcion = $2, 
                 id_cliente = $3, 
                 id_gerente = $4, 
                 fecha_inicio = $5, 
                 fecha_fin_estimada = $6,
                 fecha_fin_real = $7,
                 presupuesto_total = $8, 
                 estado = $9 
             WHERE id_proyecto = $10`,
            [nombre, descripcion, id_cliente, id_gerente, fecha_inicio, fecha_fin_estimada, fecha_fin_real, presupuesto, estado, id]
        );
        res.status(200).json({ message: 'Proyecto actualizado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// DELETE (Borrar)
const deleteProyecto = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM PROYECTO WHERE id_proyecto = $1', [id]);
        res.status(200).json({ message: 'Proyecto eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};

// SELECT ONE (Obtener datos de 1 proyecto para editar en el modal)
const getProyectoById = async (req, res) => {
    try {
        const { id } = req.params;
        // Al usar SELECT *, PostgreSQL ya traerá las nuevas columnas automáticamente
        const result = await pool.query('SELECT * FROM PROYECTO WHERE id_proyecto = $1', [id]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener datos', error: error.message });
    }
};

module.exports = { getProyectos, createProyecto, updateProyecto, deleteProyecto, getProyectoById };