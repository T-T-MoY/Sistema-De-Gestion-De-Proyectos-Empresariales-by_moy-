<script setup>
import { ref, computed, onMounted } from 'vue'

// ==========================================
// 1. ESTADO GLOBAL Y PERMISOS
// ==========================================
const rolUsuarioActivo = localStorage.getItem('rolUsuario') || 'Empleado'
const idUsuarioActivo = localStorage.getItem('idUsuario')

// Variables Reactivas
const proyectos = ref([])
const clientes = ref([])
const empleados = ref([])

// Filtros Reactivos
const filtroTexto = ref('')
const filtroEstado = ref('Todos')

// ==========================================
// 2. LÓGICA DE FILTRADO (Automático)
// ==========================================
const proyectosFiltrados = computed(() => {
  return proyectos.value.filter(p => {
    const coincideTexto = (p.nombre?.toLowerCase().includes(filtroTexto.value.toLowerCase()) || 
                           p.cliente?.toLowerCase().includes(filtroTexto.value.toLowerCase()))
    const coincideEstado = filtroEstado.value === 'Todos' || p.estado === filtroEstado.value
    return coincideTexto && coincideEstado
  })
})

// ==========================================
// 3. OBTENER DATOS (APIs)
// ==========================================
const cargarProyectos = async () => {
  try {
    const res = await fetch(`http://localhost:3000/api/proyectos?rol=${rolUsuarioActivo}&id=${idUsuarioActivo}`)
    if (res.ok) {
      proyectos.value = await res.json()
    }
  } catch (error) { console.error("Error de red:", error) }
}

const cargarDesplegables = async () => {
  try {
    const resCli = await fetch('http://localhost:3000/api/clientes')
    if (resCli.ok) clientes.value = await resCli.json()

    const resEmp = await fetch('http://localhost:3000/api/empleados')
    if (resEmp.ok) empleados.value = await resEmp.json()
  } catch (error) { console.error("Error cargando listas:", error) }
}

// ==========================================
// 4. MÓDULO: GESTIÓN DE PROYECTOS (CRUD)
// ==========================================
let modalProyectoInstance = null
const isEditing = ref(false)
const formProyecto = ref({
  id: null, nombre: '', descripcion: '', id_cliente: '', id_gerente: '', 
  fecha_inicio: '', fecha_fin_estimada: '', fecha_fin_real: '', presupuesto: '', estado: 'Pendiente'
})

const abrirModalNuevo = () => {
  isEditing.value = false
  formProyecto.value = { 
    id: null, nombre: '', descripcion: '', id_cliente: '', 
    id_gerente: rolUsuarioActivo === 'Gerente' ? idUsuarioActivo : '', 
    fecha_inicio: '', fecha_fin_estimada: '', fecha_fin_real: '', presupuesto: '', estado: 'Pendiente' 
  }
  modalProyectoInstance.show()
}

const prepararEdicion = async (id) => {
  try {
    const res = await fetch(`http://localhost:3000/api/proyectos/${id}`)
    const p = await res.json()
    
    isEditing.value = true
    formProyecto.value = {
      id: id,
      nombre: p.nombre_proyecto,
      descripcion: p.descripcion,
      id_cliente: p.id_cliente,
      id_gerente: p.id_gerente,
      fecha_inicio: p.fecha_inicio ? p.fecha_inicio.split('T')[0] : '',
      fecha_fin_estimada: p.fecha_fin_estimada ? p.fecha_fin_estimada.split('T')[0] : '',
      fecha_fin_real: p.fecha_fin_real ? p.fecha_fin_real.split('T')[0] : '',
      presupuesto: p.presupuesto_total,
      estado: p.estado
    }
    modalProyectoInstance.show()
  } catch (error) { console.error("Error cargando proyecto para editar", error) }
}

