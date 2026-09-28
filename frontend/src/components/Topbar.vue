<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute() 

const idUsuarioActivo = parseInt(localStorage.getItem('idUsuario'))
const nombreUsuario = ref('Usuario')
const rolUsuario = ref('Empleado')
const avatarUrl = ref('')
const isDarkMode = ref(localStorage.getItem('theme') === 'dark')

// ==========================================
// ESTADO DE NOTIFICACIONES (Conexión Real BD)
// ==========================================
const notificaciones = ref([])

const notificacionesNoLeidas = computed(() => {
  return notificaciones.value.filter(n => !n.leido).length
})

const cargarNotificaciones = async () => {
  if (!idUsuarioActivo) return

  try {
    const res = await fetch(`http://localhost:3000/api/alertas/usuario/${idUsuarioActivo}`)
    if (res.ok) {
      const datos = await res.json()
      
      notificaciones.value = datos.map(a => {
        let icono = 'fa-bell'
        let color = 'text-primary'
        let bg = 'rgba(59, 130, 246, 0.15)'

        if (a.nivel_prioridad === 'Critica') {
          icono = 'fa-exclamation-triangle'
          color = 'text-danger'
          bg = 'rgba(239, 68, 68, 0.15)'
        } else if (a.nivel_prioridad === 'Advertencia') {
          icono = 'fa-clock'
          color = 'text-warning'
          bg = 'rgba(245, 158, 11, 0.15)'
        } else if (a.tipo_alerta === 'ASIGNACION') {
          icono = 'fa-tasks'
        }

        // Formateo corto de fecha y hora
        const d = new Date(a.fecha_generacion)
        const tiempoStr = isNaN(d) ? '' : d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        return { 
          id: a.id_notificacion, 
          tipo: a.tipo_alerta, 
          titulo: a.titulo, 
          mensaje: a.mensaje, 
          tiempo: tiempoStr, 
          leido: a.leido, 
          icono, color, bg 
        }
      })
    }
  } catch (error) {
    console.error("Error al cargar notificaciones:", error)
  }
}

