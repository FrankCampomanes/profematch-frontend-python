import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Swal from 'sweetalert2';

export default function ResenasEstudiante() {
  const [misResenas, setMisResenas] = useState([]);
  const [tutoriasPendientes, setTutoriasPendientes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Form State
  const [selectedTutoria, setSelectedTutoria] = useState(null);
  const [categorias, setCategorias] = useState({
    Claridad: 0,
    Dominio: 0,
    Puntualidad: 0,
    Profesionalismo: 0,
    Exigencia: 0,
    Disponibilidad: 0
  });
  const [comentario, setComentario] = useState("");
  const [recomendaria, setRecomendaria] = useState(true);
  const [quejaFormal, setQuejaFormal] = useState(false);
  const [motivoQueja, setMotivoQueja] = useState("");

  const numCategoriasEvaluadas = Object.values(categorias).filter(val => val > 0).length;
  const sumaCategorias = Object.values(categorias).reduce((a, b) => a + b, 0);
  const rating = sumaCategorias > 0 ? Math.round(sumaCategorias / 6) : 0;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const userSession = JSON.parse(localStorage.getItem('userSession'));
      if (!userSession || !userSession.id) return;

      // 1. Obtener el historial de valoraciones ya hechas
      const resResenas = await fetch(`${import.meta.env.VITE_API_URL}/resenas/estudiante/${userSession.id}`);
      let historialResenas = [];
      if (resResenas.ok) {
        historialResenas = await resResenas.json();
        setMisResenas(historialResenas);
      }

      // 2. Obtener sesiones completadas del estudiante
      const resInsc = await fetch(`${import.meta.env.VITE_API_URL}/sesiones/estudiante/${userSession.id}`);
      if (resInsc.ok) {
        const inscripciones = await resInsc.json();
        const completadas = inscripciones.filter(insc => insc.estado_sesion === "Finalizada");

        // Filtrar las que aún no están en historialResenas
        const pendientes = completadas.filter(comp => !historialResenas.some(r => r.sesion_id === comp.sesion_id));
        setTutoriasPendientes(pendientes);
      }
    } catch (err) {
      console.error("Error cargando valoraciones:", err);
    } finally {
      setCargando(false);
    }
  };

  const handleAbrirModal = (tutoria = null) => {
    setSelectedTutoria(tutoria);
    setCategorias({ Claridad: 0, Dominio: 0, Puntualidad: 0, Profesionalismo: 0, Exigencia: 0, Disponibilidad: 0 });
    setComentario("");
    setRecomendaria(true);
    setQuejaFormal(false);
    setMotivoQueja("");
    setShowAddModal(true);
  };

  const guardarResena = async (e) => {
    e.preventDefault();
    if (!selectedTutoria) {
      Swal.fire('Error', 'Por favor selecciona una tutoría para evaluar.', 'error');
      return;
    }
    if (Object.values(categorias).some(val => val === 0)) {
      Swal.fire('Atención', 'Por favor evalúa todas las subcategorías (Puntualidad, Claridad, etc).', 'warning');
      return;
    }
    if (comentario.trim().length < 15) {
      Swal.fire('Atención', 'El comentario debe tener al menos 15 caracteres.', 'warning');
      return;
    }
    if (quejaFormal && motivoQueja.trim().length < 10) {
      Swal.fire('Atención', 'Por favor describe el motivo de tu queja formal.', 'warning');
      return;
    }

    try {
      const userSession = JSON.parse(localStorage.getItem('userSession'));
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/resenas/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estudiante_id: userSession.id,
          profesor_id: selectedTutoria.profesor_id,
          sesion_id: selectedTutoria.sesion_id,
          puntuaciones_json: categorias,
          comentario: comentario,
          recomendaria: recomendaria,
          queja_formal: quejaFormal,
          motivo_queja: quejaFormal ? motivoQueja : null
        })
      });

      if (res.ok) {
        Swal.fire({
          title: 'Reseña Guardada',
          text: quejaFormal ? 'La reseña y queja formal han sido registradas. El administrador revisará el caso.' : 'Gracias por valorar tu tutoría.',
          icon: 'success',
          confirmButtonColor: '#3F51B5'
        });
        setShowAddModal(false);
        cargarDatos();
      } else {
        const errorData = await res.json();
        Swal.fire('Error', errorData.detail || 'Ocurrió un problema al guardar la reseña', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión con el servidor', 'error');
    }
  };

  const renderStars = (currentRating, onClickHandler) => {
    return [...Array(5)].map((_, i) => (
      <i
        key={i}
        className={`bi ${i < currentRating ? "bi-star-fill text-warning" : "bi-star text-secondary"} me-1`}
        style={{ cursor: onClickHandler ? "pointer" : "default" }}
        onClick={() => onClickHandler && onClickHandler(i + 1)}
      ></i>
    ));
  };

  const getPromedioRating = () => {
    if (misResenas.length === 0) return 0;
    let sumaTotal = 0;
    let cantidadTotal = 0;
    misResenas.forEach(r => {
      Object.values(r.puntuaciones_json || {}).forEach(v => {
        sumaTotal += v;
        cantidadTotal++;
      });
    });
    return cantidadTotal > 0 ? (sumaTotal / cantidadTotal).toFixed(1) : 0;
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

  return (
    <div className="main-layout">
      <Sidebar role="estudiante" />

      <main className="dashboard-content bg-light bg-opacity-50">
        <header className="mb-4 d-flex justify-content-between align-items-end">
          <div>
            <h2 className="fw-bold mb-1" style={textGradient}>Centro de Valoraciones</h2>
            <p className="text-muted mb-0">Evalúa tus tutorías completadas y revisa tu historial de reseñas.</p>
          </div>
          {misResenas.length > 0 && (
            <div className="text-end">
              <h4 className="fw-bold text-dark mb-0 d-flex align-items-center justify-content-end">
                {getPromedioRating()} <i className="bi bi-star-fill text-warning ms-2"></i>
              </h4>
              <small className="text-muted">Rating Promedio que has dado</small>
            </div>
          )}
        </header>

        {cargando ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted mt-2">Cargando datos...</p>
          </div>
        ) : (
          <div className="row g-4">
            
            {/* Tutorías Pendientes de Valorar */}
            <div className="col-12">
              <h5 className="fw-bold mb-3 d-flex align-items-center">
                <i className="bi bi-clock-history me-2 text-warning fs-4"></i>
                Pendientes de Valorar ({tutoriasPendientes.length})
              </h5>
              
              {tutoriasPendientes.length === 0 ? (
                <div className="card border-0 rounded-4 shadow-sm">
                  <div className="card-body text-center p-5">
                    <i className="bi bi-check-circle text-success fs-1 mb-2 d-block"></i>
                    <h6 className="text-dark fw-bold">¡Estás al día!</h6>
                    <p className="text-muted small mb-0">Has valorado todas tus tutorías completadas.</p>
                  </div>
                </div>
              ) : (
                <div className="row g-3">
                  {tutoriasPendientes.map(tut => (
                    <div key={tut.inscripcion_id} className="col-md-6 col-lg-4">
                      <div className="card border-0 rounded-4 shadow-sm h-100 hover-shadow transition-all" style={{ borderLeft: '4px solid #ffc107 !important' }}>
                        <div className="card-body p-4 d-flex flex-column justify-content-between">
                          <div>
                            <div className="d-flex align-items-center mb-3">
                              <img src="https://i.pravatar.cc/150?img=11" alt="avatar" className="rounded-circle me-3" width="40" height="40" />
                              <div>
                                <h6 className="fw-bold mb-0 text-dark">{tut.profesor_nombre}</h6>
                                <small className="text-muted">{tut.curso_nombre}</small>
                              </div>
                            </div>
                            <p className="small text-muted mb-3"><i className="bi bi-calendar-check me-2"></i>Clase completada el {new Date(tut.fecha_hora_inicio).toLocaleDateString()}</p>
                          </div>
                          <button 
                            className="btn btn-outline-warning rounded-pill fw-bold w-100 mt-2 text-dark border-2" 
                            onClick={() => handleAbrirModal(tut)}
                          >
                            <i className="bi bi-star me-2"></i> Valorar Tutoría
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de Reseñas */}
            <div className="col-12 mt-5">
              <h5 className="fw-bold mb-3 d-flex align-items-center">
                <i className="bi bi-journal-text me-2 text-primary fs-4"></i>
                Mi Historial de Reseñas ({misResenas.length})
              </h5>

              {misResenas.length === 0 ? (
                <div className="card border-0 rounded-4 shadow-sm">
                  <div className="card-body text-center p-5">
                    <i className="bi bi-chat-square-text text-muted fs-1 mb-2 d-block"></i>
                    <p className="text-muted mb-0">Aún no has escrito ninguna reseña.</p>
                  </div>
                </div>
              ) : (
                <div className="row g-4">
                  {misResenas.map(res => {
                    const vals = Object.values(res.puntuaciones_json || {});
                    const avgResena = vals.length > 0 ? (vals.reduce((a,b)=>a+b, 0) / vals.length) : 0;
                    return (
                      <div key={res.id} className="col-md-6">
                        <div className="card border-0 rounded-4 shadow-sm h-100">
                          <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div className="d-flex align-items-center">
                                <img src="https://i.pravatar.cc/150?img=11" alt="avatar" className="rounded-circle me-3" width="45" height="45" />
                                <div>
                                  <h6 className="fw-bold text-dark mb-0">{res.profesor_nombre}</h6>
                                  <span className="badge bg-light text-secondary border mt-1">{res.curso_nombre}</span>
                                </div>
                              </div>
                              <div className="text-end">
                                <h5 className="fw-bold text-warning mb-0">{avgResena.toFixed(1)} <i className="bi bi-star-fill"></i></h5>
                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  {new Date(res.fecha_creacion).toLocaleDateString()}
                                </small>
                              </div>
                            </div>
                            
                            <div className="bg-light p-3 rounded-3 mb-3">
                              <p className="mb-0 text-secondary fst-italic" style={{ fontSize: '0.9rem' }}>"{res.comentario}"</p>
                            </div>

                            <div className="row g-2 small text-muted">
                              <div className="col-6"><i className="bi bi-check2 text-success me-1"></i> Claridad: {res.puntuaciones_json?.Claridad || 0}/5</div>
                              <div className="col-6"><i className="bi bi-check2 text-success me-1"></i> Dominio: {res.puntuaciones_json?.Dominio || 0}/5</div>
                              <div className="col-6"><i className="bi bi-check2 text-success me-1"></i> Puntualidad: {res.puntuaciones_json?.Puntualidad || 0}/5</div>
                              <div className="col-6"><i className="bi bi-check2 text-success me-1"></i> Profesionalismo: {res.puntuaciones_json?.Profesionalismo || 0}/5</div>
                            </div>
                            
                            {res.respuesta_profesor && (
                              <div className="mt-3 p-3 rounded bg-light border-start border-primary border-4">
                                <small className="fw-bold d-block text-primary mb-1">Respuesta del Profesor:</small>
                                <span className="small text-muted fst-italic">"{res.respuesta_profesor}"</span>
                              </div>
                            )}
                            
                            {res.queja_formal && (
                              <div className="alert alert-danger mt-3 mb-0 py-2 px-3 small border-0">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i> Emitiste una queja formal en esta sesión.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* MODAL PARA AÑADIR RESEÑA */}
      {showAddModal && selectedTutoria && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
              <div className="modal-header text-white" style={{ background: "linear-gradient(135deg, #7B1FA2 0%, #403fa0ff 100%)" }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-star me-2"></i>Valorar Tutoría
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={guardarResena}>
                <div className="modal-body p-4">
                  <div className="d-flex align-items-center mb-4 bg-light p-3 rounded-4">
                    <img src="https://i.pravatar.cc/150?img=11" alt="avatar" className="rounded-circle me-3" width="50" height="50" />
                    <div>
                      <h6 className="fw-bold text-dark mb-0">Prof. {selectedTutoria.profesor_nombre}</h6>
                      <small className="text-muted">{selectedTutoria.curso_nombre}</small>
                    </div>
                    <div className="ms-auto text-end">
                      <h3 className="fw-bold text-warning mb-0">{rating} <span className="fs-5 text-muted">/ 5</span></h3>
                      <small className="text-muted d-block">Rating Promedio</small>
                    </div>
                  </div>

                  <h6 className="fw-bold mb-3 border-bottom pb-2">Califica las siguientes áreas:</h6>
                  <div className="row g-3 mb-4">
                    {Object.keys(categorias).map((cat) => (
                      <div className="col-md-6 d-flex justify-content-between align-items-center" key={cat}>
                        <span className="text-muted fw-bold small">{cat}</span>
                        <div className="fs-5">
                          {renderStars(categorias[cat], (val) => setCategorias({ ...categorias, [cat]: val }))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <h6 className="fw-bold mb-2">Comentario detallado</h6>
                  <textarea
                    className="form-control bg-light border-0 mb-3"
                    rows="3"
                    placeholder="Comparte tu experiencia. ¿Qué fue lo mejor de la tutoría? ¿Qué se podría mejorar? (Mín. 15 caracteres)"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    required
                  ></textarea>

                  <div className="d-flex align-items-center gap-4 border-top pt-3">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="recomendaria" checked={recomendaria} onChange={e => setRecomendaria(e.target.checked)} />
                      <label className="form-check-label text-dark fw-bold small" htmlFor="recomendaria">
                        Recomendaría a este profesor
                      </label>
                    </div>
                    
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="quejaFormal" checked={quejaFormal} onChange={e => setQuejaFormal(e.target.checked)} />
                      <label className="form-check-label text-danger fw-bold small" htmlFor="quejaFormal">
                        Emitir queja formal (Incidente grave)
                      </label>
                    </div>
                  </div>

                  {quejaFormal && (
                    <div className="mt-3 bg-danger bg-opacity-10 p-3 rounded border border-danger">
                      <label className="form-label text-danger fw-bold small">Motivo de la queja formal</label>
                      <textarea
                        className="form-control border-danger"
                        rows="2"
                        placeholder="Describe el incidente (ausencia injustificada, mal comportamiento, etc.)"
                        value={motivoQueja}
                        onChange={(e) => setMotivoQueja(e.target.value)}
                        required={quejaFormal}
                      ></textarea>
                    </div>
                  )}

                </div>
                <div className="modal-footer bg-light border-0">
                  <button type="button" className="btn btn-light rounded-pill px-4 fw-bold text-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                  <button type="submit" className="btn text-white rounded-pill px-4 fw-bold shadow-sm" style={gradientStyle}>Guardar Valoración</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}