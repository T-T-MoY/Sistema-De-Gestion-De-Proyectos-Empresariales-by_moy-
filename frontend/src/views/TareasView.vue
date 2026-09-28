<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// ==========================================
// 1. ESTADO GLOBAL Y VARIABLES
// ==========================================
const rolUsuarioActivo = localStorage.getItem('rolUsuario') || 'Empleado'
const idUsuarioActivo = localStorage.getItem('idUsuario')

const proyectos = ref([])
const idProyectoActivo = ref('')
const tareas = ref([])

let modalDetalleInstance = null

// ==========================================
// 2. LÓGICA DEL KANBAN (Agrupación)
// ==========================================
const columnasKanban = computed(() => {
  const columnas = {
    Pendiente: [],
    'En Progreso': [],
    Finalizada: [],
    Cancelada: []
  }
  
  tareas.value.forEach(t => {
    if (columnas[t.estado]) {
      columnas[t.estado].push(t)
    }
  })
  
  return columnas
})

// ==========================================
// 3. OBTENER DATOS (APIs)
// ==========================================
const cargarProyectos = async () => {
  try {
    const res = await fetch(`http://localhost:3000/api/equipo/utilidades/proyectos?rol=${rolUsuarioActivo}&id=${idUsuarioActivo}`)
    if (res.ok) {
      proyectos.value = await res.json()
      if (proyectos.value.length > 0) idProyectoActivo.value = proyectos.value[0].id_proyecto
    }
  } catch (error) { console.error("Error cargando proyectos:", error) }
}

const cargarTablero = async () => {
  if (!idProyectoActivo.value) {
    tareas.value = []
    return
  }
  try {
    const res = await fetch(`http://localhost:3000/api/tareas/tablero/${idProyectoActivo.value}`)
    if (res.ok) tareas.value = await res.json()
  } catch (error) { console.error("Error cargando tablero:", error) }
}

watch(idProyectoActivo, () => {
  cargarTablero()
})

// ==========================================
// 4. MÓDULO: DETALLE DE TAREA Y COMENTARIOS
// ==========================================
const tareaActiva = ref({})
const comentarios = ref([])
const nuevoComentario = ref('')
const isComentariosLoading = ref(false)
const selectEstado = ref('')

const puedeEditarEstado = computed(() => {
  return rolUsuarioActivo === 'Admin' || 
         rolUsuarioActivo === 'Gerente' || 
         tareaActiva.value.id_usuario == idUsuarioActivo
})

const abrirModalTarea = async (tarea) => {
  tareaActiva.value = { ...tarea }
  selectEstado.value = tarea.estado
  comentarios.value = []
  
  await cargarComentarios(tarea.id_tarea)
  modalDetalleInstance.show()
}

