import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import CheckoutModal from "../../components/CheckoutModal";
import ModalCancelacion from "../../components/ModalCancelacion";
import { StorageService } from "../../core/database/StorageService";
import { courseDurations } from "../../data/profesoresData";
import Swal from 'sweetalert2';

export default function TutoriasEstudiante() {
  const [tab, setTab] = useState("mis-tutorias"); // 'mis-tutorias' o 'explorar'

  // Data
  const [misTutoriasAgendadas, setMisTutoriasAgendadas] = useState([]);
  const [sesionesDisponibles, setSesionesDisponibles] = useState([]);

  // Modals state
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null);
  const [tutoriaACancelar, setTutoriaACancelar] = useState(null);

  // Grouping by course
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (location.state?.cursoSeleccionado) {
      setTab("explorar");
      setCursoSeleccionado(location.state.cursoSeleccionado);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const cargarDatos = () => {
    const todasSesiones = StorageService.getSessions();
    const misSesiones = StorageService.getTutoringSessions().map(reserva => {
      // Sincronizar el estado de la reserva con el estado real de la sesión dictada por el profe
      const sesionReal = todasSesiones.find(s => s.id === reserva.sesionId);
      if (sesionReal && sesionReal.estado === "Finalizada" && reserva.estado !== "Cancelada") {
        return { ...reserva, estado: "Completada" };
      }
      if (sesionReal && sesionReal.estado === "Cancelada") {
        return { ...reserva, estado: "Cancelada" };
      }
      return reserva;
    });
    
    misSesiones.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
    setMisTutoriasAgendadas(misSesiones);
    setSesionesDisponibles(todasSesiones);
  };

  const cursosUnicos = Object.keys(courseDurations);

  const handleInscripcionExitosa = () => {
    setSesionSeleccionada(null);
    cargarDatos();
    setTab("mis-tutorias");
  };

  const isHoy = (fechaISO) => {
    const hoy = new Date();
    const fecha = new Date(fechaISO);
    return hoy.toDateString() === fecha.toDateString();
  };

  const isHoraDeClase = (fechaISO, duracionHoras = 1.5) => {
    const ahora = new Date();
    const fechaInicio = new Date(fechaISO);
    const diezMinutosAntes = new Date(fechaInicio.getTime() - 10 * 60000);
    const horaFin = new Date(fechaInicio.getTime() + duracionHoras * 60 * 60 * 1000);
    
    // Puede entrar desde 10 mins antes hasta que acabe la clase
    return ahora >= diezMinutosAntes && ahora <= horaFin;
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case "Confirmada": return "success";
      case "Completada": return "secondary";
      case "Cancelada": return "danger";
      default: return "primary";
    }
  };

  const getCourseIcon = (curso) => {
    const icons = {
      "Programación Web": "bi-code-slash",
      "Psicología Social": "bi-person-hearts",
      "Cálculo I": "bi-calculator",
      "Física II": "bi-lightning",
      "Microeconomía": "bi-graph-up-arrow",
      "Base de Datos": "bi-database",
      "Anatomía Humana": "bi-lungs",
      "Redacción Académica": "bi-pen",
      "Gestión de Procesos": "bi-diagram-3",
      "Derecho Constitucional": "bi-bank",
      "Estructura de Datos": "bi-diagram-2",
      "Álgebra Lineal": "bi-bounding-box",
      "Neuropsicología": "bi-brain"
    };
    return icons[curso] || "bi-book";
  };

  const gradientStyle = {
    background: "linear-gradient(135deg, #801caaff 0%, rgba(127, 56, 221, 1) 100%)",
    color: "white"
  };

  const textGradient = {
    background: "linear-gradient(135deg, #801caaff 0%, rgba(127, 56, 221, 1) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  };

  // Filtrado de sesiones válidas (Regla de los 10 minutos para explorar sesiones)
  const sesionesVigentes = sesionesDisponibles.filter(s => {
    if (s.estado !== 'Programada') return false;
    const inicio = new Date(`${s.fecha}T${s.hora}:00`);
    const limiteIngreso = new Date(inicio.getTime() + 10 * 60000); // 10 min de gracia máximo para inscribirse
    const ahora = new Date();
    return ahora <= limiteIngreso;
  });

  return (
    <div className="main-layout">
      <Sidebar role="estudiante" />

      <main className="dashboard-content">
        <header className="mb-4">
          <h2 className="fw-bold" style={textGradient}>Centro de Tutorías</h2>
          <p className="text-muted">Gestiona tus sesiones programadas o explora nuevas clases.</p>
        </header>

        {/* TABS */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link fw-bold ${tab === "mis-tutorias" ? "active border-bottom-0" : "text-muted bg-light"}`}
              style={tab === "mis-tutorias" ? textGradient : {}}
              onClick={() => setTab("mis-tutorias")}
            >
              Mis Tutorías Programadas
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link fw-bold ${tab === "explorar" ? "active border-bottom-0" : "text-muted bg-light"}`}
              style={tab === "explorar" ? textGradient : {}}
              onClick={() => {
                setTab("explorar");
                setCursoSeleccionado(null);
              }}
            >
              Explorar Sesiones
            </button>
          </li>
        </ul>

        {tab === "mis-tutorias" && (
          <section>
            {misTutoriasAgendadas.length === 0 ? (
              <div className="text-center py-5 bg-light rounded-4">
                <i className="bi bi-calendar-x fs-1 text-muted mb-3 d-block"></i>
                <h5 className="text-muted">No tienes tutorías programadas</h5>
                <button
                  className="btn mt-3 fw-bold border-0 shadow-sm px-4 py-2 rounded-pill"
                  style={gradientStyle}
                  onClick={() => setTab("explorar")}
                >
                  Agendar una ahora
                </button>
              </div>
            ) : (
              <div className="row g-4">
                {misTutoriasAgendadas.map(tut => (
                  <div key={tut.id} className="col-md-6 col-lg-4">
                    <div className={`card border-0 shadow-sm rounded-4 h-100 border-start border-4 border-${getStatusColor(tut.estado)}`}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <span className={`badge bg-${getStatusColor(tut.estado)} bg-opacity-10 text-${getStatusColor(tut.estado)} px-3 py-2`}>
                            {tut.estado}
                          </span>
                          {isHoy(tut.fechaHora) && tut.estado === "Confirmada" && (
                            <span className="badge bg-warning text-dark shadow-sm px-2 py-1">
                              <i className="bi bi-star-fill me-1"></i> Hoy
                            </span>
                          )}
                        </div>

                        <h5 className="fw-bold text-dark mb-1">{tut.curso}</h5>
                        <div className="d-flex align-items-center mb-3">
                          <img src={tut.foto} alt={tut.profesorNombre} className="rounded-circle me-2" width="30" height="30" style={{ objectFit: 'cover' }} />
                          <small className="text-muted">{tut.profesorNombre}</small>
                        </div>

                        <div className="bg-light rounded p-2 mb-3">
                          <div className="d-flex align-items-center mb-1">
                            <i className="bi bi-calendar-event text-primary me-2"></i>
                            <small className="fw-bold">{new Date(tut.fechaHora).toLocaleDateString()}</small>
                          </div>
                          <div className="d-flex align-items-center">
                            <i className="bi bi-clock text-primary me-2"></i>
                            <small className="fw-bold">
                              {new Date(tut.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {tut.duracionEstimada && ` • ${tut.duracionEstimada}h`}
                            </small>
                          </div>
                        </div>

                        {tut.estado === "Confirmada" && (
                          <div className="d-grid mt-3">
                            {isHoraDeClase(tut.fechaHora) ? (
                              <button 
                                className="btn rounded-pill fw-bold py-2 text-white border-0 shadow-sm hover-shadow animation-pulse"
                                style={gradientStyle}
                                onClick={() => {
                                  Swal.fire({
                                    icon: 'success',
                                    title: '¡Conectado a la Sala!',
                                    text: 'Has entrado exitosamente a la sala virtual. Recuerda que la clase se marcará como Completada solo cuando el Profesor la finalice.',
                                    confirmButtonColor: '#7B1FA2'
                                  });
                                  if (tut.enlace_reunion) {
                                    window.open(tut.enlace_reunion, '_blank');
                                  }
                                }}
                              >
                                <i className="bi bi-camera-video-fill me-2"></i> Entrar a Sala Virtual
                              </button>
                            ) : (
                              <button 
                                className="btn btn-outline-danger btn-sm rounded-pill fw-bold"
                                onClick={() => setTutoriaACancelar(tut)}
                              >
                                <i className="bi bi-x-circle me-2"></i> Cancelar Tutoría
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "explorar" && (
          <section>
            {!cursoSeleccionado ? (
              <>
                <h5 className="fw-bold mb-4">¿En qué curso necesitas ayuda?</h5>
                <div className="row g-4">
                  {cursosUnicos.map(curso => {
                    const duracion = courseDurations[curso] || 1.5;
                    // Count only available sessions for this course
                    const numSesiones = sesionesVigentes.filter(s => s.curso === curso).length;

                    return (
                      <div key={curso} className="col-md-4 col-lg-3">
                        <div
                          className="card border-0 shadow-sm rounded-4 h-100 text-center p-4 position-relative overflow-hidden"
                          onClick={() => setCursoSeleccionado(curso)}
                          style={{ cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                          onMouseOver={e => {
                            e.currentTarget.style.transform = "translateY(-5px)";
                            e.currentTarget.style.boxShadow = "0 10px 20px rgba(123, 31, 162, 0.15)";
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)";
                          }}
                        >
                          <div className="position-absolute top-0 start-0 w-100" style={{ height: '4px', ...gradientStyle }}></div>

                          <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3 shadow-sm" style={{ width: "60px", height: "60px" }}>
                            <i className={`bi ${getCourseIcon(curso)} fs-3`} style={textGradient}></i>
                          </div>

                          <h6 className="fw-bold text-dark mb-1">{curso}</h6>
                          <div className="d-flex flex-column gap-1 mt-2">
                            <small className="text-muted">
                              <i className="bi bi-clock me-1"></i> {duracion}h estimadas
                            </small>
                            <small className={numSesiones > 0 ? "text-success fw-bold" : "text-muted fw-bold"}>
                              {numSesiones} {numSesiones === 1 ? "sesión disponible" : "sesiones disponibles"}
                            </small>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <button className="btn btn-link text-decoration-none text-muted p-0 mb-4 fw-bold d-flex align-items-center" onClick={() => setCursoSeleccionado(null)}>
                  <i className="bi bi-arrow-left me-2 fs-5"></i> Volver a cursos
                </button>
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm" style={{ width: "50px", height: "50px" }}>
                    <i className={`bi ${getCourseIcon(cursoSeleccionado)} fs-4`} style={textGradient}></i>
                  </div>
                  <div>
                    <h4 className="fw-bold mb-0" style={textGradient}>Sesiones disponibles para {cursoSeleccionado}</h4>
                    <span className="badge mt-1 shadow-sm" style={gradientStyle}>
                      <i className="bi bi-clock me-1"></i> {courseDurations[cursoSeleccionado] || 1.5}h
                    </span>
                  </div>
                </div>

                <div className="row g-4">
                  {sesionesVigentes.filter(s => s.curso === cursoSeleccionado).map((sesion) => {
                    const estaLleno = sesion.inscritos >= sesion.cuposMaximos;
                    const quedanPocos = (sesion.cuposMaximos - sesion.inscritos) <= 5;
                    
                    // Comprobar si ya estoy inscrito (Confirmada o Completada, permitimos recompra si canceló)
                    const yaInscrito = misTutoriasAgendadas.some(mt => mt.sesionId === sesion.id && mt.estado !== "Cancelada");

                    return (
                      <div key={sesion.id} className="col-md-6 col-lg-4">
                        <div className="card border-0 shadow-sm rounded-4 h-100 p-4" style={{ transition: "all 0.2s ease" }}>
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <div className="d-flex align-items-center">
                              <img src={sesion.foto} alt={sesion.profesorNombre} className="rounded-circle me-3" width="45" height="45" style={{ objectFit: 'cover' }} />
                              <div>
                                <h6 className="fw-bold mb-0">{sesion.profesorNombre}</h6>
                                <small className="text-muted d-block">{sesion.fecha} - {sesion.hora}</small>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-light rounded-3 mb-3 text-center">
                            <span className="badge bg-indigo text-white mb-2 py-1 px-3 fs-6 rounded-pill" style={{ background: '#3F51B5' }}>Tema: {sesion.tema || "General"}</span>
                            <small className="text-uppercase fw-bold text-muted d-block mb-1 mt-2">Cupos Disponibles</small>
                            <h4 className={`fw-bold mb-0 ${estaLleno ? 'text-danger' : quedanPocos ? 'text-warning' : 'text-success'}`}>
                              {sesion.inscritos} / {sesion.cuposMaximos}
                            </h4>
                            {quedanPocos && !estaLleno && (
                              <span className="badge bg-warning text-dark mt-2">¡Pocos lugares!</span>
                            )}
                          </div>

                          {yaInscrito ? (
                            <button className="btn btn-secondary w-100 rounded-pill fw-bold" disabled>
                              Ya estás inscrito
                            </button>
                          ) : estaLleno ? (
                            <button className="btn btn-danger w-100 rounded-pill fw-bold" disabled>
                              Sesión Llena
                            </button>
                          ) : (
                            <button 
                              className="btn text-white w-100 rounded-pill fw-bold border-0 shadow-sm"
                              style={gradientStyle}
                              onClick={() => setSesionSeleccionada(sesion)}
                            >
                              Reservar Cupo (S/ {sesion.precioHora || 10})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {sesionesVigentes.filter(s => s.curso === cursoSeleccionado).length === 0 && (
                    <div className="col-12 text-center py-5">
                      <div className="bg-light p-4 rounded-4 d-inline-block shadow-sm">
                        <i className="bi bi-clock-history fs-1 text-muted d-block mb-2"></i>
                        <h5 className="text-muted">Por el momento no hay sesiones publicadas para este curso.</h5>
                        <p className="text-muted small mb-0">Vuelve más tarde o explora otros cursos.</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

      </main>

      {/* MODALS */}
      {sesionSeleccionada && (
        <CheckoutModal
          sesion={sesionSeleccionada}
          onClose={() => setSesionSeleccionada(null)}
          onSuccess={handleInscripcionExitosa}
        />
      )}

      {tutoriaACancelar && (
        <ModalCancelacion
          tutoria={tutoriaACancelar}
          onClose={() => setTutoriaACancelar(null)}
          onSuccess={() => { setTutoriaACancelar(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}