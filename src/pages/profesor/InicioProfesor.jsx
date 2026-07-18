import React, { useState, useEffect } from 'react';
import Sidebar from "../../components/Sidebar";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { StorageService } from "../../core/database/StorageService";
import Swal from 'sweetalert2';
import { courseDurations } from "../../data/profesoresData";

// IMPORTACIONES PARA EL GRÁFICO ESTADÍSTICO
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2'; 

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const getErrorMessage = (data) => {
  if (!data) return null;
  if (data.detail) {
    if (Array.isArray(data.detail)) {
      return data.detail.map(err => {
        const campo = err.loc ? err.loc[err.loc.length - 1] : "";
        return `${campo ? campo + ": " : ""}${err.msg}`;
      }).join(", ");
    }
    return data.detail;
  }
  return data.message || data.error;
};

const InicioProfesor = () => {
  const [finanzas, setFinanzas] = useState({
    ingresoBruto: 0,
    comisionPlataforma: 0,
    ingresoNeto: 0,
    ingresosPendientes: 0,
    perdidasCancelacion: 0
  });

  const [historialTransacciones, setHistorialTransacciones] = useState([]);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [graficosData, setGraficosData] = useState({
    barLabels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
    barData: [0, 0, 0, 0],
    lineLabels: ['Mes 1', 'Mes 2', 'Mes 3'],
    lineData: [0, 0, 0]
  });

  const META_CLASES = 10;
  const MONTO_BONO = 15;
  const [totalClasesDictadas, setTotalClasesDictadas] = useState(0);
  const [isMetaAlcanzada, setIsMetaAlcanzada] = useState(false);

  // ESTADO PARA COMPLETAR PERFIL
  const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);
  const [datosPerfil, setDatosPerfil] = useState({
    descripcion: '',
    metodologia: '',
    reconocimientos: '',
    horarios: '',
    cursos: []
  });

  useEffect(() => {
    // Comprobar si es un profesor nuevo
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    if (userSession && (userSession.role === 'profesor' || userSession.rol === 'profesor')) {
      if (userSession.perfil_completado === false || userSession.perfil_completado === 0) {
        setMostrarModalPerfil(true);
      }
    }
  }, []);

  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    const userSession = JSON.parse(localStorage.getItem('userSession'));
    
    if (datosPerfil.cursos.length === 0) {
      Swal.fire('Error', 'Debes seleccionar al menos un curso que dictas.', 'error');
      return;
    }

    const reconocimientosArray = datosPerfil.reconocimientos.split(',').map(r => r.trim()).filter(r => r);
    const horariosObj = { "Lunes a Viernes": [datosPerfil.horarios] };

    const profileData = {
      descripcion: datosPerfil.descripcion,
      metodologia: datosPerfil.metodologia,
      reconocimientos: reconocimientosArray,
      horarios: horariosObj,
      cursos: datosPerfil.cursos
    };

    try {
      // Intentar actualizar en el backend usando el token
      const res = await fetch(`${import.meta.env.VITE_API_URL}/professors/${userSession.id}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userSession.token}`
        },
        body: JSON.stringify(profileData)
      });

      if (res.ok) {
        // Por si acaso, actualizamos el StorageService para mantener compatibilidad 
        // temporal con otras vistas que aún no migran, pero la verdad está en el backend.
        StorageService.saveProfessorProfile({
          nombre: userSession.nombres,
          email: userSession.email,
          ...profileData,
          departamento: "Tutoría General"
        });

        // UPDATE LOCAL STORAGE SO THE MODAL DOES NOT APPEAR AGAIN
        const updatedSession = { 
          ...userSession, 
          perfil_completado: true,
          cursos: profileData.cursos
        };
        localStorage.setItem('userSession', JSON.stringify(updatedSession));

        Swal.fire({
          title: "Perfil Completado",
          text: "Tus datos ahora son visibles para los estudiantes.",
          icon: "success",
          confirmButtonColor: '#3F51B5'
        });
        setMostrarModalPerfil(false);
      } else {
        const errData = await res.json();
        const errorDetail = getErrorMessage(errData);
        Swal.fire('Error', errorDetail || 'Error al guardar el perfil en el servidor', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Problema de conexión con el servidor', 'error');
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const userSession = JSON.parse(localStorage.getItem('userSession'));
        if (!userSession || !userSession.token || (userSession.role !== 'profesor' && userSession.rol !== 'profesor')) {
          return;
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL}/professors/${userSession.id}/dashboard`, {
          headers: {
            "Authorization": `Bearer ${userSession.token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          
          setFinanzas({
            ingresoNeto: data.finanzas.ingresoNeto,
            ingresosPendientes: data.finanzas.ingresosPendientes,
            bono: data.finanzas.bono
          });
          
          setTotalClasesDictadas(data.totalClasesDictadas);
          setIsMetaAlcanzada(data.totalClasesDictadas >= META_CLASES);
          
          setHistorialTransacciones(data.historialTransacciones);
          
          // Guardar graficos dinámicos
          if(data.graficos) {
            setGraficosData(data.graficos);
          }
        }
      } catch (err) {
        console.error("Error obteniendo dashboard del profesor:", err);
      }
    };
    
    fetchDashboardData();
  }, []);

  const porcentajeProgreso = Math.min(((totalClasesDictadas % META_CLASES) / META_CLASES) * 100, 100);
  const ingresoNetoFinal = (finanzas.ingresoNeto || 0) + (finanzas.bono || 0);

  const datosBarras = {
    labels: graficosData.barLabels,
    datasets: [
      {
        label: 'Ingresos Netos (S/.)',
        data: graficosData.barData,
        backgroundColor: '#3F51B5',
        borderRadius: 6,
      },
    ],
  };

  const datosLineas = {
    labels: graficosData.lineLabels,
    datasets: [
      {
        label: 'Evolución de Ganancias (S/.)',
        data: graficosData.lineData,
        borderColor: '#E91E63',
        backgroundColor: 'rgba(233, 30, 99, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#7B1FA2'
      },
    ],
  };

  const opcionesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.03)' } },
      x: { grid: { display: false } }
    }
  };

  const descargarPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("ProfeMatch - Reporte de Ingresos y Contabilidad", 14, 22);
      
      doc.setFontSize(10);
      doc.text(`Fecha de corte: ${new Date().toLocaleDateString()}`, 14, 30);
      const userSession = JSON.parse(localStorage.getItem('userSession'));
      doc.text(`Profesor: ${userSession?.nombres || "Desconocido"}`, 14, 36);

      const columnas = ["Fecha", "Tema", "Curso", "Inscritos", "Precio Alumno", "Neto Docente", "Estado"];
      
      const filas = historialTransacciones.map(t => {
        return [
          String(t.fecha || ""), 
          String(t.tema || ""), 
          String(t.curso || ""), 
          String(t.inscritos || 0), 
          `S/. ${t.precio?.toFixed(2)}`, 
          `S/. ${t.pagoNeto?.toFixed(2)}`, 
          String(t.estado || "")
        ];
      });

      if (finanzas.bono > 0) {
        filas.push(["-", "BONOS ACUMULADOS", "-", "-", "-", `S/. ${finanzas.bono.toFixed(2)}`, "Asignado"]);
      }

      autoTable(doc, {
        startY: 44,
        head: [columnas],
        body: filas,
        theme: 'striped',
        headStyles: { fillColor: [63, 81, 181] },
        styles: { fontSize: 9 }
      });

      doc.save(`Reporte_Financiero_ProfeMatch.pdf`);
    } catch (error) {
      console.error("Error en jsPDF:", error);
      alert("Error al construir el documento PDF.");
    }
  };

  const cardStyle = {
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    borderRadius: '15px'
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.transform = "translateY(-4px)";
    e.currentTarget.style.boxShadow = "0 8px 15px rgba(0,0,0,0.1)";
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className="d-flex">
      <Sidebar role="profesor" />
      
      <div className="container-fluid p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        
        {/* ENCABEZADO */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: '#3F51B5' }}>Dashboard Financiero</h2>
            <p className="text-muted small mb-0">Monitorea tus ingresos reales, comisiones y costos de oportunidad de tu negocio educativo.</p>
          </div>
          <button className="btn text-white fw-semibold shadow-sm px-4 d-flex align-items-center gap-2" style={{ backgroundColor: '#7B1FA2' }} onClick={descargarPDF}>
            <i className="bi bi-printer"></i> Exportar Balance Financiero
          </button>
        </div>

        {/* METAS DE INCENTIVOS */}
        <div className="card border-0 shadow-sm mb-4 p-4" style={{ borderRadius: '15px', backgroundColor: '#ffffff' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <h5 className="fw-bold m-0 text-dark">
                <i className="bi bi-target text-indigo me-2"></i>Meta de Incentivo Mensual
              </h5>
              <p className="text-muted small m-0">Dicta {META_CLASES} clases completas en el ciclo y recibe un bono de excelencia docente.</p>
            </div>
            <span className={`badge px-3 py-2 fs-6 fw-bold d-flex align-items-center gap-1 ${isMetaAlcanzada ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
              <i className={`bi ${isMetaAlcanzada ? 'bi-check-circle-fill' : 'bi-hourglass-split'}`}></i>
              {isMetaAlcanzada ? 'Bono Activado' : 'En Progreso'}
            </span>
          </div>

          <div className="row align-items-center my-3">
            <div className="col-md-9">
              <div className="progress" style={{ height: '22px', borderRadius: '12px', backgroundColor: '#E0E0E0' }}>
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                  role="progressbar" 
                  style={{ width: `${porcentajeProgreso}%`, borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}
                >
                  {Math.round(porcentajeProgreso)}%
                </div>
              </div>
            </div>
            <div className="col-md-3 text-end">
              <span className="fw-bold fs-5 text-dark">{totalClasesDictadas}</span> 
              <span className="text-muted"> / {META_CLASES} Clases</span>
            </div>
          </div>

          <div className="p-2 px-3 bg-light rounded d-flex justify-content-between align-items-center" style={{ fontSize: '0.85rem' }}>
            <span className="text-secondary fw-semibold">
              <i className="bi bi-info-circle me-1"></i> Recompensa extra acumulada (bonos ganados):
            </span>
            <span className="fw-bold text-success fs-6">+ S/. {(finanzas.bono || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-6 mb-4">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <div className="card-body p-3 border-start border-success border-5 rounded-end">
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Ingreso Neto (+ Bonos)</span>
                <h3 className="fw-bold text-success mb-1">S/. {ingresoNetoFinal.toFixed(2)}</h3>
                <small className="text-muted d-block mt-2">Clases: S/. {(finanzas.ingresoNeto || 0).toFixed(2)}</small>
                <small className="text-success-subtle bg-success px-2 py-0.5 rounded text-white" style={{ fontSize: '0.7rem' }}>Bonos acumulados: S/. {(finanzas.bono || 0).toFixed(2)}</small>
              </div>
            </div>
          </div>

          <div className="col-md-6 mb-4">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <div className="card-body p-3 border-start border-primary border-5 rounded-end">
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Proyección Próxima</span>
                <h3 className="fw-bold text-primary mb-1">S/. {(finanzas.ingresosPendientes || 0).toFixed(2)}</h3>
                <small className="text-muted d-block mt-2">Basado en reservas pendientes (Sesiones Programadas)</small>
              </div>
            </div>
          </div>
        </div>

        {/* GRAFICOS */}
        <div className="row mb-4">
          <div className="col-md-6 mb-3">
            <div className="card border-0 shadow-sm bg-white p-4" style={{ borderRadius: '15px' }}>
              <h6 className="fw-bold text-dark mb-3">
                <i className="bi bi-bar-chart-line-fill text-indigo me-2"></i>Ingresos Semanales (Mes Actual)
              </h6>
              <div style={{ height: '220px' }}>
                <Bar data={datosBarras} options={opcionesGrafico} />
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-3">
            <div className="card border-0 shadow-sm bg-white p-4" style={{ borderRadius: '15px' }}>
              <h6 className="fw-bold text-dark mb-3">
                <i className="bi bi-graph-up-arrow text-danger me-2"></i>Tendencia de Ingresos (Últimos 3 Meses)
              </h6>
              <div style={{ height: '220px' }}>
                <Line data={datosLineas} options={opcionesGrafico} />
              </div>
            </div>
          </div>
        </div>

        {/* HISTORIAL DETALLADO */}
        <div className="card border-0 shadow-sm bg-white" style={{ borderRadius: '15px' }}>
          <div className="card-body p-4">
            
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-journal-text text-indigo"></i> Historial de Transacciones Contables
              </h5>
              <button className="btn btn-sm btn-outline-secondary px-3 d-flex align-items-center gap-2" onClick={() => setMostrarCalendario(true)}>
                <i className="bi bi-calendar3"></i> Ver Calendario de Cobros
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light text-secondary">
                  <tr>
                    <th>Fecha</th>
                    <th>Tema</th>
                    <th>Curso</th>
                    <th>Inscritos</th>
                    <th>Precio Alumno</th>
                    <th>Neto Docente</th>
                    <th className="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historialTransacciones.length > 0 ? historialTransacciones.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 text-muted fw-medium">{t.fecha}</td>
                      <td className="py-2 text-dark fw-bold text-truncate" style={{ maxWidth: '180px' }} title={t.tema}>{t.tema}</td>
                      <td className="py-2 text-muted text-truncate" style={{ maxWidth: '120px' }} title={t.curso}>{t.curso}</td>
                      <td className="py-2 text-dark">{t.inscritos || 0}</td>
                      <td className="py-2 text-muted">S/. {t.precio?.toFixed(2)}</td>
                      <td className="py-2 text-success fw-bold">S/. {t.pagoNeto?.toFixed(2)}</td>
                      <td className="py-2 text-center">
                        <span className={`badge px-2 py-1 rounded ${t.estado === 'Finalizada' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                          {t.estado}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">No tienes sesiones finalizadas aún.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* MODAL CALENDARIO */}
        {mostrarCalendario && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                
                <div 
                  className="text-white d-flex justify-content-between align-items-center p-3" 
                  style={{ 
                    backgroundColor: '#3F51B5',
                    background: '#3F51B5'
                  }}
                >
                  <h5 className="modal-title fw-bold m-0 d-flex align-items-center gap-2" style={{ fontSize: '1.1rem' }}>
                    <i className="bi bi-calendar-event"></i> Calendario Académico de Estados
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white shadow-none m-0" 
                    onClick={() => setMostrarCalendario(false)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <table className="table table-hover border mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Estado Control</th>
                        <th>Color Muestra</th>
                        <th>Significado Financiero</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="fw-medium">Confirmada / Dictada</td>
                        <td><span className="badge px-3 py-1 bg-success text-white">Verde</span></td>
                        <td>Tutoría completada con éxito. Liquidación liberada.</td>
                      </tr>
                      <tr>
                        <td className="fw-medium">Pendiente de Confirmación</td>
                        <td><span className="badge px-3 py-1 bg-warning text-dark">Amarillo</span></td>
                        <td>Horas reservadas. Ingreso proyectado en espera.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="modal-footer border-0 bg-light">
                  <button className="btn btn-secondary px-4 fw-semibold" onClick={() => setMostrarCalendario(false)}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL COMPLETAR PERFIL (PARA NUEVOS PROFESORES) */}
        {mostrarModalPerfil && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
                <div className="modal-header bg-indigo text-white" style={{ backgroundColor: '#3F51B5' }}>
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-person-lines-fill me-2"></i>Completa tu Perfil
                  </h5>
                </div>
                <form onSubmit={handleGuardarPerfil}>
                  <div className="modal-body p-4">
                    <div className="alert alert-info border-0 bg-info-subtle text-info-emphasis rounded-3">
                      <i className="bi bi-info-circle-fill me-2"></i>
                      Como profesor nuevo, necesitamos algunos datos para mostrarlos a los estudiantes. Puedes llenarlo ahora o más tarde.
                    </div>
                    
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-bold small">Sobre Mí (Descripción)</label>
                        <textarea className="form-control bg-light" rows="2" placeholder="Ej: Especialista en desarrollo web..." value={datosPerfil.descripcion} onChange={e => setDatosPerfil({...datosPerfil, descripcion: e.target.value})} required></textarea>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold small">Metodología</label>
                        <input type="text" className="form-control bg-light" placeholder="Ej: Aprendizaje basado en proyectos..." value={datosPerfil.metodologia} onChange={e => setDatosPerfil({...datosPerfil, metodologia: e.target.value})} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-bold small">Cursos que dictas (Selecciona uno o varios)</label>
                        <div className="d-flex flex-wrap gap-3 mt-1 bg-light p-3 rounded border">
                          {Object.keys(courseDurations).map(curso => (
                            <div key={curso} className="form-check">
                              <input 
                                className="form-check-input" 
                                type="checkbox" 
                                id={`curso-${curso}`}
                                checked={datosPerfil.cursos.includes(curso)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setDatosPerfil({...datosPerfil, cursos: [...datosPerfil.cursos, curso]});
                                  } else {
                                    setDatosPerfil({...datosPerfil, cursos: datosPerfil.cursos.filter(c => c !== curso)});
                                  }
                                }}
                              />
                              <label className="form-check-label small" htmlFor={`curso-${curso}`}>
                                {curso}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold small">Reconocimientos (Separados por coma)</label>
                        <input type="text" className="form-control bg-light" placeholder="Ej: Premio Excelencia 2023, Certificación AWS..." value={datosPerfil.reconocimientos} onChange={e => setDatosPerfil({...datosPerfil, reconocimientos: e.target.value})} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold small">Horarios Habituales</label>
                        <input type="text" className="form-control bg-light" placeholder="Ej: 16:00 - 20:00" value={datosPerfil.horarios} onChange={e => setDatosPerfil({...datosPerfil, horarios: e.target.value})} required />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer bg-light border-0">
                    <button type="button" className="btn btn-outline-secondary rounded-pill px-4 fw-bold" onClick={() => setMostrarModalPerfil(false)}>
                      Llenar más tarde
                    </button>
                    <button type="submit" className="btn text-white rounded-pill px-4 fw-bold shadow-sm" style={{ backgroundColor: '#3F51B5' }}>
                      Guardar Perfil
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InicioProfesor;