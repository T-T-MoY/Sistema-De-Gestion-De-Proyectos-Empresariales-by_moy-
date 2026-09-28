<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// ==========================================
// 1. ESTADO GLOBAL Y VARIABLES
// ==========================================
const rolUsuarioActivo = localStorage.getItem('rolUsuario') || 'Empleado'
const idUsuarioActivo = localStorage.getItem('idUsuario')

const proyectos = ref([])
const idProyectoActivo = ref('')
const miembrosEquipo = ref([])
const directorioEmpleados = ref([])

// Variables para Modales
let modalAgregarInstance = null
let modalTareaInstance = null
let modalGestionInstance = null

// ==========================================
// 2. CÁLCULO DE KPIs (Automático)
// ==========================================
const kpis = computed(() => {
  let tareas = 0, horas = 0
  miembrosEquipo.value.forEach(m => {
    tareas += parseInt(m.total_tareas) || 0
    horas += parseFloat(m.total_horas) || 0
  })
  return {
    miembros: miembrosEquipo.value.length,
    tareasPendientes: tareas,
    horasRegistradas: horas.toFixed(2)
  }
})

// ==========================================
// 3. OBTENER DATOS PRINCIPALES
// ==========================================
const cargarProyectos = async () => {
  try {
    const res = await fetch(`http://localhost:3000/api/equipo/utilidades/proyectos?rol=${rolUsuarioActivo}&id=${idUsuarioActivo}`)
    if (res.ok) {
      const data = await res.json()
      proyectos.value = data
      if (data.length > 0) idProyectoActivo.value = data[0].id_proyecto
    }
  } catch (error) { console.error("Error cargando proyectos:", error) }
}

const cargarDirectorioEmpleados = async () => {
  try {
    const res = await fetch(`http://localhost:3000/api/equipo/utilidades/empleados`)
    if (res.ok) directorioEmpleados.value = await res.json()
  } catch (error) { console.error("Error cargando directorio:", error) }
}

const cargarMiembros = async () => {
  if (!idProyectoActivo.value) {
    miembrosEquipo.value = []
    return
  }
  try {
    const res = await fetch(`http://localhost:3000/api/equipo/${idProyectoActivo.value}`)
    if (res.ok) miembrosEquipo.value = await res.json()
  } catch (error) { console.error("Error cargando miembros:", error) }
}

watch(idProyectoActivo, () => {
  cargarMiembros()
})

// ==========================================
// 4. MÓDULO: ASIGNAR / QUITAR MIEMBROS
// ==========================================
const formMiembro = ref({ id_usuario: '', rol_proyecto: '' })

const nombreProyectoActivo = computed(() => {
  const p = proyectos.value.find(p => p.id_proyecto === idProyectoActivo.value)
  return p ? p.nombre_proyecto : 'Cargando...'
})

const asignarMiembro = async () => {
  if (!formMiembro.value.id_usuario || !idProyectoActivo.value) return alert("Selecciona un empleado.")

  const datos = {
    id_proyecto: idProyectoActivo.value,
    id_usuario: formMiembro.value.id_usuario,
    rol_en_proyecto: formMiembro.value.rol_proyecto || null
  }

  try {
    const res = await fetch('http://localhost:3000/api/equipo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
    })
    if (res.ok) {
      modalAgregarInstance.hide()
      formMiembro.value = { id_usuario: '', rol_proyecto: '' }
      cargarMiembros()
    } else {
      const err = await res.json()
      alert("Error: " + err.error)
    }
  } catch (error) { console.error(error) }
}

const quitarMiembro = async (idUsuario) => {
  if (!confirm('¿Estás seguro de quitar a este empleado del proyecto?')) return
  try {
    const res = await fetch(`http://localhost:3000/api/equipo/${idProyectoActivo.value}/${idUsuario}`, { method: 'DELETE' })
    if (res.ok) cargarMiembros()
  } catch (error) { console.error(error) }
}

// ==========================================
// 5. MÓDULO: ASIGNAR NUEVA TAREA
// ==========================================
const miembroActivo = ref({ id: null, nombre: '' })
const formTarea = ref({ titulo: '', descripcion: '', fecha_inicio: '', fecha_fin_estimada: '', horas_estimadas: '', prioridad: 'Media' })

