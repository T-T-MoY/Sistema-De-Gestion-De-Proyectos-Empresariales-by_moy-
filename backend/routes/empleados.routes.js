const express = require('express');
const router = express.Router();
const empCtrl = require('../controllers/empleados.controller');

router.get('/', empCtrl.getEmpleados);
router.post('/', empCtrl.crearEmpleado);
router.put('/:id', empCtrl.actualizarEmpleado);
router.put('/:id/estado', empCtrl.toggleEstado);
router.delete('/:id', empCtrl.eliminarEmpleado);

module.exports = router;