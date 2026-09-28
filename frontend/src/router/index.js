import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import ProyectosView from '../views/ProyectosView.vue' 
import EmpleadosView from '../views/EmpleadosView.vue'
import ClientesView from '../views/ClientesView.vue'
import RecursosView from '../views/RecursosView.vue'
import ReportesView from '../views/ReportesView.vue'
import AlertasView from '../views/AlertasView.vue'
import EquipoView from '../views/EquipoView.vue'
import TareasView from '../views/TareasView.vue'
import RegistrarHorasView from '../views/RegistrarHorasView.vue'
import PerfilView from '../views/PerfilView.vue'
import RegistroView from '../views/RegistrosView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { title: 'Iniciar Sesión' }
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true, title: 'Panel de Control' } // Página: Bienvenido, [Nombre]
    },
    {
      path: '/proyectos',
      name: 'proyectos',
      component: ProyectosView,
      meta: { requiresAuth: true, title: 'Módulo de Proyectos' } // Página: Gestión de Proyectos
    },
    {
      path: '/empleados',
      name: 'empleados',
      component: EmpleadosView,
      meta: { requiresAuth: true, title: 'Recursos Humanos' } // Página: Directorio de Empleados
    },
    {
      path: '/clientes',
      name: 'clientes',
      component: ClientesView,
      meta: { requiresAuth: true, title: 'Relaciones Comerciales' } // Página: Directorio de Clientes
    },
    {
      path: '/recursos',
      name: 'recursos',
      component: RecursosView,
      meta: { requiresAuth: true, title: 'Gestión de Inventario' } // Página: Catálogo de Recursos
    },
    {
      path: '/reportes',
      name: 'reportes',
      component: ReportesView,
      meta: { requiresAuth: true, title: 'Análisis de Datos' } // Página: Centro de Reportes
    },
    {
      path: '/perfil',
      name: 'perfil',
      component: PerfilView,
      meta: { requiresAuth: true, title: 'Configuración' } // Página: Mi Perfil
    },
    {
      path: '/alertas',
      name: 'alertas',
      component: AlertasView,
      meta: { requiresAuth: true, title: 'Notificaciones' } // Página: Mensajes
    },
    {
      path: '/equipo',
      name: 'equipo',
      component: EquipoView,
      meta: { requiresAuth: true, title: 'Asignaciones' } // Página: Equipo de Proyecto
    },
    {
      path: '/tareas',
      name: 'tareas',
      component: TareasView,
      meta: { requiresAuth: true, title: 'Ejecución' } // Página: Tablero Kanban
    },
    {
      path: '/registrar-horas',
      name: 'registrar-horas',
      component: RegistrarHorasView,
      meta: { requiresAuth: true, title: 'Productividad' } // Página: Avance Diario
    },
    {
      path: '/registros',
      name: 'registros',
      component: RegistroView,
      meta: { requiresAuth: true, title: 'Registros' }
    }
  ]
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title} | ApexDEV`
  const isAuthenticated = localStorage.getItem('tokenSession')
  if (to.meta.requiresAuth && !isAuthenticated) next('/login')
  else if (to.name === 'login' && isAuthenticated) next('/')
  else next()
})

export default router