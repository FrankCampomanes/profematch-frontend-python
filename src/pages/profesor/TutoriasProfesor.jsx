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

  // ALERTA VISUAL
  const [alertaCancelacionEstudiante, setAlertaCancelacionEstudiante] = useState(false);

  // ESTADOS PARA MODAL DE CANCELACIÓN (PENALIZACIONES)
  const [mostrarModalCancelacion, setMostrarModalCancelacion] = useState(false);
  const [sesionACancelar, setSesionACancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [comentarioCancelacion, setComentarioCancelacion] = useState('');

  // ESTADOS PARA MODAL DE VALORACIÓN POST-TUTORÍA
  const [mostrarModalValoracion, setMostrarModalValoracion] = useState(false);
  const [sesionAEvaluar, setSesionAEvaluar] = useState(null);
  const [comentarioLibre, setComentarioLibre] = useState('');

  useEffect(() => {
    cargarSesiones();
    const scoreActual = Number(localStorage.getItem("score_profesor")) || 100;
    if (scoreActual < 100) {
      setAlertaCancelacionEstudiante(true);
    }

    // Cargar los cursos que dicta el profesor desde su perfil
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    if (userSession && userSession.cursos && userSession.cursos.length > 0) {
      setMisCursos(userSession.cursos);
      setCursoNuevaSesion(userSession.cursos[0].id);
    } else {
      setMisCursos([{ id: "", nombre: "Pendiente de asignar" }]);
      setCursoNuevaSesion("");
    }
  }, []);

  const cargarSesiones = () => {
    const sesiones = StorageService.getSessions();
    // Filtramos para mostrar solo las programadas. Las finalizadas se ocultan.
    setSesionesCreadas(sesiones.filter(s => s.estado === "Programada"));
  };

  const handleCrearSesion = (e) => {
    e.preventDefault();
    if (!cursoNuevaSesion || cursoNuevaSesion === "Pendiente de asignar") {
      Swal.fire('Error', 'Debes seleccionar un curso válido antes de crear la sesión.', 'error');
      return;
    }
    if (!temaNuevaSesion.trim()) {
      Swal.fire('Error', 'Debes especificar el tema de la sesión.', 'error');
      return;
    }
    if (!fechaNuevaSesion || !horaNuevaSesion || !horaNuevaSesionFin) {
      Swal.fire('Error', 'Completa todos los campos de fecha y hora.', 'error');
      return;
    }
    if (precioNuevaSesion < 5) {
      Swal.fire('Error', 'El precio mínimo debe ser de 5 soles.', 'error');
      return;
    }

    const todasSesiones = StorageService.getSessions();
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

    const hayChoque = todasSesiones.some(s => {
      if (s.estado !== 'Programada') return false;
      const sInicio = new Date(`${s.fecha}T${s.hora}:00`);
      // Si el formato antiguo no tenía horaFin, usa una duración estimada para choque
      let sFin = s.horaFin ? new Date(`${s.fecha}T${s.horaFin}:00`) : new Date(sInicio.getTime() + 1.5 * 60 * 60 * 1000);
      if (s.horaFin && sFin < sInicio) {
        sFin.setDate(sFin.getDate() + 1);
      }
      return (nuevaFechaHora < sFin && nuevaFechaHoraFin > sInicio);
    });

    if (hayChoque) {
      Swal.fire({
        title: 'Conflicto de Horario',
        text: 'Ya tienes una sesión programada en este horario. Por favor elige otra hora.',
        icon: 'warning'
      });
      return;
    }

    // Obtenemos al usuario activo
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    const userName = userSession?.nombres || "Prof. Ejemplo (Tú)";
    const duracionHoras = (duracionMs / (1000 * 60 * 60)).toFixed(1);

    const payload = {
      profesor_id: userSession?.id || 1,
      curso_id: parseInt(cursoNuevaSesion), // ahora es ID
      tema: temaNuevaSesion,
      precio: parseInt(precioNuevaSesion),
      fecha_hora_inicio: nuevaFechaHora.toISOString(),
      fecha_hora_fin: nuevaFechaHoraFin.toISOString(),
      cupos_maximos: 40,
      enlace_reunion: enlaceReunion || null
    };

    fetch(`${import.meta.env.VITE_API_URL}/sesiones/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Error al crear la sesión en el backend');
      }

      // Fallback temporal para la UI hasta que el Backend cree el GET /api/sessions
      const nombreCursoReal = misCursos.find(c => c.id === payload.curso_id)?.nombre || "Curso ID " + payload.curso_id;
      StorageService.saveSession({
        id: data.sesion_id,
        profesorId: payload.profesor_id,
        profesorNombre: userName, 
        curso: nombreCursoReal,
        tema: payload.tema,
        fecha: fechaNuevaSesion,
        hora: horaNuevaSesion,
        horaFin: horaNuevaSesionFin,
        duracion: duracionHoras,
        foto: "https://i.pravatar.cc/150?img=11",
        precioHora: payload.precio
      });

      Swal.fire('¡Éxito!', 'La sesión ha sido publicada y está disponible para los alumnos.', 'success');
      setFechaNuevaSesion('');
      setHoraNuevaSesion('');
      setHoraNuevaSesionFin('');
      setTemaNuevaSesion('');
      setPrecioNuevaSesion(10);
      setEnlaceReunion('');
      cargarSesiones();
    })
    .catch(err => {
      console.error(err);
      Swal.fire('Error', err.message, 'error');
    });
    cargarSesiones();
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

  const solicitarCancelacion = (sesion) => {
    setSesionACancelar(sesion);
    setMotivoCancelacion('');
    setComentarioCancelacion('');
    setMostrarModalCancelacion(true);
  };

  const confirmarCancelacion = () => {
    if (!motivoCancelacion) {
      alert("Por favor, selecciona un motivo para la cancelación.");
      return;
    }

    const fechaTutoria = new Date(`${sesionACancelar.fecha}T${sesionACancelar.hora}:00`);
    const ahora = new Date();
    const diferenciaHoras = (fechaTutoria - ahora) / (1000 * 60 * 60);

    let puntosPenalizacion = 0;
    let mensajeTiempo = "";

    if (diferenciaHoras < 0) {
      puntosPenalizacion = 30;
      mensajeTiempo = "sin aviso (No-Show) (-30 puntos)";
    } else if (diferenciaHoras < 24) {
      puntosPenalizacion = 15;
      mensajeTiempo = "con menos de 24 horas de anticipación (-15 puntos)";
    } else {
      puntosPenalizacion = 5;
      mensajeTiempo = "con más de 24 horas de anticipación (-5 puntos)";
    }

    alert(`Cancelación registrada.\nConsecuencia: Tu Score disminuirá en ${puntosPenalizacion} puntos por cancelar ${mensajeTiempo}.`);

    const scoreActual = Number(localStorage.getItem("score_profesor")) || 100;
    localStorage.setItem("score_profesor", Math.max(0, scoreActual - puntosPenalizacion));

    StorageService.updateSession(sesionACancelar.id, { estado: 'Cancelada' });
    
    setMostrarModalCancelacion(false);
    cargarSesiones();
  };

  const handleIniciarSesionVirtual = (sesion) => {
    const ahora = new Date();
    const fechaHoraInicio = new Date(`${sesion.fecha}T${sesion.hora}:00`);
    let fechaHoraFin = sesion.horaFin ? new Date(`${sesion.fecha}T${sesion.horaFin}:00`) : new Date(fechaHoraInicio.getTime() + 1.5 * 60 * 60 * 1000);
    
    // Si la hora de fin es menor a la de inicio (cruza la medianoche), sumamos un día
    if (fechaHoraFin < fechaHoraInicio) {
      fechaHoraFin.setDate(fechaHoraFin.getDate() + 1);
    }
    
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    const esProfesorDemo = userSession?.email === "prof@profematch.com" || userSession?.nombres === "Profesor Ejemplo";

    // Validar hora de ingreso: solo desde 10 min antes hasta la hora de fin.
    const diezMinutosAntes = new Date(fechaHoraInicio.getTime() - 10 * 60000);
    if (!esProfesorDemo && ahora < diezMinutosAntes) {
      Swal.fire('Atención', 'Aún es muy pronto. Solo puedes ingresar a la sala desde 10 minutos antes de la hora de inicio.', 'warning');
      return;
    }

    // Lista simulada de estudiantes
    const numeroInscritos = sesion.inscritos || Math.floor(Math.random() * 5) + 1;
    let htmlAlumnos = '<ul class="list-group text-start mt-3 mb-3" style="max-height: 150px; overflow-y: auto;">';
    for (let i = 1; i <= numeroInscritos; i++) {
      htmlAlumnos += `<li class="list-group-item d-flex align-items-center">
        <span class="bg-success rounded-circle me-2" style="width: 10px; height: 10px; display: inline-block;"></span>
        Estudiante ${i} (Conectado)
      </li>`;
    }
    htmlAlumnos += '</ul>';

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
      confirmButtonColor: '#3F51B5',
      cancelButtonColor: '#6c757d',
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        // Validar si puede finalizar usando el tiempo exacto en el que hizo clic
        if (!esProfesorDemo && new Date() < fechaHoraFin) {
          Swal.fire('No puedes finalizar aún', 'La clase aún no ha cumplido su horario establecido. Los alumnos siguen conectados.', 'error');
          return;
        }

        StorageService.updateSession(sesion.id, { estado: 'Finalizada' });
        
        Swal.fire({
          title: 'Clase Finalizada',
          text: 'La sesión ha sido marcada como completada y los alumnos ya pueden dejar su reseña.',
          icon: 'success',
          confirmButtonColor: '#28a745'
        }).then(() => {
          handleAbrirEvaluacion(sesion);
        });
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
        
        {alertaCancelacionEstudiante && (
          <div className="alert alert-warning border-0 shadow-sm rounded-4 p-3 mb-4 d-flex align-items-center justify-content-between" style={{ borderLeft: '5px solid #ffc107' }}>
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill text-warning fs-4"></i>
              <div>
                <strong className="d-block text-dark">Alerta de Agenda</strong>
                <span className="small text-secondary">Tu Score de confiabilidad ha disminuido debido a cancelaciones recientes.</span>
              </div>
            </div>
            <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => setAlertaCancelacionEstudiante(false)}>Entendido</button>
          </div>
        )}

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
                    <label className="form-label small fw-bold text-secondary">Enlace de la Reunión (Opcional)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0 rounded-start-3 text-muted"><i className="bi bi-link-45deg"></i></span>
                      <input 
                        type="url" 
                        className="form-control bg-light border-0 shadow-none rounded-end-3"
                        placeholder="https://zoom.us/j/..."
                        value={enlaceReunion}
                        onChange={(e) => setEnlaceReunion(e.target.value)}
                        style={{ padding: '0.6rem 1rem' }}
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
                    <button 
                      className="btn btn-sm text-white p-0 btn-close-white" 
                      onClick={() => solicitarCancelacion(sesion)}
                      title="Cancelar sesión"
                    >
                      &times;
                    </button>
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
                      <button 
                        className="btn fw-semibold w-100 py-2 shadow-sm text-white d-flex align-items-center justify-content-center gap-2" 
                        style={{ backgroundColor: colores.indigo, border: 'none' }}
                        onClick={() => handleIniciarSesionVirtual(sesion)}
                      >
                        <i className="bi bi-camera-video-fill"></i> Iniciar Sesión Virtual
                      </button>
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

      {/* MODAL CANCELACIÓN */}
      {mostrarModalCancelacion && sesionACancelar && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
              <div className="modal-header bg-danger text-white border-0" style={{ borderTopLeftRadius: '15px', borderTopRightRadius: '15px' }}>
                <h5 className="modal-title fw-bold">¿Estás seguro de cancelar esta sesión?</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setMostrarModalCancelacion(false)}></button>
              </div>
              <div className="modal-body p-4">
                <p>Cancelarás la clase de <strong>{sesionACancelar.curso}</strong> del {sesionACancelar.fecha} a las {sesionACancelar.hora}.</p>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">Motivo de la cancelación *</label>
                  <select 
                    className="form-select bg-light border-0" 
                    value={motivoCancelacion} 
                    onChange={(e) => setMotivoCancelacion(e.target.value)}
                  >
                    <option value="">-- Selecciona un motivo --</option>
                    <option value="Problema de salud">Problema de salud</option>
                    <option value="Cruce de horario">Cruce de horario</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary px-4" onClick={() => setMostrarModalCancelacion(false)}>Volver</button>
                <button className="btn btn-danger px-4 fw-bold" onClick={confirmarCancelacion}>Confirmar Cancelación</button>
              </div>
            </div>
          </div>
        </div>
      )}

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