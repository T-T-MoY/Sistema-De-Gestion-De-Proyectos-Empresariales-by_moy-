const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller.js');

// Ruta para Admin 
router.get('/admin', dashboardController.getDashboardAdmin);

// Rutas para Gerente y Empleado 
router.get('/gerente/:id', dashboardController.getDashboardGerente);
router.get('/empleado/:id', dashboardController.getDashboardEmpleado);

module.exports = router;