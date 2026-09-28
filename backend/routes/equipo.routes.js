const express = require('express');
const router = express.Router();
const equipoController = require('../controllers/equipo.controller');

// Rutas para llenar los selects (Deben ir arriba para que Express no confunda "proyectos" con un ":id_proyecto")
router.get('/utilidades/proyectos', equipoController.getProyectosCombo);
router.get('/utilidades/empleados', equipoController.getEmpleadosCombo);

// Rutas del CRUD del Equipo
router.get('/:id_proyecto', equipoController.getMiembros);
router.post('/', equipoController.asignarMiembro);
router.delete('/:id_proyecto/:id_usuario', equipoController.quitarMiembro);
// Ruta para asignar tarea al miembro
router.post('/tarea', equipoController.asignarTarea);
// Rutas para gestionar tareas existentes
router.get('/:id_proyecto/tareas/:id_usuario', equipoController.getTareasEmpleado);
router.put('/tarea/:id_tarea', equipoController.actualizarTarea);
router.delete('/tarea/:id_tarea', equipoController.eliminarTarea);

module.exports = router;