const guardarProyecto = async () => {
  if (!formProyecto.value.fecha_inicio) return alert('La fecha de inicio es obligatoria')
  if (!formProyecto.value.fecha_fin_estimada) return alert('La fecha fin estimada es obligatoria')
  
  const datos = {
    nombre: formProyecto.value.nombre,
    descripcion: formProyecto.value.descripcion,
    id_cliente: formProyecto.value.id_cliente ? parseInt(formProyecto.value.id_cliente) : null,
    id_gerente: formProyecto.value.id_gerente ? parseInt(formProyecto.value.id_gerente) : null,
    fecha_inicio: formProyecto.value.fecha_inicio,
    fecha_fin_estimada: formProyecto.value.fecha_fin_estimada,
    fecha_fin_real: formProyecto.value.estado === 'Finalizada' ? (formProyecto.value.fecha_fin_real || new Date().toISOString().split('T')[0]) : null,
    presupuesto: formProyecto.value.presupuesto ? parseFloat(formProyecto.value.presupuesto) : 0,
    estado: formProyecto.value.estado
  }

  const url = isEditing.value ? `http://localhost:3000/api/proyectos/${formProyecto.value.id}` : 'http://localhost:3000/api/proyectos'
  const metodo = isEditing.value ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
    })
    if (res.ok) {
      modalProyectoInstance.hide()
      cargarProyectos()
    } else alert("Error al guardar")
  } catch (error) { console.error(error) }
}

const borrarProyecto = async (id) => {
  if (!confirm('¿Estás seguro de eliminar este proyecto?')) return
  try {
    const res = await fetch(`http://localhost:3000/api/proyectos/${id}`, { method: 'DELETE' })
    if (res.ok) cargarProyectos()
  } catch (error) { console.error(error) }
}

// ==========================================
// 5. MÓDULO: RECURSOS DEL PROYECTO
// ==========================================
let modalRecursosInstance = null
const proyectoActivo = ref({ id: null, nombre: '' })
const catalogoRecursos = ref([])
const recursosAsignados = ref([])

const isEditingRecurso = ref(false)
const formRecurso = ref({ id_recurso: '', cantidad_usada: 1, observacion: '' })

const costoTotalRecursos = computed(() => {
  return recursosAsignados.value.reduce((acc, r) => acc + parseFloat(r.costo_total || 0), 0).toFixed(2)
})

const abrirModalRecursos = async (proyecto) => {
  proyectoActivo.value = { id: proyecto.id, nombre: proyecto.nombre }
  formRecurso.value = { id_recurso: '', cantidad_usada: 1, observacion: '' }
  isEditingRecurso.value = false
  
  await cargarCatalogoRecursos()
  await cargarRecursosDelProyecto(proyecto.id)
  modalRecursosInstance.show()
}

const cargarCatalogoRecursos = async () => {
  const res = await fetch('http://localhost:3000/api/recursos')
  if (res.ok) catalogoRecursos.value = await res.json()
}

const cargarRecursosDelProyecto = async (id) => {
  const res = await fetch(`http://localhost:3000/api/proyectos/${id}/recursos`)
  if (res.ok) recursosAsignados.value = await res.json()
}

const guardarRecurso = async () => {
  const url = isEditingRecurso.value 
    ? `http://localhost:3000/api/proyectos/${proyectoActivo.value.id}/recursos/${formRecurso.value.id_recurso}`
    : `http://localhost:3000/api/proyectos/${proyectoActivo.value.id}/recursos`
  
  const datos = {
    id_proyecto: proyectoActivo.value.id,
    id_recurso: parseInt(formRecurso.value.id_recurso),
    cantidad_usada: parseInt(formRecurso.value.cantidad_usada),
    observacion: formRecurso.value.observacion
  }

  try {
    const res = await fetch(url, {
      method: isEditingRecurso.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })
    if (res.ok) {
      formRecurso.value = { id_recurso: '', cantidad_usada: 1, observacion: '' }
      isEditingRecurso.value = false
      cargarRecursosDelProyecto(proyectoActivo.value.id)
    }
  } catch (error) { console.error(error) }
}

const prepararEdicionRecurso = (r) => {
  isEditingRecurso.value = true
  formRecurso.value = {
    id_recurso: r.id_recurso,
    cantidad_usada: r.cantidad_usada,
    observacion: r.observacion || ''
  }
}

const retirarRecurso = async (idRecurso) => {
  if (!confirm("¿Retirar este material?")) return
  const res = await fetch(`http://localhost:3000/api/proyectos/${proyectoActivo.value.id}/recursos/${idRecurso}`, { method: 'DELETE' })
  if (res.ok) cargarRecursosDelProyecto(proyectoActivo.value.id)
}

// ==========================================
// 6. UTILIDADES Y ESTILOS AVANZADOS
// ==========================================
const formatoMoneda = (val) => parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })

