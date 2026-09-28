<script setup>
import { ref, computed, onMounted } from 'vue'

// ==========================================
// 1. ESTADO GLOBAL Y PERMISOS
// ==========================================
const rolUsuarioActivo = localStorage.getItem('rolUsuario') || 'Empleado'
const recursos = ref([])

// Filtros Reactivos
const filtroTexto = ref('')
const filtroCategoria = ref('Todos')

// ==========================================
// 2. LÓGICA DE FILTRADO (Automático)
// ==========================================
const recursosFiltrados = computed(() => {
  return recursos.value.filter(r => {
    const textoBuscado = filtroTexto.value.toLowerCase()
    const coincideTexto = r.nombre_recurso?.toLowerCase().includes(textoBuscado) || 
                          r.descripcion?.toLowerCase().includes(textoBuscado)

    const coincideCat = filtroCategoria.value === 'Todos' || r.categoria === filtroCategoria.value

    return coincideTexto && coincideCat
  })
})

// ==========================================
// 3. OBTENER DATOS (API)
// ==========================================
const cargarRecursos = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/recursos')
    if (res.ok) {
      recursos.value = await res.json()
    }
  } catch (error) { console.error("Error al cargar recursos:", error) }
}

// ==========================================
// 4. MÓDULO: GESTIÓN DE RECURSOS (CRUD)
// ==========================================
let modalRecursoInstance = null
const isEditing = ref(false)
const formRecurso = ref({
  id_recurso: null, nombre_recurso: '', descripcion: '', categoria: 'Hardware', 
  costo_unitario: '', unidad_medida: 'Unidad'
})

const abrirModalNuevo = () => {
  isEditing.value = false
  formRecurso.value = {
    id_recurso: null, nombre_recurso: '', descripcion: '', categoria: 'Hardware', 
    costo_unitario: '', unidad_medida: 'Unidad'
  }
  modalRecursoInstance.show()
}

const prepararEdicion = (r) => {
  isEditing.value = true
  formRecurso.value = {
    id_recurso: r.id_recurso,
    nombre_recurso: r.nombre_recurso || '',
    descripcion: r.descripcion || '',
    categoria: r.categoria || 'Otro',
    costo_unitario: parseFloat(r.costo_unitario || 0).toFixed(2),
    unidad_medida: r.unidad_medida || 'Unidad'
  }
  modalRecursoInstance.show()
}

const guardarRecurso = async () => {
  const f = formRecurso.value
  if (!f.nombre_recurso || !f.costo_unitario) {
    return alert("El nombre y el costo unitario son obligatorios.")
  }

  const datos = {
    nombre_recurso: f.nombre_recurso,
    descripcion: f.descripcion,
    categoria: f.categoria,
    costo_unitario: parseFloat(f.costo_unitario),
    unidad_medida: f.unidad_medida
  }

  const url = isEditing.value ? `http://localhost:3000/api/recursos/${f.id_recurso}` : 'http://localhost:3000/api/recursos'
  const metodo = isEditing.value ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })

    if (res.ok) {
      modalRecursoInstance.hide()
      cargarRecursos()
    } else {
      const err = await res.json()
      alert("Error: " + (err.error || "Fallo en el servidor"))
    }
  } catch (error) { console.error(error) }
}

const eliminarRecurso = async (id) => {
  if (!confirm("¿Estás seguro de eliminar este recurso del inventario?")) return
  try {
    const res = await fetch(`http://localhost:3000/api/recursos/${id}`, { method: 'DELETE' })
    if (res.ok) {
      cargarRecursos()
    } else {
      const err = await res.json()
      alert("No se puede eliminar porque este recurso ya está asignado a un proyecto.")
    }
  } catch (error) { console.error(error) }
}

// ==========================================
// 5. UTILIDADES VISUALES (Helpers)
// ==========================================
const obtenerIcono = (categoria) => {
  if (categoria === 'Hardware') return 'fa-laptop text-warning'
  if (categoria === 'Software') return 'fa-code text-primary'
  if (categoria === 'Cloud') return 'fa-cloud text-info'
  if (categoria === 'Insumos') return 'fa-box-open text-success'
  return 'fa-cube text-secondary'
}

