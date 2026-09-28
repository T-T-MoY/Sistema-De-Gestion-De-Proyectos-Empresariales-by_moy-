<script setup>
import { ref, computed, onMounted } from 'vue'

// ==========================================
// 1. ESTADO GLOBAL
// ==========================================
const idUsuarioActivo = localStorage.getItem('idUsuario')

const tareasActivas = ref([])
const historial = ref([])
const isLoading = ref(false)

// Estado del Formulario
const formRegistro = ref({
  id_tarea: '',
  fecha_reporte: new Date().toISOString().split('T')[0], // Fecha de hoy por defecto
  horas_trabajadas: '',
  porcentaje_avance: 0,
  detalle_trabajo: ''
})

// ==========================================
// 2. LÓGICA REACTIVA (Sliders y Totales)
// ==========================================
const estiloBadgePorcentaje = computed(() => {
  const val = parseInt(formRegistro.value.porcentaje_avance)
  if (val === 100) return { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' } 
  if (val > 0) return { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' } 
  return { backgroundColor: 'rgba(108, 117, 125, 0.15)', color: '#6c757d', border: '1px solid rgba(108, 117, 125, 0.3)' } 
})

const colorBarra = (porcentaje) => {
  const p = parseInt(porcentaje)
  if (p === 100) return 'bg-success'
  if (p > 50) return 'bg-primary'
  return 'bg-warning'
}

const totalHorasAcumuladas = computed(() => {
  return historial.value.reduce((total, r) => total + parseFloat(r.horas_trabajadas || 0), 0).toFixed(1)
})

// ==========================================
// 3. OBTENER DATOS (APIs)
// ==========================================
const cargarTareas = async () => {
  try {
    const res = await fetch(`http://localhost:3000/api/avances/tareas/${idUsuarioActivo}`)
    if (res.ok) tareasActivas.value = await res.json()
  } catch (error) { console.error("Error al cargar tareas:", error) }
}

const cargarHistorial = async () => {
  try {
    const res = await fetch(`http://localhost:3000/api/avances/historial/${idUsuarioActivo}`)
    if (res.ok) historial.value = await res.json()
  } catch (error) { console.error("Error al cargar historial:", error) }
}

// ==========================================
// 4. GUARDAR REGISTRO
// ==========================================
const guardarRegistro = async () => {
  const f = formRegistro.value

  if (!f.id_tarea) return alert("Por favor selecciona una tarea válida")
  if (!f.fecha_reporte) return alert("Por favor selecciona una fecha")
  if (!f.horas_trabajadas || f.horas_trabajadas <= 0) return alert("Ingresa horas trabajadas válidas (mayor a 0)")
  if (!f.detalle_trabajo.trim()) return alert("Ingresa una descripción del trabajo realizado")

  const datos = {
    id_tarea: parseInt(f.id_tarea),
    id_usuario: parseInt(idUsuarioActivo),
    fecha_reporte: f.fecha_reporte,
    horas_trabajadas: parseFloat(f.horas_trabajadas),
    porcentaje_avance: parseInt(f.porcentaje_avance),
    detalle_trabajo: f.detalle_trabajo.trim()
  }

  isLoading.value = true

  try {
    const res = await fetch('http://localhost:3000/api/avances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })

    if (res.ok) {
      alert("✅ ¡Avance registrado con éxito!")
      
      formRegistro.value = {
        id_tarea: '',
        fecha_reporte: new Date().toISOString().split('T')[0],
        horas_trabajadas: '',
        porcentaje_avance: 0,
        detalle_trabajo: ''
      }

      await cargarHistorial()
      await cargarTareas()
    } else {
      const err = await res.json()
      alert("Error: " + (err.error || "Error desconocido"))
    }
  } catch (error) {
    console.error("Error de red:", error)
    alert("Error al conectar con el servidor. Verifica tu conexión.")
  } finally {
    isLoading.value = false
  }
}

// ==========================================
// 5. UTILIDADES VISUALES
// ==========================================
const formatFecha = (fechaSQL) => {
  const d = new Date(fechaSQL)
  if (isNaN(d)) return fechaSQL
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

onMounted(() => {
  cargarTareas()
  cargarHistorial()
})
</script>

<template>
  <div>
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 px-2 gap-3">
      <div>
        <h3 class="fw-bold mb-0">Registro de <span class="text-primary">Avance Diario</span></h3>
        <p class="text-muted mb-0 fs-7">Reporta las horas invertidas y actualiza el progreso de tus tareas.</p>
      </div>
    </div>

    <div class="row g-4 mb-4">
      
      <div class="col-lg-5">
        <div class="card shadow-lg rounded-4 h-100">
          <div class="card-header bg-transparent border-bottom p-4">
            <h5 class="fw-bold mb-0 text-body"><i class="fas fa-business-time text-primary me-2"></i> Nuevo Registro</h5>
          </div>
          
          <div class="card-body p-4">
            <form @submit.prevent="guardarRegistro">
              
              <div class="mb-3">
                <label class="form-label fw-semibold fs-8 text-uppercase text-muted">Seleccionar Tarea Asignada</label>
                <select class="form-select rounded-3 py-2 px-3 shadow-sm" v-model="formRegistro.id_tarea" required>
                  <option value="" disabled>Elige una tarea en progreso...</option>
                  <option v-for="t in tareasActivas" :key="t.id_tarea" :value="t.id_tarea">
                    TRJ-{{ t.id_tarea }}: {{ t.titulo }}
                  </option>
                </select>
              </div>
              
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold fs-8 text-uppercase text-muted">Fecha de Trabajo</label>
                  <input type="date" v-model="formRegistro.fecha_reporte" class="form-control rounded-3 py-2 px-3 shadow-sm" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold fs-8 text-uppercase text-muted">Horas Invertidas</label>
                  <div class="custom-input-group shadow-sm rounded-3">
                    <input type="number" v-model="formRegistro.horas_trabajadas" class="form-control border-0 py-2 px-3" placeholder="0" step="0.5" min="0.5" max="24" required>
                    <span class="input-group-text border-0 pe-3 fw-medium">hrs</span>
                  </div>
                </div>
              </div>

              <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <label class="form-label fw-semibold mb-0 fs-8 text-uppercase text-muted">Porcentaje de Avance</label>
                  <span class="badge fs-7 rounded-pill px-3 py-1 fw-bold" :style="estiloBadgePorcentaje">{{ formRegistro.porcentaje_avance }}%</span>
                </div>
                <input type="range" class="form-range custom-range-slider mt-2" v-model="formRegistro.porcentaje_avance" min="0" max="100" step="5">
                <div class="d-flex justify-content-between text-muted fs-8 mt-1 fw-medium">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div class="mb-4">
                <label class="form-label fw-semibold fs-8 text-uppercase text-muted">Descripción del Trabajo Realizado</label>
                <textarea v-model="formRegistro.detalle_trabajo" class="form-control rounded-3 p-3 shadow-sm" rows="3" placeholder="Detalla qué hiciste durante estas horas..." required></textarea>
              </div>

              <button type="submit" class="btn-neon w-100 rounded-pill py-2 fw-semibold mt-2 d-flex justify-content-center align-items-center" :disabled="isLoading">
                <span v-if="isLoading"><i class="fas fa-circle-notch fa-spin me-2"></i> Procesando...</span>
                <span v-else><i class="fas fa-save me-2"></i> Confirmar Registro</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <div class="col-lg-7">
        <div class="card shadow-lg rounded-4 h-100 overflow-hidden">
          <div class="card-header bg-transparent border-bottom p-4 d-flex justify-content-between align-items-center">
            <h5 class="fw-bold mb-0 text-body"><i class="fas fa-history text-primary me-2"></i> Mi Historial de Registros</h5>
          </div>
          <div class="card-body p-0">
            
            <div class="table-responsive d-none d-md-block" style="max-height: 520px; scrollbar-width: thin;">
              <table class="table table-hover table-borderless align-middle mb-0 custom-table">
                <thead class="sticky-top" style="background-color: var(--bg-card); z-index: 10;">
                  <tr>
                    <th class="ps-4 py-3 fw-bold text-uppercase text-muted border-bottom border-secondary border-opacity-25" style="font-size:0.75rem; letter-spacing: 1px;">Fecha</th>
                    <th class="py-3 fw-bold text-uppercase text-muted border-bottom border-secondary border-opacity-25" style="font-size:0.75rem; letter-spacing: 1px;">Tarea</th>
                    <th class="py-3 fw-bold text-uppercase text-center text-muted border-bottom border-secondary border-opacity-25" style="font-size:0.75rem; letter-spacing: 1px;">Horas</th>
                    <th class="py-3 fw-bold text-uppercase text-muted border-bottom border-secondary border-opacity-25" style="font-size:0.75rem; letter-spacing: 1px;">Avance Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in historial" :key="r.id_avance">
                    <td class="ps-4 text-muted fw-medium fs-8 border-bottom border-secondary border-opacity-10">{{ formatFecha(r.fecha_reporte) }}</td>
                    <td class="border-bottom border-secondary border-opacity-10">
                      <h6 class="mb-1 fw-bold text-body fs-7 lh-sm">{{ r.titulo }}</h6>
                      <small class="text-muted fs-8 text-truncate d-block" style="max-width: 250px;" :title="r.detalle_trabajo">{{ r.detalle_trabajo }}</small>
                    </td>
                    <td class="text-center fw-bold text-primary border-bottom border-secondary border-opacity-10">{{ parseFloat(r.horas_trabajadas).toFixed(1) }}</td>
                    <td class="pe-4 w-25 border-bottom border-secondary border-opacity-10">
                      <div class="d-flex align-items-center justify-content-between mb-1">
                        <span class="fs-8 fw-bold" :class="r.porcentaje_avance == 100 ? 'text-success' : 'text-body'">{{ r.porcentaje_avance || 0 }}%</span>
                      </div>
                      <div class="progress rounded-pill" style="height: 6px; background-color: var(--border-color);">
                        <div class="progress-bar rounded-pill" :class="colorBarra(r.porcentaje_avance)" :style="{ width: r.porcentaje_avance + '%' }"></div>
                      </div>
                    </td>
                  </tr>
                  
                  <tr v-if="historial.length === 0">
                    <td colspan="4" class="text-center py-5 text-muted border-bottom border-secondary border-opacity-10">
                      <i class="fas fa-folder-open fs-2 mb-2 opacity-25 d-block"></i>
                      No has registrado horas de trabajo aún.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="p-3 d-md-none bg-transparent" style="max-height: 520px; overflow-y: auto; scrollbar-width: thin;">
              <div class="row g-3">
                <div class="col-12" v-for="r in historial" :key="r.id_avance">
                  <div class="card shadow-sm border-0 rounded-4 bg-body p-3">
                    
                    <div class="d-flex justify-content-between align-items-start mb-2">
                      <h6 class="fw-bold mb-0 text-body lh-sm pe-2">{{ r.titulo }}</h6>
                      <span class="badge bg-light text-muted border border-secondary border-opacity-25 px-2 py-1 fs-9 flex-shrink-0">{{ formatFecha(r.fecha_reporte) }}</span>
                    </div>
                    
                    <div class="mb-3">
                      <p class="text-muted fs-8 mb-2 lh-sm">{{ r.detalle_trabajo }}</p>
                      <div class="d-flex align-items-center">
                        <i class="fas fa-clock text-primary me-2"></i>
                        <span class="fw-bold text-primary">{{ parseFloat(r.horas_trabajadas).toFixed(1) }} hrs invertidas</span>
                      </div>
                    </div>

                    <div class="border-top border-secondary border-opacity-10 pt-3">
                      <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fs-9 fw-semibold text-muted text-uppercase">Avance Reportado</span>
                        <span class="fs-8 fw-bold" :class="r.porcentaje_avance == 100 ? 'text-success' : 'text-body'">{{ r.porcentaje_avance || 0 }}%</span>
                      </div>
                      <div class="progress rounded-pill" style="height: 6px; background-color: var(--border-color);">
                        <div class="progress-bar rounded-pill" :class="colorBarra(r.porcentaje_avance)" :style="{ width: r.porcentaje_avance + '%' }"></div>
                      </div>
                    </div>

                  </div>
                </div>

                <div v-if="historial.length === 0" class="col-12 text-center py-4 text-muted">
                  <i class="fas fa-folder-open fs-3 mb-2 opacity-25 d-block"></i>
                  No has registrado horas de trabajo aún.
                </div>
              </div>
            </div>

          </div>
          
          <div class="card-footer bg-transparent border-top border-secondary border-opacity-25 p-3 text-center">
            <p class="text-muted fs-7 mb-0 text-uppercase fw-semibold">Horas Históricas Invertidas: <strong class="text-primary fs-6 ms-2">{{ totalHorasAcumuladas }} h</strong></p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ==========================================
   SLIDER ADAPTATIVO (SIN COLORES INTRUSIVOS)
   ========================================== */


.custom-range-slider::-webkit-slider-runnable-track {
  background-color: var(--border-color); 
  border-radius: 1rem;
  height: 6px;
  transition: background-color 0.3s ease;
}


.custom-range-slider::-webkit-slider-thumb {
  background-color: var(--neon-btn); 
  border: 2px solid var(--bg-card); 
  box-shadow: 0 0 10px var(--neon-shadow);
  transition: transform 0.1s;
}

.custom-range-slider::-webkit-slider-thumb:active {
  transform: scale(1.15);
}

.custom-range-slider::-moz-range-track {
  background-color: var(--border-color);
  border-radius: 1rem;
  height: 6px;
}
.custom-range-slider::-moz-range-thumb {
  background-color: var(--neon-btn);
  border: 2px solid var(--bg-card);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--neon-shadow);
}
</style>