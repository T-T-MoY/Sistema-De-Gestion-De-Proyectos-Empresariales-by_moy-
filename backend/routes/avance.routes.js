// backend/routes/avance.routes.js
const express = require('express');
const router = express.Router();
const avanceController = require('../controllers/avance.controller');

// Ruta para que el empleado envíe sus horas
router.post('/', avanceController.registrarAvance);

// Ruta para que el gerente vea quién trabajó en una tarea específica
router.get('/tarea/:id_tarea', avanceController.obtenerAvancesPorTarea);

module.exports = router;