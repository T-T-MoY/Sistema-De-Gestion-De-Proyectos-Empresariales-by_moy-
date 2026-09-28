const express = require('express');
const router = express.Router();
const recursosController = require('../controllers/recursos.controller');

router.get('/', recursosController.getRecursos);
router.post('/', recursosController.crearRecurso);
router.put('/:id', recursosController.actualizarRecurso);
router.delete('/:id', recursosController.eliminarRecurso);


module.exports = router;