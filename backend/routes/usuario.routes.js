const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/usuario.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const storage = multer.diskStorage({
    destination: (req, file, cb) => { 
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir); }
        cb(null, dir); 
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `foto_${req.body.id_usuario}_${Date.now()}${ext}`);
    }
});
const upload = multer({ storage: storage });

// Rutas
router.get('/perfil/:id_usuario', userCtrl.obtenerPerfil);
router.put('/perfil', userCtrl.actualizarPerfil);
router.put('/password', userCtrl.cambiarPassword);

router.post('/upload-foto', upload.single('imagen'), userCtrl.subirFotoPerfil);

module.exports = router;