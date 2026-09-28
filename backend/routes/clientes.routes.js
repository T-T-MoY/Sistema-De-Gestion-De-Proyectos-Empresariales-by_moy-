const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');

router.get('/', clientesController.getClientes);
router.post('/', clientesController.crearCliente);
router.put('/:id', clientesController.actualizarCliente);
router.patch('/:id/estado', clientesController.cambiarEstadoCliente);
router.delete('/:id', clientesController.eliminarCliente);

module.exports = router;