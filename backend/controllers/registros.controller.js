const pool = require('../config/db'); // Ajusta la ruta a tu conexión de BD

const obtenerRegistrosPorAprobar = async (req, res) => {
  try {
    const id_gerente = req.query.id_gerente; 
    
    if (!id_gerente) {
      return res.status(400).json({ error: 'El ID del gerente es obligatorio' });
    }

    // CORRECCIÓN: Añadido "ra.estado" al SELECT para que el frontend pueda filtrar
    // Mantenemos la consulta sin "WHERE ra.estado = 'Pendiente'" para que el frontend 
    // reciba todos y pueda usar su select de "Mostrar Todos / Aprobados / Rechazados"
    const query = `
      SELECT 
        ra.id_registro, 
        (u.nombre || ' ' || u.apellido_paterno) AS empleado,
        p.nombre_proyecto AS proyecto, 
        t.titulo AS tarea,
        ra.horas_trabajadas, 
        ra.porcentaje_avance, 
        ra.fecha_reporte,
        ra.estado 
      FROM REGISTRO_AVANCE ra
      JOIN TAREA t ON ra.id_tarea = t.id_tarea
      JOIN PROYECTO p ON t.id_proyecto = p.id_proyecto
      JOIN USUARIO u ON ra.id_usuario = u.id_usuario
      WHERE p.id_gerente = $1 
      ORDER BY ra.fecha_reporte DESC; 
    `;
    
    const { rows } = await pool.query(query, [id_gerente]);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ error: 'Error interno del servidor al consultar la base de datos' });
  }
};

const procesarAprobacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; 

    // CORRECCIÓN: Validación estricta de los datos de entrada
    const estadosValidos = ['Aprobado', 'Rechazado', 'Pendiente'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Intento de inyección o dato corrupto.' });
    }
    
    // Ejecutamos la actualización real en la base de datos
    const query = `
      UPDATE REGISTRO_AVANCE 
      SET estado = $1 
      WHERE id_registro = $2 
      RETURNING *;
    `;
    
    const { rows } = await pool.query(query, [estado, id]);

    // Verificamos si el registro realmente existía y se actualizó
    if (rows.length === 0) {
      return res.status(404).json({ error: 'El registro especificado no existe.' });
    }

    res.status(200).json({ 
      message: `El registro de horas fue ${estado.toLowerCase()} correctamente.`,
      registro_actualizado: rows[0]
    });

  } catch (error) {
    console.error('Error procesando la aprobación:', error);
    res.status(500).json({ error: 'Error al intentar actualizar el estado en la base de datos.' });
  }
};

module.exports = { obtenerRegistrosPorAprobar, procesarAprobacion };