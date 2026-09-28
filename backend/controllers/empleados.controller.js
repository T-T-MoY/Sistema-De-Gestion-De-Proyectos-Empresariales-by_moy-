const pool = require('../config/db');

// 1. Obtener todos los empleados
const getEmpleados = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM USUARIO ORDER BY id_usuario DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Registrar un nuevo empleado
const crearEmpleado = async (req, res) => {
    // Añadidos los campos faltantes de la tabla USUARIO
    const { ci, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, telefono, direccion, correo, rol, especialidad, costo_hora } = req.body;
    try {
        await pool.query(
            `INSERT INTO USUARIO (ci, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, telefono, direccion, correo, rol, especialidad, costo_por_hora, password_hash, activo) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)`,
            [
                ci, nombre, apellido_paterno, apellido_materno, 
                fecha_nacimiento || null, 
                sexo || null, 
                telefono, direccion, correo, rol, especialidad, 
                parseFloat(costo_hora || 0), 
                ci // Password temporal
            ]
        );
        res.status(201).json({ message: 'Empleado registrado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Actualizar datos del empleado
const actualizarEmpleado = async (req, res) => {
    const { id } = req.params;
    const { ci, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, sexo, telefono, direccion, correo, rol, especialidad, costo_hora } = req.body;
    try {
        await pool.query(
            `UPDATE USUARIO 
             SET ci = $1, nombre = $2, apellido_paterno = $3, apellido_materno = $4, 
                 fecha_nacimiento = $5, sexo = $6, telefono = $7, direccion = $8, 
                 correo = $9, rol = $10, especialidad = $11, costo_por_hora = $12
             WHERE id_usuario = $13`,
            [
                ci, nombre, apellido_paterno, apellido_materno, 
                fecha_nacimiento || null, 
                sexo || null, 
                telefono, direccion, correo, rol, especialidad, 
                parseFloat(costo_hora || 0), 
                id
            ]
        );
        res.json({ message: 'Empleado actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Activar / Desactivar Empleado (Soft Delete)
const toggleEstado = async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;
    try {
        await pool.query('UPDATE USUARIO SET activo = $1 WHERE id_usuario = $2', [activo, id]);
        res.json({ message: 'Estado del empleado actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Borrar Empleado Definitivamente (Hard Delete)
const eliminarEmpleado = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM USUARIO WHERE id_usuario = $1', [id]);
        res.json({ message: 'Empleado eliminado permanentemente de la base de datos' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getEmpleados, crearEmpleado, actualizarEmpleado, toggleEstado, eliminarEmpleado };