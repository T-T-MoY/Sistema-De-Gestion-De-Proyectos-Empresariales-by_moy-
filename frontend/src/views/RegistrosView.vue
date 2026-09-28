<script setup>
import { ref, computed, onMounted } from 'vue'

const registros = ref([])
const isLoading = ref(true)
const idUsuarioActivo = localStorage.getItem('idUsuario') || 1 // Ajusta a tu auth

// ==========================================
// 1. FILTROS REACTIVOS
// ==========================================
const filtroTexto = ref('')
const filtroEstado = ref('Pendiente') // Por defecto mostramos los pendientes

// Lógica de filtrado
const registrosFiltrados = computed(() => {
  return registros.value.filter(r => {
    // Filtro por texto (Empleado, Proyecto o Tarea)
    const textoMatch = 
      r.empleado.toLowerCase().includes(filtroTexto.value.toLowerCase()) ||
      r.proyecto.toLowerCase().includes(filtroTexto.value.toLowerCase()) ||
      r.tarea.toLowerCase().includes(filtroTexto.value.toLowerCase())
      
    // Filtro REAL conectado a la base de datos
    // Si el registro no tiene estado, asumimos 'Pendiente'
    const estadoReal = r.estado || 'Pendiente'
    const estadoMatch = filtroEstado.value === 'Todos' || estadoReal === filtroEstado.value

    return textoMatch && estadoMatch
  })
})

// ==========================================
// 2. OBTENER DATOS (API)
// ==========================================
const cargarRegistros = async () => {
  try {
    isLoading.value = true
    const res = await fetch(`http://localhost:3000/api/registros/por-aprobar?id_gerente=${idUsuarioActivo}`)
    if (res.ok) {
      registros.value = await res.json()
    }
  } catch (error) {
    console.error("Error cargando registros:", error)
  } finally {
    isLoading.value = false
  }
}

