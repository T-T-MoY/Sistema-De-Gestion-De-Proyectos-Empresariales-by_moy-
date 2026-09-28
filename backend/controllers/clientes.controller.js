const pool = require('../config/db');

// Obtener todos los clientes
const getClientes = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM CLIENTE ORDER BY id_cliente DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Crear un nuevo cliente
const crearCliente = async (req, res) => {
    const { nombre_empresa, nit, telefono_contacto, correo_empresa, direccion_empresa } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO CLIENTE (nombre_empresa, nit, telefono_contacto, correo_empresa, direccion_empresa) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nombre_empresa, nit, telefono_contacto, correo_empresa, direccion_empresa]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar un cliente existente
const actualizarCliente = async (req, res) => {
    const { id } = req.params;
    // Agregamos 'activo' a los datos que recibimos
    const { nombre_empresa, nit, telefono_contacto, correo_empresa, direccion_empresa, activo } = req.body;
    try {
        await pool.query(
            'UPDATE CLIENTE SET nombre_empresa = $1, nit = $2, telefono_contacto = $3, correo_empresa = $4, direccion_empresa = $5, activo = $6 WHERE id_cliente = $7',
            [nombre_empresa, nit, telefono_contacto, correo_empresa, direccion_empresa, activo, id]
        );
        res.json({ message: 'Cliente actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cambiar el estado del cliente (Activo / Inactivo)
const cambiarEstadoCliente = async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body; // true o false
    try {
        await pool.query('UPDATE CLIENTE SET activo = $1 WHERE id_cliente = $2', [activo, id]);
        res.json({ message: 'Estado del cliente actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar cliente físicamente (Hard Delete)
const eliminarCliente = async (req, res) => {
    const { id } = req.params;
    const { rol } = req.query; // Recibimos el rol desde el frontend

    // Candado de seguridad: Solo el Admin pasa de aquí
    if (rol !== 'Admin') {
        return res.status(403).json({ error: 'Permiso denegado. Solo el Administrador del sistema puede eliminar clientes físicamente.' });
    }

    try {
        await pool.query('DELETE FROM CLIENTE WHERE id_cliente = $1', [id]);
        res.json({ message: 'Cliente eliminado definitivamente de la base de datos' });
    } catch (error) {
        // Código 23503 en PostgreSQL es violación de llave foránea (ya tiene proyectos)
        if (error.code === '23503') {
            res.status(400).json({ error: 'No puedes eliminar este cliente porque ya tiene proyectos asignados. El protocolo exige cambiar su estado a Inactivo.' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

// Asegúrate de exportarla al final del archivo
module.exports = { getClientes, crearCliente, actualizarCliente, cambiarEstadoCliente, eliminarCliente };