const prepararNuevaTarea = (idUsuario, nombre) => {
  miembroActivo.value = { id: idUsuario, nombre }
  formTarea.value = { titulo: '', descripcion: '', fecha_inicio: '', fecha_fin_estimada: '', horas_estimadas: '', prioridad: 'Media' }
  modalTareaInstance.show()
}

const guardarNuevaTarea = async () => {
  const f = formTarea.value
  if (!f.titulo || !f.fecha_inicio || !f.horas_estimadas) return alert("Título, fecha de inicio y horas son obligatorios.")

  const datos = {
    titulo: f.titulo, descripcion: f.descripcion, fecha_inicio: f.fecha_inicio,
    fecha_fin_estimada: f.fecha_fin_estimada || null, horas_estimadas: parseInt(f.horas_estimadas),
    prioridad: f.prioridad, id_proyecto: idProyectoActivo.value, id_usuario: miembroActivo.value.id
  }

  try {
    const res = await fetch('http://localhost:3000/api/equipo/tarea', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
    })
    
    if (res.ok) {
      modalTareaInstance.hide()
      cargarMiembros()
      alert("✅ Tarea asignada correctamente.")
    } else {
      const err = await res.json()
      alert("❌ Acción Bloqueada:\n" + (err.error || err.message || "Error al asignar la tarea."))
    }
  } catch (error) { 
    console.error(error) 
    alert("Error de conexión con el servidor.")
  }
}

// ==========================================
// 6. MÓDULO: GESTIÓN DE TAREAS (VER/EDITAR)
// ==========================================
const tareasMiembro = ref([])
const idTareaSeleccionada = ref('')
const formEdicionTarea = ref({
  id_tarea: null, titulo: '', descripcion: '', fecha_inicio: '', fecha_fin_estimada: '', horas_estimadas: '', prioridad: 'Media'
})

const abrirGestionTareas = async (idUsuario, nombre) => {
  miembroActivo.value = { id: idUsuario, nombre }
  idTareaSeleccionada.value = ''
  
  try {
    const res = await fetch(`http://localhost:3000/api/equipo/${idProyectoActivo.value}/tareas/${idUsuario}`)
    tareasMiembro.value = await res.json()
    modalGestionInstance.show()
  } catch (error) { console.error(error) }
}

watch(idTareaSeleccionada, (newId) => {
  if (!newId) return
  const t = tareasMiembro.value.find(tarea => tarea.id_tarea == newId)
  if (t) {
    formEdicionTarea.value = {
      id_tarea: t.id_tarea, titulo: t.titulo, descripcion: t.descripcion || '',
      fecha_inicio: t.fecha_inicio ? t.fecha_inicio.split('T')[0] : '',
      fecha_fin_estimada: t.fecha_fin_estimada ? t.fecha_fin_estimada.split('T')[0] : '',
      horas_estimadas: t.horas_estimadas, prioridad: t.prioridad || 'Media'
    }
  }
})

