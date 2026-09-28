// backend/routes/proyectos.routes.js
const express = require('express');
const router = express.Router();

// Importamos el controlador que creamos en el paso anterior
const proyectosController = require('../controllers/proyectos.controller');
const recursosCtrl = require('../controllers/recursos.controller');

// ==========================================
// ENDPOINTS PARA EL CRUD DE PROYECTOS
// ==========================================

// Leer todos los proyectos (SELECT)
router.get('/', proyectosController.getProyectos);

// Crear un nuevo proyecto (INSERT) 
router.post('/', proyectosController.createProyecto);

// Leer los datos de UN solo proyecto (SELECT por ID) 
router.get('/:id', proyectosController.getProyectoById);

// Actualizar un proyecto (UPDATE) 
router.put('/:id', proyectosController.updateProyecto);

// Eliminar un proyecto (DELETE) 
router.delete('/:id', proyectosController.deleteProyecto);


// Rutas para la tabla UTILIZA
router.get('/:id_proyecto/recursos', recursosCtrl.getRecursosProyecto);
router.post('/:id_proyecto/recursos', recursosCtrl.asignarRecurso);
router.delete('/:id_proyecto/recursos/:id_recurso', recursosCtrl.retirarRecurso);
router.put('/:id_proyecto/recursos/:id_recurso', recursosCtrl.actualizarRecursoProyecto); 

module.exports = router;