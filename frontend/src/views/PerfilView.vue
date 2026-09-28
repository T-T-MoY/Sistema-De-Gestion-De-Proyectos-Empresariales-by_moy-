<script setup>
import { ref, computed, onMounted } from 'vue'

const idUsuarioActivo = localStorage.getItem('idUsuario')
const activeTab = ref('info') 

// 1. INICIALIZAMOS CON LOCALSTORAGE PARA QUE NUNCA ESTÉ EN BLANCO
const perfil = ref({
  nombre: localStorage.getItem('nombrePila') || '',
  apellido_paterno: localStorage.getItem('apellidoPaterno') || '',
  apellido_materno: localStorage.getItem('apellidoMaterno') || '',
  correo: localStorage.getItem('correoUsuario') || 'Cargando correo...',
  ci: localStorage.getItem('ciUsuario') || 'Cargando CI...',
  rol: localStorage.getItem('rolUsuario') || 'Empleado',
  especialidad: localStorage.getItem('especialidadUsuario') || '',
  direccion: '',
  telefono: localStorage.getItem('telefonoUsuario') || '',
  sexo: 'Cargando...',
  fecha_nacimiento: 'Cargando...',
  foto_perfil: localStorage.getItem('fotoUsuario') || ''
})

const passForm = ref({ actual: '', nueva: '', confirmar: '' })
const passError = ref('')
const inputSubirFoto = ref(null)

// 2. FOTO DE PERFIL INTELIGENTE (Muestra iniciales si no hay foto)
const avatarUrl = computed(() => {
  // Si tiene un enlace de foto válido, lo usa
  if (perfil.value.foto_perfil && perfil.value.foto_perfil !== 'null' && perfil.value.foto_perfil.trim() !== '') {
    return perfil.value.foto_perfil
  }
  
  // Si no hay foto, agarra el nombre y el apellido para crear iniciales (Ej: MP)
  let textoAvatar = 'Usuario'
  if (perfil.value.nombre && perfil.value.apellido_paterno) {
    textoAvatar = `${perfil.value.nombre} ${perfil.value.apellido_paterno}`
  }
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(textoAvatar)}&background=3b82f6&color=fff&size=128&bold=true`
})

// ==========================================
// 3. CARGAR DATOS DESDE LA BD (GET)
// ==========================================
const cargarPerfil = async () => {
  try {
    // ¡CORREGIDO A SINGULAR: /api/usuario/...!
    const res = await fetch(`http://localhost:3000/api/usuario/perfil/${idUsuarioActivo}`)
    if (res.ok) {
      const data = await res.json()
      
      perfil.value.nombre = data.nombre || perfil.value.nombre
      perfil.value.apellido_paterno = data.apellido_paterno || perfil.value.apellido_paterno
      perfil.value.apellido_materno = data.apellido_materno || ''
      perfil.value.correo = data.correo || perfil.value.correo
      perfil.value.ci = data.ci || perfil.value.ci
      perfil.value.rol = data.rol || perfil.value.rol
      perfil.value.especialidad = data.especialidad || perfil.value.especialidad
      perfil.value.telefono = data.telefono || perfil.value.telefono
      perfil.value.direccion = data.direccion || ''

      // Formateo seguro de Sexo
      if (data.sexo === 'M') perfil.value.sexo = 'Masculino'
      else if (data.sexo === 'F') perfil.value.sexo = 'Femenino'
      else perfil.value.sexo = 'No registrado' // Si es null, muestra esto

      // Formateo seguro de Fecha
      if (data.fecha_nacimiento) {
        perfil.value.fecha_nacimiento = data.fecha_nacimiento.split('T')[0]
      } else {
        perfil.value.fecha_nacimiento = 'No registrada' // Si es null, muestra esto
      }
      
      // Actualizar foto si existe en la BD
      if (data.foto_perfil && data.foto_perfil !== 'null') {
        perfil.value.foto_perfil = data.foto_perfil
        localStorage.setItem('fotoUsuario', data.foto_perfil)
      }
    }
  } catch (error) { 
    console.error("Error al cargar perfil desde BD:", error) 
  }
}

// ==========================================
// 4. ACTUALIZAR INFO (PUT)
// ==========================================
const actualizarInformacion = async () => {
  try {
    // ¡CORREGIDO A SINGULAR!
    const res = await fetch('http://localhost:3000/api/usuario/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario: idUsuarioActivo,
        nombre: perfil.value.nombre,
        apellido_paterno: perfil.value.apellido_paterno,
        apellido_materno: perfil.value.apellido_materno,
        telefono: perfil.value.telefono,
        especialidad: perfil.value.especialidad,
        direccion: perfil.value.direccion
      })
    })
    if (res.ok) {
      alert("✅ Perfil actualizado con éxito")
      localStorage.setItem('nombrePila', perfil.value.nombre)
      localStorage.setItem('apellidoPaterno', perfil.value.apellido_paterno)
      localStorage.setItem('nombreUsuario', `${perfil.value.nombre} ${perfil.value.apellido_paterno}`)
      window.location.reload()
    } else {
      const err = await res.json()
      alert("❌ Error: " + err.error)
    }
  } catch (error) { console.error(error) }
}

