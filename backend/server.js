// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const db = require('./config/db'); 

// Importamos las rutas
const proyectoRoutes = require('./routes/proyectos.routes');
const authRoutes = require('./routes/auth.routes'); 
const dashboardRoutes = require('./routes/dashboard.routes');
const proyectosRoutes = require('./routes/proyectos.routes');
const equipoRoutes = require('./routes/equipo.routes');
const tareasRoutes = require('./routes/tareas.routes');
const reportesRoutes = require('./routes/reportes.routes');
const clientesRoutes = require('./routes/clientes.routes');
const avancesRoutes = require('./routes/avances.routes');
const recursosRoutes = require('./routes/recursos.routes');
const alertasRoutes = require('./routes/alertas.routes');
const usuariosRoutes = require('./routes/usuario.routes');
const empleadosRoutes = require('./routes/empleados.routes');
const registrosRoutes = require('./routes/registros.routes');

// Middlewares
app.use(cors()); // Permite peticiones desde el frontend
app.use(express.json()); // Permite recibir datos en formato JSON

// Usamos las rutas
app.use('/api/proyectos', proyectoRoutes);
app.use('/api/avances', avancesRoutes);
app.use('/api', authRoutes); 
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/proyectos', proyectosRoutes);
app.use('/api/equipo', equipoRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/recursos', recursosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/usuario', usuariosRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/registros', registrosRoutes);


app.use('/uploads', express.static('uploads'));
// ==========================================
// RUTA DE PRUEBA (Para ver si todo funciona)
// ==========================================
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM PROYECTO LIMIT 3');
        res.json({
            mensaje: "¡API funcionando y conectada a la BD!",
            proyectos_de_prueba: result.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error en el servidor');
    }
});

// Inicializar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend corriendo en http://localhost:${PORT}`);
});

