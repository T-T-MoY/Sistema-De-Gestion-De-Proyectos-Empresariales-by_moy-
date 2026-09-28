const express = require('express');
const router = express.Router();
const alertasCtrl = require('../controllers/alertas.controller');

// Obtener el historial de alertas del usuario
router.get('/usuario/:id_usuario', alertasCtrl.getAlertasUsuario);

// Marcar notificaciones como leídas
// El frontend ejecutará esta acción al abrir el panel o presionar "Marcar leídas"
router.patch('/usuario/:id_usuario/leer', alertasCtrl.marcarTodasLeidas);

module.exports = router;