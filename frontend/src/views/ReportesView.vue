<script setup>
import { ref, onMounted } from 'vue'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable' 
import * as XLSX from 'xlsx'

const rolUsuarioActivo = localStorage.getItem('rolUsuario') || 'Empleado'
const nombreUsuario = localStorage.getItem('nombreUsuario') || 'Usuario'
const idUsuarioActivo = localStorage.getItem('idUsuario')

const proyectos = ref([])
const tipoReporte = ref('avance') 
const proyectoSeleccionado = ref('Todos')

// Variables para el filtro de fechas
const fechaInicio = ref('')
const fechaFin = ref('')

const isGenerating = ref(false)
const hasDocument = ref(false)
const pdfUrl = ref('')
const statusMessage = ref('No hay documento generado')

let currentPdfDoc = null
let currentExcelData = null
let currentReportName = 'Reporte_ApexDEV'

const cargarProyectos = async () => {
  try {
    const res = await fetch(`http://localhost:3000/api/equipo/utilidades/proyectos?rol=${rolUsuarioActivo}&id=${idUsuarioActivo}`)
    if (res.ok) {
      proyectos.value = await res.json()
    }
  } catch (error) { console.error("Error cargando proyectos:", error) }
}

const generarReporte = async () => {
  isGenerating.value = true
  hasDocument.value = false
  statusMessage.value = 'Construyendo PDF...'

  let endpoint = tipoReporte.value;
  if (tipoReporte.value === 'financiero_view') endpoint = 'financiero-view';
  if (tipoReporte.value === 'cronograma_view') endpoint = 'cronograma-view';

  try {
    const res = await fetch(`http://localhost:3000/api/reportes/${endpoint}?id_proyecto=${proyectoSeleccionado.value}&id_usuario=${idUsuarioActivo}&rol=${rolUsuarioActivo}&fecha_inicio=${fechaInicio.value}&fecha_fin=${fechaFin.value}`)
    
    if (!res.ok) throw new Error(`Error ${res.status} al conectar con el servidor.`);

    const datos = await res.json()

    const esHorizontal = (tipoReporte.value === 'avance' || tipoReporte.value === 'cronograma_view')
    const doc = new jsPDF(esHorizontal ? 'l' : 'p')
    
    let headers = []
    let bodyRows = []
    let footers = []
    currentExcelData = []
    
    let textoFechas = (fechaInicio.value || fechaFin.value) ? `\nPeriodo: ${fechaInicio.value || 'Inicio'} al ${fechaFin.value || 'Hoy'}` : ''
    let tituloTexto = ""

    // ====================================================================
    // CASO 1: RECURSOS / COSTOS
    // ====================================================================
    if (tipoReporte.value === 'costos') {
      tituloTexto = "Reporte de Costos Consolidado"
      currentReportName = "Costos_Proyectos_Original"
      headers = ['Proyecto', 'Costo RRHH (Bs)', 'Costo Materiales (Bs)', 'Costo Total (Bs)']
      
      let tRrhh = 0, tMat = 0, tTot = 0

      if (datos.length === 0) {
        bodyRows.push([{ content: 'No se encontraron registros para los filtros seleccionados', colSpan: 4, styles: { halign: 'center', fontStyle: 'italic', textColor: [100,100,100] } }])
      } else {
        datos.forEach(r => {
          let rrhh = parseFloat(r.costo_rrhh) || 0
          let mat = parseFloat(r.costo_materiales) || 0
          let tot = parseFloat(r.costo_total) || 0
          tRrhh += rrhh; tMat += mat; tTot += tot
          
          bodyRows.push([r.proyecto, rrhh.toFixed(2), mat.toFixed(2), tot.toFixed(2)])
          currentExcelData.push({ "Proyecto": r.proyecto, "Costo RRHH": rrhh, "Costo Materiales": mat, "Costo Total": tot })
        })
      }
      footers = ['TOTAL GLOBAL:', tRrhh.toFixed(2), tMat.toFixed(2), tTot.toFixed(2)]
    } 
    // ====================================================================
    // CASO 2: AVANCE OPERATIVO
    // ====================================================================
    else if (tipoReporte.value === 'avance') {
      tituloTexto = "Reporte de Avance Operativo"
      currentReportName = "Avance_Proyectos_Original"
      headers = ['Proyecto', 'Cliente', 'Estado / Vence', 'Tareas (Pen/Prog/Fin)', 'Horas (Real/Est)', 'Progreso']
      
      let sTar = 0, sPen = 0, sPro = 0, sFin = 0, sHrsE = 0, sHrsR = 0

      if (datos.length === 0) {
        bodyRows.push([{ content: 'No se encontraron registros para los filtros seleccionados', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic', textColor: [100,100,100] } }])
      } else {
        datos.forEach(r => {
          sTar += parseInt(r.total_tareas || 0); sPen += parseInt(r.tareas_pendientes || 0)
          sPro += parseInt(r.tareas_en_progreso || 0); sFin += parseInt(r.tareas_finalizadas || 0)
          sHrsE += parseInt(r.horas_estimadas || 0); sHrsR += parseInt(r.horas_trabajadas || 0)
          
          let fechaF = r.fecha_limite ? new Date(r.fecha_limite).toLocaleDateString() : 'N/D'
          bodyRows.push([
            r.proyecto, r.cliente, `${r.estado_proyecto}\n${fechaF}`, 
            `${r.total_tareas} Tot (${r.tareas_pendientes}P / ${r.tareas_en_progreso}P / ${r.tareas_finalizadas}F)`,
            `${r.horas_trabajadas}h / ${r.horas_estimadas}h`, `${r.porcentaje_avance}%`
          ])
          currentExcelData.push({
            "Proyecto": r.proyecto, "Cliente": r.cliente, "Estado": r.estado_proyecto, "Vencimiento": fechaF,
            "Tareas": r.total_tareas, "Horas Estimadas": r.horas_estimadas, "Horas Reales": r.horas_trabajadas, "Avance %": r.porcentaje_avance
          })
        })
      }
      let avGl = sTar > 0 ? ((sFin / sTar) * 100).toFixed(2) : 0
      footers = ['TOTALES GLOBALES:', '', '', `${sTar} Tot (${sPen}P / ${sPro}P / ${sFin}F)`, `${sHrsR}h / ${sHrsE}h`, `${avGl}%`]
    }
    // ====================================================================
    // CASO 3: REPORTE FINANCIERO DETALLADO
    // ====================================================================
    else if (tipoReporte.value === 'financiero_view') {
      tituloTexto = "Reporte Financiero de Proyectos"
      currentReportName = "Reporte_Financiero_Detallado"
      headers = ['Proyecto', 'Estado', 'Presupuesto (Bs)', 'Mano Obra (Bs)', 'Materiales (Bs)', 'Total Real (Bs)', 'Consumo %']
      
      let tPres = 0, tRrhh = 0, tMat = 0, tTot = 0

      if (datos.length === 0) {
        bodyRows.push([{ content: 'No se encontraron registros para los filtros seleccionados', colSpan: 7, styles: { halign: 'center', fontStyle: 'italic', textColor: [100,100,100] } }])
      } else {
        datos.forEach(r => {
          let pres = parseFloat(r.presupuesto_total) || 0
          let rrhh = parseFloat(r.costo_mano_obra) || 0
          let mat = parseFloat(r.costo_materiales) || 0
          let tot = parseFloat(r.costo_real_acumulado) || 0
          tPres += pres; tRrhh += rrhh; tMat += mat; tTot += tot
          
          bodyRows.push([
            r.nombre_proyecto, r.estado, pres.toFixed(2), rrhh.toFixed(2), mat.toFixed(2), tot.toFixed(2), 
            `${r.porcentaje_consumido}% ${r.alerta_sobrecosto ? '(RIESGO)' : ''}`
          ])
          currentExcelData.push({
            "Proyecto": r.nombre_proyecto, "Estado": r.estado, "Presupuesto": pres, "Mano de Obra": rrhh, "Materiales": mat, "Costo Real": tot, "Consumo %": r.porcentaje_consumido
          })
        })
      }
      footers = ['TOTAL GLOBAL:', '', tPres.toFixed(2), tRrhh.toFixed(2), tMat.toFixed(2), tTot.toFixed(2), '']
    }
    // ====================================================================
    // CASO 4: CRONOGRAMA Y SEGUIMIENTO DE TAREAS
    // ====================================================================
    else if (tipoReporte.value === 'cronograma_view') {
      tituloTexto = "Reporte de Cronograma y Desvíos de Tareas"
      currentReportName = "Reporte_Cronograma_Tareas"
      headers = ['Proyecto', 'Tarea', 'Responsable', 'Horas Invertidas', 'Fin Estimado', 'Atraso (Días)', 'Situación']
      
      let totalHoras = 0

      if (datos.length === 0) {
        bodyRows.push([{ content: 'No se encontraron registros para los filtros seleccionados', colSpan: 7, styles: { halign: 'center', fontStyle: 'italic', textColor: [100,100,100] } }])
      } else {
        datos.forEach(r => {
          let hrs = parseFloat(r.horas_invertidas) || 0
          totalHoras += hrs
          let fEstimada = r.fecha_fin_estimada ? new Date(r.fecha_fin_estimada).toLocaleDateString() : 'N/D'
          
          bodyRows.push([
            r.nombre_proyecto, r.nombre_tarea, r.responsable || 'Sin Asignar', `${hrs} h`, fEstimada, r.dias_desvio, r.semaforo_tiempo
          ])
          currentExcelData.push({
            "Proyecto": r.nombre_proyecto, "Tarea": r.nombre_tarea, "Responsable": r.responsable, "Horas": hrs, "Estimada": fEstimada, "Días Retraso": r.dias_desvio, "Situación": r.semaforo_tiempo
          })
        })
      }
      footers = ['TOTALES:', '', '', `${totalHoras} h`, '', '', '']
    }
    // ====================================================================
    // CASO 5: NÓMINA Y RENDIMIENTO
    // ====================================================================
    else if (tipoReporte.value === 'nomina') {
      const isTodos = proyectoSeleccionado.value === 'Todos'
      const nomProyecto = isTodos ? 'Todos los Proyectos (Consolidado)' : proyectos.value.find(p => p.id_proyecto === proyectoSeleccionado.value)?.nombre_proyecto || 'Proyecto'
      
      // Aquí está el título de 3 líneas que sobreponía el texto
      tituloTexto = `Reporte de Rendimiento y Planilla de Pagos\nProyecto: ${nomProyecto}${textoFechas}`
      currentReportName = `Planilla_Pagos_${isTodos ? 'General' : proyectoSeleccionado.value}`
      
      headers = ['Proyecto', 'Empleado', 'Especialidad', 'Tareas Fin.', 'Horas', 'Tarifa (Bs)', 'Total Pagar (Bs)']
      
      let tTareas = 0, tHoras = 0, tPagar = 0

      if (datos.length === 0) {
        bodyRows.push([{ content: 'No hay personal asignado o no se encontraron registros de avance en los proyectos seleccionados.', colSpan: 7, styles: { halign: 'center', fontStyle: 'italic', textColor: [100,100,100] } }])
      } else {
        datos.forEach(r => {
          let tareas = parseInt(r.tareas_completadas) || 0
          let horas = parseFloat(r.total_horas) || 0
          let tarifa = parseFloat(r.tarifa_hora) || 0
          let pagar = parseFloat(r.total_pagar) || 0
          
          tTareas += tareas; tHoras += horas; tPagar += pagar
          
          bodyRows.push([
            r.proyecto, r.empleado, r.especialidad, tareas.toString(), `${horas.toFixed(1)} h`, tarifa.toFixed(2), pagar.toFixed(2)
          ])
          currentExcelData.push({
            "Proyecto": r.proyecto, "Empleado": r.empleado, "Especialidad": r.especialidad, "Tareas Completadas": tareas, "Horas Trabajadas": horas, "Tarifa Base": tarifa, "Total a Pagar": pagar
          })
        })
      }
      footers = ['TOTAL PLANILLA:', '', '', tTareas.toString(), `${tHoras.toFixed(1)} h`, '', `Bs. ${tPagar.toFixed(2)}`]
    }

    // ====================================================================
    // RENDERIZADO DEL PDF (CORRECCIÓN DE ESPACIOS)
    // ====================================================================
    doc.text(tituloTexto, 14, 22)
    
    // Calculamos dinámicamente dónde empezar a escribir lo de abajo
    // split('\n').length cuenta cuántas líneas tiene el título
    const cantidadDeLineas = tituloTexto.split('\n').length;
    const posicionYSubtitulo = 22 + (cantidadDeLineas * 6); 

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generado por: ${nombreUsuario} (${rolUsuarioActivo})  |  Fecha: ${new Date().toLocaleString()}`, 14, posicionYSubtitulo)

    // La tabla ahora iniciará 6 pixeles más abajo del subtítulo, sin importar qué tan grande sea el título
    autoTable(doc, {
      startY: posicionYSubtitulo + 6,
      head: [headers],
      body: bodyRows,
      foot: [footers],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }, 
      footStyles: { fillColor: [241, 245, 249], textColor: [220, 38, 38] }, 
      styles: { fontSize: 9 }
    })

    currentPdfDoc = doc
    const pdfBlob = doc.output('blob')
    pdfUrl.value = URL.createObjectURL(pdfBlob)
    
    isGenerating.value = false
    hasDocument.value = true

  } catch (error) {
    console.error(error)
    isGenerating.value = false
    statusMessage.value = error.message
  }
}

const exportarPDF = () => {
  if (currentPdfDoc) currentPdfDoc.save(`${currentReportName}.pdf`)
}

const exportarExcel = () => {
  if (!currentExcelData) return
  const ws = XLSX.utils.json_to_sheet(currentExcelData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Datos")
  XLSX.writeFile(wb, `${currentReportName}.xlsx`)
}

onMounted(() => {
  cargarProyectos()
})
</script>

<template>
  <div>
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 px-2 gap-3">
      <div>
        <h3 class="fw-bold mb-0">Centro de <span class="text-primary">Reportes</span></h3>
        <p class="text-muted mb-0">Visualiza y exporta métricas transaccionales, de avance y costos financieros.</p>
      </div>
    </div>

    <div class="row g-4 mb-4">
      
      <div class="col-lg-4">
        <div class="card shadow-lg border-0 rounded-4 h-100 bg-body-tertiary">
          <div class="card-header bg-transparent border-bottom-0 p-4 pb-2">
            <h5 class="fw-bold mb-0 text-body"><i class="fas fa-sliders-h text-primary me-2"></i> Parámetros</h5>
          </div>
          <div class="card-body p-4 pt-3">
            <form @submit.prevent="generarReporte">
              
              <div class="mb-4">
                <label class="form-label fw-semibold text-muted">Seleccionar Reporte</label>
                <div class="custom-input-group border">
                  <span class="input-group-text bg-transparent border-0 pe-2"><i class="fas fa-file-invoice text-muted"></i></span>
                  <select class="form-select border-0 shadow-none bg-transparent py-2" v-model="tipoReporte">
                    <option value="avance">Reporte de Avance Operativo</option>
                    <option value="costos">Reporte de Costos por Proyecto</option>
                    <option value="financiero_view">Reporte Financiero Detallado</option>
                    <option value="cronograma_view">Reporte de Cronograma e Incidencias</option>
                    <option value="nomina">Reporte de Rendimiento y Nómina</option>
                  </select>
                </div>
              </div>

              <div class="mb-4">
                <label class="form-label fw-semibold text-muted">Filtro de Proyecto</label>
                <div class="custom-input-group border">
                  <span class="input-group-text bg-transparent border-0 pe-2"><i class="fas fa-briefcase text-muted"></i></span>
                  <select class="form-select border-0 shadow-none bg-transparent py-2" v-model="proyectoSeleccionado">
                    <option value="Todos">Todos los Proyectos</option>
                    <option v-for="p in proyectos" :key="p.id_proyecto" :value="p.id_proyecto">
                      {{ p.nombre_proyecto }}
                    </option>
                  </select>
                </div>
              </div>

              <div v-if="tipoReporte === 'nomina'" class="row g-2 mb-5">
                <div class="col-6">
                  <label class="form-label fw-semibold text-muted fs-8">Desde (Opcional)</label>
                  <input type="date" v-model="fechaInicio" class="form-control bg-transparent border shadow-none py-2 text-body">
                </div>
                <div class="col-6">
                  <label class="form-label fw-semibold text-muted fs-8">Hasta (Opcional)</label>
                  <input type="date" v-model="fechaFin" class="form-control bg-transparent border shadow-none py-2 text-body">
                </div>
              </div>
              <div v-else class="mb-5">
                 </div>

              <button type="submit" class="btn btn-primary w-100 rounded-pill shadow-sm py-2 fw-semibold" :disabled="isGenerating">
                <span v-if="isGenerating"><i class="fas fa-spinner fa-spin me-2"></i> Procesando...</span>
                <span v-else><i class="fas fa-magic me-2"></i> Generar Vista Previa</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="card shadow-lg border-0 rounded-4 h-100 d-flex flex-column bg-body-tertiary" style="min-height: 600px;">
          
          <div class="card-header bg-transparent border-bottom p-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 class="fw-bold mb-0 text-body"><i class="fas fa-eye text-primary me-2"></i> Documento</h5>
            
            <div class="d-flex gap-2">
              <button @click="exportarPDF" class="btn btn-outline-danger rounded-pill shadow-sm px-4 fw-semibold" title="Descargar PDF" :disabled="!hasDocument">
                <i class="fas fa-file-pdf me-2"></i> PDF
              </button>
              <button @click="exportarExcel" class="btn btn-outline-success rounded-pill shadow-sm px-4 fw-semibold" title="Exportar a Excel" :disabled="!hasDocument">
                <i class="fas fa-file-excel me-2"></i> Excel
              </button>
            </div>
            
          </div>
          
          <div class="card-body p-0 d-flex flex-column flex-grow-1 position-relative bg-body rounded-bottom-4">
            
            <div v-if="!hasDocument" class="d-flex flex-column align-items-center justify-content-center h-100 p-5 text-muted position-absolute w-100" style="z-index: 10;">
              <i class="fas" :class="isGenerating ? 'fa-circle-notch fa-spin text-primary' : 'fa-file-pdf text-secondary'" style="font-size: 3.5rem; margin-bottom: 1.5rem; opacity: 0.7;"></i>
              <h5 class="text-danger fw-bold text-center" v-if="statusMessage.includes('error') || statusMessage.includes('servidor') || statusMessage.includes('debes seleccionar')">{{ statusMessage }}</h5>
              <h5 class="text-body fw-bold text-center" v-else>{{ statusMessage }}</h5>
              <p v-if="!isGenerating && !statusMessage.includes('error') && !statusMessage.includes('debes seleccionar')" class="text-center fs-7 mt-2" style="max-width: 300px;">Selecciona el tipo de reporte a la izquierda y presiona "Generar Vista Previa".</p>
            </div>

            <iframe v-if="hasDocument" :src="pdfUrl" class="w-100 flex-grow-1" style="border: none; border-radius: 0 0 1rem 1rem; background-color: transparent;"></iframe>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>