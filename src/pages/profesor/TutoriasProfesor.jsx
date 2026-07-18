import React, { useState, useEffect } from 'react';
import Sidebar from "../../components/Sidebar";
import Swal from 'sweetalert2';
import { StorageService } from "../../core/database/StorageService";
import { courseDurations } from "../../data/profesoresData";

const TutoriasProfesor = () => {
  const [sesionesCreadas, setSesionesCreadas] = useState([]);
  
  // ESTADOS FORMULARIO CREAR SESIÓN
  const [misCursos, setMisCursos] = useState([]);
  const [cursoNuevaSesion, setCursoNuevaSesion] = useState('');
  const [temaNuevaSesion, setTemaNuevaSesion] = useState('');
  const [precioNuevaSesion, setPrecioNuevaSesion] = useState(10);
  const [fechaNuevaSesion, setFechaNuevaSesion] = useState('');
  const [horaNuevaSesion, setHoraNuevaSesion] = useState('');
  const [horaNuevaSesionFin, setHoraNuevaSesionFin] = useState('');
  const [enlaceReunion, setEnlaceReunion] = useState('');



  // ESTADOS PARA MODAL DE VALORACIÓN POST-TUTORÍA
  const [mostrarModalValoracion, setMostrarModalValoracion] = useState(false);
  const [sesionAEvaluar, setSesionAEvaluar] = useState(null);
  const [comentarioLibre, setComentarioLibre] = useState('');

  useEffect(() => {
    cargarSesiones();

    // Cargar los cursos que dicta el profesor desde su perfil
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    if (userSession && userSession.cursos && userSession.cursos.length > 0) {
      setMisCursos(userSession.cursos);
      const primerCurso = userSession.cursos[0];
      setCursoNuevaSesion(primerCurso.id ? primerCurso.id : primerCurso);
    } else {
      setMisCursos([{ id: "", nombre: "Pendiente de asignar" }]);
      setCursoNuevaSesion("");
    }
  }, []);

  const cargarSesiones = async () => {
    try {
      const userSession = JSON.parse(localStorage.getItem('userSession'));
      if (!userSession) return;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/professors/${userSession.id}/sesiones`);
      if (res.ok) {
        const sesiones = await res.json();
        // Mapear el formato backend al formato que espera la UI
        const mapped = sesiones.map(s => {
          // IMPORTANTE: el backend devuelve fechas en UTC sin 'Z'. Añadimos 'Z' para que
          // JS las interprete como UTC y las convierta correctamente a hora local.
          const start = new Date(s.fecha_hora_inicio + 'Z');
          const end = new Date(s.fecha_hora_fin + 'Z');
          const duracionHoras = ((end - start) / (1000 * 60 * 60)).toFixed(1);
          
          // Formatear fecha como YYYY-MM-DD
          const anio = start.getFullYear();
          const mes = String(start.getMonth() + 1).padStart(2, '0');
          const dia = String(start.getDate()).padStart(2, '0');
          const fechaStr = `${anio}-${mes}-${dia}`;
          
          const horaStr = start.toTimeString().split(' ')[0].substring(0, 5);
          const horaFinStr = end.toTimeString().split(' ')[0].substring(0, 5);

          return {
            id: s.id,
            profesorId: userSession.id,
            curso: s.tema, // para simplificar o mapear con nombre del curso
            tema: s.tema,
            fecha: fechaStr,
            hora: horaStr,
            horaFin: horaFinStr,
            duracion: duracionHoras,
            inscritos: s.inscritos_actuales,
            cuposMaximos: s.cupos_maximos,
            estado: s.estado,
            enlace_reunion: s.enlace_reunion,
            fecha_hora_inicio: s.fecha_hora_inicio,
            fecha_hora_fin: s.fecha_hora_fin
          };
        });

        // Filtrar sesiones: solo las Programadas.
        // Damos un margen (por ejemplo 60 minutos) después del fin para que no desaparezca inmediatamente y el profe pueda finalizarla.
        const ahora = new Date();
        const activas = mapped.filter(s => {
          if (s.estado !== "Programada") return false;
          const fin = new Date(s.fecha_hora_fin + 'Z');
          const limiteVisible = new Date(fin.getTime() + 60 * 60000); // 60 minutos después del fin
          return limiteVisible > ahora;
        });

        setSesionesCreadas(activas);
      }
    } catch (err) {
      console.error("Error al cargar sesiones del backend:", err);
    }
  };

  const handleCrearSesion = async (e) => {
    e.preventDefault();
    if (!cursoNuevaSesion || cursoNuevaSesion === "Pendiente de asignar") {
      Swal.fire('Aviso', 'Debes seleccionar un curso válido antes de crear la sesión.', 'warning');
      return;
    }
    if (!temaNuevaSesion.trim()) {
      Swal.fire('Aviso', 'Debes especificar el tema de la sesión.', 'warning');
      return;
    }
    if (!fechaNuevaSesion || !horaNuevaSesion || !horaNuevaSesionFin) {
      Swal.fire('Aviso', 'Completa todos los campos de fecha y hora.', 'warning');
      return;
    }
    if (precioNuevaSesion < 5) {
      Swal.fire('Aviso', 'El precio mínimo debe ser de 5 soles.', 'warning');
      return;
    }

    const nuevaFechaHora = new Date(`${fechaNuevaSesion}T${horaNuevaSesion}:00`);
    let nuevaFechaHoraFin = new Date(`${fechaNuevaSesion}T${horaNuevaSesionFin}:00`);
    
    // Si la hora de fin es menor a la hora de inicio (madrugada), le sumamos un día
    if (nuevaFechaHoraFin < nuevaFechaHora) {
      nuevaFechaHoraFin.setDate(nuevaFechaHoraFin.getDate() + 1);
    }
    
    // Evitar crear sesiones en el pasado
    if (nuevaFechaHora < new Date()) {
      Swal.fire('Atención', 'No puedes programar una sesión en una hora que ya pasó.', 'warning');
      return;
    }

    // Validar duración mínima (1.5 horas = 90 minutos)
    const duracionMs = nuevaFechaHoraFin - nuevaFechaHora;
    const minDuracionMs = 1.5 * 60 * 60 * 1000;
    if (duracionMs < minDuracionMs) {
      Swal.fire('Atención', 'La sesión debe durar al menos una hora y media (90 minutos).', 'warning');
      return;
    }

    if (!enlaceReunion || enlaceReunion.trim() === '') {
      Swal.fire({
        title: 'Enlace Requerido',
        text: 'Debes incluir un enlace de reunión válido (Zoom, Meet, Teams, etc.) para que los alumnos puedan unirse.',
        icon: 'warning'
      });
      return;
    }

    // Obtenemos al usuario activo
    const userSession = JSON.parse(localStorage.getItem('userSession'));

    const payload = {
      profesor_id: userSession?.id || 1,
      curso_id: parseInt(cursoNuevaSesion),
      tema: temaNuevaSesion,
      precio: parseInt(precioNuevaSesion),
      fecha_hora_inicio: nuevaFechaHora.toISOString(),
      fecha_hora_fin: nuevaFechaHoraFin.toISOString(),
      cupos_maximos: 40,
      enlace_reunion: enlaceReunion || null
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sesiones/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Error al crear la sesión en el backend');
      }

      Swal.fire('¡Éxito!', 'La sesión ha sido publicada y está disponible para los alumnos.', 'success');
      setFechaNuevaSesion('');
      setHoraNuevaSesion('');
      setHoraNuevaSesionFin('');
      setTemaNuevaSesion('');
      setPrecioNuevaSesion(10);
      setEnlaceReunion('');
      cargarSesiones();
    } catch (err) {
      console.error(err);
      Swal.fire('Aviso', err.message, 'warning');
    }
  };

  const formatearFechaEspanol = (fechaString) => {
    if (!fechaString) return "Fecha por asignar";
    const partes = fechaString.split("-");
    if (partes.length === 3) {
      const anio = partes[0];
      const mes = partes[1];
      const dia = partes[2];
      const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio", 
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      return `${parseInt(dia, 10)} de ${meses[parseInt(mes, 10) - 1]} de ${anio}`;
    }
    return fechaString;
  };


  // Determina la fase de la sesión respecto al tiempo actual
  const getSessionPhase = (sesion) => {
    const ahora = new Date();
    const inicio = new Date(`${sesion.fecha}T${sesion.hora}:00`);
    let fin = sesion.horaFin ? new Date(`${sesion.fecha}T${sesion.horaFin}:00`) : new Date(inicio.getTime() + 1.5 * 60 * 60 * 1000);
    if (fin < inicio) fin.setDate(fin.getDate() + 1);

    const userSession = JSON.parse(localStorage.getItem('userSession'));
    const esDemo = userSession?.email === "prof@profematch.com" || userSession?.nombres === "Profesor Ejemplo";

    const diezAntesInicio = new Date(inicio.getTime() - 10 * 60000);
    const cincoAntesFin = new Date(fin.getTime() - 5 * 60000);
    const sesentaDespuesFin = new Date(fin.getTime() + 60 * 60000);

    if (esDemo) {
      // Profesor Demo: siempre puede interactuar (en_curso) desde 10 min antes del inicio
      if (ahora >= diezAntesInicio && ahora <= sesentaDespuesFin) return 'en_curso';
      if (ahora < diezAntesInicio) return 'demasiado_pronto';
      return 'expirado';
    }

    if (ahora < diezAntesInicio) return 'demasiado_pronto';        // Muy pronto
    if (ahora >= diezAntesInicio && ahora < cincoAntesFin) return 'en_curso'; // Sala abierta
    if (ahora >= cincoAntesFin && ahora <= sesentaDespuesFin) return 'finalizar'; // Puede finalizar
    return 'expirado';
  };

  const getButtonConfig = (sesion) => {
    const phase = getSessionPhase(sesion);
    switch (phase) {
      case 'demasiado_pronto':
        return { label: 'Clase no iniciada aún', icon: 'bi-clock', color: '#6c757d', disabled: true };
      case 'en_curso':
        return { label: 'Iniciar / Unirse a Clase', icon: 'bi-camera-video-fill', color: '#3F51B5', disabled: false };
      case 'finalizar':
        return { label: 'Finalizar Sesión', icon: 'bi-check-circle-fill', color: '#d32f2f', disabled: false };
      default:
        return { label: 'Sesión Expirada', icon: 'bi-x-circle', color: '#adb5bd', disabled: true };
    }
  };

  const handleIniciarSesionVirtual = async (sesion) => {
    const phase = getSessionPhase(sesion);
    if (phase === 'demasiado_pronto' || phase === 'expirado') return;

    const ahora = new Date();
    const fechaHoraInicio = new Date(`${sesion.fecha}T${sesion.hora}:00`);
    let fechaHoraFin = sesion.horaFin ? new Date(`${sesion.fecha}T${sesion.horaFin}:00`) : new Date(fechaHoraInicio.getTime() + 1.5 * 60 * 60 * 1000);
    if (fechaHoraFin < fechaHoraInicio) fechaHoraFin.setDate(fechaHoraFin.getDate() + 1);

    const userSession = JSON.parse(localStorage.getItem('userSession'));
    const esProfesorDemo = userSession?.email === "prof@profematch.com" || userSession?.nombres === "Profesor Ejemplo";

    // Función auxiliar para enviar la petición de finalización al backend
    const ejecutarFinalizacion = async () => {
      // Validación extra de tiempo para asegurar (aunque la fase ya lo valida)
      const cincoMinutosAntesDeFin = new Date(fechaHoraFin.getTime() - 5 * 60000);
      if (!esProfesorDemo && new Date() < cincoMinutosAntesDeFin) {
        Swal.fire('No puedes finalizar aún', 'La clase aún no ha cumplido su horario establecido. Podrás finalizarla desde 5 minutos antes de la hora programada.', 'warning');
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/sesiones/${sesion.id}/finalizar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Error al finalizar la sesión en el servidor');
        }

        Swal.fire({
          title: 'Clase Finalizada',
          text: 'La sesión ha sido marcada como completada y los alumnos ya pueden dejar su reseña.',
          icon: 'success',
          confirmButtonColor: '#28a745'
        }).then(() => {
          cargarSesiones();
          handleAbrirEvaluacion(sesion);
        });
      } catch (err) {
        Swal.fire('Aviso', err.message, 'warning');
      }
    };

    if (phase === 'finalizar' && !esProfesorDemo) {
      // Si ya estamos en tiempo de finalizar (y no es el flujo especial de Demo)
      Swal.fire({
        title: 'Finalizar Sesión',
        text: '¿Estás seguro de que deseas finalizar la sesión ahora? Los estudiantes serán notificados para dejar su reseña.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, finalizar clase',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d32f2f',
      }).then((result) => {
        if (result.isConfirmed) {
          ejecutarFinalizacion();
        }
      });
      return;
    }

    // Para la fase 'en_curso' (o para el Profesor Demo en cualquier momento permitido)
    let listaInscritos = [];
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sesiones/${sesion.id}/inscritos`);
      if (res.ok) {
        listaInscritos = await res.json();
      }
    } catch (e) {
      console.error("Error al obtener inscritos:", e);
    }

    const numeroInscritos = listaInscritos.length;
    let htmlAlumnos = '<ul class="list-group text-start mt-3 mb-3" style="max-height: 150px; overflow-y: auto;">';
    
    if (numeroInscritos === 0) {
      htmlAlumnos += `<li class="list-group-item text-muted text-center">No hay alumnos inscritos aún</li>`;
    } else {
      listaInscritos.forEach(est => {
        htmlAlumnos += `<li class="list-group-item d-flex align-items-center">
          <span class="bg-success rounded-circle me-2" style="width: 10px; height: 10px; display: inline-block;"></span>
          ${est.nombre_estudiante} (Inscrito)
        </li>`;
      });
    }
    htmlAlumnos += '</ul>';

    if (sesion.enlace_reunion) {
      window.open(sesion.enlace_reunion, '_blank');
    }

    Swal.fire({
      title: 'Sala Virtual Activa',
      html: `
        <p>Dictando clase de <strong>${sesion.curso}</strong></p>
        <p class="small text-muted mb-1">Alumnos en la sala: ${numeroInscritos}</p>
        ${htmlAlumnos}
        <p class="text-danger small">Atención: Solo puedes finalizar la clase cuando se cumpla la hora programada (${sesion.horaFin || 'fin estimado'}).</p>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Finalizar Clase',
      cancelButtonText: 'Minimizar Sala (Seguir dando clase)',
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#6c757d',
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        ejecutarFinalizacion();
      }
    });
  };

  const handleAbrirEvaluacion = (sesion) => {
    setSesionAEvaluar(sesion);
    setComentarioLibre('');
    setMostrarModalValoracion(true);
  };

  const guardarValoracionDocente = (e) => {
    e.preventDefault();
    alert(`Evaluación general de la clase guardada con éxito.`);
    setMostrarModalValoracion(false);
    cargarSesiones();
  };

  const colores = { indigo: '#3F51B5', violet: '#7B1FA2', fuchsia: '#E91E63' };
  const cardStyle = { borderRadius: '12px', transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)" };

  const ahora = new Date();
  const fechaHoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

  return (
    <div className="d-flex">
      <Sidebar role="profesor" />
      <div className="container-fluid p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        


        <h2 className="mb-4 fw-bold" style={{ color: colores.indigo }}>Gestión de Sesiones de Tutoría</h2>
        
        <div className="row mb-5">
          <div className="col-12 col-xl-8">
            <div className="card shadow-lg border-0" style={{ borderRadius: '20px', overflow: 'hidden' }}>
              <div className="p-4 text-white position-relative" style={{ background: `linear-gradient(135deg, ${colores.indigo} 0%, #283593 100%)` }}>
                <div className="position-absolute top-0 end-0 p-3 opacity-25">
                  <i className="bi bi-calendar-plus-fill" style={{ fontSize: '4rem' }}></i>
                </div>
                <h5 className="fw-bold mb-2 position-relative z-1">
                  <i className="bi bi-plus-circle-fill me-2"></i>Crear Nueva Sesión
                </h5>
                <p className="small mb-0 position-relative z-1" style={{ opacity: 0.9 }}>
                  Programa una clase. El límite por defecto es 40 alumnos por sesión.
                </p>
              </div>
              
              <div className="p-4 bg-white">
                <form onSubmit={handleCrearSesion} className="row g-4">
                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-secondary">Curso a Dictar</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 rounded-start-3 text-muted"><i className="bi bi-book"></i></span>
                        <select 
                          className="form-select bg-light border-0 shadow-none rounded-end-3"
                          value={cursoNuevaSesion}
                          onChange={(e) => setCursoNuevaSesion(e.target.value)}
                          required
                          style={{ padding: '0.6rem 1rem' }}
                        >
                          {misCursos.map(curso => (
                            <option key={curso.id || curso} value={curso.id || curso}>{curso.nombre || curso}</option>
                          ))}
                        </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-secondary">Tema Específico</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 rounded-start-3 text-muted"><i className="bi bi-card-heading"></i></span>
                      <input 
                        type="text" 
                        className="form-control bg-light border-0 shadow-none rounded-end-3"
                        placeholder="Ej. Faraday, Óptica..."
                        value={temaNuevaSesion}
                        onChange={(e) => setTemaNuevaSesion(e.target.value)}
                        required
                        style={{ padding: '0.6rem 1rem' }}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-secondary">Precio por alumno (S/)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 rounded-start-3 text-muted"><i className="bi bi-currency-dollar"></i></span>
                      <input 
                        type="number" 
                        className="form-control bg-light border-0 shadow-none rounded-end-3"
                        value={precioNuevaSesion}
                        onChange={(e) => setPrecioNuevaSesion(e.target.value)}
                        min="5"
                        required
                        style={{ padding: '0.6rem 1rem' }}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-secondary">Fecha</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 rounded-start-3 text-muted"><i className="bi bi-calendar-event"></i></span>
                      <input 
                        type="date" 
                        className="form-control bg-light border-0 shadow-none rounded-end-3"
                        value={fechaNuevaSesion}
                        onChange={(e) => setFechaNuevaSesion(e.target.value)}
                        min={fechaHoyStr}
                        required
                        style={{ padding: '0.6rem 1rem' }}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-secondary">Hora Inicio</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 rounded-start-3 text-muted"><i className="bi bi-clock"></i></span>
                      <input 
                        type="time" 
                        className="form-control bg-light border-0 shadow-none rounded-end-3"
                        value={horaNuevaSesion}
                        onChange={(e) => setHoraNuevaSesion(e.target.value)}
                        required
                        style={{ padding: '0.6rem 1rem' }}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-bold text-secondary">Hora Fin</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 rounded-start-3 text-muted"><i className="bi bi-clock-history"></i></span>
                      <input 
                        type="time" 
                        className="form-control bg-light border-0 shadow-none rounded-end-3"
                        value={horaNuevaSesionFin}
                        onChange={(e) => setHoraNuevaSesionFin(e.target.value)}
                        required
                        style={{ padding: '0.6rem 1rem' }}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label small fw-bold text-secondary">Enlace de la Reunión (Obligatorio)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 rounded-start-3 text-muted"><i className="bi bi-link-45deg"></i></span>
                      <input 
                        type="url" 
                        className="form-control bg-light border-0 shadow-none rounded-end-3"
                        placeholder="https://zoom.us/j/..."
                        value={enlaceReunion}
                        onChange={(e) => setEnlaceReunion(e.target.value)}
                        style={{ padding: '0.6rem 1rem' }}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-12 mt-4">
                    <button type="submit" className="btn text-white fw-bold py-2 px-4 rounded-pill shadow-sm hover-shadow w-100" style={{ backgroundColor: colores.indigo, transition: 'all 0.3s' }}>
                      <i className="bi bi-rocket-takeoff-fill me-2"></i>Publicar Sesión Ahora
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <h5 className="fw-bold mb-3 text-dark">
          <i className="bi bi-calendar-check-fill text-indigo me-2"></i>Mi Agenda de Sesiones Programadas
        </h5>
        
        <div className="row">
          {sesionesCreadas.length > 0 ? (
            sesionesCreadas.map((sesion) => (
              <div className="col-md-4 mb-4" key={sesion.id}>
                <div 
                  className="card border-0 shadow-sm h-100 bg-white"
                  style={cardStyle}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 .125rem .25rem rgba(0,0,0,0.075)";
                  }}
                >
                  <div className="card-header text-white py-3 border-0 d-flex justify-content-between align-items-center" style={{ backgroundColor: colores.indigo, borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                    <span className="fw-bold small text-uppercase tracking-wider">{sesion.curso}</span>
                  </div>
                  <div className="card-body p-4 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center text-muted small mb-2">
                        <i className="bi bi-calendar-event me-2"></i> {formatearFechaEspanol(sesion.fecha)}
                      </div>
                      <div className="d-flex align-items-center text-muted small mb-3">
                        <i className="bi bi-clock me-2"></i> {sesion.hora} ({courseDurations[sesion.curso] || 1.5}h)
                      </div>
                      
                      <div className="p-3 bg-light rounded text-center mb-3">
                        <span className="d-block small text-muted text-uppercase fw-bold mb-1">Cupos Ocupados</span>
                        <div className="fs-4 fw-bold text-dark">
                          {sesion.inscritos} <span className="text-muted fs-6">/ {sesion.cuposMaximos}</span>
                        </div>
                        <div className="progress mt-2" style={{ height: '6px' }}>
                          <div className="progress-bar" role="progressbar" style={{ width: `${(sesion.inscritos/sesion.cuposMaximos)*100}%`, backgroundColor: colores.violet }}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      {(() => {
                        const btnConfig = getButtonConfig(sesion);
                        return (
                          <button
                            className="btn fw-semibold w-100 py-2 shadow-sm text-white d-flex align-items-center justify-content-center gap-2"
                            style={{ backgroundColor: btnConfig.color, border: 'none', opacity: btnConfig.disabled ? 0.65 : 1 }}
                            onClick={() => !btnConfig.disabled && handleIniciarSesionVirtual(sesion)}
                            disabled={btnConfig.disabled}
                          >
                            <i className={`bi ${btnConfig.icon}`}></i> {btnConfig.label}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12 text-center mt-2">
              <div className="alert alert-light border shadow-sm text-muted py-5 rounded-4">
                <i className="bi bi-calendar-x fs-1 text-muted mb-3 d-block"></i>
                <h5 className="text-muted mb-0">No tienes ninguna sesión programada actualmente.</h5>
                <p className="small mt-2">Usa el formulario de arriba para crear una nueva.</p>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* MODAL EVALUACIÓN */}
      {mostrarModalValoracion && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
              <div className="modal-header text-white border-0" style={{ backgroundColor: colores.indigo, borderTopLeftRadius: '15px', borderTopRightRadius: '15px' }}>
                <h5 className="modal-title fw-bold">Reporte de Asistencia y Nivel</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setMostrarModalValoracion(false)}></button>
              </div>
              <form onSubmit={guardarValoracionDocente}>
                <div className="modal-body p-4">
                  <p>Guarda tus comentarios generales sobre cómo fue la sesión de <strong>{sesionAEvaluar?.curso}</strong>.</p>
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-secondary">Comentario General</label>
                    <textarea 
                      className="form-control bg-light border-0" 
                      rows="3" 
                      placeholder="Describe el desempeño del grupo..."
                      value={comentarioLibre}
                      onChange={(e) => setComentarioLibre(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="submit" className="btn text-white px-4 fw-bold w-100" style={{ backgroundColor: colores.indigo }}>Guardar Reporte</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutoriasProfesor;