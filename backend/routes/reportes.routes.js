const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller'); // Ajusta la ruta si es necesario


router.get('/costos', reportesController.getReporteCostos);
router.get('/avance', reportesController.getReporteAvance);


router.get('/financiero-view', reportesController.getReporteFinancieroView);
router.get('/cronograma-view', reportesController.getReporteCronogramaView);
router.get('/nomina', reportesController.getReporteNomina);

module.exports = router;