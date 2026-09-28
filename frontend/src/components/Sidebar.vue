<script setup>
import { computed } from 'vue'

const rolUsuario = localStorage.getItem('rolUsuario') || 'Empleado'

const menus = {
  'Admin': [
    { nombre: 'Dashboard', url: '/', icono: 'fa-chart-pie' },
    { nombre: 'Proyectos', url: '/proyectos', icono: 'fa-briefcase' },
    { nombre: 'Empleados', url: '/empleados', icono: 'fa-user-tie' },
    { nombre: 'Clientes', url: '/clientes', icono: 'fa-building' },
    { nombre: 'Recursos', url: '/recursos', icono: 'fa-boxes' },
    { nombre: 'Reportes', url: '/reportes', icono: 'fa-file-pdf' },
    { nombre: 'Alertas', url: '/alertas', icono: 'fa-bell' } // Añadido
  ],
  'Gerente': [
    { nombre: 'Dashboard', url: '/', icono: 'fa-chart-pie' },
    { nombre: 'Mis Proyectos', url: '/proyectos', icono: 'fa-project-diagram' },
    { nombre: 'Clientes', url: '/clientes', icono: 'fa-handshake' },
    { nombre: 'Mi Equipo / Asignaciones', url: '/equipo', icono: 'fa-users-cog' },
    { nombre: 'Tareas', url: '/tareas', icono: 'fa-tasks' },
    { nombre: 'Uso de Recursos', url: '/recursos', icono: 'fa-dolly' },
    { nombre: 'Reportes', url: '/reportes', icono: 'fa-file-invoice-dollar' },
    { nombre: 'Alertas', url: '/alertas', icono: 'fa-bell' } // Añadido
  ],
  'Empleado': [
    { nombre: 'Dashboard', url: '/', icono: 'fa-chart-pie' },
    { nombre: 'Mis Proyectos', url: '/proyectos', icono: 'fa-briefcase' },
    { nombre: 'Mis Tareas', url: '/tareas', icono: 'fa-tasks' },
    { nombre: 'Control de Avance', url: '/registrar-horas', icono: 'fa-user-clock' },
    { nombre: 'Mis Colegas', url: '/equipo', icono: 'fa-users' },
    { nombre: 'Alertas', url: '/alertas', icono: 'fa-bell' } // Añadido
  ]
}

const enlacesDelRol = computed(() => menus[rolUsuario] || menus['Empleado'])
</script>

<template>
  <aside id="sidebar" class="floating-sidebar d-flex flex-column p-3">
    
    <router-link to="/" class="sidebar-brand d-flex align-items-center justify-content-center text-decoration-none mb-4 mt-2 flex-shrink-0">
      <div class="brand-icon d-flex justify-content-center align-items-center shadow-sm" style="width: 42px; height: 42px;">
        <i class="fas fa-layer-group text-white fs-5"></i>
      </div>
      <span class="brand-text ms-3 fs-5 fw-bold text-white" style="transform: translateY(1px); letter-spacing: 0.5px;">
        Apex<span class="fw-light">DEV</span>
      </span>
    </router-link>

    <hr class="sidebar-divider mb-3 flex-shrink-0">

    <div class="menu-scroll-container flex-grow-1 pe-1">
      <ul id="menu-dinamico" class="nav nav-pills flex-column gap-1">
        <li class="nav-item" v-for="(item, index) in enlacesDelRol" :key="index">
          
          <router-link :to="item.url" class="nav-link d-flex align-items-center text-white py-2 px-3 rounded-4" active-class="active">
            <i class="fas text-center me-3" style="width: 30px; font-size: 1.2rem;" :class="item.icono"></i> 
            <span class="fw-medium" style="font-size: 1.03rem; transform: translateY(1px); letter-spacing: 0.3px;">{{ item.nombre }}</span>
          </router-link>
          
        </li>
      </ul>
    </div>

  </aside>
</template>

<style scoped>
.menu-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}
.menu-scroll-container::-webkit-scrollbar { width: 4px; }
.menu-scroll-container::-webkit-scrollbar-track { background: transparent; }
.menu-scroll-container::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
.menu-scroll-container::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.4); }
</style>