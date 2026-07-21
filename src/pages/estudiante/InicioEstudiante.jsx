import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

export default function InicioEstudiante() {
  const [userName, setUserName] = useState("Estudiante");
  const navigate = useNavigate();

  const [sesionesCompletadas, setSesionesCompletadas] = useState([]);
  const [sesionesConfirmadas, setSesionesConfirmadas] = useState([]);
  const [horasTotales, setHorasTotales] = useState(0);
  const [distribucionMaterias, setDistribucionMaterias] = useState([]);
  const [mapaCalor, setMapaCalor] = useState([]);
  const [profesoresFrecuentes, setProfesoresFrecuentes] = useState([]);
  const [insignias, setInsignias] = useState([]);
  const [sugerenciaObjetivo, setSugerenciaObjetivo] = useState("");

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession"));
    if (session && session.email) {
      const namePart = session.nombres || session.email.split('@')[0];
      setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
    }
    if (session && session.id) {
      cargarDatosDesdeBackend(session.id);
    }
  }, []);

  const cargarDatosDesdeBackend = async (estudianteId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sesiones/estudiante/${estudianteId}`);
      if (!res.ok) return;
      const inscripciones = await res.json();

      // Convertir a formato interno
      const sesiones = inscripciones.map(insc => {
        const start = new Date(insc.fecha_hora_inicio + 'Z');
        const end = new Date(insc.fecha_hora_fin + 'Z');
        const durHoras = ((end - start) / (1000 * 60 * 60));
        let estado = "Confirmada";
        if (insc.estado_sesion === "Finalizada") estado = "Completada";
        else if (insc.estado_inscripcion === "Cancelado" || insc.estado_sesion === "Cancelada") estado = "Cancelada";
        return {
          id: insc.inscripcion_id,
          sesionId: insc.sesion_id,
          curso: insc.curso_nombre,
          profesorId: insc.profesor_id,
          profesorNombre: insc.profesor_nombre,
          foto: "https://i.pravatar.cc/150?img=11",
          fechaHora: insc.fecha_hora_inicio + 'Z',
          duracionEstimada: durHoras,
          estado
        };
      });

      procesarDatos(sesiones);
    } catch (err) {
      console.error("Error cargando datos del estudiante:", err);
    }
  };

  const procesarDatos = (sesiones) => {
    const completadas = sesiones.filter(s => s.estado === "Completada");
    const confirmadas = sesiones.filter(s => s.estado === "Confirmada");

    confirmadas.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

    setSesionesCompletadas(completadas);
    setSesionesConfirmadas(confirmadas);
    setHorasTotales(completadas.length);

    // Distribución por materias
    const conteoMaterias = {};
    completadas.forEach(s => {
      conteoMaterias[s.curso] = (conteoMaterias[s.curso] || 0) + 1;
    });

    const distribucionArray = Object.keys(conteoMaterias).map(curso => ({
      curso,
      horas: conteoMaterias[curso],
      porcentaje: Math.round((conteoMaterias[curso] / completadas.length) * 100) || 0
    })).sort((a, b) => b.horas - a.horas);
    setDistribucionMaterias(distribucionArray);

    // Mapa de Calor (Dias de la semana)
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const conteoDias = [0, 0, 0, 0, 0, 0, 0];
    completadas.forEach(s => {
      const d = new Date(s.fechaHora).getDay();
      conteoDias[d]++;
    });
    setMapaCalor(dias.map((d, i) => ({ dia: d, count: conteoDias[i] })));

    // Profesores frecuentes
    const conteoProfes = {};
    completadas.forEach(s => {
      if (!conteoProfes[s.profesorId]) {
        conteoProfes[s.profesorId] = { count: 0, nombre: s.profesorNombre, foto: s.foto };
      }
      conteoProfes[s.profesorId].count++;
    });
    const profesArray = Object.keys(conteoProfes)
      .map(id => conteoProfes[id])
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    setProfesoresFrecuentes(profesArray);

    // Insignias
    const nuevasInsignias = [];
    if (completadas.length >= 1) nuevasInsignias.push({ icon: "🚀", titulo: "Primer Paso", desc: "Primera tutoría completada" });
    if (completadas.length >= 10) nuevasInsignias.push({ icon: "🏆", titulo: "10 Horas", desc: "Has estudiado 10 horas" });
    if (distribucionArray.length >= 3) nuevasInsignias.push({ icon: "🧠", titulo: "Multidisciplinario", desc: "Exploraste 3+ materias" });
    setInsignias(nuevasInsignias);

    // Objetivo
    if (distribucionArray.length > 0) {
      const ultimaMateria = distribucionArray[distribucionArray.length - 1].curso;
      const frases = [
        `Refuerza tus conocimientos en ${ultimaMateria}. ¡Agenda una sesión pronto!`,
        `¿Listo para dominar ${ultimaMateria}? ¡Tus tutores te esperan!`,
        `Sigue brillando en ${ultimaMateria}. ¡Reserva tu próxima tutoría!`,
        `¡Excelente ritmo! Un repaso de ${ultimaMateria} te vendría genial hoy.`
      ];
      setSugerenciaObjetivo(frases[Math.floor(Math.random() * frases.length)]);
    } else {
      setSugerenciaObjetivo("¡Empieza explorando materias nuevas en el buscador!");
    }
  };

  const getHeatmapColor = (count) => {
    if (count === 0) return "#ebedf0";
    if (count === 1) return "#9be9a8";
    if (count === 2) return "#40c463";
    if (count === 3) return "#30a14e";
    return "#216e39";
  };

  return (
    <div className="main-layout">
      <Sidebar role="estudiante" />

      <main className="dashboard-content bg-light bg-opacity-50">

        {/* Cabecera */}
        <header className="mb-4 d-flex justify-content-between align-items-end">
          <div>
            <h2 className="fw-bold text-indigo mb-1">Tu Progreso Académico</h2>
            <p className="text-muted mb-0">Revisa tus estadísticas y próximos objetivos, {userName}.</p>
          </div>
          <Link to="/tutorias-estudiante" className="btn btn-primary fw-bold shadow-sm rounded-pill px-4">
            <i className="bi bi-calendar-plus me-2"></i>Agendar
          </Link>
        </header>

        <div className="row g-4 mb-4">
          {/* Widget de Horas Totales */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-4" style={{ background: "linear-gradient(135deg, #493774 0%, #6b51a3 100%)", color: "white" }}>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="bg-white bg-opacity-25 rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                  <i className="bi bi-clock-history fs-4"></i>
                </div>
                <span className="badge bg-white text-primary">Este Ciclo</span>
              </div>
              <h1 className="fw-bold mb-0 display-4">{horasTotales} <span className="fs-5 text-white-50">hrs</span></h1>
              <p className="mb-0 mt-2 small opacity-75">
                {horasTotales > 0 ? "¡Excelente ritmo de estudio continuo!" : "Aún no tienes horas registradas."}
              </p>
            </div>
          </div>

          {/* Distribución por Materias */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-4 bg-white">
              <h6 className="fw-bold text-dark mb-3">Distribución por Materias</h6>
              {distribucionMaterias.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {distribucionMaterias.slice(0, 3).map((item, idx) => (
                    <div key={idx}>
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="fw-bold">{item.curso}</span>
                        <span className="text-muted">{item.horas}h ({item.porcentaje}%)</span>
                      </div>
                      <div className="progress" style={{ height: "6px" }}>
                        <div className="progress-bar bg-info" style={{ width: `${item.porcentaje}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted my-auto py-3 small">
                  Completa tutorías para ver tu distribución.
                </div>
              )}
            </div>
          </div>

          {/* Próximas Tutorías (Widget Rápido) */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-4 bg-white">
              <div className="d-flex justify-content-between mb-3">
                <h6 className="fw-bold text-dark mb-0">Próximas Sesiones</h6>
                <Link to="/tutorias-estudiante" className="text-primary small text-decoration-none">Ver todas</Link>
              </div>
              {sesionesConfirmadas.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {sesionesConfirmadas.slice(0, 2).map(tut => (
                    <div key={tut.id} className="p-2 border border-primary border-opacity-25 rounded-3 bg-primary bg-opacity-10 d-flex gap-2 align-items-center">
                      <div className="bg-white rounded px-2 py-1 text-center shadow-sm" style={{ minWidth: '45px' }}>
                        <small className="d-block fw-bold text-primary" style={{ fontSize: '0.7rem' }}>{new Date(tut.fechaHora).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</small>
                        <strong className="d-block text-dark lh-1">{new Date(tut.fechaHora).getDate()}</strong>
                      </div>
                      <div className="overflow-hidden">
                        <small className="fw-bold d-block text-truncate text-dark">{tut.curso}</small>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(tut.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tut.profesorNombre}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted my-auto py-3 small">
                  No tienes sesiones agendadas próximas.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Mapa de Calor y Sugerencias */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-4 bg-white">
              <h6 className="fw-bold text-dark mb-3">Intensidad de Estudio (Días de la Semana)</h6>
              <div className="d-flex gap-2 justify-content-around bg-light p-3 rounded-4">
                {mapaCalor.map((dia, idx) => (
                  <div key={idx} className="text-center">
                    <div
                      className="rounded mb-1 mx-auto shadow-sm"
                      style={{
                        width: "30px", height: "30px",
                        backgroundColor: getHeatmapColor(dia.count),
                        border: "1px solid rgba(27,31,35,0.06)"
                      }}
                      title={`${dia.count} sesiones`}
                    ></div>
                    <small className="text-muted" style={{ fontSize: "0.7rem" }}>{dia.dia}</small>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-end small text-muted">
                <span className="me-2">Menos</span>
                <span className="d-inline-block rounded me-1" style={{ width: '12px', height: '12px', background: '#ebedf0' }}></span>
                <span className="d-inline-block rounded me-1" style={{ width: '12px', height: '12px', background: '#9be9a8' }}></span>
                <span className="d-inline-block rounded me-1" style={{ width: '12px', height: '12px', background: '#40c463' }}></span>
                <span className="d-inline-block rounded me-1" style={{ width: '12px', height: '12px', background: '#30a14e' }}></span>
                <span className="d-inline-block rounded me-2" style={{ width: '12px', height: '12px', background: '#216e39' }}></span>
                <span>Más</span>
              </div>
            </div>

            {/* Sugerencias Dinámicas */}
            <div className="card border-0 shadow-sm rounded-4 p-4 border-start border-4 border-warning bg-white">
              <div className="d-flex gap-3 align-items-center">
                <div className="bg-warning bg-opacity-25 p-3 rounded-circle text-warning fs-3">
                  <i className="bi bi-lightbulb-fill"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Próximos Objetivos</h6>
                  <p className="text-muted mb-0 small">{sugerenciaObjetivo}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Insignias y Profesores */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-4 bg-white">
              <h6 className="fw-bold text-dark mb-3">Tus Insignias</h6>
              {insignias.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {insignias.map((ins, idx) => (
                    <div key={idx} className="d-flex gap-3 align-items-center bg-light p-2 rounded-3 border">
                      <div className="fs-3">{ins.icon}</div>
                      <div>
                        <strong className="d-block text-dark small lh-1">{ins.titulo}</strong>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>{ins.desc}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted small py-3">
                  Aún no tienes insignias. ¡Empieza a estudiar para ganarlas!
                </div>
              )}
            </div>

            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h6 className="fw-bold text-dark mb-3">Profesores Frecuentes</h6>
              {profesoresFrecuentes.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {profesoresFrecuentes.map((profe, idx) => (
                    <div key={idx} className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <img src={profe.foto} className="rounded-circle" width="35" height="35" style={{ objectFit: 'cover' }} alt="" />
                        <div>
                          <strong className="d-block text-dark small lh-1">{profe.nombre}</strong>
                          <small className="text-muted" style={{ fontSize: '0.7rem' }}>{profe.count} sesiones</small>
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-primary py-0 px-2"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => navigate("/buscar-estudiante")}
                      >
                        Agendar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted small py-2">
                  Aún no has tenido sesiones con profesores.
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}