// ESTILO ESTANDARIZADO PARA INSIGNIAS DE CATEGORÍA
const badgeCategoria = (categoria) => {
  if (categoria === 'Hardware') return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' } // Naranja
  if (categoria === 'Software') return { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' } // Azul
  if (categoria === 'Cloud') return { backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' } // Cyan
  if (categoria === 'Insumos') return { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' } // Verde
  return { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' } // Gris para 'Otro'
}

// ==========================================
// 6. CICLO DE VIDA
// ==========================================
onMounted(() => {
  modalRecursoInstance = new window.bootstrap.Modal(document.getElementById('modalNuevoRecurso'))
  cargarRecursos()
})
</script>

<template>
  <div>
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 px-2 gap-3">
      <div>
        <h3 class="fw-bold mb-0">Inventario de <span class="text-primary">Recursos</span></h3>
        <p class="text-muted mb-0">Gestión de licencias, hardware y servicios disponibles para proyectos.</p>
      </div>
      <button v-if="rolUsuarioActivo === 'Admin'" @click="abrirModalNuevo" class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold d-flex align-items-center">
        <i class="fas fa-plus me-2"></i> Nuevo Recurso
      </button>
    </div>

    <div class="card shadow-lg border-0 rounded-4 overflow-hidden mb-4">
      
      <div class="card-header bg-transparent border-bottom-0 p-4">
        <div class="row g-3">
          <div class="col-md-6">
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-search"></i></span>
              <input type="text" class="form-control" v-model="filtroTexto" placeholder="Buscar por nombre o descripción...">
            </div>
          </div>
          <div class="col-md-4">
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-tags"></i></span>
              <select class="form-select border-0 shadow-none bg-transparent text-muted py-2" v-model="filtroCategoria">
                <option value="Todos">Todas las categorías</option>
                <option value="Hardware">Hardware / Equipos</option>
                <option value="Software">Software / Licencias</option>
                <option value="Cloud">Servicios Cloud</option>
                <option value="Insumos">Insumos Varios</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="card-body p-0">
        
        <div class="table-responsive d-none d-md-block">
          <table class="table table-hover align-middle mb-0 custom-table">
            <thead class="border-bottom border-secondary border-opacity-25">
              <tr>
                <th class="ps-4 py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Recurso</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Descripción</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; text-align: center;">Categoría</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Costo Unit.</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; text-align: center;">Unidad</th>
                <th class="pe-4 py-3 text-muted fw-bold text-uppercase text-end" style="font-size:0.75rem;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in recursosFiltrados" :key="r.id_recurso">
                <td class="ps-4">
                  <div class="d-flex align-items-center">
                    <div class="icon-shape bg-light rounded-circle me-3 d-flex justify-content-center align-items-center shadow-sm flex-shrink-0" style="width: 40px; height: 40px; min-width: 40px;">
                      <i class="fas" :class="obtenerIcono(r.categoria)"></i>
                    </div>
                    <div>
                      <h6 class="mb-0 fw-bold text-body lh-sm">{{ r.nombre_recurso }}</h6>
                    </div>
                  </div>
                </td>
                <td class="text-muted fs-8 w-25 text-truncate" style="max-width: 200px;" :title="r.descripcion">{{ r.descripcion || 'Sin descripción' }}</td>
                <td style="text-align: center;">
                  <span class="badge px-3 py-1 rounded-pill fw-semibold" :style="badgeCategoria(r.categoria)">{{ r.categoria || 'Otro' }}</span>
                </td>
                <td class="fw-bold text-danger">Bs. {{ parseFloat(r.costo_unitario).toFixed(2) }}</td>
                <td class="text-muted fw-medium text-center">{{ r.unidad_medida || 'N/A' }}</td>
                <td class="pe-4 text-end text-nowrap">
                  
                  <template v-if="rolUsuarioActivo === 'Admin'">
                    <button @click="prepararEdicion(r)" class="btn btn-sm btn-outline-primary border-0 shadow-sm me-1 rounded-pill px-3" title="Editar"><i class="fas fa-edit"></i></button>
                    <button @click="eliminarRecurso(r.id_recurso)" class="btn btn-sm btn-outline-danger border-0 shadow-sm rounded-pill px-3" title="Eliminar"><i class="fas fa-trash"></i></button>
                  </template>
                  
                  <span v-else class="text-muted fs-8"><i class="fas fa-eye me-1"></i>Solo lectura</span>
                  
                </td>
              </tr>
              <tr v-if="recursosFiltrados.length === 0">
                <td colspan="6" class="text-center py-4 text-muted">No se encontraron recursos en el catálogo.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-3 d-md-none bg-transparent">
          <div class="row g-3">
            <div class="col-12" v-for="r in recursosFiltrados" :key="r.id_recurso">
              <div class="card shadow-sm border-0 rounded-4 bg-body p-3">
                
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <div class="d-flex align-items-center overflow-hidden w-100">
                    <div class="icon-shape bg-light rounded-circle me-3 d-flex justify-content-center align-items-center shadow-sm flex-shrink-0" style="width: 45px; height: 45px; min-width: 45px;">
                      <i class="fas fs-5" :class="obtenerIcono(r.categoria)"></i>
                    </div>
                    <div class="overflow-hidden w-100">
                      <h6 class="fw-bold mb-1 text-body text-truncate">{{ r.nombre_recurso }}</h6>
                      <span class="badge rounded-pill fw-semibold" :style="badgeCategoria(r.categoria)">{{ r.categoria || 'Otro' }}</span>
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <p class="text-muted fs-8 mb-0 text-truncate"><i class="fas fa-align-left text-primary me-2 w-15px text-center"></i>{{ r.descripcion || 'Sin descripción detallada' }}</p>
                </div>

                <div class="d-flex justify-content-between align-items-center border-top border-secondary border-opacity-10 pt-3">
                  <div>
                    <h6 class="fw-bold text-danger mb-0">Bs. {{ parseFloat(r.costo_unitario).toFixed(2) }}</h6>
                    <small class="text-muted fs-9">{{ r.unidad_medida || 'N/A' }}</small>
                  </div>
                  
                  <div class="d-flex gap-2">
                    <template v-if="rolUsuarioActivo === 'Admin'">
                      <button @click="prepararEdicion(r)" class="btn btn-sm btn-outline-primary shadow-sm"><i class="fas fa-edit"></i></button>
                      <button @click="eliminarRecurso(r.id_recurso)" class="btn btn-sm btn-outline-danger shadow-sm"><i class="fas fa-trash"></i></button>
                    </template>
                    <span v-else class="text-muted fs-8"><i class="fas fa-lock me-1"></i></span>
                  </div>
                </div>

              </div>
            </div>
            
            <div v-if="recursosFiltrados.length === 0" class="col-12 text-center py-4 text-muted">
              No se encontraron recursos en el catálogo.
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="modal fade" id="modalNuevoRecurso" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow">
          <div class="modal-header border-0 pb-0 px-4 pt-4">
            <h5 class="modal-title fw-bold text-body">{{ isEditing ? 'Editar Recurso' : 'Registrar Nuevo Recurso' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <form @submit.prevent="guardarRecurso">
              <div class="mb-3">
                <label class="form-label fw-semibold">Nombre del Recurso</label>
                <input type="text" v-model="formRecurso.nombre_recurso" class="form-control rounded-3 border py-2 px-3" placeholder="Ej: Licencia Anual Microsoft 365" required>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Descripción Técnica</label>
                <textarea v-model="formRecurso.descripcion" class="form-control rounded-3 border py-2 px-3" rows="2" placeholder="Detalles o especificaciones del material..."></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Categoría</label>
                <select v-model="formRecurso.categoria" class="form-select rounded-3 border py-2 px-3">
                  <option value="Hardware">Hardware / Equipos</option>
                  <option value="Software">Software / Licencias</option>
                  <option value="Cloud">Servicios Cloud</option>
                  <option value="Insumos">Insumos Varios</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Costo Unitario (Bs.)</label>
                  <input type="number" v-model="formRecurso.costo_unitario" class="form-control rounded-3 border py-2 px-3" placeholder="0.00" step="0.01" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Unidad de Medida</label>
                  <select v-model="formRecurso.unidad_medida" class="form-select rounded-3 border py-2 px-3" required>
                    <option value="Unidad">Unidad (Equipo/Pieza)</option>
                    <option value="Suscripción Mensual">Suscripción Mensual</option>
                    <option value="Suscripción Anual">Suscripción Anual</option>
                    <option value="Licencia Única">Licencia Única (Lifetime)</option>
                    <option value="Hora">Por Hora</option>
                    <option value="Global">Global / Paquete</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer border-0 pt-0 mt-4 px-0 pb-0">
                <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold">{{ isEditing ? 'Actualizar Recurso' : 'Guardar Recurso' }}</button>
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