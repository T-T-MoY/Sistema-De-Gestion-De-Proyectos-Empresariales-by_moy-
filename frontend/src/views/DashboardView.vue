<script setup>
import { ref, onMounted, nextTick } from 'vue'
import Chart from 'chart.js/auto'

const rol = ref(localStorage.getItem('rolUsuario') || 'Empleado')
const nombre = ref(localStorage.getItem('nombrePila') || 'Usuario')
const idUsuario = localStorage.getItem('idUsuario')

const dashboardData = ref({})
const isLoading = ref(true)

let chartEstado = null
let chartCostos = null
let chartProd = null

const formatoMoneda = (valor) => {
  if (!valor) return '0.00'
  return parseFloat(valor).toLocaleString('en-US')
}

const renderizarGraficos = () => {
  const graficos = dashboardData.value.graficos
  if (!graficos) return

  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark'
  Chart.defaults.color = isDarkMode ? '#adb5bd' : '#6c757d'
  Chart.defaults.font.family = "'Roboto', sans-serif"

  // 1. Gráfico de Dona
  const canvasEstado = document.getElementById('chartProyectosEstado')
  if (canvasEstado && graficos.estado) {
    if (chartEstado) chartEstado.destroy()
    const labels = graficos.estado.map(e => e.estado)
    const data = graficos.estado.map(e => parseInt(e.cantidad))
    chartEstado = new Chart(canvasEstado, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['Sin Proyectos'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '70%' }
    })
  }

  // 2. Gráfico de Barras
  const canvasCostos = document.getElementById('chartPresupuestoCostos')
  if (canvasCostos && graficos.costos && graficos.costos.length > 0) {
    if (chartCostos) chartCostos.destroy()
    const labels = graficos.costos.map(c => c.nombre_proyecto.substring(0, 15) + '...')
    const dataPresupuesto = graficos.costos.map(c => parseFloat(c.presupuesto_total))
    const dataReal = graficos.costos.map(c => parseFloat(c.costo_real))
    chartCostos = new Chart(canvasCostos, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Presupuesto (Bs)', data: dataPresupuesto, backgroundColor: '#3b82f6', borderRadius: 4 },
          { label: 'Costo Real (Bs)', data: dataReal, backgroundColor: '#10b981', borderRadius: 4 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
    })
  }

  // 3. Gráfico de Líneas (Solo Admin)
  const canvasProd = document.getElementById('chartProductividad')
  if (canvasProd && graficos.productividad) {
    if (chartProd) chartProd.destroy()
    const labels = graficos.productividad.map(p => p.fecha)
    const data = graficos.productividad.map(p => parseFloat(p.horas))
    chartProd = new Chart(canvasProd, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Horas Trabajadas Globales', data: data,
          borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.2)', borderWidth: 3,
          fill: true, tension: 0.4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    })
  }
}

