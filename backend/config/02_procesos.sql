-- ==========================================
-- FUNCION: DASHBOARD ADMINISTRADOR
-- ==========================================
CREATE OR REPLACE FUNCTION fn_dashboard_admin()
RETURNS TABLE (
    proyectos_activos INTEGER,
    presupuesto_global DECIMAL(12,2),
    empleados_activos INTEGER,
    alertas_criticas INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- 1. Proyectos en curso (Pendiente o En Progreso)
        (SELECT COUNT(*)::INTEGER FROM PROYECTO WHERE estado IN ('En Progreso', 'Pendiente')),
        
        -- 2. Suma de presupuestos (COALESCE evita error si no hay proyectos)
        (SELECT COALESCE(SUM(presupuesto_total), 0) FROM PROYECTO),
        
        -- 3. Total de usuarios que están activos (usando tu campo booleano)
        (SELECT COUNT(*)::INTEGER FROM USUARIO WHERE activo = TRUE),
        
        -- 4. Alertas: Tareas vencidas que no están Finalizadas ni Canceladas
        (SELECT COUNT(*)::INTEGER FROM TAREA 
         WHERE fecha_fin_estimada < CURRENT_DATE 
         AND estado NOT IN ('Finalizada', 'Cancelada'));
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- FUNCION: DASHBOARD GERENTE (CORREGIDA)
-- ==========================================
CREATE OR REPLACE FUNCTION fn_dashboard_gerente(p_id_gerente INTEGER)
RETURNS TABLE (
    proyectos_asignados INTEGER,
    tareas_atrasadas INTEGER,
    registros_por_aprobar INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- 1. Proyectos donde él es el Gerente
        (SELECT COUNT(*)::INTEGER FROM PROYECTO WHERE id_gerente = p_id_gerente),
        
        -- 2. Tareas atrasadas del equipo en SUS proyectos
        (SELECT COUNT(*)::INTEGER FROM TAREA t
         JOIN PROYECTO p ON t.id_proyecto = p.id_proyecto
         WHERE p.id_gerente = p_id_gerente 
         AND t.fecha_fin_estimada < CURRENT_DATE 
         AND t.estado NOT IN ('Finalizada', 'Cancelada')),
         
        -- 3. Registros de horas PENDIENTES de aprobación (Histórico completo)
        (SELECT COUNT(*)::INTEGER FROM REGISTRO_AVANCE ra
         JOIN TAREA t ON ra.id_tarea = t.id_tarea
         JOIN PROYECTO p ON t.id_proyecto = p.id_proyecto
         WHERE p.id_gerente = p_id_gerente
         AND (ra.estado = 'Pendiente' OR ra.estado IS NULL));
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- FUNCION: DASHBOARD EMPLEADO
-- ==========================================
CREATE OR REPLACE FUNCTION fn_dashboard_empleado(p_id_empleado INTEGER)
RETURNS TABLE (
    tareas_pendientes INTEGER,
    horas_reportadas_semana INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- 1. Tareas que tiene asignadas y aún no termina
        (SELECT COUNT(*)::INTEGER FROM TAREA 
         WHERE id_usuario = p_id_empleado 
         AND estado IN ('Pendiente', 'En Progreso')),
         
        -- 2. Horas trabajadas (usando tu campo INTEGER) solo de esta semana
        (SELECT COALESCE(SUM(horas_trabajadas), 0)::INTEGER FROM REGISTRO_AVANCE 
         WHERE id_usuario = p_id_empleado 
         AND EXTRACT(WEEK FROM fecha_reporte) = EXTRACT(WEEK FROM CURRENT_DATE));
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- FUNCION: OBTENER LISTA DE PROYECTOS
-- ==========================================
CREATE OR REPLACE FUNCTION fn_obtener_proyectos()
RETURNS TABLE (
    id INTEGER,
    nombre VARCHAR,
    cliente VARCHAR,
    gerente VARCHAR,
    estado VARCHAR,
    presupuesto DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id_proyecto AS id,
        p.nombre_proyecto AS nombre,
        COALESCE(c.nombre_empresa, 'Sin Cliente')::VARCHAR AS cliente,
        COALESCE(u.nombre || ' ' || u.apellido_paterno, 'Sin Asignar')::VARCHAR AS gerente,
        p.estado,
        p.presupuesto_total AS presupuesto
    FROM PROYECTO p
    LEFT JOIN CLIENTE c ON p.id_cliente = c.id_cliente
    LEFT JOIN USUARIO u ON p.id_gerente = u.id_usuario
    ORDER BY p.id_proyecto DESC; -- Muestra los proyectos más recientes primero
END;
$$ LANGUAGE plpgsql;



-- ==========================================
-- PROCEDIMIENTO: CREAR NUEVO PROYECTO
-- ==========================================
CREATE OR REPLACE PROCEDURE sp_crear_proyecto(
    p_nombre_proyecto VARCHAR,
    p_descripcion TEXT,
    p_id_cliente INTEGER,
    p_id_gerente INTEGER,
    p_fecha_inicio DATE,
    p_fecha_fin_estimada DATE, 
    p_fecha_fin_real DATE,    
    p_presupuesto DECIMAL,
    p_estado VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insertamos los datos en la tabla PROYECTO
    INSERT INTO PROYECTO (
        nombre_proyecto, 
        descripcion, 
        id_cliente, 
        id_gerente, 
        fecha_inicio, 
        fecha_fin_estimada, 
        fecha_fin_real,     
        presupuesto_total, 
        estado
    ) VALUES (
        p_nombre_proyecto, 
        p_descripcion, 
        p_id_cliente, 
        p_id_gerente, 
        p_fecha_inicio, 
        p_fecha_fin_estimada,
        p_fecha_fin_real,     
        p_presupuesto, 
        p_estado
    );
END;
$$;


CREATE OR REPLACE FUNCTION fn_obtener_equipo_proyecto(p_id_proyecto INT)
RETURNS TABLE (
    id_usuario INT,
    nombre_completo TEXT,
    rol_asignado VARCHAR,
    total_tareas BIGINT,
    total_horas NUMERIC,
    porcentaje_progreso NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id_usuario,
        (u.nombre || ' ' || u.apellido_paterno)::TEXT AS nombre_completo,
        COALESCE(em.rol_en_proyecto, u.especialidad, 'General')::VARCHAR AS rol_asignado,
        
        -- 1. Total de Tareas (Se mantiene igual)
        (SELECT COUNT(*) FROM TAREA t 
         WHERE t.id_proyecto = p_id_proyecto AND t.id_usuario = u.id_usuario) AS total_tareas,
        
        -- 2. Horas: Redondeado a 1 decimal usando ROUND(..., 1)
        ROUND(COALESCE((
            SELECT SUM(ra.horas_trabajadas) 
            FROM REGISTRO_AVANCE ra 
            JOIN TAREA t ON ra.id_tarea = t.id_tarea 
            WHERE t.id_proyecto = p_id_proyecto AND t.id_usuario = u.id_usuario
        ), 0)::NUMERIC, 1) AS total_horas,
        
        -- 3. Progreso: Redondeado a números enteros usando ROUND(..., 0)
        ROUND(COALESCE((
            SELECT AVG(
                CASE 
                    WHEN t.estado = 'Finalizada' THEN 100 
                    ELSE COALESCE((SELECT MAX(porcentaje_avance) FROM REGISTRO_AVANCE WHERE id_tarea = t.id_tarea), 0)
                END
            )
            FROM TAREA t 
            WHERE t.id_proyecto = p_id_proyecto AND t.id_usuario = u.id_usuario
        ), 0)::NUMERIC, 0) AS porcentaje_progreso

    FROM ES_MIEMBRO em
    JOIN USUARIO u ON em.id_usuario = u.id_usuario
    WHERE em.id_proyecto = p_id_proyecto;
END;
$$ LANGUAGE plpgsql;


-- Eliminamos las versiones antiguas para evitar conflictos

-- 1. NUEVA VERSIÓN REPORTE DE COSTOS
CREATE OR REPLACE FUNCTION sp_reporte_costos(p_id_proyecto INTEGER DEFAULT NULL, p_id_gerente INTEGER DEFAULT NULL)
RETURNS TABLE (
    proyecto VARCHAR, costo_rrhh NUMERIC, costo_materiales NUMERIC, costo_total NUMERIC
) AS $$
DECLARE
    cur_proyectos CURSOR FOR 
        SELECT id_proyecto, nombre_proyecto 
        FROM PROYECTO 
        WHERE (p_id_proyecto IS NULL OR id_proyecto = p_id_proyecto)
          -- AQUI ESTÁ LA MAGIA DEL FILTRO POR GERENTE
          AND (p_id_gerente IS NULL OR id_gerente = p_id_gerente);
        
    v_proy RECORD; v_rrhh NUMERIC; v_mat NUMERIC;
BEGIN
    OPEN cur_proyectos;
    LOOP
        FETCH cur_proyectos INTO v_proy; EXIT WHEN NOT FOUND;

        SELECT COALESCE(SUM(ra.horas_trabajadas * u.costo_por_hora), 0) INTO v_rrhh
        FROM REGISTRO_AVANCE ra JOIN TAREA t ON ra.id_tarea = t.id_tarea JOIN USUARIO u ON ra.id_usuario = u.id_usuario
        WHERE t.id_proyecto = v_proy.id_proyecto;

        SELECT COALESCE(SUM(ut.cantidad_usada * rm.costo_unitario), 0) INTO v_mat
        FROM UTILIZA ut JOIN RECURSO_MATERIAL rm ON ut.id_recurso = rm.id_recurso
        WHERE ut.id_proyecto = v_proy.id_proyecto;

        proyecto := v_proy.nombre_proyecto; costo_rrhh := v_rrhh; costo_materiales := v_mat; costo_total := v_rrhh + v_mat;
        RETURN NEXT; 
    END LOOP;
    CLOSE cur_proyectos;
END;
$$ LANGUAGE plpgsql;


-- 2. NUEVA VERSIÓN REPORTE DE AVANCE GENERAL
CREATE OR REPLACE FUNCTION sp_reporte_avance_general(p_id_proyecto INTEGER DEFAULT NULL, p_id_gerente INTEGER DEFAULT NULL)
RETURNS TABLE (
    proyecto VARCHAR, cliente VARCHAR, gerente VARCHAR, estado_proyecto VARCHAR, fecha_limite DATE,
    total_tareas INTEGER, tareas_pendientes INTEGER, tareas_en_progreso INTEGER, tareas_finalizadas INTEGER,
    horas_estimadas BIGINT, horas_trabajadas BIGINT, porcentaje_avance NUMERIC
) AS $$
DECLARE
    cur_proyectos CURSOR FOR
        SELECT p.id_proyecto, p.nombre_proyecto, p.estado, p.fecha_fin_estimada, c.nombre_empresa, (u.nombre || ' ' || u.apellido_paterno) AS nombre_gerente
        FROM PROYECTO p
        LEFT JOIN CLIENTE c ON p.id_cliente = c.id_cliente
        LEFT JOIN USUARIO u ON p.id_gerente = u.id_usuario
        WHERE (p_id_proyecto IS NULL OR p.id_proyecto = p_id_proyecto)
          -- EL FILTRO SE APLICA AQUÍ TAMBIÉN
          AND (p_id_gerente IS NULL OR p.id_gerente = p_id_gerente);

    v_proy RECORD; v_tot_tareas INTEGER; v_tar_pend INTEGER; v_tar_prog INTEGER; v_tar_fin INTEGER; v_hrs_est BIGINT; v_hrs_trab BIGINT;
BEGIN
    OPEN cur_proyectos;
    LOOP
        FETCH cur_proyectos INTO v_proy; EXIT WHEN NOT FOUND;

        SELECT COUNT(t.id_tarea), COALESCE(SUM(t.horas_estimadas), 0),
               COALESCE(SUM(CASE WHEN t.estado = 'Pendiente' THEN 1 ELSE 0 END), 0),
               COALESCE(SUM(CASE WHEN t.estado = 'En Progreso' THEN 1 ELSE 0 END), 0),
               COALESCE(SUM(CASE WHEN t.estado = 'Finalizada' THEN 1 ELSE 0 END), 0)
        INTO v_tot_tareas, v_hrs_est, v_tar_pend, v_tar_prog, v_tar_fin
        FROM TAREA t WHERE t.id_proyecto = v_proy.id_proyecto;

        SELECT COALESCE(SUM(ra.horas_trabajadas), 0) INTO v_hrs_trab FROM REGISTRO_AVANCE ra JOIN TAREA t ON ra.id_tarea = t.id_tarea WHERE t.id_proyecto = v_proy.id_proyecto;

        porcentaje_avance := 0; IF v_tot_tareas > 0 THEN porcentaje_avance := ROUND((v_tar_fin::NUMERIC / v_tot_tareas::NUMERIC) * 100, 2); END IF;

        proyecto := v_proy.nombre_proyecto; cliente := COALESCE(v_proy.nombre_empresa, 'Sin Cliente'); gerente := COALESCE(v_proy.nombre_gerente, 'Sin Asignar');
        estado_proyecto := v_proy.estado; fecha_limite := v_proy.fecha_fin_estimada; total_tareas := v_tot_tareas; tareas_pendientes := v_tar_pend;
        tareas_en_progreso := v_tar_prog; tareas_finalizadas := v_tar_fin; horas_estimadas := v_hrs_est; horas_trabajadas := v_hrs_trab;
        RETURN NEXT;
    END LOOP;
    CLOSE cur_proyectos;
END;
$$ LANGUAGE plpgsql;


/* new */
CREATE OR REPLACE VIEW vw_reporte_financiero AS
SELECT 
    p.id_proyecto,
    p.nombre_proyecto,
    p.estado,
    p.presupuesto_total,
    
    -- COSTO DE MANO DE OBRA: (horas_trabajadas × costo_por_hora de tu tabla USUARIO)
    COALESCE((
        SELECT SUM(ra.horas_trabajadas * u.costo_por_hora)
        FROM REGISTRO_AVANCE ra
        JOIN TAREA t ON ra.id_tarea = t.id_tarea
        JOIN USUARIO u ON ra.id_usuario = u.id_usuario
        WHERE t.id_proyecto = p.id_proyecto
    ), 0.00) AS costo_mano_obra,

    -- COSTO DE MATERIALES: (cantidad_usada de UTILIZA × costo_unitario de RECURSO_MATERIAL)
    COALESCE((
        SELECT SUM(ut.cantidad_usada * rm.costo_unitario)
        FROM UTILIZA ut
        JOIN RECURSO_MATERIAL rm ON ut.id_recurso = rm.id_recurso
        WHERE ut.id_proyecto = p.id_proyecto
    ), 0.00) AS costo_materiales,

    -- COSTO TOTAL REAL ACUMULADO
    (
        COALESCE((SELECT SUM(ra.horas_trabajadas * u.costo_por_hora) FROM REGISTRO_AVANCE ra JOIN TAREA t ON ra.id_tarea = t.id_tarea JOIN USUARIO u ON ra.id_usuario = u.id_usuario WHERE t.id_proyecto = p.id_proyecto), 0) +
        COALESCE((SELECT SUM(ut.cantidad_usada * rm.costo_unitario) FROM UTILIZA ut JOIN RECURSO_MATERIAL rm ON ut.id_recurso = rm.id_recurso WHERE ut.id_proyecto = p.id_proyecto), 0)
    ) AS costo_real_acumulado,

    -- PORCENTAJE CONSUMIDO DEL PRESUPUESTO
    CASE 
        WHEN p.presupuesto_total > 0 THEN 
            ROUND(((
                COALESCE((SELECT SUM(ra.horas_trabajadas * u.costo_por_hora) FROM REGISTRO_AVANCE ra JOIN TAREA t ON ra.id_tarea = t.id_tarea JOIN USUARIO u ON ra.id_usuario = u.id_usuario WHERE t.id_proyecto = p.id_proyecto), 0) +
                COALESCE((SELECT SUM(ut.cantidad_usada * rm.costo_unitario) FROM UTILIZA ut JOIN RECURSO_MATERIAL rm ON ut.id_recurso = rm.id_recurso WHERE ut.id_proyecto = p.id_proyecto), 0)
            ) / p.presupuesto_total * 100), 2)
        ELSE 0.00 
    END AS porcentaje_consumido,

    -- ALERTA DE RIESGO FINANCIERO (Si supera el 80% da true)
    CASE 
        WHEN (
            COALESCE((SELECT SUM(ra.horas_trabajadas * u.costo_por_hora) FROM REGISTRO_AVANCE ra JOIN TAREA t ON ra.id_tarea = t.id_tarea JOIN USUARIO u ON ra.id_usuario = u.id_usuario WHERE t.id_proyecto = p.id_proyecto), 0) +
            COALESCE((SELECT SUM(ut.cantidad_usada * rm.costo_unitario) FROM UTILIZA ut JOIN RECURSO_MATERIAL rm ON ut.id_recurso = rm.id_recurso WHERE ut.id_proyecto = p.id_proyecto), 0)
        ) > (p.presupuesto_total * 0.80) THEN true
        ELSE false
    END AS alerta_sobrecosto

FROM PROYECTO p;




CREATE OR REPLACE VIEW vw_reporte_cronograma_tareas AS
SELECT 
    t.id_proyecto,
    p.nombre_proyecto,
    t.id_tarea,
    t.titulo AS nombre_tarea, -- CORREGIDO: Mapeado a tu columna 'titulo'
    t.estado AS estado_tarea,
    t.prioridad AS prioridad_tarea,
    u.nombre || ' ' || u.apellido_paterno AS responsable,
    
    -- SUMA TOTAL DE HORAS LOGRADAS EN REGISTRO_AVANCE PARA ESTA TAREA
    COALESCE((SELECT SUM(horas_trabajadas) FROM REGISTRO_AVANCE WHERE id_tarea = t.id_tarea), 0) AS horas_invertidas,
    
    t.fecha_inicio,
    t.fecha_fin_estimada,
    t.fecha_fin_real,

    -- CALCULAR DÍAS DE RETRASO (Desvíos de tiempo)
    CASE
        WHEN t.estado = 'Finalizada' AND t.fecha_fin_real > t.fecha_fin_estimada THEN 
            DATE_PART('day', t.fecha_fin_real::timestamp - t.fecha_fin_estimada::timestamp)
        WHEN t.estado != 'Finalizada' AND CURRENT_DATE > t.fecha_fin_estimada THEN 
            DATE_PART('day', CURRENT_DATE::timestamp - t.fecha_fin_estimada::timestamp)
        ELSE 0 
    END AS dias_desvio,

    -- SEMÁFORO DE ALERTAS TEMPORALES
    CASE
        WHEN t.estado = 'Finalizada' AND t.fecha_fin_real <= t.fecha_fin_estimada THEN 'A Tiempo'
        WHEN t.estado = 'Finalizada' AND t.fecha_fin_real > t.fecha_fin_estimada THEN 'Completada con Atraso'
        WHEN t.estado != 'Finalizada' AND CURRENT_DATE > t.fecha_fin_estimada THEN 'Atrasada'
        WHEN t.estado != 'Finalizada' AND CURRENT_DATE = t.fecha_fin_estimada THEN 'Vence Hoy'
        ELSE 'En Plazo'
    END AS semaforo_tiempo

FROM TAREA t
JOIN PROYECTO p ON t.id_proyecto = p.id_proyecto
LEFT JOIN USUARIO u ON t.id_usuario = u.id_usuario;

/* -------------------- */
-- ====================================================================
-- DISPARADOR 1: SINCRONIZACIÓN DE ESTADOS (REGISTRO_AVANCE -> TAREA)
-- ====================================================================

-- 1. Creamos la función que procesa el avance diario
CREATE OR REPLACE FUNCTION fn_sincronizar_avance_tarea()
RETURNS TRIGGER AS $$
BEGIN
    -- Caso A: Si el empleado reporta el 100% de avance, la tarea se cierra automáticamente
    IF NEW.porcentaje_avance = 100 THEN
        UPDATE TAREA 
        SET estado = 'Finalizada', 
            fecha_fin_real = NEW.fecha_reporte
        WHERE id_tarea = NEW.id_tarea;
        
    -- Caso B: Si reporta un avance parcial (ej. 20%) y la tarea seguía 'Pendiente', 
    -- pasa automáticamente a 'En Progreso' porque ya se empezó a trabajar en ella.
    ELSIF NEW.porcentaje_avance > 0 AND NEW.porcentaje_avance < 100 THEN
        UPDATE TAREA 
        SET estado = 'En Progreso'
        WHERE id_tarea = NEW.id_tarea AND estado = 'Pendiente';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Creamos el Trigger amarrado a tu tabla REGISTRO_AVANCE
-- Se ejecuta inmediatamente después de cualquier INSERT o UPDATE de avances

CREATE TRIGGER trg_sincronizar_avance
AFTER INSERT OR UPDATE ON REGISTRO_AVANCE
FOR EACH ROW
EXECUTE FUNCTION fn_sincronizar_avance_tarea();


-- ====================================================================
-- DISPARADOR 2: AUDITORÍA AUTOMÁTICA DE LOGS (TAREA -> HISTORIAL_ESTADO)
-- ====================================================================

-- 3. Creamos la función que alimenta tu tabla de historial
CREATE OR REPLACE FUNCTION fn_auditar_estado_tarea()
RETURNS TRIGGER AS $$
BEGIN
    -- Validamos que el estado realmente haya cambiado para no duplicar registros vacíos
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO HISTORIAL_ESTADO (
            tabla_referencia, 
            id_referencia, 
            estado_anterior, 
            estado_nuevo, 
            id_usuario
        )
        VALUES (
            'TAREA', 
            NEW.id_tarea, 
            OLD.estado, 
            NEW.estado, 
            NEW.id_usuario -- Almacena quién provocó el cambio de estado
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Creamos el Trigger amarrado a tu tabla TAREA
-- Se activa únicamente cuando se altera la columna 'estado'

CREATE TRIGGER trg_auditar_estado_tarea
AFTER UPDATE OF estado ON TAREA
FOR EACH ROW
EXECUTE FUNCTION fn_auditar_estado_tarea();









-- ====================================================================================
-- CUMPLIENDO LA META M-03 Y OE-12: Alerta automática al superar el 80% del presupuesto
-- ====================================================================================

CREATE OR REPLACE FUNCTION fn_alerta_presupuesto()
RETURNS TRIGGER AS $$
DECLARE
    costo_actual DECIMAL(12,2);
    presupuesto_limite DECIMAL(12,2);
    v_id_proyecto INTEGER; -- Variable nueva para guardar el proyecto
BEGIN
    -- 1. PRIMERO: Averiguamos a qué proyecto pertenece este registro de avance
    SELECT id_proyecto INTO v_id_proyecto 
    FROM TAREA 
    WHERE id_tarea = NEW.id_tarea;

    -- 2. Calculamos cuánto se ha gastado en horas en ese proyecto
    SELECT COALESCE(SUM(ra.horas_trabajadas * u.costo_por_hora), 0)
    INTO costo_actual
    FROM REGISTRO_AVANCE ra
    JOIN TAREA t ON ra.id_tarea = t.id_tarea
    JOIN USUARIO u ON ra.id_usuario = u.id_usuario
    WHERE t.id_proyecto = v_id_proyecto; -- Usamos la variable en lugar de NEW.id_proyecto

    -- 3. Obtenemos el presupuesto total del proyecto
    SELECT presupuesto_total INTO presupuesto_limite 
    FROM PROYECTO 
    WHERE id_proyecto = v_id_proyecto;

    -- 4. LÓGICA DE ALERTA (Meta M-03): Si el costo supera el 80% del presupuesto
    IF costo_actual >= (presupuesto_limite * 0.80) THEN
        -- Revisamos si ya existe una alerta de presupuesto para no spamear al gerente
        IF NOT EXISTS (SELECT 1 FROM NOTIFICACION WHERE tipo_alerta = 'LIMITE_PRESUPUESTO' AND id_referencia = v_id_proyecto AND leido = FALSE) THEN
            -- Insertamos la notificación dirigida al Gerente del Proyecto
            INSERT INTO NOTIFICACION (tipo_alerta, titulo, mensaje, id_usuario, id_referencia, nivel_prioridad)
            SELECT 
                'LIMITE_PRESUPUESTO',
                'Alerta de Presupuesto: Riesgo de Desvío',
                'El costo actual del proyecto superó el 80% del presupuesto asignado. Costo actual: Bs. ' || costo_actual,
                id_gerente,
                v_id_proyecto,
                'Critica'
            FROM PROYECTO WHERE id_proyecto = v_id_proyecto;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El Trigger se mantiene igual

CREATE TRIGGER trg_alerta_presupuesto
AFTER INSERT OR UPDATE ON REGISTRO_AVANCE
FOR EACH ROW
EXECUTE FUNCTION fn_alerta_presupuesto();

-- ====================================================================================
-- CUMPLIENDO EL OE-11: Alertas automáticas por tareas retrasadas (CRON JOB o vista)
-- ====================================================================================
-- Nota Técnica: PostgreSQL no ejecuta tareas programadas por tiempo (cron) de forma nativa sin extensiones.
-- En sistemas empresariales reales, el Backend (Node.js/Spring) hace esta verificación.
-- Sin embargo, si quieres que la BD lo calcule "al vuelo" cuando un empleado cierra una tarea tarde:

CREATE OR REPLACE FUNCTION fn_alerta_retraso_tarea()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la tarea se cierra (100% o estado Finalizada) y la fecha de cierre supera la estimada
    IF NEW.estado = 'Finalizada' AND CURRENT_DATE > OLD.fecha_fin_estimada THEN
        INSERT INTO NOTIFICACION (tipo_alerta, titulo, mensaje, id_usuario, id_referencia, nivel_prioridad)
        SELECT 
            'RETRASO_TAREA',
            'Desvío de Cronograma Detectado',
            'La tarea "' || NEW.titulo || '" ha sido finalizada con retraso. Fecha estimada: ' || OLD.fecha_fin_estimada,
            id_gerente,
            NEW.id_tarea,
            'Advertencia'
        FROM PROYECTO WHERE id_proyecto = NEW.id_proyecto;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_alerta_retraso_tarea
AFTER UPDATE OF estado ON TAREA
FOR EACH ROW
EXECUTE FUNCTION fn_alerta_retraso_tarea();


-- ====================================================================================
-- CUMPLIENDO EL OE-09: Control de disponibilidad para evitar sobreasignación
-- ====================================================================================

CREATE OR REPLACE FUNCTION fn_control_sobreasignacion()
RETURNS TRIGGER AS $$
DECLARE
    tareas_activas INTEGER;
BEGIN
    -- REGLA CORREGIDA: Solo auditar si es una NUEVA tarea (INSERT) 
    -- O si el gerente está cambiando el usuario asignado (UPDATE)
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.id_usuario IS DISTINCT FROM NEW.id_usuario) THEN
        
        -- Contamos cuántas tareas activas tiene el usuario al que se le va a asignar
        SELECT COUNT(*) INTO tareas_activas
        FROM TAREA
        WHERE id_usuario = NEW.id_usuario
        AND estado IN ('Pendiente', 'En Progreso');

        IF tareas_activas >= 4 THEN
            RAISE EXCEPTION 'Control OE-09: El empleado ya tiene % tareas activas. Asigne la tarea a otro personal disponible.', tareas_activas;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_control_sobreasignacion ON TAREA;
CREATE TRIGGER trg_control_sobreasignacion
BEFORE INSERT OR UPDATE ON TAREA
FOR EACH ROW
EXECUTE FUNCTION fn_control_sobreasignacion();


-- ====================================================================================
-- REPORTE DE NÓMINA Y RENDIMIENTO POR PROYECTO (OE-07 y OE-12)
-- ====================================================================================

CREATE OR REPLACE FUNCTION fn_reporte_nomina_proyecto(p_id_proyecto INT)
RETURNS TABLE (
    id_usuario INT,
    empleado TEXT,
    especialidad VARCHAR,
    tareas_completadas BIGINT,
    total_horas NUMERIC,
    tarifa_hora NUMERIC,
    total_pagar NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id_usuario,
        (u.nombre || ' ' || u.apellido_paterno)::TEXT AS empleado,
        COALESCE(u.especialidad, 'General')::VARCHAR AS especialidad,
        
        -- 1. Contamos cuántas tareas finalizó este empleado en este proyecto
        (SELECT COUNT(*) 
         FROM TAREA t 
         WHERE t.id_usuario = u.id_usuario 
           AND t.id_proyecto = p_id_proyecto 
           AND t.estado = 'Finalizada')::BIGINT AS tareas_completadas,
        
        -- 2. Sumamos las horas reales que reportó
        ROUND(COALESCE((
            SELECT SUM(ra.horas_trabajadas)
            FROM REGISTRO_AVANCE ra
            JOIN TAREA t ON ra.id_tarea = t.id_tarea
            WHERE t.id_proyecto = p_id_proyecto 
              AND ra.id_usuario = u.id_usuario
        ), 0)::NUMERIC, 1) AS total_horas,
        
        -- 3. Obtenemos su tarifa configurada en su perfil
        ROUND(u.costo_por_hora::NUMERIC, 2) AS tarifa_hora,
        
        -- 4. LA MAGIA: Multiplicamos Horas * Tarifa para obtener el salario
        ROUND((
            COALESCE((
                SELECT SUM(ra.horas_trabajadas)
                FROM REGISTRO_AVANCE ra
                JOIN TAREA t ON ra.id_tarea = t.id_tarea
                WHERE t.id_proyecto = p_id_proyecto 
                  AND ra.id_usuario = u.id_usuario
            ), 0) * u.costo_por_hora
        )::NUMERIC, 2) AS total_pagar

    FROM USUARIO u
    JOIN ES_MIEMBRO em ON u.id_usuario = em.id_usuario
    WHERE em.id_proyecto = p_id_proyecto
    ORDER BY total_pagar DESC; -- Ordenamos para que los que cobran más salgan arriba
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION fn_reporte_nomina_global(
    p_id_proyecto INT, 
    p_id_gerente INT,
    p_fecha_inicio DATE, 
    p_fecha_fin DATE     
)
RETURNS TABLE (
    proyecto TEXT, empleado TEXT, especialidad VARCHAR,
    tareas_completadas BIGINT, total_horas NUMERIC, tarifa_hora NUMERIC, total_pagar NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.nombre_proyecto::TEXT AS proyecto,
        (u.nombre || ' ' || u.apellido_paterno)::TEXT AS empleado,
        COALESCE(u.especialidad, 'General')::VARCHAR AS especialidad,
        
        -- Contar tareas finalizadas en ese rango de fechas
        (SELECT COUNT(*) FROM TAREA t 
         WHERE t.id_usuario = u.id_usuario AND t.id_proyecto = p.id_proyecto AND t.estado = 'Finalizada'
           AND (p_fecha_inicio IS NULL OR t.fecha_fin_real >= p_fecha_inicio)
           AND (p_fecha_fin IS NULL OR t.fecha_fin_real <= p_fecha_fin)
        )::BIGINT AS tareas_completadas,
        
        -- Sumar horas trabajadas en ese rango de fechas
        ROUND(COALESCE((
            SELECT SUM(ra.horas_trabajadas) FROM REGISTRO_AVANCE ra JOIN TAREA t ON ra.id_tarea = t.id_tarea
            WHERE t.id_proyecto = p.id_proyecto AND ra.id_usuario = u.id_usuario
              AND (p_fecha_inicio IS NULL OR ra.fecha_reporte >= p_fecha_inicio)
              AND (p_fecha_fin IS NULL OR ra.fecha_reporte <= p_fecha_fin)
        ), 0)::NUMERIC, 1) AS total_horas,
        
        ROUND(u.costo_por_hora::NUMERIC, 2) AS tarifa_hora,
        
        -- Calcular salario basado SÓLO en las horas de ese rango de fechas
        ROUND((
            COALESCE((
                SELECT SUM(ra.horas_trabajadas) FROM REGISTRO_AVANCE ra JOIN TAREA t ON ra.id_tarea = t.id_tarea
                WHERE t.id_proyecto = p.id_proyecto AND ra.id_usuario = u.id_usuario
                  AND (p_fecha_inicio IS NULL OR ra.fecha_reporte >= p_fecha_inicio)
                  AND (p_fecha_fin IS NULL OR ra.fecha_reporte <= p_fecha_fin)
            ), 0) * u.costo_por_hora
        )::NUMERIC, 2) AS total_pagar

    FROM USUARIO u
    JOIN ES_MIEMBRO em ON u.id_usuario = em.id_usuario
    JOIN PROYECTO p ON em.id_proyecto = p.id_proyecto
    WHERE (p_id_proyecto IS NULL OR p.id_proyecto = p_id_proyecto)
      AND (p_id_gerente IS NULL OR p.id_gerente = p_id_gerente)
    ORDER BY p.nombre_proyecto ASC, total_pagar DESC;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION fn_notificar_asignacion_proyecto()
RETURNS TRIGGER AS $$
DECLARE
    v_nombre_proyecto VARCHAR;
BEGIN
    -- 1. Buscamos el nombre del proyecto para ponerlo en el mensaje
    SELECT nombre_proyecto INTO v_nombre_proyecto
    FROM PROYECTO
    WHERE id_proyecto = NEW.id_proyecto;

    -- 2. Insertamos la notificación automáticamente para ese usuario
    INSERT INTO NOTIFICACION (
        tipo_alerta, 
        titulo, 
        mensaje, 
        id_usuario, 
        id_referencia, 
        nivel_prioridad
    ) VALUES (
        'ASIGNACION',
        'Asignado al proyecto: ' || v_nombre_proyecto,
        'Has sido asignado con el rol de "' || COALESCE(NEW.rol_en_proyecto, 'Miembro') || '" al proyecto "' || v_nombre_proyecto || '".',
        NEW.id_usuario,
        NEW.id_proyecto,
        'Normal'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_asignacion_proyecto
AFTER INSERT ON ES_MIEMBRO
FOR EACH ROW
EXECUTE FUNCTION fn_notificar_asignacion_proyecto();