// 🚀 LÓGICA EMPRESARIAL INTEGRADA
const guardarNuevoEstado = async () => {
  if (!puedeEditarEstado.value) return

  // Si intenta cerrar la tarea, lanzamos el flujo de reporte
  if (selectEstado.value === 'Finalizada') {
    const horasFinales = prompt("Para finalizar esta tarea, ingresa las horas que trabajaste hoy para completarla:", "1");
    
    if (horasFinales === null) {
      selectEstado.value = tareaActiva.value.estado;
      return; 
    }

    const detalle = prompt("Escribe una breve descripción del cierre de la tarea:", "Tarea completada según requerimientos.");
    
    if (detalle === null) {
      selectEstado.value = tareaActiva.value.estado;
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/avances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tarea: tareaActiva.value.id_tarea,
          id_usuario: idUsuarioActivo,
          fecha_reporte: new Date().toISOString().split('T')[0],
          horas_trabajadas: parseFloat(horasFinales),
          porcentaje_avance: 100, // Fuerza el trigger de la base de datos
          detalle_trabajo: detalle
        })
      })

      if (res.ok) {
        modalDetalleInstance.hide()
        cargarTablero() 
        alert("✅ Tarea finalizada y horas registradas en el historial exitosamente.")
      } else {
        alert("❌ Error al registrar el cierre de la tarea.")
      }
    } catch (error) { console.error(error) }

  } else {
    // Flujo normal para estados como "En Progreso" o "Cancelada"
    try {
      const res = await fetch(`http://localhost:3000/api/tareas/${tareaActiva.value.id_tarea}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: selectEstado.value })
      })
      
      if (res.ok) {
        modalDetalleInstance.hide()
        cargarTablero() 
      }
    } catch (error) { console.error(error) }
  }
}

const cargarComentarios = async (idTarea) => {
  isComentariosLoading.value = true
  try {
    const res = await fetch(`http://localhost:3000/api/tareas/${idTarea}/comentarios`)
    if (res.ok) comentarios.value = await res.json()
  } catch (error) { console.error("Error al cargar comentarios", error) }
  finally { isComentariosLoading.value = false }
}

const enviarComentario = async () => {
  if (!nuevoComentario.value.trim()) return

  const datos = {
    id_tarea: tareaActiva.value.id_tarea,
    id_usuario: idUsuarioActivo,
    comentario: nuevoComentario.value.trim()
  }

  try {
    const res = await fetch(`http://localhost:3000/api/tareas/comentario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    
    if (res.ok) {
      nuevoComentario.value = ''
      cargarComentarios(tareaActiva.value.id_tarea)
    }
  } catch (error) { console.error(error) }
}

// ==========================================
// 5. EFECTO DRAG TO SCROLL (Ratón)
// ==========================================
const scrollWrapper = ref(null)
let isDown = false
let startX, scrollLeft

const onMouseDown = (e) => {
  if (e.target.closest('.task-card') || e.target.closest('select')) return
  isDown = true
  scrollWrapper.value.classList.add('active')
  startX = e.pageX - scrollWrapper.value.offsetLeft
  scrollLeft = scrollWrapper.value.scrollLeft
}

const onMouseLeave = () => { isDown = false; scrollWrapper.value?.classList.remove('active') }
const onMouseUp = () => { isDown = false; scrollWrapper.value?.classList.remove('active') }

const onMouseMove = (e) => {
  if (!isDown) return
  e.preventDefault()
  const x = e.pageX - scrollWrapper.value.offsetLeft
  const walk = (x - startX) * 2 
  scrollWrapper.value.scrollLeft = scrollLeft - walk
}

// ==========================================
// 6. UTILIDADES VISUALES (Mantenidas idénticas)
// ==========================================
const badgePrioridadEstilo = (prioridad) => {
  if (prioridad === 'Alta') return { color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', backgroundColor: 'transparent' }
  if (prioridad === 'Media') return { color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', backgroundColor: 'transparent' }
  return { color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.4)', backgroundColor: 'transparent' }
}

const configuracionColumna = (estado) => {
  if (estado === 'Pendiente') return { colorClass: 'text-secondary', icon: 'fas fa-circle', badgeBg: 'rgba(108, 117, 125, 0.15)', badgeColor: '#6c757d', borderLine: 'rgba(108, 117, 125, 0.3)' }
  if (estado === 'En Progreso') return { colorClass: 'text-primary', icon: 'fas fa-spinner fa-spin', badgeBg: 'rgba(59, 130, 246, 0.15)', badgeColor: '#3b82f6', borderLine: 'rgba(59, 130, 246, 0.3)' }
  if (estado === 'Finalizada') return { colorClass: 'text-success', icon: 'fas fa-check-circle', badgeBg: 'rgba(16, 185, 129, 0.15)', badgeColor: '#10b981', borderLine: 'rgba(16, 185, 129, 0.3)' }
  if (estado === 'Cancelada') return { colorClass: 'text-danger', icon: 'fas fa-times-circle', badgeBg: 'rgba(239, 68, 68, 0.15)', badgeColor: '#ef4444', borderLine: 'rgba(239, 68, 68, 0.3)' }
  return { colorClass: 'text-body', icon: 'fas fa-tasks', badgeBg: 'rgba(0, 0, 0, 0.1)', badgeColor: 'inherit', borderLine: 'rgba(255, 255, 255, 0.1)' }
}

const formatFecha = (fechaSQL) => {
  const d = new Date(fechaSQL)
  if (isNaN(d)) return fechaSQL
  return d.toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const getAvatar = (nombre, fotoReal = null) => {
  if (fotoReal && fotoReal !== 'null' && fotoReal !== '') return fotoReal
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre || 'X')}&background=random`
}

onMounted(async () => {
  modalDetalleInstance = new window.bootstrap.Modal(document.getElementById('modalDetalleTarea'))
  await cargarProyectos()
})
</script>

<template>
  <div class="h-100 d-flex flex-column">
    
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 px-2 gap-3">
      <div>
        <h3 class="fw-bold mb-0">Tablero <span class="text-primary">Kanban</span></h3>
        <p class="text-muted mb-0 fs-7">Selecciona una tarea para editar detalles y comentarios.</p>
      </div>
      
      <div class="custom-input-group border border-primary rounded-pill px-3 py-1 bg-transparent w-100" style="max-width: 320px;">
        <i class="fas fa-briefcase text-primary me-2"></i>
        <select class="form-select border-0 shadow-none bg-transparent p-1 fw-medium text-body w-100" v-model="idProyectoActivo">
          <option value="" v-if="proyectos.length === 0">Sin proyectos</option>
          <option v-for="p in proyectos" :key="p.id_proyecto" :value="p.id_proyecto">{{ p.nombre_proyecto }}</option>
        </select>
      </div>
    </div>

    <div class="kanban-wrapper flex-grow-1" ref="scrollWrapper" 
         @mousedown="onMouseDown" @mouseleave="onMouseLeave" @mouseup="onMouseUp" @mousemove="onMouseMove">
      
      <div class="kanban-board">
        
        <div v-for="(tareasCol, nombreCol) in columnasKanban" :key="nombreCol" 
             class="kanban-column bg-transparent"
             :style="{ border: `1px solid ${configuracionColumna(nombreCol).borderLine}` }"
             :class="nombreCol === 'Cancelada' ? 'opacity-75' : ''">
          
          <div class="kanban-header d-flex justify-content-between align-items-center bg-transparent"
               :style="{ borderBottom: `1px solid ${configuracionColumna(nombreCol).borderLine}` }">
            <h6 class="fw-bold text-uppercase mb-0 fs-7" :class="configuracionColumna(nombreCol).colorClass">
              <i class="me-2" :class="configuracionColumna(nombreCol).icon" style="font-size: 0.8rem;"></i> {{ nombreCol }}
            </h6>
            <span class="badge rounded-pill px-3" 
                  :style="{ backgroundColor: configuracionColumna(nombreCol).badgeBg, color: configuracionColumna(nombreCol).badgeColor }">
              {{ tareasCol.length }}
            </span>
          </div>

          <div class="kanban-cards">
            <div v-for="t in tareasCol" :key="t.id_tarea" 
                 class="card border-0 rounded-4 mb-3 task-card bg-body shadow-none"
                 style="border: 1px solid var(--border-color) !important;"
                 @click="abrirModalTarea(t)">
              <div class="card-body p-3">
                
                <span class="badge rounded-pill fw-normal mb-3 d-inline-block px-2 py-1" :style="badgePrioridadEstilo(t.prioridad)" style="font-size: 0.65rem;">
                  {{ t.prioridad }}
                </span>
                
                <h6 class="fw-bold mb-3 text-body lh-sm" :class="t.estado === 'Cancelada' ? 'text-decoration-line-through text-muted' : ''">
                  {{ t.titulo }}
                </h6>
                
                <div class="d-flex justify-content-between align-items-center pt-3" style="border-top: 1px solid var(--border-color);">
                  <div class="d-flex align-items-center" :title="'Asignado a: ' + (t.nombre_responsable || 'Sin asignar')">
                    <img :src="getAvatar(t.nombre_responsable, t.foto_responsable)" class="rounded-circle flex-shrink-0" :class="t.estado === 'Cancelada' ? 'opacity-50' : ''" width="22" height="22" style="object-fit: cover;">
                    <small class="ms-2 text-muted text-truncate" style="font-size: 0.75rem; max-width:110px;">{{ t.nombre_responsable || 'Sin Asignar' }}</small>
                  </div>
                  <small class="text-muted fw-medium" style="font-size: 0.75rem;"><i class="far fa-clock"></i> {{ t.horas_estimadas }}h</small>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="modal fade" id="modalDetalleTarea" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow-lg">
          <div class="modal-header border-0 pb-0 px-4 pt-4">
            <h5 class="modal-title fw-bold text-body lh-sm pe-3">{{ tareaActiva.titulo }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body p-4 pt-3">
            <div class="p-3 mb-4 rounded-3 border border-secondary border-opacity-25 bg-transparent">
              <p class="text-muted fs-7 mb-0">{{ tareaActiva.descripcion || 'Sin descripción adicional técnica.' }}</p>
            </div>

            <div class="row g-0 mb-4 border border-secondary border-opacity-25 rounded-4 overflow-hidden shadow-sm">
              <div class="col-12 col-sm-6 p-3 bg-transparent border-bottom border-sm-bottom-0 border-sm-end border-secondary border-opacity-25 d-flex align-items-center">
                <div class="icon-shape rounded-circle me-3 d-flex justify-content-center align-items-center flex-shrink-0" style="width: 36px; height: 36px; background-color: rgba(59, 130, 246, 0.15); color: #3b82f6;">
                  <i class="fas fa-user-tag fs-8"></i>
                </div>
                <div>
                  <small class="d-block text-muted fs-9 fw-bold text-uppercase">Responsable</small>
                  <span class="fs-8 fw-bold text-body text-truncate d-block" style="max-width: 140px;">{{ tareaActiva.nombre_responsable || 'Sin asignar' }}</span>
                </div>
              </div>
              <div class="col-12 col-sm-6 p-3 bg-transparent d-flex align-items-center ps-sm-3">
                <div class="icon-shape rounded-circle me-3 d-flex justify-content-center align-items-center flex-shrink-0" style="width: 36px; height: 36px; background-color: rgba(16, 185, 129, 0.15); color: #10b981;">
                  <i class="fas fa-stopwatch fs-8"></i>
                </div>
                <div>
                  <small class="d-block text-muted fs-9 fw-bold text-uppercase">Estimación</small>
                  <span class="fs-8 fw-bold text-body">{{ tareaActiva.horas_estimadas }} horas</span>
                </div>
              </div>
            </div>

            <div v-if="!puedeEditarEstado" class="alert alert-warning py-2 px-3 fs-8 text-center mb-3 rounded-3 border-0 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center">
              <i class="fas fa-lock me-2 fs-6"></i> Solo lectura. Esta tarea está delegada a otro colega.
            </div>

            <div class="mb-4 px-1">
              <label class="form-label fw-bold text-muted mb-1 fs-8 text-uppercase"><i class="fas fa-exchange-alt me-1"></i> Estado del Tablero:</label>
              <select v-model="selectEstado" class="form-select form-select-sm rounded-pill border-secondary border-opacity-25 shadow-sm py-2 px-3 fw-semibold text-body bg-transparent" :disabled="!puedeEditarEstado">
                <option value="Pendiente">Pendiente (Por Hacer)</option>
                <option value="En Progreso">En Progreso (Trabajando)</option>
                <option value="Finalizada">Finalizada (Completada)</option>
                <option value="Cancelada">Cancelada (Bloqueada)</option>
              </select>
            </div>

            <div class="border border-secondary border-opacity-25 rounded-4 p-3 bg-transparent shadow-sm">
              <h6 class="fw-bold mb-3 fs-8 text-uppercase text-muted"><i class="far fa-comments text-primary me-2"></i>Hilo de Feedback</h6>

              <div class="mb-3 d-flex flex-column gap-3" style="max-height: 220px; overflow-y: auto; scrollbar-width: thin;">
                <div v-if="isComentariosLoading" class="text-center text-primary fs-8 py-4"><i class="fas fa-circle-notch fa-spin fs-4 mb-2 d-block"></i>Sincronizando...</div>
                <div v-else-if="comentarios.length === 0" class="text-center text-muted fs-8 py-4 opacity-75"><i class="fas fa-comment-slash fs-2 mb-2 d-block"></i>No hay feedback registrado.</div>
                
                <template v-else>
                  <div v-for="c in comentarios" :key="c.id_comentario" class="d-flex" :class="c.id_usuario == idUsuarioActivo ? 'justify-content-end' : 'justify-content-start'">
                    
                    <img v-if="c.id_usuario != idUsuarioActivo" :src="getAvatar(c.nombre_autor, c.foto_autor)" class="rounded-circle me-2 flex-shrink-0 shadow-sm mt-1" width="30" height="30" style="object-fit: cover;">
                    
                    <div class="p-2 px-3 rounded-4 shadow-sm" :class="c.id_usuario == idUsuarioActivo ? 'bg-primary text-white border-0' : 'bg-transparent border border-secondary border-opacity-25 text-body'" style="max-width: 85%;">
                      <div class="d-flex justify-content-between align-items-center mb-1 gap-3">
                        <small class="fw-bold fs-9" :class="c.id_usuario == idUsuarioActivo ? 'text-white' : 'text-primary'">{{ c.id_usuario == idUsuarioActivo ? 'Tú' : c.nombre_autor }}</small>
                        <small class="fs-9" :class="c.id_usuario == idUsuarioActivo ? 'text-white text-opacity-75' : 'text-muted'">{{ formatFecha(c.fecha_comentario) }}</small>
                      </div>
                      <p class="mb-0 fs-8 lh-sm text-break">{{ c.comentario }}</p>
                    </div>

                  </div>
                </template>
              </div>

              <form @submit.prevent="enviarComentario" class="d-flex gap-2">
                <input type="text" v-model="nuevoComentario" class="form-control form-control-sm rounded-pill border-secondary border-opacity-25 shadow-sm px-3 py-2 bg-transparent text-body" placeholder="Escribe un avance..." autocomplete="off">
                <button class="btn btn-primary rounded-circle flex-shrink-0 shadow-sm d-flex justify-content-center align-items-center" type="submit" style="width: 38px; height: 38px;" :disabled="!nuevoComentario.trim()">
                  <i class="fas fa-paper-plane fs-8 ms-1"></i>
                </button>
              </form>
            </div>

          </div>
          <div class="modal-footer border-0 pt-0 mt-2 px-4 pb-4">
            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cerrar</button>
            <button v-if="puedeEditarEstado" @click="guardarNuevoEstado" type="button" class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold">Guardar Cambios</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ==========================================
   DISEÑO KANBAN 100% RESPONSIVE (MÓVIL, PC Y FULL HD)
   ========================================== */
.kanban-wrapper {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 1rem;
  cursor: grab;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch; 
}
.kanban-wrapper:active { cursor: grabbing; }

.kanban-board {
  display: flex; 
  flex-wrap: nowrap; 
  gap: 1.25rem; 
  min-height: 65vh; 
  align-items: stretch;
  width: 100%; 
  min-width: 1200px; /* GARANTIZA QUE OCUPE TODO EL ANCHO EN PANTALLAS GRANDES */
}

.kanban-column {
  flex: 1 1 0; /* LA MAGIA: Obliga a que todas las columnas tengan exactamente el mismo ancho */
  min-width: 280px; /* Ancho mínimo para que las tarjetas no se aplasten */
  border-radius: 0.75rem;
  display: flex; 
  flex-direction: column;
  max-height: 100%;
}

.kanban-header { 
  padding: 1rem 1.25rem; 
  user-select: none; 
  border-top-left-radius: 0.75rem; 
  border-top-right-radius: 0.75rem; 
}

.kanban-cards { 
  flex-grow: 1; 
  overflow-y: auto; 
  padding: 1rem; 
  scrollbar-width: none; 
}
.kanban-cards::-webkit-scrollbar { display: none; } 

.task-card {
  cursor: pointer; 
  transition: transform 0.2s ease, box-shadow 0.2s ease; 
}
.task-card:hover { 
  transform: translateY(-3px); 
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important; 
}

/* Estilos de la barra de desplazamiento horizontal */
.kanban-wrapper::-webkit-scrollbar { height: 8px; }
.kanban-wrapper::-webkit-scrollbar-track { background: rgba(0,0,0,0.02); border-radius: 4px; }
.kanban-wrapper::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
[data-theme="dark"] .kanban-wrapper::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
[data-theme="dark"] .kanban-wrapper::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }

.fs-9 { font-size: 0.72rem; }
</style>