const marcarComoLeidas = async () => {
  if (!idUsuarioActivo) return

  try {
    const res = await fetch(`http://localhost:3000/api/alertas/usuario/${idUsuarioActivo}/leer`, {
      method: 'PATCH'
    })

    if (res.ok) {
      // Si la BD se actualiza correctamente, limpiamos las alertas visuales
      notificaciones.value.forEach(n => n.leido = true)
    }
  } catch (error) {
    console.error("Error al marcar como leídas:", error)
  }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
onMounted(() => {
  nombreUsuario.value = localStorage.getItem('nombreUsuario') || 'Usuario'
  rolUsuario.value = localStorage.getItem('rolUsuario') || 'Empleado'
  
  const foto = localStorage.getItem('fotoUsuario')
  if (foto && foto !== 'null' && foto !== '') {
    avatarUrl.value = foto
  } else {
    avatarUrl.value = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreUsuario.value)}&background=3b82f6&color=fff`
  }

  isDarkMode.value = localStorage.getItem('theme') !== 'light'

  // Cargar las notificaciones reales al iniciar
  cargarNotificaciones()
})

// Función para cambiar de modo al tocar el Switch
const toggleDarkMode = () => {
  const htmlElement = document.documentElement
  if (isDarkMode.value) {
    htmlElement.setAttribute('data-theme', 'dark')
    htmlElement.setAttribute('data-bs-theme', 'dark')
    localStorage.setItem('theme', 'dark')
  } else {
    htmlElement.setAttribute('data-theme', 'light')
    htmlElement.setAttribute('data-bs-theme', 'light')
    localStorage.setItem('theme', 'light')
  }
}

const cerrarSesion = () => {
  // 1. Salvamos la preferencia del tema antes de que explote la bomba
  const temaGuardado = localStorage.getItem('theme') || 'light'
  
  // 2. Borramos toda la sesión por seguridad (tokens, id, roles)
  localStorage.clear()
  
  // 3. Volvemos a guardar el tema para que el navegador lo recuerde intacto
  localStorage.setItem('theme', temaGuardado)
  
  // 4. Redirigimos al login
  router.push('/login')
}

defineEmits(['toggle-sidebar'])
</script>

<template>
  <nav class="navbar navbar-expand-lg topbar px-4 py-3 rounded-4 shadow-sm mb-4">
    <div class="d-flex align-items-center justify-content-between w-100">
      
      <div class="d-flex align-items-center">
        <button @click="$emit('toggle-sidebar')" id="sidebarToggle" class="btn btn-link d-lg-none me-3 text-body p-0 text-decoration-none">
          <i class="fas fa-bars fs-4"></i>
        </button>
        <h5 class="mb-0 fw-bold d-none d-sm-block page-title" style="transform: translateY(1px);">{{ route.meta.title }}</h5>
      </div>

      <div class="d-flex align-items-center">
        
        <div class="dropdown me-4">
          <button class="btn btn-link text-body p-0 position-relative text-decoration-none d-flex align-items-center" data-bs-toggle="dropdown" aria-expanded="false" style="margin-top: 2px;">
            <i class="fas fa-bell fs-5 text-muted hover-primary transition-all"></i>
            <span v-if="notificacionesNoLeidas > 0" class="position-absolute top-0 start-100 translate-middle badge border border-2 border-body rounded-circle bg-danger p-1" style="font-size: 0.5rem; transform: translate(-30%, -20%) !important;">
              <span class="visually-hidden">Alertas no leídas</span>
              <span class="d-inline-block text-center" style="width: 10px; height: 10px; line-height: 10px;">{{ notificacionesNoLeidas }}</span>
            </span>
          </button>
          
          <div class="dropdown-menu dropdown-menu-end shadow-lg border border-secondary border-opacity-25 mt-3 rounded-4 p-0 overflow-hidden bg-body" style="width: 320px;">
            <div class="p-3 border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center bg-transparent">
              <span class="fw-bold fs-7 mb-0 text-body">Centro de Alertas</span>
              <a href="#" class="text-primary text-decoration-none fs-9 fw-semibold" @click.prevent="marcarComoLeidas" v-if="notificacionesNoLeidas > 0">Marcar leídas</a>
            </div>
            
            <div class="notif-scroll" style="max-height: 300px; overflow-y: auto;">
              <div v-if="notificaciones.length === 0" class="p-4 text-center text-muted fs-8">
                <i class="fas fa-check-circle fs-3 mb-2 opacity-50 d-block"></i>
                Todo al día. No hay alertas recientes.
              </div>
              
              <a v-for="notif in notificaciones" :key="notif.id" href="#" class="dropdown-item p-3 border-bottom border-secondary border-opacity-10 d-flex text-wrap align-items-start position-relative notification-item" :class="notif.leido ? 'opacity-75' : 'bg-primary bg-opacity-10'">
                <div v-if="!notif.leido" class="position-absolute bg-primary rounded-circle" style="width: 6px; height: 6px; left: 8px; top: 22px;"></div>
                
                <div class="rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 ms-2 me-3" :style="{ width: '38px', height: '38px', backgroundColor: notif.bg }">
                  <i class="fas fs-7" :class="[notif.icono, notif.color]"></i>
                </div>
                
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="fw-bold fs-8 text-body lh-sm">{{ notif.titulo }}</span>
                    <span class="text-muted" style="font-size: 0.65rem;">{{ notif.tiempo }}</span>
                  </div>
                  <p class="mb-0 text-muted lh-sm" style="font-size: 0.75rem; white-space: normal;">{{ notif.mensaje }}</p>
                </div>
              </a>
            </div>
            
            <div class="p-2 border-top border-secondary border-opacity-25 text-center bg-body-tertiary bg-opacity-50">
              <router-link to="/alertas" class="text-decoration-none fs-8 text-primary fw-bold text-uppercase" style="letter-spacing: 0.5px;">Ver historial de alertas</router-link>
            </div>
          </div>
        </div>

        <label class="theme-switch me-4 mb-0 d-flex align-items-center" title="Alternar tema">
          <input type="checkbox" v-model="isDarkMode" @change="toggleDarkMode">
          <div class="slider"></div>
        </label>

        <div class="dropdown">
          <div class="d-flex align-items-center cursor-pointer profile-menu" data-bs-toggle="dropdown" aria-expanded="false">
            <img :src="avatarUrl" alt="Perfil" class="rounded-circle shadow-sm border border-2 border-primary" width="42" height="42" style="object-fit: cover;">
            
            <div class="ms-2 d-none d-sm-flex flex-column justify-content-center text-start" style="height: 42px;">
              <span class="fw-bold fs-7 lh-sm text-body">{{ nombreUsuario }}</span>
              <span class="text-muted fs-8 lh-sm">{{ rolUsuario }}</span>
            </div>
            
            <i class="fas fa-chevron-down ms-3 text-muted" style="font-size: 0.8rem;"></i>
          </div>
          
          <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-3 rounded-3">
            <li>
              <router-link class="dropdown-item py-2" to="/perfil">
                <i class="fas fa-user fa-sm fa-fw me-2 text-muted"></i> Mi Perfil
              </router-link>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li>
              <a class="dropdown-item py-2 text-danger" href="#" @click.prevent="cerrarSesion">
                <i class="fas fa-sign-out-alt fa-sm fa-fw me-2"></i> Cerrar Sesión
              </a>
            </li>
          </ul>
        </div>

      </div>
    </div>
  </nav>
</template>

<style scoped>
.hover-primary:hover {
  color: var(--neon-btn, #3b82f6) !important;
}
.transition-all {
  transition: all 0.2s ease;
}
.notification-item {
  transition: background-color 0.2s;
}
.notification-item:hover {
  background-color: rgba(var(--bs-primary-rgb), 0.05) !important;
}

/* Scroll delgado para la lista de notificaciones */
.notif-scroll::-webkit-scrollbar {
  width: 5px;
}
.notif-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.notif-scroll::-webkit-scrollbar-thumb {
  background: rgba(108, 117, 125, 0.3);
  border-radius: 10px;
}
[data-theme="dark"] .notif-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
</style>