const actualizarTarea = async () => {
  const f = formEdicionTarea.value
  if (!f.titulo || !f.fecha_inicio || !f.horas_estimadas) return alert("Datos incompletos.")

  try {
    const res = await fetch(`http://localhost:3000/api/equipo/tarea/${f.id_tarea}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f)
    })
    if (res.ok) {
      modalGestionInstance.hide()
      cargarMiembros()
    }
  } catch (error) { console.error(error) }
}

const borrarTarea = async () => {
  if (!confirm('¿Borrar esta tarea definitivamente?')) return
  try {
    const res = await fetch(`http://localhost:3000/api/equipo/tarea/${formEdicionTarea.value.id_tarea}`, { method: 'DELETE' })
    if (res.ok) {
      modalGestionInstance.hide()
      cargarMiembros()
    }
  } catch (error) { console.error(error) }
}

// ==========================================
// 7. UTILIDADES VISUALES
// ==========================================
const avatarMiembro = (nombre) => `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`

onMounted(async () => {
  modalAgregarInstance = new window.bootstrap.Modal(document.getElementById('modalAgregarMiembro'))
  modalTareaInstance = new window.bootstrap.Modal(document.getElementById('modalAsignarTarea'))
  modalGestionInstance = new window.bootstrap.Modal(document.getElementById('modalGestionTareas'))
  
  await cargarProyectos()
  if (rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente') cargarDirectorioEmpleados()
})
</script>

<template>
  <div>
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 px-2 gap-3">
      <div>
        <h3 class="fw-bold mb-0">Miembros del <span class="text-primary">Proyecto</span></h3>
        <p class="text-muted mb-0">Asigna recursos humanos y supervisa su carga de trabajo.</p>
      </div>
      
      <div class="d-flex flex-column flex-sm-row gap-2 align-items-center w-100" style="max-width: 480px;">
        
        <div class="custom-input-group flex-grow-1 w-100">
          <span class="input-group-text"><i class="fas fa-briefcase"></i></span>
          <select class="form-select border-0 shadow-none bg-transparent py-2 px-0 fw-medium text-body w-100" v-model="idProyectoActivo">
            <option value="" v-if="proyectos.length === 0">No tienes proyectos asignados</option>
            <option v-for="p in proyectos" :key="p.id_proyecto" :value="p.id_proyecto">
              {{ p.nombre_proyecto }}
            </option>
          </select>
        </div>

        <button v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'" 
                class="btn btn-primary rounded-pill px-4 py-2 shadow-sm fw-semibold text-nowrap" data-bs-toggle="modal" data-bs-target="#modalAgregarMiembro">
          <i class="fas fa-user-plus me-2"></i>Agregar
        </button>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card shadow-sm border-0 rounded-4 h-100 bg-body-tertiary">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center px-md-1">
              <div>
                <p class="text-muted text-sm mb-1 text-uppercase fw-bold">Tamaño del Equipo</p>
                <h3 class="fw-bolder mb-0 text-primary">{{ kpis.miembros }} <span class="fs-6 fw-normal text-muted">Miembros</span></h3>
              </div>
              <div class="icon-shape rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 48px; height: 48px; background-color: rgba(59, 130, 246, 0.15); color: #3b82f6;">
                <i class="fas fa-users fs-5"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card shadow-sm border-0 rounded-4 h-100 bg-body-tertiary">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center px-md-1">
              <div>
                <p class="text-muted text-sm mb-1 text-uppercase fw-bold">Horas Registradas</p>
                <h3 class="fw-bolder mb-0 text-success">{{ kpis.horasRegistradas }} <span class="fs-6 fw-normal text-muted">Horas</span></h3>
              </div>
              <div class="icon-shape rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 48px; height: 48px; background-color: rgba(16, 185, 129, 0.15); color: #10b981;">
                <i class="fas fa-clock fs-5"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card shadow-sm border-0 rounded-4 h-100 bg-body-tertiary">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center px-md-1">
              <div>
                <p class="text-muted text-sm mb-1 text-uppercase fw-bold">Carga de Tareas</p>
                <h3 class="fw-bolder mb-0 text-warning">{{ kpis.tareasPendientes }} <span class="fs-6 fw-normal text-muted">Pendientes</span></h3>
              </div>
              <div class="icon-shape rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 48px; height: 48px; background-color: rgba(245, 158, 11, 0.15); color: #f59e0b;">
                <i class="fas fa-tasks fs-5"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-lg border-0 rounded-4 overflow-hidden bg-body-tertiary mb-4">
      <div class="card-header bg-transparent border-bottom-0 p-4">
        <h6 class="fw-bold mb-0 text-uppercase text-muted" style="letter-spacing: 1px;">Asignaciones Actuales</h6>
      </div>
      <div class="card-body p-0">
        
        <div class="table-responsive d-none d-md-block">
          <table class="table table-hover table-borderless align-middle mb-0 custom-table">
            <thead class="border-bottom border-secondary border-opacity-25">
              <tr>
                <th class="ps-4 py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; letter-spacing: 1px;">Empleado</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; letter-spacing: 1px; text-align: center;">Especialidad / Rol</th>
                <th class="py-3 text-muted fw-bold text-uppercase text-center" style="font-size:0.75rem; letter-spacing: 1px;">Tareas</th>
                <th class="py-3 text-muted fw-bold text-uppercase text-center" style="font-size:0.75rem; letter-spacing: 1px;">Horas</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; letter-spacing: 1px;">Rendimiento</th>
                <th class="pe-4 py-3 text-muted fw-bold text-uppercase text-end" style="font-size:0.75rem; letter-spacing: 1px;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in miembrosEquipo" :key="m.id_usuario">
                <td class="ps-4">
                  <div class="d-flex align-items-center">
                    <img :src="avatarMiembro(m.nombre_completo)" class="rounded-circle me-3 shadow-sm flex-shrink-0" width="40" height="40">
                    <h6 class="mb-0 fw-bold text-body lh-sm">{{ m.nombre_completo }}</h6>
                  </div>
                </td>
                <td style="text-align: center;">
                  <span class="badge px-3 py-1 rounded-pill fw-semibold" style="background-color: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3);">
                    {{ m.rol_asignado }}
                  </span>
                </td>
                <td class="text-center fw-bold text-body">{{ m.total_tareas || 0 }}</td>
                <td class="text-center fw-bold text-success">{{ m.total_horas || 0 }} hrs</td>
                <td class="w-25 pe-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-muted fs-8">Progreso</span>
                    <span class="fw-bold fs-8" :class="m.porcentaje_progreso === 100 ? 'text-success' : 'text-body'">{{ m.porcentaje_progreso || 0 }}%</span>
                  </div>
                  <div class="progress rounded-pill bg-secondary bg-opacity-25" style="height: 6px;">
                    <div class="progress-bar rounded-pill" :class="m.porcentaje_progreso === 100 ? 'bg-success' : 'bg-primary'" :style="{ width: (m.porcentaje_progreso || 0) + '%' }"></div>
                  </div>
                </td>
                <td class="pe-4 text-end text-nowrap">
                  <div v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'" class="d-flex justify-content-end">
                    <button @click="prepararNuevaTarea(m.id_usuario, m.nombre_completo)" class="btn btn-sm btn-outline-success border-0 shadow-sm me-1" title="Nueva Tarea"><i class="fas fa-plus"></i></button>
                    <button @click="abrirGestionTareas(m.id_usuario, m.nombre_completo)" class="btn btn-sm btn-outline-info border-0 shadow-sm me-1" title="Ver/Editar Tareas"><i class="fas fa-list"></i></button>
                    <button @click="quitarMiembro(m.id_usuario)" class="btn btn-sm btn-outline-danger border-0 shadow-sm" title="Quitar del Proyecto"><i class="fas fa-user-minus"></i></button>
                  </div>
                  <span v-else class="text-muted fs-8"><i class="fas fa-lock me-1"></i>Colega</span>
                </td>
              </tr>
              <tr v-if="miembrosEquipo.length === 0">
                <td colspan="6" class="text-center py-4 text-muted">
                  {{ idProyectoActivo ? 'No hay empleados asignados a este proyecto.' : 'Selecciona un proyecto para ver a su equipo.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-3 d-md-none bg-transparent">
          <div class="row g-3">
            <div class="col-12" v-for="m in miembrosEquipo" :key="m.id_usuario">
              <div class="card shadow-sm border-0 rounded-4 bg-body p-3">
                
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <div class="d-flex align-items-center">
                    <img :src="avatarMiembro(m.nombre_completo)" class="rounded-circle me-3 shadow-sm flex-shrink-0" width="45" height="45">
                    <div>
                      <h6 class="fw-bold mb-1 text-body lh-sm">{{ m.nombre_completo }}</h6>
                      <span class="badge px-2 py-1 rounded-pill fw-semibold" style="font-size: 0.7rem; background-color: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3);">
                        {{ m.rol_asignado }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="row text-center mb-3">
                  <div class="col-6 border-end border-secondary border-opacity-25">
                    <p class="text-muted fs-8 mb-0 text-uppercase">Tareas</p>
                    <h6 class="fw-bold text-body mb-0">{{ m.total_tareas || 0 }}</h6>
                  </div>
                  <div class="col-6">
                    <p class="text-muted fs-8 mb-0 text-uppercase">Horas</p>
                    <h6 class="fw-bold text-success mb-0">{{ m.total_horas || 0 }} hrs</h6>
                  </div>
                </div>

                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-muted fs-8">Progreso de Tareas</span>
                    <span class="fw-bold fs-8" :class="m.porcentaje_progreso === 100 ? 'text-success' : 'text-body'">{{ m.porcentaje_progreso || 0 }}%</span>
                  </div>
                  <div class="progress rounded-pill bg-secondary bg-opacity-25" style="height: 6px;">
                    <div class="progress-bar rounded-pill" :class="m.porcentaje_progreso === 100 ? 'bg-success' : 'bg-primary'" :style="{ width: (m.porcentaje_progreso || 0) + '%' }"></div>
                  </div>
                </div>

                <div class="d-flex justify-content-end pt-3 border-top border-secondary border-opacity-10" v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'">
                  <button @click="prepararNuevaTarea(m.id_usuario, m.nombre_completo)" class="btn btn-sm btn-outline-success shadow-sm me-2"><i class="fas fa-plus"></i></button>
                  <button @click="abrirGestionTareas(m.id_usuario, m.nombre_completo)" class="btn btn-sm btn-outline-info shadow-sm me-2"><i class="fas fa-list"></i></button>
                  <button @click="quitarMiembro(m.id_usuario)" class="btn btn-sm btn-outline-danger shadow-sm"><i class="fas fa-trash"></i></button>
                </div>

              </div>
            </div>
            
            <div v-if="miembrosEquipo.length === 0" class="col-12 text-center py-4 text-muted">
              {{ idProyectoActivo ? 'No hay empleados asignados a este proyecto.' : 'Selecciona un proyecto para ver a su equipo.' }}
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="modal fade" id="modalAgregarMiembro" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow">
          <div class="modal-header border-0 pb-0 px-4 pt-4">
            <h5 class="modal-title fw-bold">Vincular al Proyecto</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="alert alert-primary py-2 d-flex align-items-center rounded-3 border-0 mb-4 bg-opacity-10">
              <i class="fas fa-info-circle me-3 fs-4 text-primary"></i>
              <small class="text-body">Proyecto destino: <strong class="text-primary">{{ nombreProyectoActivo }}</strong></small>
            </div>
            <form @submit.prevent="asignarMiembro">
              <div class="mb-3">
                <label class="form-label fw-semibold">Seleccionar Empleado</label>
                <select v-model="formMiembro.id_usuario" class="form-select rounded-3 border py-2 px-3" required>
                  <option value="">Seleccione un compañero...</option>
                  <option v-for="e in directorioEmpleados" :key="e.id_usuario" :value="e.id_usuario">
                    {{ e.nombre }} - {{ e.especialidad || 'General' }}
                  </option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Rol o Función Específica (Opcional)</label>
                <input type="text" v-model="formMiembro.rol_proyecto" class="form-control rounded-3 border py-2 px-3" placeholder="Ej: DBA Principal">
              </div>
              <div class="modal-footer border-0 pt-0 mt-4 px-0 pb-0">
                <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold">Añadir al Equipo</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="modalAsignarTarea" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow">
          <div class="modal-header border-0 pb-0 px-4 pt-4">
            <h5 class="modal-title fw-bold">Asignar Nueva Tarea</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="alert alert-success py-2 d-flex align-items-center rounded-3 border-0 mb-4 bg-opacity-10">
              <i class="fas fa-user-tag me-3 fs-4 text-success"></i>
              <small class="text-body">Delegando a: <strong class="text-success">{{ miembroActivo.nombre }}</strong></small>
            </div>
            <form @submit.prevent="guardarNuevaTarea">
              <div class="mb-3">
                <label class="form-label fw-semibold">Título de la Tarea</label>
                <input type="text" v-model="formTarea.titulo" class="form-control rounded-3 border py-2 px-3" required>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Descripción Técnica (Opcional)</label>
                <textarea v-model="formTarea.descripcion" class="form-control rounded-3 border py-2 px-3" rows="2"></textarea>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-6">
                  <label class="form-label fw-semibold">Fecha Inicio</label>
                  <input type="date" v-model="formTarea.fecha_inicio" class="form-control rounded-3 border py-2 px-3" required>
                </div>
                <div class="col-6">
                  <label class="form-label fw-semibold">Fecha Fin Estimada</label>
                  <input type="date" v-model="formTarea.fecha_fin_estimada" class="form-control rounded-3 border py-2 px-3">
                </div>
              </div>
              <div class="row g-3">
                <div class="col-6">
                  <label class="form-label fw-semibold">Horas Estimadas</label>
                  <input type="number" v-model="formTarea.horas_estimadas" class="form-control rounded-3 border py-2 px-3" min="1" required>
                </div>
                <div class="col-6">
                  <label class="form-label fw-semibold">Nivel de Prioridad</label>
                  <select v-model="formTarea.prioridad" class="form-select rounded-3 border py-2 px-3">
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer border-0 pt-0 mt-4 px-0 pb-0">
                <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-success rounded-pill px-4 shadow-sm fw-semibold">Crear Tarea</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="modalGestionTareas" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow">
          <div class="modal-header border-0 pb-0 px-4 pt-4">
            <h5 class="modal-title fw-bold">Tareas de <span class="text-primary">{{ miembroActivo.nombre }}</span></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            
            <div class="mb-4">
              <label class="form-label fw-semibold text-muted text-uppercase fs-8"><i class="fas fa-search me-1"></i> Seleccionar Tarea a Editar</label>
              <select v-model="idTareaSeleccionada" class="form-select rounded-3 border shadow-sm py-2 px-3 border-primary">
                <option value="" v-if="tareasMiembro.length === 0">No tiene tareas asignadas aún</option>
                <option value="" v-else>-- Elija una tarea de la lista --</option>
                <option v-for="t in tareasMiembro" :key="t.id_tarea" :value="t.id_tarea">
                  {{ t.titulo }} ({{ t.estado }})
                </option>
              </select>
            </div>

            <div v-if="idTareaSeleccionada" class="border border-secondary border-opacity-25 rounded-4 p-4 mt-2">
              <h6 class="fw-bold mb-3 text-primary"><i class="fas fa-edit me-2"></i>Modificar Detalles</h6>
              
              <form @submit.prevent="actualizarTarea">
                <div class="mb-3">
                  <label class="form-label fw-semibold fs-8 mb-1">Título de la Tarea</label>
                  <input type="text" v-model="formEdicionTarea.titulo" class="form-control rounded-3 border px-3 py-2" required>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold fs-8 mb-1">Descripción</label>
                  <textarea v-model="formEdicionTarea.descripcion" class="form-control rounded-3 border px-3 py-2" rows="2"></textarea>
                </div>
                <div class="row g-3 mb-3">
                  <div class="col-6">
                    <label class="form-label fw-semibold fs-8 mb-1">Fecha Inicio</label>
                    <input type="date" v-model="formEdicionTarea.fecha_inicio" class="form-control rounded-3 border px-3 py-2" required>
                  </div>
                  <div class="col-6">
                    <label class="form-label fw-semibold fs-8 mb-1">Fecha Fin Est.</label>
                    <input type="date" v-model="formEdicionTarea.fecha_fin_estimada" class="form-control rounded-3 border px-3 py-2">
                  </div>
                </div>
                <div class="row g-3 mb-4">
                  <div class="col-6">
                    <label class="form-label fw-semibold fs-8 mb-1">Horas Est.</label>
                    <input type="number" v-model="formEdicionTarea.horas_estimadas" class="form-control rounded-3 border px-3 py-2" required>
                  </div>
                  <div class="col-6">
                    <label class="form-label fw-semibold fs-8 mb-1">Prioridad</label>
                    <select v-model="formEdicionTarea.prioridad" class="form-select rounded-3 border px-3 py-2">
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                </div>
                
                <div class="d-flex justify-content-between align-items-center mt-2 pt-3 border-top border-secondary border-opacity-25">
                  <button type="button" @click="borrarTarea" class="btn btn-outline-danger rounded-pill px-4 shadow-sm fw-semibold"><i class="fas fa-trash me-2"></i> Eliminar</button>
                  <button type="submit" class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold"><i class="fas fa-save me-2"></i> Guardar</button>
                </div>
              </form>
            </div>
            
          </div>
        </div>
      </div>
    </div>

  </div>
</template>