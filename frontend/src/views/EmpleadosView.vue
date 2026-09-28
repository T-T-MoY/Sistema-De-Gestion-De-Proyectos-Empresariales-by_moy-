<script setup>
import { ref, computed, onMounted } from 'vue'

// ==========================================
// 1. ESTADO GLOBAL Y PERMISOS
// ==========================================
const rolUsuarioActivo = localStorage.getItem('rolUsuario') || 'Empleado'
const empleados = ref([])

// Filtros Reactivos
const filtroTexto = ref('')
const filtroRol = ref('Todos')
const filtroEstado = ref('Todos')

// ==========================================
// 2. LÓGICA DE FILTRADO (Automático)
// ==========================================
const empleadosFiltrados = computed(() => {
  return empleados.value.filter(e => {
    const nombreCompleto = `${e.nombre} ${e.apellido_paterno} ${e.apellido_materno || ''}`.toLowerCase()
    const matchTexto = nombreCompleto.includes(filtroTexto.value.toLowerCase()) || 
                       (e.ci && e.ci.toLowerCase().includes(filtroTexto.value.toLowerCase())) || 
                       (e.correo && e.correo.toLowerCase().includes(filtroTexto.value.toLowerCase()))

    const matchRol = filtroRol.value === 'Todos' || e.rol === filtroRol.value

    let matchEstado = true
    if (filtroEstado.value === 'Activo') matchEstado = e.activo === true
    if (filtroEstado.value === 'Inactivo') matchEstado = e.activo === false

    return matchTexto && matchRol && matchEstado
  })
})

// ==========================================
// 3. OBTENER DATOS (API)
// ==========================================
const cargarEmpleados = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/empleados')
    if (res.ok) {
      empleados.value = await res.json()
    }
  } catch (error) {
    console.error("Error cargando empleados:", error)
  }
}

// ==========================================
// 4. MÓDULO: GESTIÓN DE EMPLEADOS (CRUD)
// ==========================================
let modalEmpleadoInstance = null
const isEditing = ref(false)

const formEmpleado = ref({
  id_usuario: null, ci: '', nombre: '', apellido_paterno: '', apellido_materno: '',
  fecha_nacimiento: '', sexo: '', telefono: '', direccion: '',
  correo: '', rol: 'Empleado', especialidad: '', costo_hora: 0
})

const abrirModalNuevo = () => {
  isEditing.value = false
  formEmpleado.value = {
    id_usuario: null, ci: '', nombre: '', apellido_paterno: '', apellido_materno: '',
    fecha_nacimiento: '', sexo: '', telefono: '', direccion: '',
    correo: '', rol: 'Empleado', especialidad: '', costo_hora: 0
  }
  modalEmpleadoInstance.show()
}

const prepararEdicion = (emp) => {
  isEditing.value = true
  formEmpleado.value = {
    id_usuario: emp.id_usuario,
    ci: emp.ci || '',
    nombre: emp.nombre || '',
    apellido_paterno: emp.apellido_paterno || '',
    apellido_materno: emp.apellido_materno || '',
    fecha_nacimiento: emp.fecha_nacimiento ? emp.fecha_nacimiento.split('T')[0] : '',
    sexo: emp.sexo || '',
    telefono: emp.telefono || '',
    direccion: emp.direccion || '',
    correo: emp.correo || '',
    rol: emp.rol || 'Empleado',
    especialidad: emp.especialidad || '',
    costo_hora: parseFloat(emp.costo_hora || 0).toFixed(2)
  }
  modalEmpleadoInstance.show()
}

const guardarEmpleado = async () => {
  const f = formEmpleado.value
  if (!f.ci || !f.nombre || !f.apellido_paterno || !f.correo) {
    return alert("El CI, Nombre, Apellido Paterno y Correo son obligatorios.")
  }

  const datos = {
    ci: f.ci,
    nombre: f.nombre,
    apellido_paterno: f.apellido_paterno,
    apellido_materno: f.apellido_materno,
    fecha_nacimiento: f.fecha_nacimiento,
    sexo: f.sexo,
    telefono: f.telefono,
    direccion: f.direccion,
    correo: f.correo,
    rol: f.rol,
    especialidad: f.especialidad,
    costo_hora: parseFloat(f.costo_hora) || 0
  }

  const url = isEditing.value ? `http://localhost:3000/api/empleados/${f.id_usuario}` : 'http://localhost:3000/api/empleados'
  const metodo = isEditing.value ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })

    if (res.ok) {
      modalEmpleadoInstance.hide()
      cargarEmpleados()
    } else {
      const err = await res.json()
      alert("Error: " + (err.error || "Fallo en el servidor"))
    }
  } catch (error) { console.error(error) }
}

