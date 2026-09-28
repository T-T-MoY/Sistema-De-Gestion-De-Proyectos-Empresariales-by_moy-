const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareas.controller');

router.get('/tablero/:id_proyecto', tareasController.getTareasTablero);
router.patch('/:id_tarea/estado', tareasController.actualizarEstadoTarea);
// Rutas para los comentarios
router.get('/:id_tarea/comentarios', tareasController.getComentariosTarea);
router.post('/comentario', tareasController.agregarComentario);

module.exports = router;