onMounted(async () => {
  try {
    let url = ''
    if (rol.value === 'Admin') url = 'http://localhost:3000/api/dashboard/admin'
    else if (rol.value === 'Gerente') url = `http://localhost:3000/api/dashboard/gerente/${idUsuario}`
    else url = `http://localhost:3000/api/dashboard/empleado/${idUsuario}`

    const response = await fetch(url)
    if (response.ok) {
      dashboardData.value = await response.json()
    }
  } catch (error) { 
    console.error('Error de red:', error) 
  } finally { 
    isLoading.value = false 
    if (rol.value === 'Admin' || rol.value === 'Gerente') {
      setTimeout(() => { 
        renderizarGraficos() 
      }, 100)
    }
  }
})
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4 px-2">
      <div>
        <h3 class="fw-bold mb-0">Bienvenido, <span class="text-primary">{{ nombre }}</span></h3>
        <p class="text-muted mb-0">Resumen general del sistema y estadísticas en tiempo real.</p>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-5">
      <i class="fas fa-spinner fa-spin fs-2 text-primary"></i>
      <p class="text-muted mt-2">Cargando métricas...</p>
    </div>

    <div v-else>
      
      <div v-if="rol === 'Admin'">
        <div class="row g-3 mb-4">
          <div class="col-xl-3 col-sm-6">
            <div class="card shadow-sm border-0 rounded-4 h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between px-md-1">
                  <div>
                    <p class="text-muted text-sm mb-1 text-uppercase fw-bold">Proyectos Activos</p>
                    <h3 class="fw-bolder mb-0 text-body">{{ dashboardData.proyectos_activos || '0' }}</h3>
                  </div>
                  <div class="icon-shape bg-primary text-white rounded-circle d-flex align-items-center justify-content-center shadow flex-shrink-0" style="width: 48px; height: 48px;"><i class="fas fa-briefcase fs-5"></i></div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-xl-3 col-sm-6">
            <div class="card shadow-sm border-0 rounded-4 h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between px-md-1">
                  <div>
                    <p class="text-muted text-sm mb-1 text-uppercase fw-bold">Presupuesto Global</p>
                    <h3 class="fw-bolder mb-0 text-success">Bs. {{ formatoMoneda(dashboardData.presupuesto_global) }}</h3>
                  </div>
                  <div class="icon-shape bg-success text-white rounded-circle d-flex align-items-center justify-content-center shadow flex-shrink-0" style="width: 48px; height: 48px;"><i class="fas fa-money-bill-wave fs-5"></i></div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-xl-3 col-sm-6">
            <div class="card shadow-sm border-0 rounded-4 h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between px-md-1">
                  <div>
                    <p class="text-muted text-sm mb-1 text-uppercase fw-bold">Empleados Activos</p>
                    <h3 class="fw-bolder mb-0 text-body">{{ dashboardData.empleados_activos || '0' }}</h3>
                  </div>
                  <div class="icon-shape bg-warning text-white rounded-circle d-flex align-items-center justify-content-center shadow flex-shrink-0" style="width: 48px; height: 48px;"><i class="fas fa-users fs-5"></i></div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-xl-3 col-sm-6">
            <div class="card shadow-sm border-0 rounded-4 h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between px-md-1">
                  <div>
                    <p class="text-muted text-sm mb-1 text-uppercase fw-bold">Alertas Críticas</p>
                    <h3 class="fw-bolder mb-0 text-danger">{{ dashboardData.alertas_criticas || '0' }}</h3>
                  </div>
                  <div class="icon-shape bg-danger text-white rounded-circle d-flex align-items-center justify-content-center shadow flex-shrink-0" style="width: 48px; height: 48px;"><i class="fas fa-exclamation-triangle fs-5"></i></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-lg-4">
            <div class="card shadow-lg border-0 rounded-4 h-100">
              <div class="card-header border-bottom border-secondary border-opacity-25 p-4 d-flex justify-content-between align-items-center">
                <h6 class="fw-bold mb-0 text-uppercase text-muted" style="letter-spacing: 1px;">Proyectos por Estado</h6>
              </div>
              <div class="card-body p-4 d-flex justify-content-center align-items-center">
                <div style="position: relative; height: 250px; width: 100%;"><canvas id="chartProyectosEstado"></canvas></div>
              </div>
            </div>
          </div>
          <div class="col-lg-8">
            <div class="card shadow-lg border-0 rounded-4 h-100">
              <div class="card-header border-bottom border-secondary border-opacity-25 p-4 d-flex justify-content-between align-items-center">
                <h6 class="fw-bold mb-0 text-uppercase text-muted" style="letter-spacing: 1px;">Presupuesto vs Costo Real</h6>
              </div>
              <div class="card-body p-4">
                <div style="position: relative; height: 250px; width: 100%;"><canvas id="chartPresupuestoCostos"></canvas></div>
              </div>
            </div>
          </div>
          <div class="col-12">
            <div class="card shadow-lg border-0 rounded-4">
              <div class="card-header border-bottom border-secondary border-opacity-25 p-4 d-flex justify-content-between align-items-center">
                <h6 class="fw-bold mb-0 text-uppercase text-muted" style="letter-spacing: 1px;">Curva de Productividad (Últimos 7 días)</h6>
              </div>
              <div class="card-body p-4">
                <div style="position: relative; height: 250px; width: 100%;"><canvas id="chartProductividad"></canvas></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="rol === 'Gerente'">
        <div class="row g-3 mb-4">
          <div class="col-md-4">
            <div class="card shadow-sm border-0 rounded-4 h-100">
              <div class="card-body p-4 text-center">
                <div class="icon-shape bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center shadow mb-3 flex-shrink-0" style="width: 64px; height: 64px;"><i class="fas fa-project-diagram fs-3"></i></div>
                <h4 class="fw-bold">Mis Proyectos</h4>
                <p class="text-muted">Tienes <strong>{{ dashboardData.proyectos_asignados || '0' }}</strong> proyectos bajo tu supervisión.</p>
                <router-link to="/proyectos" class="btn btn-outline-primary rounded-pill px-4 mt-2">Gestionar Proyectos</router-link>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 rounded-4 h-100">
              <div class="card-body p-4 text-center">
                <div class="icon-shape bg-warning text-white rounded-circle d-inline-flex align-items-center justify-content-center shadow mb-3 flex-shrink-0" style="width: 64px; height: 64px;"><i class="fas fa-tasks fs-3"></i></div>
                <h4 class="fw-bold">Rendimiento</h4>
                <p class="text-muted">El equipo tiene <strong>{{ dashboardData.tareas_atrasadas || '0' }}</strong> tareas atrasadas.</p>
                <router-link to="/equipo" class="btn btn-warning text-white rounded-pill px-4 mt-2 shadow-sm">Ver Equipo</router-link>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 rounded-4 h-100">
              <div class="card-body p-4 text-center">
                <div class="icon-shape bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center shadow mb-3 flex-shrink-0" style="width: 64px; height: 64px;"><i class="fas fa-check-double fs-3"></i></div>
                <h4 class="fw-bold">Horas por Aprobar</h4>
                <p class="text-muted">Hay <strong>{{ dashboardData.registros_por_aprobar || '0' }}</strong> registros pendientes.</p>
                <router-link to="/registros" class="btn btn-success rounded-pill px-4 mt-2 shadow-sm">Aprobar Horas</router-link>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-lg-4">
            <div class="card shadow-lg border-0 rounded-4 h-100">
              <div class="card-header border-bottom border-secondary border-opacity-25 p-4 d-flex justify-content-between align-items-center">
                <h6 class="fw-bold mb-0 text-uppercase text-muted" style="letter-spacing: 1px;">Mis Proyectos (Estado)</h6>
              </div>
              <div class="card-body p-4 d-flex justify-content-center align-items-center">
                <div style="position: relative; height: 250px; width: 100%;"><canvas id="chartProyectosEstado"></canvas></div>
              </div>
            </div>
          </div>
          <div class="col-lg-8">
            <div class="card shadow-lg border-0 rounded-4 h-100">
              <div class="card-header border-bottom border-secondary border-opacity-25 p-4 d-flex justify-content-between align-items-center">
                <h6 class="fw-bold mb-0 text-uppercase text-muted" style="letter-spacing: 1px;">Presupuesto vs Costo Real</h6>
              </div>
              <div class="card-body p-4">
                <div style="position: relative; height: 250px; width: 100%;"><canvas id="chartPresupuestoCostos"></canvas></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="row g-3 mb-4">
        <div class="col-md-6">
          <div class="card shadow-sm border-0 rounded-4 h-100">
            <div class="card-body p-4 text-center">
              <div class="icon-shape bg-info text-white rounded-circle d-inline-flex align-items-center justify-content-center shadow mb-3 flex-shrink-0" style="width: 64px; height: 64px;"><i class="fas fa-clipboard-list fs-3"></i></div>
              <h4 class="fw-bold">Mis Tareas</h4>
              <p class="text-muted">Tienes <strong>{{ dashboardData.tareas_pendientes || '0' }}</strong> tareas pendientes esta semana.</p>
              <router-link to="/tareas" class="btn btn-outline-info rounded-pill px-4 mt-2">Ir al Tablero Kanban</router-link>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card shadow-sm border-0 rounded-4 h-100">
            <div class="card-body p-4 text-center">
              <div class="icon-shape bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center shadow mb-3 flex-shrink-0" style="width: 64px; height: 64px;"><i class="fas fa-clock fs-3"></i></div>
              <h4 class="fw-bold">Registro de Avance</h4>
              <p class="text-muted">Llevas <strong>{{ dashboardData.horas_reportadas_semana || '0' }}</strong> horas reportadas esta semana.</p>
              <router-link to="/registrar-horas" class="btn btn-primary rounded-pill px-4 mt-2 shadow-sm">Reportar Horas</router-link>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>