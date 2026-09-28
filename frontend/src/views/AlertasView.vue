<script setup>
import { ref, computed, onMounted } from 'vue'

const idUsuarioActivo = parseInt(localStorage.getItem('idUsuario'))

// ==========================================
// ESTADO DE ALERTAS (Simulando la base de datos)
// ==========================================
const historialAlertas = ref([])
const isLoading = ref(false)

// Control de UI y Filtros
const tabActivo = ref('todas') // 'todas', 'criticas', 'advertencias'
const filtroTexto = ref('')

// ==========================================
// LÓGICA DE FILTRADO
// ==========================================
const alertasFiltradas = computed(() => {
  let resultado = historialAlertas.value

  // Filtro por pestaña (Nivel de prioridad)
  if (tabActivo.value === 'criticas') {
    resultado = resultado.filter(a => a.nivel_prioridad === 'Critica')
  } else if (tabActivo.value === 'advertencias') {
    resultado = resultado.filter(a => a.nivel_prioridad === 'Advertencia')
  }

  // Filtro por texto (Buscador)
  if (filtroTexto.value.trim() !== '') {
    const texto = filtroTexto.value.toLowerCase()
    resultado = resultado.filter(a => 
      a.titulo.toLowerCase().includes(texto) || 
      a.mensaje.toLowerCase().includes(texto)
    )
  }

  return resultado
})

// ==========================================
// OBTENER DATOS (APIs)
// ==========================================
const cargarAlertas = async () => {
  isLoading.value = true
  try {
    const res = await fetch(`http://localhost:3000/api/alertas/usuario/${idUsuarioActivo}`)
    if (res.ok) {
      const datos = await res.json()
      
      // Mapeamos los datos para inyectar los iconos y fondos según el tipo
      historialAlertas.value = datos.map(a => {
        let icono = 'fa-bell'
        let colorClass = 'text-primary'
        let bgClass = 'rgba(59, 130, 246, 0.15)'

        if (a.nivel_prioridad === 'Critica') {
          icono = 'fa-exclamation-triangle'
          colorClass = 'text-danger'
          bgClass = 'rgba(239, 68, 68, 0.15)'
        } else if (a.nivel_prioridad === 'Advertencia') {
          icono = 'fa-clock'
          colorClass = 'text-warning'
          bgClass = 'rgba(245, 158, 11, 0.15)'
        } else if (a.tipo_alerta === 'ASIGNACION') {
          icono = 'fa-tasks'
        }

        return { ...a, icono, colorClass, bgClass }
      })
    }
  } catch (error) { 
    console.error("Error cargando alertas reales:", error)
  } finally {
    isLoading.value = false
  }
}
// ==========================================
// UTILIDADES VISUALES
// ==========================================
const formatearFechaCompleta = (fechaSQL) => {
  const fecha = new Date(fechaSQL)
  if (isNaN(fecha)) return ''
  return fecha.toLocaleString('es-ES', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  })
}

onMounted(() => {
  cargarAlertas()
})
</script>

