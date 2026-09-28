const express = require('express');
const router = express.Router();
const { obtenerRegistrosPorAprobar, procesarAprobacion } = require('../controllers/registros.controller');

// Ruta: GET /api/registros/por-aprobar?id_gerente=X
router.get('/por-aprobar', obtenerRegistrosPorAprobar);

// Ruta: PUT /api/registros/:id/estado
router.put('/:id/estado', procesarAprobacion);

module.exports = router;