// ==========================================
// 5. ACTUALIZAR PASSWORD (PUT)
// ==========================================
const actualizarPassword = async () => {
  if (passForm.value.nueva !== passForm.value.confirmar) {
    passError.value = "Las contraseñas nuevas no coinciden."
    return
  }
  passError.value = ''

  try {
    // ¡CORREGIDO A SINGULAR!
    const res = await fetch('http://localhost:3000/api/usuario/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id_usuario: idUsuarioActivo, 
        passActual: passForm.value.actual, 
        passNueva: passForm.value.nueva 
      })
    })
    if (res.ok) {
      alert("✅ Contraseña actualizada correctamente")
      passForm.value = { actual: '', nueva: '', confirmar: '' }
    } else {
      const err = await res.json()
      alert("❌ Error: " + err.error)
    }
  } catch (error) { console.error(error) }
}

// ==========================================
// 6. SUBIR FOTO (POST)
// ==========================================
const triggerInputFoto = () => {
  if(inputSubirFoto.value) {
    inputSubirFoto.value.click()
  }
}

const subirFoto = async (event) => {
  const archivo = event.target.files[0]
  if (!archivo) return

  const formData = new FormData()
  formData.append('id_usuario', idUsuarioActivo)
  formData.append('imagen', archivo)

  try {
    // ¡CORREGIDO A SINGULAR!
    const res = await fetch('http://localhost:3000/api/usuario/upload-foto', {
      method: 'POST',
      body: formData 
    })
    
    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('fotoUsuario', data.url)
      perfil.value.foto_perfil = data.url
      alert("✅ ¡Foto de perfil actualizada!")
      window.location.reload()
    } else {
      const err = await res.json()
      alert("❌ Error al subir la imagen: " + (err.error || "Desconocido"))
    }
  } catch (error) { 
    console.error("Error de red al subir foto:", error) 
    alert("Error de conexión al intentar subir la foto.")
  }
}

onMounted(() => { cargarPerfil() })
</script>