<template>
  <div class="h-100 d-flex flex-column">
    
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 px-2 gap-3">
      <div>
        <h3 class="fw-bold mb-0">Historial de <span class="text-primary">Alertas</span></h3>
        <p class="text-muted mb-0 fs-7">Registro de eventos automáticos, desviaciones de presupuesto y cronograma.</p>
      </div>
      
      <div class="custom-input-group border border-secondary border-opacity-25 rounded-pill px-3 py-1 bg-transparent w-100 shadow-sm" style="max-width: 350px;">
        <i class="fas fa-search text-muted me-2"></i>
        <input type="text" v-model="filtroTexto" class="form-control border-0 shadow-none bg-transparent p-1 fw-medium text-body w-100 fs-7" placeholder="Buscar alerta..." autocomplete="off">
      </div>
    </div>

    <div class="card shadow-lg border border-secondary border-opacity-25 rounded-4 h-100 bg-transparent flex-grow-1 overflow-hidden">
      
      <div class="card-header bg-transparent border-bottom border-secondary border-opacity-25 p-3 p-md-4">
        <div class="modern-segmented-control mx-auto" style="max-width: 600px;">
          <button class="segment-btn" :class="{ 'active': tabActivo === 'todas' }" @click="tabActivo = 'todas'">
            <i class="fas fa-list-ul me-2"></i>Todas
          </button>
          <button class="segment-btn" :class="{ 'active': tabActivo === 'criticas' }" @click="tabActivo = 'criticas'">
            <i class="fas fa-exclamation-circle me-2 text-danger"></i>Críticas
          </button>
          <button class="segment-btn" :class="{ 'active': tabActivo === 'advertencias' }" @click="tabActivo = 'advertencias'">
            <i class="fas fa-exclamation-triangle me-2 text-warning"></i>Advertencias
          </button>
        </div>
      </div>

      <div class="card-body p-0 overflow-auto alert-list-container">
        
        <div v-if="isLoading" class="d-flex justify-content-center align-items-center h-100 text-primary">
          <i class="fas fa-circle-notch fa-spin fs-2"></i>
        </div>

        <div v-else-if="alertasFiltradas.length === 0" class="d-flex flex-column justify-content-center align-items-center h-100 text-muted opacity-50 p-5">
          <i class="fas fa-check-double fs-1 mb-3"></i>
          <h5 class="fw-bold">No hay alertas registradas</h5>
          <p class="fs-7 text-center">El sistema no ha detectado eventos que coincidan con tu búsqueda.</p>
        </div>

        <div v-else class="p-3 p-md-4 d-flex flex-column gap-3">
          <div v-for="alerta in alertasFiltradas" :key="alerta.id_notificacion" 
               class="alert-card p-3 p-md-4 rounded-4 border border-secondary border-opacity-25 bg-body d-flex flex-column flex-sm-row gap-3 align-items-start transition-all shadow-sm">
            
            <div class="icon-shape rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 mt-1" 
                 :style="{ width: '54px', height: '54px', backgroundColor: alerta.bgClass, color: alerta.colorClass }">
              <i class="fas fs-4" :class="alerta.icono"></i>
            </div>
            
            <div class="flex-grow-1 w-100">
              <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-2 gap-2">
                <h5 class="fw-bold mb-0 text-body lh-sm">{{ alerta.titulo }}</h5>
                
                <span class="badge rounded-pill fw-bold px-3 py-1 custom-badge"
                      :class="{
                        'badge-critica': alerta.nivel_prioridad === 'Critica',
                        'badge-advertencia': alerta.nivel_prioridad === 'Advertencia',
                        'badge-normal': alerta.nivel_prioridad === 'Normal'
                      }">
                  {{ alerta.nivel_prioridad }}
                </span>
              </div>
              
              <p class="text-muted fs-7 mb-3 lh-base">{{ alerta.mensaje }}</p>
              
              <div class="d-flex align-items-center justify-content-between pt-3 border-top border-secondary border-opacity-10">
                <small class="text-muted fw-medium text-capitalize fs-8">
                  <i class="far fa-calendar-alt me-1"></i> {{ formatearFechaCompleta(alerta.fecha_generacion) }}
                </small>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.modern-segmented-control {
  display: flex;
  background-color: rgba(148, 163, 184, 0.12);
  border-radius: 0.75rem;
  padding: 4px;
}
.segment-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 0.6rem;
  padding: 10px 12px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-muted, #6c757d);
  transition: all 0.25s ease;
}
.segment-btn.active {
  background-color: var(--bg-card, #ffffff);
  color: var(--text-body, #212529) !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
[data-theme="dark"] .segment-btn.active {
  background-color: var(--bg-card, #0d1321);
  color: #ffffff !important;
}

/* ==========================================
   ETIQUETAS PERSONALIZADAS (PERFECTAS PARA DARK/LIGHT)
   ========================================== */
.custom-badge {
  border: 1px solid transparent;
  letter-spacing: 0.5px;
  font-size: 0.7rem;
}

/* Modo Claro */
.badge-critica { color: #dc3545; background-color: rgba(220, 53, 69, 0.1); border-color: rgba(220, 53, 69, 0.3); }
.badge-advertencia { color: #d97706; background-color: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.4); }
.badge-normal { color: #0d6efd; background-color: rgba(13, 110, 253, 0.1); border-color: rgba(13, 110, 253, 0.3); }

/* Modo Oscuro */
[data-theme="dark"] .badge-critica { 
  color: #ff6b6b; 
  background-color: rgba(255, 107, 107, 0.15); 
  border-color: rgba(255, 107, 107, 0.4); 
}
[data-theme="dark"] .badge-advertencia { 
  color: #fbbf24; /* Un amarillo/naranja más brillante */
  background-color: rgba(251, 191, 36, 0.15); 
  border-color: rgba(251, 191, 36, 0.3); 
}
[data-theme="dark"] .badge-normal { 
  color: #60a5fa; 
  background-color: rgba(96, 165, 250, 0.15); 
  border-color: rgba(96, 165, 250, 0.4); 
}

/* Efecto hover en las tarjetas de alerta */
.alert-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.alert-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
}

/* Scroller elegante */
.alert-list-container {
  scrollbar-width: thin;
}
.alert-list-container::-webkit-scrollbar {
  width: 6px;
}
.alert-list-container::-webkit-scrollbar-track {
  background: transparent;
}
.alert-list-container::-webkit-scrollbar-thumb {
  background: rgba(108, 117, 125, 0.3);
  border-radius: 10px;
}
[data-theme="dark"] .alert-list-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
</style>