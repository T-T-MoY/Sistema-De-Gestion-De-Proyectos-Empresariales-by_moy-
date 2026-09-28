<script setup>
import { ref, computed, onMounted } from 'vue'

// ==========================================
// 1. ESTADO GLOBAL Y PERMISOS
// ==========================================
const rolUsuarioActivo = localStorage.getItem('rolUsuario') || 'Empleado'
const clientes = ref([])

// Filtros Reactivos
const filtroTexto = ref('')
const filtroEstado = ref('Todos')

// ==========================================
// 2. LÓGICA DE FILTRADO (Automático)
// ==========================================
const clientesFiltrados = computed(() => {
  return clientes.value.filter(c => {
    // 1. Filtro por texto (Empresa o NIT)
    const textoBuscado = filtroTexto.value.toLowerCase()
    const coincideTexto = c.nombre_empresa?.toLowerCase().includes(textoBuscado) || 
                          c.nit?.toLowerCase().includes(textoBuscado)

    // 2. Filtro por Estado
    let coincideEstado = true
    if (filtroEstado.value === 'Activo') coincideEstado = c.activo === true
    if (filtroEstado.value === 'Inactivo') coincideEstado = c.activo === false

    return coincideTexto && coincideEstado
  })
})

// ==========================================
// 3. OBTENER DATOS (API)
// ==========================================
const cargarClientes = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/clientes')
    if (res.ok) {
      clientes.value = await res.json()
    }
  } catch (error) {
    console.error("Error al cargar clientes:", error)
  }
}

// ==========================================
// 4. MÓDULO: GESTIÓN DE CLIENTES (CRUD)
// ==========================================
let modalClienteInstance = null
const isEditing = ref(false)
const formCliente = ref({
  id_cliente: null, nombre_empresa: '', nit: '', telefono_contacto: '', 
  correo_empresa: '', direccion_empresa: '', activo: 'true'
})

const abrirModalNuevo = () => {
  isEditing.value = false
  formCliente.value = {
    id_cliente: null, nombre_empresa: '', nit: '', telefono_contacto: '', 
    correo_empresa: '', direccion_empresa: '', activo: 'true'
  }
  modalClienteInstance.show()
}

const prepararEdicion = (c) => {
  isEditing.value = true
  formCliente.value = {
    id_cliente: c.id_cliente,
    nombre_empresa: c.nombre_empresa || '',
    nit: c.nit || '',
    telefono_contacto: c.telefono_contacto || '',
    correo_empresa: c.correo_empresa || '',
    direccion_empresa: c.direccion_empresa || '',
    activo: c.activo ? 'true' : 'false'
  }
  modalClienteInstance.show()
}

const guardarCliente = async () => {
  const f = formCliente.value
  if (!f.nombre_empresa || !f.nit) {
    return alert("El nombre de la empresa y el NIT son obligatorios.")
  }

  const datos = {
    nombre_empresa: f.nombre_empresa,
    nit: f.nit,
    telefono_contacto: f.telefono_contacto,
    correo_empresa: f.correo_empresa,
    direccion_empresa: f.direccion_empresa,
    activo: f.activo === 'true'
  }

  const url = isEditing.value ? `http://localhost:3000/api/clientes/${f.id_cliente}` : 'http://localhost:3000/api/clientes'
  const metodo = isEditing.value ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    })

    if (res.ok) {
      modalClienteInstance.hide()
      cargarClientes()
    } else {
      const err = await res.json()
      alert("Error: " + (err.error || "Fallo en el servidor"))
    }
  } catch (error) { console.error(error) }
}

const cambiarEstado = async (id, nuevoEstado) => {
  if (!confirm(`¿Estás seguro de ${nuevoEstado ? 'activar' : 'desactivar'} este cliente?`)) return
  
  try {
    const res = await fetch(`http://localhost:3000/api/clientes/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: nuevoEstado })
    })
    if (res.ok) cargarClientes()
  } catch (error) { console.error(error) }
}

const eliminarCliente = async (id) => {
  if (!confirm('🚨 ¿ESTÁS SEGURO? Eliminar un cliente de la base de datos es irreversible. Si tiene proyectos, el sistema bloqueará la acción.')) return

  try {
    const res = await fetch(`http://localhost:3000/api/clientes/${id}?rol=${rolUsuarioActivo}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      cargarClientes()
    } else {
      const err = await res.json()
      alert("Acción bloqueada: " + (err.error || "Error desconocido"))
    }
  } catch (error) { console.error(error) }
}

// ==========================================
// 5. UTILIDADES VISUALES Y CICLO DE VIDA
// ==========================================