// ==========================================
// 3. ACCIONES
// ==========================================
const gestionarRegistro = async (id, estado) => {
  try {
    const res = await fetch(`http://localhost:3000/api/registros/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    })

    if (res.ok) {
      // Magia de UI: En lugar de eliminarlo, actualizamos su estado.
      // Así se aplicará el filtro reactivo automáticamente.
      const index = registros.value.findIndex(r => r.id_registro === id)
      if (index !== -1) {
        registros.value[index].estado = estado
      }
      
      // Alerta nativa simple
      alert(`Horas ${estado === 'Aprobado' ? 'Aprobadas' : 'Rechazadas'} correctamente.`);
    }
  } catch (error) {
    console.error("Error al gestionar:", error)
    alert("Error al procesar la solicitud.");
  }
}

// ==========================================
// 4. UTILIDADES VISUALES Y ESTILOS
// ==========================================
const formatearFecha = (fecha) => {
  if (!fecha) return 'N/D'
  return new Date(fecha).toLocaleDateString()
}

const generarAvatar = (nombreCompleto) => {
  const nombreCodificado = encodeURIComponent(nombreCompleto)
  return `https://ui-avatars.com/api/?name=${nombreCodificado}&background=3b82f6&color=fff`
}

// Función para generar los colores del estado
const badgeEstado = (estado) => {
  const est = estado || 'Pendiente'
  if (est === 'Aprobado') return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' }
  if (est === 'Rechazado') return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' }
  return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' } // Pendiente
}

onMounted(() => {
  cargarRegistros()
})
</script>

<template>
  <div>
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 px-2 gap-3">
      <div>
        <h3 class="fw-bold mb-0">Aprobación de <span class="text-primary">Horas</span></h3>
        <p class="text-muted mb-0">Revisa y valida el avance diario reportado por tu equipo.</p>
      </div>
    </div>

    <div class="card shadow-lg border-0 rounded-4 overflow-hidden mb-4 bg-body-tertiary">
      
      <div class="card-header bg-transparent border-bottom-0 p-4">
        <div class="row g-3">
          <div class="col-md-6">
            <div class="custom-input-group border">
              <span class="input-group-text bg-transparent border-0"><i class="fas fa-search text-muted"></i></span>
              <input type="text" class="form-control border-0 shadow-none bg-transparent text-body" v-model="filtroTexto" placeholder="Buscar por empleado, proyecto o tarea...">
            </div>
          </div>
          <div class="col-md-6">
            <div class="custom-input-group border">
              <span class="input-group-text bg-transparent border-0"><i class="fas fa-filter text-muted"></i></span>
              <select class="form-select border-0 shadow-none bg-transparent text-muted py-2" v-model="filtroEstado">
                <option value="Todos">Mostrar Todos</option>
                <option value="Pendiente">Solo Pendientes</option>
                <option value="Aprobado">Solo Aprobados</option>
                <option value="Rechazado">Solo Rechazados</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="card-body p-0">
        
        <div v-if="isLoading" class="text-center p-5">
          <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
          <p class="text-muted mt-2">Cargando registros...</p>
        </div>

        <div v-else-if="registrosFiltrados.length === 0" class="text-center p-5">
          <i class="fas fa-check-circle fa-3x text-success opacity-50 mb-3"></i>
          <h5 class="text-muted">No se encontraron registros</h5>
          <p class="fs-7 text-secondary">Ajusta los filtros o disfruta del día.</p>
        </div>

        <div v-else class="table-responsive d-none d-md-block">
          <table class="table table-hover align-middle mb-0 custom-table">
            <thead>
              <tr>
                <th class="ps-4 py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Empleado</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Proyecto y Tarea</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; text-align: center;">Fecha</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; text-align: center;">Horas</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; text-align: center;">Estado</th>
                <th class="pe-4 py-3 text-muted fw-bold text-uppercase text-end" style="font-size:0.75rem;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="reg in registrosFiltrados" :key="reg.id_registro">
                <td class="ps-4">
                  <div class="d-flex align-items-center">
                    <img :src="generarAvatar(reg.empleado)" class="rounded-circle me-3 shadow-sm flex-shrink-0" width="40" height="40" style="object-fit: cover;">
                    <div class="overflow-hidden">
                      <h6 class="mb-0 fw-bold text-body text-truncate">{{ reg.empleado }}</h6>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="text-primary fw-bold text-truncate" style="max-width: 250px;">{{ reg.proyecto }}</div>
                  <div class="text-muted fs-8 text-truncate" style="max-width: 250px;"><i class="fas fa-tasks me-1 w-15px"></i> {{ reg.tarea }}</div>
                </td>
                <td class="text-center text-muted fw-medium">{{ formatearFecha(reg.fecha_reporte) }}</td>
                <td style="text-align: center;">
                  <span class="badge px-3 py-1 rounded-pill fw-semibold text-body bg-secondary bg-opacity-10">
                    {{ reg.horas_trabajadas }} h ({{ reg.porcentaje_avance }}%)
                  </span>
                </td>
                <td class="text-center">
                  <span class="badge px-3 py-1 rounded-pill fw-semibold" :style="{ backgroundColor: badgeEstado(reg.estado).bg, color: badgeEstado(reg.estado).text }">
                    {{ reg.estado || 'Pendiente' }}
                  </span>
                </td>
                <td class="pe-4 text-end text-nowrap">
                  <div v-if="!reg.estado || reg.estado === 'Pendiente'">
                    <button @click="gestionarRegistro(reg.id_registro, 'Aprobado')" class="btn btn-sm btn-outline-success border-0 shadow-sm me-1" title="Aprobar">
                      <i class="fas fa-check"></i>
                    </button>
                    <button @click="gestionarRegistro(reg.id_registro, 'Rechazado')" class="btn btn-sm btn-outline-danger border-0 shadow-sm" title="Rechazar">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                  <div v-else>
                    <span class="text-muted fs-8"><i class="fas fa-lock me-1"></i>Evaluado</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-3 d-md-none bg-transparent">
          <div class="row g-3">
            <div class="col-12" v-for="reg in registrosFiltrados" :key="reg.id_registro">
              <div class="card shadow-sm border-0 rounded-4 bg-body p-3">
                
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <div class="d-flex align-items-center overflow-hidden">
                    <img :src="generarAvatar(reg.empleado)" class="rounded-circle me-3 shadow-sm flex-shrink-0" width="45" height="45" style="object-fit: cover;">
                    <div class="overflow-hidden w-100">
                      <h6 class="fw-bold mb-1 text-body text-truncate">{{ reg.empleado }}</h6>
                      <span class="badge rounded-pill fw-semibold" :style="{ backgroundColor: badgeEstado(reg.estado).bg, color: badgeEstado(reg.estado).text }">
                        {{ reg.estado || 'Pendiente' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <p class="text-primary fw-bold fs-7 mb-1 text-truncate"><i class="fas fa-project-diagram me-2 w-15px text-center"></i>{{ reg.proyecto }}</p>
                  <p class="text-muted fs-8 mb-1 text-truncate"><i class="fas fa-tasks me-2 w-15px text-center"></i>{{ reg.tarea }}</p>
                  <p class="text-muted fs-8 mb-0"><i class="fas fa-calendar-alt text-primary me-2 w-15px text-center"></i>{{ formatearFecha(reg.fecha_reporte) }}</p>
                </div>

                <div class="d-flex justify-content-between align-items-center border-top border-secondary border-opacity-10 pt-3">
                  <div>
                    <h6 class="fw-bold text-success mb-1">{{ reg.horas_trabajadas }}<span class="text-muted fs-8 fw-normal"> hr</span></h6>
                    <span class="badge px-2 py-1 rounded-pill fw-semibold text-muted bg-secondary bg-opacity-10 fs-9">Avance: {{ reg.porcentaje_avance }}%</span>
                  </div>
                  
                  <div class="d-flex gap-2" v-if="!reg.estado || reg.estado === 'Pendiente'">
                    <button @click="gestionarRegistro(reg.id_registro, 'Aprobado')" class="btn btn-sm btn-outline-success shadow-sm" title="Aprobar"><i class="fas fa-check"></i></button>
                    <button @click="gestionarRegistro(reg.id_registro, 'Rechazado')" class="btn btn-sm btn-outline-danger shadow-sm" title="Rechazar"><i class="fas fa-times"></i></button>
                  </div>
                </div>

              </div>
            </div>
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

.custom-input-group {
  display: flex;
  align-items: center;
  border-radius: 0.5rem;
  overflow: hidden;
}
</style>