const badgeEstilo = (estado) => {
  if (estado === 'En Progreso') return { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }
  if (estado === 'Finalizada') return { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }
  if (estado === 'Cancelado') return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
  return { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' }
}

onMounted(() => {
  modalProyectoInstance = new window.bootstrap.Modal(document.getElementById('modalNuevoProyecto'))
  modalRecursosInstance = new window.bootstrap.Modal(document.getElementById('modalRecursosProyecto'))
  
  cargarProyectos()
  if (rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente') cargarDesplegables()
})
</script>

<template>
  <div>
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 px-2 gap-3">
      <div>
        <h3 class="fw-bold mb-0">Gestión de <span class="text-primary">Proyectos</span></h3>
        <p class="text-muted mb-0">Visualiza y administra los proyectos de la empresa.</p>
      </div>
      <button v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'" 
              @click="abrirModalNuevo" 
              class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold d-flex align-items-center">
        <i class="fas fa-plus me-2"></i> Nuevo Proyecto
      </button>
    </div>

    <div class="card shadow-lg border-0 rounded-4 overflow-hidden mb-4">
      <div class="card-header bg-transparent border-bottom-0 p-4">
        <div class="row g-3">
          <div class="col-md-5">
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-search"></i></span>
              <input type="text" class="form-control" v-model="filtroTexto" placeholder="Buscar por nombre o cliente...">
            </div>
          </div>
          <div class="col-md-4">
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-filter"></i></span>
              <select class="form-select border-0 shadow-none bg-transparent text-muted py-2" v-model="filtroEstado">
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Progreso">En Progreso</option>
                <option value="Finalizada">Finalizada</option>
                <option value="Cancelado">Cancelado</option>
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
                <th class="ps-4 py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; width: 25%;">Proyecto</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Cliente</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Gerente</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; text-align: center;">Estado</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Presupuesto</th>
                <th class="pe-4 py-3 text-muted fw-bold text-uppercase text-end" style="font-size:0.75rem;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in proyectosFiltrados" :key="p.id">
                <td class="ps-4"><h6 class="mb-0 fw-bold text-body">{{ p.nombre }}</h6></td>
                <td class="text-body fw-medium">{{ p.cliente }}</td>
                <td class="text-muted"><i class="fas fa-user-circle me-1"></i> {{ p.gerente }}</td>
                <td style="text-align: center;">
                  <span class="badge px-3 py-2 rounded-pill fw-semibold" :style="badgeEstilo(p.estado)">
                    {{ p.estado }}
                  </span>
                </td>
                <td class="fw-bold text-success">Bs. {{ formatoMoneda(p.presupuesto) }}</td>
                <td class="pe-4 text-end text-nowrap">
                  <button v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'" 
                          @click="abrirModalRecursos(p)" class="btn btn-sm btn-outline-success border-0 shadow-sm me-1" title="Recursos"><i class="fas fa-boxes"></i></button>
                  <button v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'" 
                          @click="prepararEdicion(p.id)" class="btn btn-sm btn-outline-primary border-0 shadow-sm me-1" title="Editar"><i class="fas fa-edit"></i></button>
                  <button v-if="rolUsuarioActivo === 'Admin'" 
                          @click="borrarProyecto(p.id)" class="btn btn-sm btn-outline-danger border-0 shadow-sm" title="Eliminar"><i class="fas fa-trash"></i></button>
                  <span v-if="rolUsuarioActivo === 'Empleado'" class="badge bg-secondary bg-opacity-10 text-muted px-2 py-1"><i class="fas fa-eye"></i> Solo lectura</span>
                </td>
              </tr>
              <tr v-if="proyectosFiltrados.length === 0">
                <td colspan="6" class="text-center py-4 text-muted">No se encontraron proyectos.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-3 d-md-none bg-transparent">
          <div class="row g-3">
            <div class="col-12" v-for="p in proyectosFiltrados" :key="p.id">
              <div class="card shadow-sm border-0 rounded-4 bg-body p-2">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="fw-bold mb-0">{{ p.nombre }}</h6>
                    <span class="badge rounded-pill fw-semibold" :style="badgeEstilo(p.estado)">{{ p.estado }}</span>
                  </div>
                  <p class="text-muted fs-8 mb-1"><i class="fas fa-building me-1"></i> {{ p.cliente }}</p>
                  <p class="text-muted fs-8 mb-2"><i class="fas fa-user-tie me-1"></i> {{ p.gerente }}</p>
                  <h6 class="fw-bold text-success mb-3">Bs. {{ formatoMoneda(p.presupuesto) }}</h6>
                  <div class="d-flex justify-content-end gap-2">
                    <button v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'" @click="abrirModalRecursos(p)" class="btn btn-sm btn-outline-success"><i class="fas fa-boxes"></i></button>
                    <button v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'" @click="prepararEdicion(p.id)" class="btn btn-sm btn-outline-primary"><i class="fas fa-edit"></i></button>
                    <button v-if="rolUsuarioActivo === 'Admin'" @click="borrarProyecto(p.id)" class="btn btn-sm btn-outline-danger"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="modalNuevoProyecto" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow">
          <div class="modal-header border-0 pb-0 px-4 pt-4">
            <h5 class="modal-title fw-bold text-body">{{ isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <form @submit.prevent="guardarProyecto">
              <div class="mb-3">
                <label class="form-label fw-semibold">Nombre del Proyecto</label>
                <input type="text" v-model="formProyecto.nombre" class="form-control rounded-3 border px-3 py-2" required>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Descripción</label>
                <textarea v-model="formProyecto.descripcion" class="form-control rounded-3 border px-3 py-2" rows="2"></textarea>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Cliente</label>
                  <select v-model="formProyecto.id_cliente" class="form-select rounded-3 border py-2 px-3">
                    <option value="">Seleccione un cliente...</option>
                    <option v-for="c in clientes" :key="c.id_cliente" :value="c.id_cliente">{{ c.nombre_empresa || c.nombre }}</option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label fw-semibold">
                    Gerente Responsable 
                    <i v-if="rolUsuarioActivo === 'Gerente'" class="fas fa-lock text-muted ms-1 fs-8" title="Asignación automática"></i>
                  </label>
                  <select 
                    v-model="formProyecto.id_gerente" 
                    class="form-select rounded-3 border py-2 px-3 transition-all" 
                    :class="{ 'opacity-50 bg-secondary bg-opacity-10 text-muted cursor-bloqueado': rolUsuarioActivo === 'Gerente' }"
                    :disabled="rolUsuarioActivo === 'Gerente'"
                  >
                    <option value="">Seleccione un gerente...</option>
                    <option v-for="e in empleados.filter(emp => rolUsuarioActivo === 'Admin' ? (emp.rol === 'Gerente' || emp.rol === 'Admin') : emp.id_usuario == idUsuarioActivo)" 
                            :key="e.id_usuario" :value="e.id_usuario">
                      {{ e.nombre }} {{ e.apellido_paterno }}
                    </option>
                  </select>
                </div>
              </div>
              
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Fecha de Inicio</label>
                  <input type="date" v-model="formProyecto.fecha_inicio" class="form-control rounded-3 border py-2 px-3" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Fecha Fin Estimada</label>
                  <input type="date" v-model="formProyecto.fecha_fin_estimada" class="form-control rounded-3 border py-2 px-3" required>
                </div>
              </div>

              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label fw-semibold">Presupuesto (Bs.)</label>
                  <input type="number" v-model="formProyecto.presupuesto" class="form-control rounded-3 border py-2 px-3">
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-semibold">Estado Actual</label>
                  <select v-model="formProyecto.estado" class="form-select rounded-3 border py-2 px-3">
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Cancelado">Cancelado</option>
                    <option value="Finalizada">Finalizada</option>
                  </select>
                </div>
                
                <div class="col-md-4" v-if="formProyecto.estado === 'Finalizada'">
                  <label class="form-label fw-semibold text-success">Fecha de Cierre Real</label>
                  <input type="date" v-model="formProyecto.fecha_fin_real" class="form-control rounded-3 border py-2 px-3 border-success">
                </div>
              </div>

              <div class="modal-footer border-0 pt-0 mt-4 px-0 pb-0">
                <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold">{{ isEditing ? 'Actualizar Cambios' : 'Crear Proyecto' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="modalRecursosProyecto" tabindex="-1">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow">
          <div class="modal-header border-0 pb-0 px-4 pt-4">
            <div>
              <h5 class="modal-title fw-bold mb-0 text-body">Inventario y Recursos Asignados</h5>
              <small class="text-muted fw-medium">Proyecto activo: <span class="text-primary fw-bold">{{ proyectoActivo.nombre }}</span></small>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="row g-4">
              
              <div class="col-lg-4 border-end border-secondary border-opacity-25" v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'">
                <h6 class="fw-bold mb-3"><i class="fas fa-plus-circle text-primary me-2"></i>Asignar Material</h6>
                <form @submit.prevent="guardarRecurso">
                  <div class="mb-3">
                    <label class="form-label fw-semibold fs-8">Material / Herramienta</label>
                    <select v-model="formRecurso.id_recurso" class="form-select rounded-3 border py-2 px-3" :disabled="isEditingRecurso" required>
                      <option value="">Seleccione un material...</option>
                      <option v-for="r in catalogoRecursos" :key="r.id_recurso" :value="r.id_recurso">
                        {{ r.nombre_recurso }} (Bs. {{ r.costo_unitario }})
                      </option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold fs-8">Cantidad a usar</label>
                    <input type="number" v-model="formRecurso.cantidad_usada" class="form-control rounded-3 border px-3 py-2" min="1" required>
                  </div>
                  <div class="mb-4">
                    <label class="form-label fw-semibold fs-8">Observaciones (Opcional)</label>
                    <textarea v-model="formRecurso.observacion" class="form-control rounded-3 border px-3 py-2" rows="2"></textarea>
                  </div>
                  <button type="submit" class="btn w-100 rounded-pill shadow-sm fw-bold py-2" :class="isEditingRecurso ? 'btn-warning text-dark' : 'btn-primary'">
                    {{ isEditingRecurso ? 'Actualizar Consumo' : 'Registrar Consumo' }}
                  </button>
                  <button v-if="isEditingRecurso" @click="isEditingRecurso = false; formRecurso = { id_recurso: '', cantidad_usada: 1, observacion: '' }" 
                          type="button" class="btn btn-link text-muted w-100 mt-2 fs-8 text-decoration-none">Cancelar Edición</button>
                </form>
              </div>

              <div :class="rolUsuarioActivo === 'Empleado' ? 'col-12' : 'col-lg-8'">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6 class="fw-bold mb-0"><i class="fas fa-boxes text-success me-2"></i>Materiales en Obra</h6>
                  <span class="badge bg-success text-white shadow-sm fs-7 px-3 py-2 rounded-pill fw-bold">Total: Bs. {{ costoTotalRecursos }}</span>
                </div>
                <div class="table-responsive" style="max-height: 350px;">
                  <table class="table table-hover align-middle custom-table mb-0">
                    <thead class="sticky-top" style="background-color: var(--bg-card); z-index: 10;">
                      <tr>
                        <th class="text-muted fw-bold text-uppercase fs-8 py-2">Recurso</th>
                        <th class="text-muted fw-bold text-uppercase fs-8 py-2 text-center">Cantidad</th>
                        <th class="text-muted fw-bold text-uppercase fs-8 py-2 text-end">Costo Total</th>
                        <th class="text-muted fw-bold text-uppercase fs-8 py-2 text-end" v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="r in recursosAsignados" :key="r.id_recurso">
                        <td>
                          <div class="fw-bold text-body">{{ r.nombre_recurso }}</div>
                          <small class="text-muted fs-8">{{ r.observacion || 'Sin observaciones' }}</small>
                        </td>
                        <td class="text-center fw-medium">{{ r.cantidad_usada }} {{ r.unidad_medida || 'u' }}</td>
                        <td class="text-end fw-bold text-success">Bs. {{ formatoMoneda(r.costo_total) }}</td>
                        <td class="text-end pe-2 text-nowrap" v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'">
                          <button @click="prepararEdicionRecurso(r)" class="btn btn-sm btn-outline-primary p-1 lh-1 rounded-circle shadow-sm me-1" title="Editar">
                            <i class="fas fa-edit fs-8 px-1"></i>
                          </button>
                          <button @click="retirarRecurso(r.id_recurso)" class="btn btn-sm btn-outline-danger p-1 lh-1 rounded-circle shadow-sm" title="Retirar">
                            <i class="fas fa-times fs-8 px-1"></i>
                          </button>
                        </td>
                      </tr>
                      <tr v-if="recursosAsignados.length === 0">
                        <td colspan="4" class="text-center text-muted py-4">No hay recursos asignados aún.</td>
                      </tr>
                    </tbody>
                  </table>
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
.cursor-bloqueado {
  cursor: not-allowed !important;
  user-select: none;
}

.transition-all {
  transition: all 0.3s ease;
}
</style>