// ESTILO ESTANDARIZADO PARA INSIGNIAS DE ESTADO
const badgeEstado = (activo) => {
  if (activo) return { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' } // Verde
  return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' } // Rojo
}

onMounted(() => {
  modalClienteInstance = new window.bootstrap.Modal(document.getElementById('modalNuevoCliente'))
  cargarClientes()
})
</script>

<template>
  <div>
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 px-2 gap-3">
      <div>
        <h3 class="fw-bold mb-0">Directorio de <span class="text-primary">Clientes</span></h3>
        <p class="text-muted mb-0">Listado de empresas y entidades asociadas a nuestros proyectos.</p>
      </div>
      <button v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'" 
              @click="abrirModalNuevo" class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold d-flex align-items-center">
        <i class="fas fa-plus me-2"></i> Nuevo Cliente
      </button>
    </div>

    <div class="card shadow-lg border-0 rounded-4 overflow-hidden mb-4">
      
      <div class="card-header bg-transparent border-bottom-0 p-4">
        <div class="row g-3">
          <div class="col-md-5">
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-search"></i></span>
              <input type="text" class="form-control" v-model="filtroTexto" placeholder="Buscar por empresa o NIT...">
            </div>
          </div>
          <div class="col-md-3">
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
            <thead class="border-bottom border-secondary border-opacity-25">
              <tr>
                <th class="ps-4 py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Empresa</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">NIT</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Datos de Contacto</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem;">Dirección</th>
                <th class="py-3 text-muted fw-bold text-uppercase" style="font-size:0.75rem; text-align: center;">Estado</th>
                <th class="pe-4 py-3 text-muted fw-bold text-uppercase text-end" style="font-size:0.75rem;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in clientesFiltrados" :key="c.id_cliente">
                <td class="ps-4">
                  <div class="d-flex align-items-center">
                    <div class="icon-shape bg-light text-primary rounded-circle me-3 d-flex justify-content-center align-items-center shadow-sm flex-shrink-0" style="width: 40px; height: 40px; min-width: 40px;">
                      <i class="fas fa-building"></i>
                    </div>
                    <div>
                      <h6 class="mb-0 fw-bold text-body lh-sm">{{ c.nombre_empresa }}</h6>
                    </div>
                  </div>
                </td>
                <td class="text-body fw-medium">{{ c.nit }}</td>
                <td>
                  <div class="text-muted fs-8"><i class="fas fa-envelope me-1"></i> {{ c.correo_empresa || 'N/A' }}</div>
                  <div class="text-muted fs-8"><i class="fas fa-phone-alt me-1"></i> {{ c.telefono_contacto || 'N/A' }}</div>
                </td>
                <td class="text-muted fs-8 w-25 text-truncate" style="max-width: 200px;" :title="c.direccion_empresa">{{ c.direccion_empresa || 'N/A' }}</td>
                <td style="text-align: center;">
                  <span class="badge px-3 py-1 rounded-pill fw-semibold d-inline-flex align-items-center" :style="badgeEstado(c.activo)">
                    <i class="fas fa-circle me-2" style="font-size: 0.4rem;"></i> {{ c.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="pe-4 text-end text-nowrap">
                  
                  <template v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'">
                    <button @click="prepararEdicion(c)" class="btn btn-sm btn-outline-primary border-0 shadow-sm me-1" title="Editar"><i class="fas fa-edit"></i></button>
                    
                    <button v-if="c.activo" @click="cambiarEstado(c.id_cliente, false)" class="btn btn-sm btn-outline-warning border-0 shadow-sm me-1" title="Desactivar"><i class="fas fa-ban"></i></button>
                    <button v-else @click="cambiarEstado(c.id_cliente, true)" class="btn btn-sm btn-outline-success border-0 shadow-sm me-1" title="Activar"><i class="fas fa-check"></i></button>
                    
                    <button v-if="rolUsuarioActivo === 'Admin'" @click="eliminarCliente(c.id_cliente)" class="btn btn-sm btn-outline-danger border-0 shadow-sm" title="Eliminar Definitivamente"><i class="fas fa-trash"></i></button>
                  </template>
                  
                  <span v-else class="text-muted fs-8"><i class="fas fa-lock me-1"></i>Solo lectura</span>
                </td>
              </tr>
              <tr v-if="clientesFiltrados.length === 0">
                <td colspan="6" class="text-center py-4 text-muted">No se encontraron clientes.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="p-3 d-md-none bg-transparent">
          <div class="row g-3">
            <div class="col-12" v-for="c in clientesFiltrados" :key="c.id_cliente">
              <div class="card shadow-sm border-0 rounded-4 bg-body p-3">
                
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <div class="d-flex align-items-center overflow-hidden w-100">
                    <div class="icon-shape bg-light text-primary rounded-circle me-3 d-flex justify-content-center align-items-center shadow-sm flex-shrink-0" style="width: 45px; height: 45px; min-width: 45px;">
                      <i class="fas fa-building fs-5"></i>
                    </div>
                    <div class="overflow-hidden w-100">
                      <h6 class="fw-bold mb-1 text-body text-truncate">{{ c.nombre_empresa }}</h6>
                      <p class="text-muted fs-8 mb-0">NIT: <span class="fw-medium text-body">{{ c.nit }}</span></p>
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <p class="text-muted fs-8 mb-1 text-truncate"><i class="fas fa-envelope text-primary me-2 w-15px text-center"></i>{{ c.correo_empresa || 'Sin correo' }}</p>
                  <p class="text-muted fs-8 mb-1"><i class="fas fa-phone-alt text-primary me-2 w-15px text-center"></i>{{ c.telefono_contacto || 'Sin teléfono' }}</p>
                  <p class="text-muted fs-8 mb-0 text-truncate"><i class="fas fa-map-marker-alt text-primary me-2 w-15px text-center"></i>{{ c.direccion_empresa || 'Sin dirección registrada' }}</p>
                </div>

                <div class="d-flex justify-content-between align-items-center border-top border-secondary border-opacity-10 pt-3">
                  <span class="badge px-2 py-1 rounded-pill fw-semibold d-inline-flex align-items-center fs-9" :style="badgeEstado(c.activo)">
                    <i class="fas fa-circle me-1" style="font-size: 0.3rem;"></i> {{ c.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                  
                  <div class="d-flex gap-2">
                    <template v-if="rolUsuarioActivo === 'Admin' || rolUsuarioActivo === 'Gerente'">
                      <button @click="prepararEdicion(c)" class="btn btn-sm btn-outline-primary shadow-sm"><i class="fas fa-edit"></i></button>
                      <button v-if="c.activo" @click="cambiarEstado(c.id_cliente, false)" class="btn btn-sm btn-outline-warning shadow-sm"><i class="fas fa-ban"></i></button>
                      <button v-else @click="cambiarEstado(c.id_cliente, true)" class="btn btn-sm btn-outline-success shadow-sm"><i class="fas fa-check"></i></button>
                      <button v-if="rolUsuarioActivo === 'Admin'" @click="eliminarCliente(c.id_cliente)" class="btn btn-sm btn-outline-danger shadow-sm"><i class="fas fa-trash"></i></button>
                    </template>
                    <span v-else class="text-muted fs-8"><i class="fas fa-lock me-1"></i></span>
                  </div>
                </div>

              </div>
            </div>
            
            <div v-if="clientesFiltrados.length === 0" class="col-12 text-center py-4 text-muted">
              No se encontraron clientes.
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="modal fade" id="modalNuevoCliente" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 rounded-4 shadow">
          <div class="modal-header border-0 pb-0 px-4 pt-4">
            <h5 class="modal-title fw-bold text-body">{{ isEditing ? 'Editar Cliente' : 'Registrar Nuevo Cliente' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <form @submit.prevent="guardarCliente">
              <div class="row g-3 mb-3">
                <div class="col-md-8">
                  <label class="form-label fw-semibold">Razón Social / Nombre de la Empresa</label>
                  <input type="text" v-model="formCliente.nombre_empresa" class="form-control rounded-3 border py-2 px-3" placeholder="Ej: Banco Mercantil Santa Cruz" required>
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-semibold">NIT</label>
                  <input type="text" v-model="formCliente.nit" class="form-control rounded-3 border py-2 px-3" placeholder="Número de Identificación Tributaria" required>
                </div>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Teléfono de Contacto</label>
                  <input type="text" v-model="formCliente.telefono_contacto" class="form-control rounded-3 border py-2 px-3" placeholder="Ej: +591 71234567">
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold">Correo de la Empresa</label>
                  <input type="email" v-model="formCliente.correo_empresa" class="form-control rounded-3 border py-2 px-3" placeholder="contacto@empresa.com">
                </div>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-8">
                  <label class="form-label fw-semibold">Dirección</label>
                  <textarea v-model="formCliente.direccion_empresa" class="form-control rounded-3 border py-2 px-3" rows="1" placeholder="Ubicación de las oficinas principales..."></textarea>
                </div>
                <div class="col-md-4">
                  <label class="form-label fw-semibold text-primary">Estado del Cliente</label>
                  <select v-model="formCliente.activo" class="form-select rounded-3 border border-primary py-2 px-3">
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer border-0 pt-0 mt-4 px-0 pb-0">
                <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary rounded-pill px-4 shadow-sm fw-semibold">{{ isEditing ? 'Actualizar Cliente' : 'Guardar Cliente' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Utilidad para alinear los iconos de contacto al mismo tamaño */
.w-15px {
  width: 15px;
  display: inline-block;
}
</style>