<template>
  <div>
    <div class="mb-4"></div>

    <div class="row g-4 mb-4">
      
      <div class="col-lg-4">
        <div class="card shadow-lg border-0 rounded-4 h-100 overflow-hidden">
          <div class="bg-primary bg-opacity-25" style="height: 120px;"></div>
          
          <div class="card-body px-4 pb-4 text-center" style="margin-top: -60px;">
            <div class="position-relative d-inline-block mb-3">
              
              <img :src="avatarUrl" alt="Perfil" class="rounded-circle shadow border border-4 border-body bg-body" width="120" height="120" style="object-fit: cover;">
              
              <input type="file" ref="inputSubirFoto" class="d-none" accept="image/png, image/jpeg, image/jpg" @change="subirFoto">
              
              <button @click="triggerInputFoto" type="button" class="btn btn-primary btn-sm rounded-circle position-absolute bottom-0 end-0 shadow" style="width: 35px; height: 35px;" title="Cambiar Foto">
                <i class="fas fa-camera"></i>
              </button>
            </div>
            
            <h4 class="fw-bold mb-1 text-body">{{ perfil.nombre }} {{ perfil.apellido_paterno }}</h4>
            <p class="text-primary fw-medium mb-3">{{ perfil.rol }}</p>
            
            <div class="d-flex justify-content-center gap-2 mb-4">
              <div class="d-inline-flex align-items-center px-3 py-1 rounded-pill" style="background-color: rgba(148, 163, 184, 0.15); color: #94a3b8; font-size: 0.85rem; font-weight: 500;">
                <i class="fas fa-laptop-code me-2"></i> {{ perfil.especialidad || 'General' }}
              </div>
              <div class="d-inline-flex align-items-center px-3 py-1 rounded-pill" style="background-color: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.85rem; font-weight: 500;">
                <i class="fas fa-circle me-2" style="font-size: 0.5rem;"></i> Activo
              </div>
            </div>

            <hr class="border-secondary border-opacity-25 mb-4">
            
            <div class="text-start">
              <h6 class="fw-bold text-muted text-uppercase mb-3 fs-8" style="letter-spacing: 1px;">Detalles de Contacto</h6>
              <div class="d-flex align-items-center mb-3">
                <div class="icon-shape bg-light text-primary rounded-circle me-3 d-flex justify-content-center align-items-center" style="width: 35px; height: 35px;"><i class="fas fa-envelope"></i></div>
                <div>
                  <small class="text-muted d-block lh-1">Correo Electrónico</small>
                  <span class="text-body fw-medium">{{ perfil.correo }}</span>
                </div>
              </div>
              <div class="d-flex align-items-center mb-3">
                <div class="icon-shape bg-light text-primary rounded-circle me-3 d-flex justify-content-center align-items-center" style="width: 35px; height: 35px;"><i class="fas fa-id-card"></i></div>
                <div>
                  <small class="text-muted d-block lh-1">Documento (CI)</small>
                  <span class="text-body fw-medium">{{ perfil.ci }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="card shadow-lg border-0 rounded-4 h-100">
          <div class="card-header bg-transparent border-bottom-0 p-4 pb-0">
            <ul class="nav nav-tabs border-bottom border-secondary border-opacity-25">
              <li class="nav-item cursor-pointer">
                <a class="nav-link bg-transparent border-0 fw-bold pb-3 px-4" 
                   :class="activeTab === 'info' ? 'text-primary' : 'text-muted'" 
                   :style="activeTab === 'info' ? 'border-bottom: 3px solid #3b82f6 !important;' : ''"
                   @click="activeTab = 'info'">Información Personal</a>
              </li>
              <li class="nav-item cursor-pointer">
                <a class="nav-link bg-transparent border-0 fw-bold pb-3 px-4" 
                   :class="activeTab === 'seguridad' ? 'text-primary' : 'text-muted'" 
                   :style="activeTab === 'seguridad' ? 'border-bottom: 3px solid #3b82f6 !important;' : ''"
                   @click="activeTab = 'seguridad'">Seguridad</a>
              </li>
            </ul>
          </div>
          
          <div class="card-body p-4">
            
            <div v-if="activeTab === 'info'">
              <form @submit.prevent="actualizarInformacion">
                <div class="row g-4 mb-4">
                  <div class="col-md-4">
                    <label class="form-label fw-semibold">Nombres</label>
                    <input type="text" v-model="perfil.nombre" class="form-control rounded-3 border px-3 py-2">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label fw-semibold">Apellido Paterno</label>
                    <input type="text" v-model="perfil.apellido_paterno" class="form-control rounded-3 border px-3 py-2">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label fw-semibold">Apellido Materno</label>
                    <input type="text" v-model="perfil.apellido_materno" class="form-control rounded-3 border px-3 py-2">
                  </div>
                </div>
                <div class="row g-4 mb-4">
                  <div class="col-md-4">
                    <label class="form-label fw-semibold">Fecha de Nacimiento</label>
                    <input type="text" v-model="perfil.fecha_nacimiento" class="form-control rounded-3 border px-3 py-2 bg-secondary bg-opacity-10 text-muted" readonly disabled>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label fw-semibold">Sexo</label>
                    <input type="text" v-model="perfil.sexo" class="form-control rounded-3 border px-3 py-2 bg-secondary bg-opacity-10 text-muted" readonly disabled>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label fw-semibold">Especialidad</label>
                    <input type="text" v-model="perfil.especialidad" class="form-control rounded-3 border px-3 py-2">
                  </div>
                </div>
                <div class="row g-4 mb-4">
                  <div class="col-md-8">
                    <label class="form-label fw-semibold">Dirección</label>
                    <input type="text" v-model="perfil.direccion" class="form-control rounded-3 border px-3 py-2" placeholder="Añade tu dirección...">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label fw-semibold">Teléfono / Celular</label>
                    <input type="text" v-model="perfil.telefono" class="form-control rounded-3 border px-3 py-2" placeholder="Añade tu teléfono...">
                  </div>
                </div>
                <div class="d-flex justify-content-end">
                  <button type="submit" class="btn btn-primary rounded-pill px-5 py-2 shadow-sm fw-bold">Guardar Cambios</button>
                </div>
              </form>
            </div>

            <div v-if="activeTab === 'seguridad'">
              <div class="alert alert-warning py-3 d-flex align-items-center rounded-4 border-0 mb-4">
                <i class="fas fa-shield-alt me-3 fs-3"></i>
                <div>
                  <h6 class="fw-bold mb-1">Protege tu cuenta</h6>
                  <small class="mb-0">Usa una combinación de letras, números y símbolos. No uses tu CI.</small>
                </div>
              </div>
              <form @submit.prevent="actualizarPassword">
                <div class="mb-4">
                  <label class="form-label fw-semibold">Contraseña Actual</label>
                  <input type="password" v-model="passForm.actual" class="form-control rounded-3 border px-3 py-2" required>
                </div>
                <hr class="border-secondary border-opacity-10 mb-4">
                <div class="row g-4 mb-4">
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Nueva Contraseña</label>
                    <input type="password" v-model="passForm.nueva" class="form-control rounded-3 border px-3 py-2" required minlength="4">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">Confirmar Nueva Contraseña</label>
                    <input type="password" v-model="passForm.confirmar" class="form-control rounded-3 border px-3 py-2" required minlength="4">
                  </div>
                </div>
                <div v-if="passError" class="alert alert-danger py-2 rounded-3 border-0 fs-8">{{ passError }}</div>
                <div class="d-flex justify-content-end">
                  <button type="submit" class="btn btn-danger rounded-pill px-5 py-2 shadow-sm fw-bold">Actualizar Contraseña</button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>