const express = require('express');
const router = express.Router();
const avancesController = require('../controllers/avances.controller');

router.get('/tareas/:id_usuario', avancesController.getMisTareasActivas);
router.get('/historial/:id_usuario', avancesController.getMisRegistros);
router.post('/', avancesController.registrarAvance);

module.exports = router;