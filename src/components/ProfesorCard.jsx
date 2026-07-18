import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function ProfesorCard({ profesor, showPrice = false, isTutoria = false, onSolicitar }) {

  const [showModal, setShowModal] = useState(false);
  const [esPremium, setEsPremium] = useState(false);

  const {
    nombre = "Profesor Anónimo",
    departamento = "General",
    rating = 0,
    dificultad = 0,
    foto = "https://ui-avatars.com/api/?name=Profe&background=random",
    precioHora = 50,
    etiquetas = [],
    curso = "",
    cursos = [],
    descripcion = "Sin descripción",
    metodologia = "Sin especificar",
    cursosAsociados = [],
    universidad = "Sin especificar",
    metricas = { claridad: 0, exigencia: 0, puntualidad: 0, empatia: 0, material: 0, estudiantesAtendidos: 0, tasaAprobacion: 0 },
    reconocimientos = [],
    modalidades = [],
    horarios = {},
    criteriosEvaluacion = {
      Puntualidad: 1,
      Claridad: 1,
      Dominio: 1,
      Profesionalismo: 1,
      Exigencia: 1,
      Disponibilidad: 1
    },
    resenasDestacadas = (profesor && profesor.resenas) || []
  } = profesor || {};

  const navigate = useNavigate();

  // REQUISITO: Verificar si este profesor tiene el Plan Premium activo para destacarlo
  useEffect(() => {
    const planGuardado = localStorage.getItem("plan_profesor") || "Freemium";

    // Para la demo, si el nombre coincide con el tuyo o si el objeto ya viene marcado como destacado
    if (planGuardado === "Premium" && (nombre.includes("Juan Jose") || profesor.isPremium)) {
      setEsPremium(true);
    }
  }, [nombre, profesor]);

  // Maneja el clic en solicitar cerrando el modal de detalles si estuviera abierto
  const handleSolicitarClick = () => {
    setShowModal(false); 
    if (onSolicitar) {
      onSolicitar();
    }
  };

  const displayFoto = foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;

  return (
    <>
      <div
        className={`card h-100 border-0 rounded-4 overflow-hidden shadow-sm hover-shadow position-relative ${esPremium ? "border border-2" : ""
          }`}
        style={{
          borderColor: esPremium ? "#7B1FA2" : "transparent",
          boxShadow: esPremium ? "0 8px 20px rgba(123, 31, 162, 0.15)" : ""
        }}
      >
        {/* INSIGNIA DE PERFIL DESTACADO PARA PLAN PREMIUM */}
        {esPremium && (
          <span
            className="position-absolute top-0 end-0 m-3 badge rounded-pill text-white shadow-sm d-flex align-items-center gap-1 px-3 py-2"
            style={{ background: "linear-gradient(135deg, #7B1FA2 0%, #6824c2ff 100%)", zIndex: 10, fontSize: "0.7rem" }}
          >
            <i className="bi bi-patch-check-fill"></i> Destacado
          </span>
        )}

        <div className="card-body p-4 d-flex flex-column text-center">

          {isTutoria ? (
            <>
              <div className="d-flex align-items-center gap-3 mb-3 text-start">
                <img
                  src={displayFoto}
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`; }}
                  className="rounded-circle border border-2 border-light shadow-sm"
                  style={{ width: "60px", height: "60px", objectFit: "cover" }}
                  alt={nombre}
                />
                <div className="text-start">
                  <h6 className="fw-bold mb-0 text-dark">{nombre}</h6>
                  <small className="text-muted">{departamento}</small>
                  <div className="text-warning small">
                    <i className="bi bi-star-fill me-1"></i>{rating}
                  </div>
                </div>
              </div>
              <div className="mb-3 text-start">
                <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-2 rounded-3">
                  S/. {precioHora}/hora
                </span>
              </div>
              <p className="text-muted small mb-3 text-start" style={{ display: "-webkit-box", WebkitLineClamp: "2", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {descripcion}
              </p>
            </>
          ) : (
            <>
              {/* Foto */}
              <div className="mb-3 position-relative d-inline-block mx-auto">
                <img
                  src={displayFoto}
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`; }}
                  alt={nombre}
                  className="rounded-circle shadow-sm border border-3 mx-auto"
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "cover",
                    borderColor: esPremium ? "#8e28b9ff" : "white"
                  }}
                />
              </div>

              {/* Nombre */}
              <h5 className="fw-bold text-dark mb-1">
                {nombre}
              </h5>

              {/* Curso */}
              <p className="text-muted small mb-1">
                {departamento} | {cursos && cursos.length > 0 ? cursos.join(", ") : curso}
              </p>
              
              {/* Universidad */}
              <p className="text-primary small mb-3 fw-bold" style={{ fontSize: "0.8rem" }}>
                <i className="bi bi-building me-1"></i>
                {universidad}
              </p>

              {/* Rating */}
              <div className="d-flex justify-content-center gap-4 mb-3">
                <div>
                  <span className="d-block fw-bold text-warning">
                    <i className="bi bi-star-fill me-1"></i>
                    {rating}
                  </span>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Rating
                  </small>
                </div>

                <div>
                  <span className="d-block fw-bold text-info">
                    <i className="bi bi-bar-chart-fill me-1"></i>
                    {dificultad}/10
                  </span>
                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                    Dificultad
                  </small>
                </div>
              </div>

              {/* Tags */}
              <div className="d-flex flex-wrap justify-content-center gap-1 mb-4">
                {etiquetas.map((tag, index) => (
                  <span
                    key={index}
                    className="badge bg-light text-indigo border rounded-pill px-2 py-1"
                    style={{ fontSize: "0.65rem" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Precio */}
              {showPrice && (
                <div className="mb-3">
                  <span
                    className="badge text-bg-success w-100 p-2 rounded-3"
                    style={{ fontSize: "0.95rem" }}
                  >
                    S/. {precioHora}/hora
                  </span>
                </div>
              )}
            </>
          )}

          {/* Botones */}
          <div className="d-grid gap-2 mt-auto">
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-outline-indigo btn-sm rounded-pill fw-bold py-2"
            >
              Ver Perfil
            </button>

            {/* CORREGIDO: onClick enlazado a la función controladora de solicitudes */}
            <button
              className="btn btn-sm rounded-pill fw-bold py-2 text-white border-0 hover-shadow"
              style={{
                background: "linear-gradient(135deg, #4b1083ff 0%, #7a2baffd 100%)"
              }}
              onClick={() => {
                if (onSolicitar) {
                  onSolicitar(profesor);
                } else {
                  if (cursos && cursos.length > 1) {
                    setShowModal(true);
                  } else {
                    const cursoTarget = cursos && cursos.length > 0 ? (cursos[0].nombre || cursos[0]) : curso;
                    navigate("/tutorias-estudiante", { state: { cursoSeleccionado: cursoTarget } });
                  }
                }
              }}
            >
              Solicitar
            </button>
          </div>
        </div>
      </div>

      {/* --- MODAL DE PERFIL  */}
      {showModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,0.7)", zIndex: 1060 }}
        >
          <div
            className="bg-white rounded-4 shadow-lg overflow-hidden d-flex flex-column"
            style={{ width: "95%", maxWidth: "800px", maxHeight: "90vh", animation: "fadeInUp 0.3s ease" }}
          >
            {/* Header del Modal */}
            <div className="p-4 text-center border-bottom bg-light position-relative">
              <button
                onClick={() => setShowModal(false)}
                className="btn-close position-absolute top-0 end-0 m-3"
              ></button>

              <img
                src={foto}
                className="rounded-circle shadow mb-3 mx-auto"
                style={{
                  width: "110px",
                  height: "110px",
                  objectFit: "cover",
                  border: esPremium ? "4px solid #7B1FA2" : "4px solid white"
                }}
                alt={nombre}
              />
              <h4 className="fw-bold text-dark mb-0">
                {nombre} {esPremium && "⭐"}
              </h4>
              <p className="text-indigo fw-bold small mb-0">{departamento}</p>
            </div>

            {/* Contenido del Modal */}
            <div className="p-4 flex-grow-1" style={{ overflowY: "auto" }}>

              {/* Información Institucional & Stat Cards */}
              <div className="row g-3 mb-4 text-center">
                <div className="col-12 mb-2 text-start">
                  {universidad && <span className="badge bg-light text-dark border me-2"><i className="bi bi-building me-1"></i> {universidad}</span>}
                  {modalidades?.map(m => <span key={m} className="badge bg-light text-primary border me-2">{m}</span>)}
                </div>
                <div className="col-6">
                  <div className="p-3 bg-light rounded-4 shadow-sm border border-white h-100 d-flex flex-column justify-content-center">
                    <h3 className="fw-bold text-success mb-0">
                      {(!metricas?.estudiantesAtendidos || metricas.estudiantesAtendidos === 0) ? 'N/A' : `${metricas?.tasaAprobacion || 0}%`}
                    </h3>
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.65rem', lineHeight: '1' }}>Tasa Aprobación</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 bg-light rounded-4 shadow-sm border border-white h-100 d-flex flex-column justify-content-center">
                    <h3 className="fw-bold text-indigo mb-0">{metricas?.estudiantesAtendidos || 0}</h3>
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.65rem', lineHeight: '1' }}>Estudiantes Atendidos</small>
                  </div>
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-lg-6 text-start mb-4 mb-lg-0">
                  <h6 className="fw-bold text-indigo border-bottom pb-2">Sobre el Profesor</h6>
                  <p className="text-muted small mb-3">{descripcion || "Sin descripción disponible."}</p>

                  <h6 className="fw-bold text-indigo border-bottom pb-2">Metodología</h6>
                  <p className="text-muted small mb-3">{metodologia || "Basada en casos prácticos y teoría aplicada."}</p>

                  {reconocimientos && reconocimientos.length > 0 && (
                    <>
                      <h6 className="fw-bold text-indigo border-bottom pb-2">Reconocimientos y Logros</h6>
                      <ul className="text-muted small ps-3 mb-0">
                        {reconocimientos.map((r, i) => <li key={i} className="mb-1">{r}</li>)}
                      </ul>
                    </>
                  )}
                </div>

                <div className="col-lg-6">
                  {/* Radar Chart */}
                  {criteriosEvaluacion && (
                    <div className="bg-light p-3 rounded-4 shadow-sm h-100 d-flex flex-column align-items-center justify-content-center border border-white">
                      <h6 className="fw-bold text-center mb-2 small text-dark">Desempeño Cualitativo</h6>
                      <div style={{ width: '100%', maxWidth: '260px', margin: '0 auto' }}>
                        <Radar
                          data={{
                            labels: ['Puntualidad', 'Claridad', 'Dominio', 'Profesionalismo', 'Exigencia', 'Disponibilidad'],
                            datasets: [{
                              label: 'Puntuación (1-5)',
                              data: [
                                criteriosEvaluacion.Puntualidad,
                                criteriosEvaluacion.Claridad,
                                criteriosEvaluacion.Dominio,
                                criteriosEvaluacion.Profesionalismo,
                                criteriosEvaluacion.Exigencia,
                                criteriosEvaluacion.Disponibilidad
                              ],
                              backgroundColor: 'rgba(123, 31, 162, 0.2)',
                              borderColor: 'rgba(123, 31, 162, 1)',
                              borderWidth: 2,
                              pointBackgroundColor: 'rgba(233, 30, 99, 1)',
                              pointBorderColor: '#fff',
                              pointHoverBackgroundColor: '#fff',
                              pointHoverBorderColor: 'rgba(233, 30, 99, 1)'
                            }]
                          }}
                          options={{
                            scales: {
                              r: {
                                angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                                pointLabels: { font: { size: 9, weight: 'bold' }, color: '#495057' },
                                ticks: { min: 0, max: 5, stepSize: 1, display: false }
                              }
                            },
                            plugins: { legend: { display: false } },
                            maintainAspectRatio: true
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Horarios Disponibles */}
              {horarios && (
                <div className="mb-4 text-start">
                  <h6 className="fw-bold text-indigo border-bottom pb-2">Horarios de Disponibilidad Habitual</h6>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {Object.entries(horarios).map(([dia, horas]) => (
                      <div key={dia} className="border rounded-3 p-2 bg-light shadow-sm flex-grow-1 text-center">
                        <strong className="d-block text-dark small mb-1">{dia}</strong>
                        {horas.map((h, i) => <span key={i} className="badge bg-white text-secondary border me-1 mb-1 shadow-sm">{h}</span>)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cursos Extra (Si los tiene) */}
              {cursos && cursos.length > 1 && (
                <div className="mb-4 text-start">
                  <h6 className="fw-bold text-indigo border-bottom pb-2">Cursos que dicta</h6>
                  <div className="d-flex flex-column gap-2 mt-2">
                    {cursos.map((c, idx) => {
                      const nombreCurso = typeof c === 'object' ? c.nombre : c;
                      const p_curso = typeof c === 'object' && c.precio ? c.precio : precioHora;
                      const r_curso = typeof c === 'object' && c.rating ? c.rating : rating;
                      return (
                      <div key={idx} className="border rounded-3 p-3 bg-white shadow-sm d-flex justify-content-between align-items-center">
                        <div>
                          <strong className="d-block text-dark">{nombreCurso}</strong>
                          <small className="text-muted">S/. {p_curso}/h | ⭐ {r_curso} | 📊 {dificultad}/10</small>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-primary rounded-pill fw-bold"
                          onClick={() => {
                            setShowModal(false);
                            const cursoTarget = c.nombre || c;
                            if (onSolicitar) onSolicitar({ ...profesor, curso: cursoTarget });
                            else navigate("/tutorias-estudiante", { state: { cursoSeleccionado: cursoTarget } });
                          }}
                        >
                          Solicitar
                        </button>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reseñas Destacadas */}
              <div className="mb-2 text-start">
                <h6 className="fw-bold text-indigo border-bottom pb-2">Reseñas Destacadas</h6>
                {resenasDestacadas && resenasDestacadas.length > 0 ? (
                  <div className="d-flex flex-column gap-3 mt-3 pe-2" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {resenasDestacadas.map((r, i) => (
                      <div key={i} className="bg-light p-3 rounded-4 shadow-sm border border-white position-relative">
                        <div className="d-flex align-items-center mb-2">
                          <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-2" style={{ width: '35px', height: '35px', fontSize: '0.8rem' }}>
                            {r.estudiante.charAt(0)}
                          </div>
                          <div>
                            <strong className="d-block text-dark" style={{ fontSize: '0.85rem' }}>{r.estudiante}</strong>
                            <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>{r.curso || "General"} • {r.fecha && String(r.fecha).includes('T') ? new Date(r.fecha).toLocaleDateString() : r.fecha}</small>
                          </div>
                          <div className="ms-auto text-warning fw-bold" style={{ fontSize: '0.8rem' }}>
                            <i className="bi bi-star-fill"></i> {r.estrellas_calculadas || rating}
                          </div>
                        </div>
                        <p className="text-muted mb-0 fst-italic" style={{ fontSize: '0.8rem' }}>"{r.comentario}"</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mt-2">Este profesor aún no tiene reseñas.</p>
                )}
              </div>
            </div>

            <div className="p-3 border-top d-flex gap-2 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-light rounded-pill w-100 fw-bold"
              >
                Cerrar
              </button>
              <button
                className="btn btn-primary rounded-pill w-100 fw-bold border-0 hover-shadow"
                style={{ background: "linear-gradient(135deg, #7B1FA2 0%, #403fa0ff 100%)" }}
                onClick={() => {
                  setShowModal(false);
                  if (onSolicitar) {
                    onSolicitar(profesor);
                  } else {
                    navigate("/tutorias-estudiante", { state: { profesorCursos: cursos } });
                  }
                }}
              >
                Solicitar Tutoría
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}