const cambiarEstado = async (id, estadoActivo) => {
  const accion = estadoActivo ? "restaurar el acceso a" : "bloquear el acceso de"
  if (!confirm(`¿Estás seguro de ${accion} este empleado?`)) return

  try {
    const res = await fetch(`http://localhost:3000/api/empleados/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: estadoActivo })
    })
    if (res.ok) cargarEmpleados()
  } catch (error) { console.error(error) }
}

const eliminarEmpleadoDefinitivo = async (id) => {
  if (!confirm(`¡ADVERTENCIA!\n¿Deseas continuar?`)) return

  try {
    const res = await fetch(`http://localhost:3000/api/empleados/${id}`, { method: 'DELETE' })
    if (res.ok) {
      cargarEmpleados()
    } else {
      alert("No se puede eliminar el empleado porque tiene registros vinculados. Es mejor desactivarlo.")
    }
  } catch (error) { console.error(error) }
}

// ==========================================
// 5. UTILIDADES VISUALES Y ESTILOS
// ==========================================
const generarAvatar = (emp) => {
  if (emp.foto_perfil && emp.foto_perfil !== 'null') return emp.foto_perfil
  const nombreCodificado = encodeURIComponent(`${emp.nombre} ${emp.apellido_paterno}`)
  return `https://ui-avatars.com/api/?name=${nombreCodificado}&background=3b82f6&color=fff`
}

const badgeRol = (rol) => {
  if (rol === 'Admin') return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
  if (rol === 'Gerente') return { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }
  return { backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' }
}

const badgeEstado = (activo) => {
  if (activo) return { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }
  return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }
}

onMounted(() => {
  modalEmpleadoInstance = new window.bootstrap.Modal(document.getElementById('modalNuevoEmpleado'))
  cargarEmpleados()
})
</script>

<template>
  <div>
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 px-2 gap-3">
      <div>
        <h3 class="fw-bold mb-0">Directorio de <span class="text-primary">Empleados</span></h3>
        <p class="text-muted mb-0">Administra los accesos, roles y tarifas por hora del personal.</p>
      </div>
      <button v-if="rolUsuarioActivo === 'Admin'" @click="abrirModalNuevo" class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold d-flex align-items-center">
        <i class="fas fa-user-plus me-2"></i> Nuevo Empleado
      </button>
    </div>

    <div class="card shadow-lg border-0 rounded-4 overflow-hidden mb-4">
      
      <div class="card-header bg-transparent border-bottom-0 p-4">
        <div class="row g-3">
          <div class="col-md-4">
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-search"></i></span>
              <input type="text" class="form-control" v-model="filtroTexto" placeholder="Buscar por nombre, CI o correo...">
            </div>
          </div>
          <div class="col-md-4">
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-user-tag"></i></span>
              <select class="form-select border-0 shadow-none bg-transparent text-muted py-2" v-model="filtroRol">
                <option value="Todos">Todos los roles</option>
                <option value="Admin">Administrador</option>
                <option value="Gerente">Gerente</option>
                <option value="Empleado">Empleado</option>
              </select>
            </div>
          </div>
          <div class="col-md-4">
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-toggle-on"></i></span>
              <select class="form-select border-0 shadow-none bg-transparent text-muted py-2" v-model="filtroEstado">
                <option value="Todos">Todos (Activos/Inactivos)</option>
                <option value="Activo">Solo Activos</option>
                <option value="Inactivo">Solo Inactivos</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="card-body p-0">
        <div class="table-responsive d-none d-md-block">
          <table class="table table-hover align-middle mb-0 custom-table">
            <thead>
              <tr>
                <th class="ps-4 py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Empleado</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Documento (CI)</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Especialidad</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; text-align: center;">Rol</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Tarifa / Hr</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; text-align: center;">Estado</th>
                <th class="pe-4 py-3 text-muted fw-bold text-uppercase text-end" style="font-size:0.75rem;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in empleadosFiltrados" :key="e.id_usuario">
                <td class="ps-4">
                  <div class="d-flex align-items-center">
                    <img :src="generarAvatar(e)" class="rounded-circle me-3 shadow-sm flex-shrink-0" width="40" height="40" style="object-fit: cover;">
                    <div class="overflow-hidden">
                      <h6 class="mb-0 fw-bold text-body text-truncate">{{ e.nombre }} {{ e.apellido_paterno }}</h6>
                      <small class="text-muted d-block text-truncate">{{ e.correo }}</small>
                    </div>
                  </div>
                </td>
                <td class="text-body fw-medium">{{ e.ci || 'N/A' }}</td>
                <td class="text-muted">{{ e.especialidad || 'General' }}</td>
                <td style="text-align: center;">
                  <span class="badge px-3 py-1 rounded-pill fw-semibold" :style="badgeRol(e.rol)">{{ e.rol }}</span>
                </td>
                <td class="fw-bold text-success">Bs. {{ parseFloat(e.costo_hora || e.costo_por_hora || 0).toFixed(2) }}</td>
                <td style="text-align: center;">
                  <span class="badge px-3 py-1 rounded-pill fw-semibold d-inline-flex align-items-center" :style="badgeEstado(e.activo)">
                    <i class="fas fa-circle me-2" style="font-size: 0.4rem;"></i> {{ e.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="pe-4 text-end text-nowrap">
                  <template v-if="rolUsuarioActivo === 'Admin'">
                    <button @click="prepararEdicion(e)" class="btn btn-sm btn-outline-primary border-0 shadow-sm me-1" title="Editar"><i class="fas fa-edit"></i></button>
                    <button v-if="e.activo" @click="cambiarEstado(e.id_usuario, false)" class="btn btn-sm btn-outline-warning border-0 shadow-sm me-1" title="Suspender Acceso"><i class="fas fa-ban"></i></button>
                    <button v-else @click="cambiarEstado(e.id_usuario, true)" class="btn btn-sm btn-outline-success border-0 shadow-sm me-1" title="Restaurar Acceso"><i class="fas fa-check"></i></button>
                    <button @click="eliminarEmpleadoDefinitivo(e.id_usuario)" class="btn btn-sm btn-outline-danger border-0 shadow-sm" title="Eliminar Permanentemente"><i class="fas fa-trash"></i></button>
                  </template>
                  <span v-else class="text-muted fs-8">Sin permisos</span>
                </td>
              </tr>
              <tr v-if="empleadosFiltrados.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">No se encontraron empleados con esos filtros.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-3 d-md-none bg-transparent">
          <div class="row g-3">
            <div class="col-12" v-for="e in empleadosFiltrados" :key="e.id_usuario">
              <div class="card shadow-sm border-0 rounded-4 bg-body p-3">
                
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <div class="d-flex align-items-center overflow-hidden">
                    <img :src="generarAvatar(e)" class="rounded-circle me-3 shadow-sm flex-shrink-0" width="45" height="45" style="object-fit: cover;">
                    <div class="overflow-hidden w-100">
                      <h6 class="fw-bold mb-1 text-body text-truncate">{{ e.nombre }} {{ e.apellido_paterno }}</h6>
                      <span class="badge rounded-pill fw-semibold" :style="badgeRol(e.rol)">{{ e.rol }}</span>
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <p class="text-muted fs-8 mb-1 text-truncate"><i class="fas fa-envelope text-primary me-2 w-15px text-center"></i>{{ e.correo }}</p>
                  <p class="text-muted fs-8 mb-1"><i class="fas fa-id-card text-primary me-2 w-15px text-center"></i>CI: <span class="fw-medium text-body">{{ e.ci || 'N/A' }}</span></p>
                  <p class="text-muted fs-8 mb-0"><i class="fas fa-briefcase text-primary me-2 w-15px text-center"></i>{{ e.especialidad || 'General' }}</p>
                </div>

                <div class="d-flex justify-content-between align-items-center border-top border-secondary border-opacity-10 pt-3">
                  <div>
                    <h6 class="fw-bold text-success mb-1">Bs. {{ parseFloat(e.costo_hora || e.costo_por_hora || 0).toFixed(2) }}<span class="text-muted fs-8 fw-normal">/hr</span></h6>
                    <span class="badge px-2 py-1 rounded-pill fw-semibold d-inline-flex align-items-center fs-9" :style="badgeEstado(e.activo)">
                      <i class="fas fa-circle me-1" style="font-size: 0.3rem;"></i> {{ e.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>
                  
                  <div class="d-flex gap-2">
                    <template v-if="rolUsuarioActivo === 'Admin'">
                      <button @click="prepararEdicion(e)" class="btn btn-sm btn-outline-primary shadow-sm"><i class="fas fa-edit"></i></button>
                      <button v-if="e.activo" @click="cambiarEstado(e.id_usuario, false)" class="btn btn-sm btn-outline-warning shadow-sm"><i class="fas fa-ban"></i></button>
                      <button v-else @click="cambiarEstado(e.id_usuario, true)" class="btn btn-sm btn-outline-success shadow-sm"><i class="fas fa-check"></i></button>
                      <button @click="eliminarEmpleadoDefinitivo(e.id_usuario)" class="btn btn-sm btn-outline-danger shadow-sm"><i class="fas fa-trash"></i></button>
                    </template>
                    <span v-else class="text-muted fs-8">Sin permisos</span>
                  </div>
                </div>

              </div>
            </div>
            
            <div v-if="empleadosFiltrados.length === 0" class="col-12 text-center py-4 text-muted">
              No se encontraron empleados con esos filtros.
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="modal fade" id="modalNuevoEmpleado" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow">
          <div class="modal-header border-0 pb-0 px-4 pt-4">
            <h5 class="modal-title fw-bold text-body">{{ isEditing ? 'Editar Empleado' : 'Registrar Nuevo Empleado' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <form @submit.prevent="guardarEmpleado">
              <h6 class="fw-bold text-primary mb-3"><i class="fas fa-id-card me-2"></i>Datos Personales</h6>
              
              <div class="row g-3 mb-3">
                <div class="col-md-4">
                  <label class="form-label fw-semibold">CI / Documento</label>
                  <input type="text" v-model="formEmpleado.ci" class="form-control rounded-3 border py-2 px-3" placeholder="Ej: 1234567 LP" required>
                </div>
                <div class="col-md-8">
                  <label class="form-label fw-semibold">Nombres</label>
                  <input type="text" v-model="formEmpleado.nombre" class="form-control rounded-3 border py-2 px-3" required>
                </div>
              </div>
              
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Apellido Paterno</label>
                  <input type="text" v-model="formEmpleado.apellido_paterno" class="form-control rounded-3 border py-2 px-3" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Apellido Materno</label>
                  <input type="text" v-model="formEmpleado.apellido_materno" class="form-control rounded-3 border py-2 px-3">
                </div>
              </div>

              <div class="row g-3 mb-4">
                <div class="col-md-4">
                  <label class="form-label fw-semibold">Fecha de Nacimiento</label>
                  <input type="date" v-model="formEmpleado.fecha_nacimiento" class="form-control rounded-3 border py-2 px-3">
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-semibold">Sexo</label>
                  <select v-model="formEmpleado.sexo" class="form-select rounded-3 border py-2 px-3">
                    <option value="">Seleccionar...</option>
                    <option value="M">Masculino (M)</option>
                    <option value="F">Femenino (F)</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-semibold">Teléfono</label>
                  <input type="text" v-model="formEmpleado.telefono" class="form-control rounded-3 border py-2 px-3">
                </div>
                <div class="col-md-12 mt-3">
                  <label class="form-label fw-semibold">Dirección</label>
                  <input type="text" v-model="formEmpleado.direccion" class="form-control rounded-3 border py-2 px-3">
                </div>
              </div>

              <hr class="border-secondary border-opacity-25 mb-4">
              <h6 class="fw-bold text-primary mb-3"><i class="fas fa-briefcase me-2"></i>Datos Corporativos</h6>

              <div class="mb-3">
                <label class="form-label fw-semibold">Correo Electrónico (Para Login)</label>
                <input type="email" v-model="formEmpleado.correo" class="form-control rounded-3 border py-2 px-3" :disabled="isEditing" required>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-4">
                  <label class="form-label fw-semibold">Rol en Sistema</label>
                  <select v-model="formEmpleado.rol" class="form-select rounded-3 border py-2 px-3">
                    <option value="Empleado">Empleado</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Admin">Administrador</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-semibold">Especialidad</label>
                  <input type="text" v-model="formEmpleado.especialidad" class="form-control rounded-3 border py-2 px-3" placeholder="Ej: Backend Developer">
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-semibold">Tarifa (Bs. / Hora)</label>
                  <input type="number" step="0.1" v-model="formEmpleado.costo_hora" class="form-control rounded-3 border py-2 px-3">
                </div>
              </div>
              
              <div class="mb-2" v-if="!isEditing">
                <div class="alert alert-info py-2 mb-0 d-flex align-items-center rounded-3 border-0">
                  <i class="fas fa-info-circle me-3 fs-4"></i>
                  <small>La contraseña temporal del usuario será generada usando su CI.</small>
                </div>
              </div>
              
              <div class="modal-footer border-0 pt-0 mt-4 px-0 pb-0">
                <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold">{{ isEditing ? 'Actualizar Datos' : 'Registrar Empleado' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.w-15px {
  width: 15px;
  display: inline-block;
}
</style>