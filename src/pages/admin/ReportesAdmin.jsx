import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// IMPORTACIÓN EXPLÍCITA COMPATIBLE CON TU ENTORNO
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale, 
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler 
} from 'chart.js';
import { Bar, Line, Radar } from 'react-chartjs-2';

// Registro manual idéntico al estándar del proyecto
ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ReportesAdmin() {
  const [globalKpis, setGlobalKpis] = useState({
    clases_impartidas: 0,
    alumnos_atendidos: 0,
    calidad_promedio: 0.0,
    mes_actual: "Mes actual",
    volumen_semanas: [0, 0, 0, 0]
  });

  React.useEffect(() => {
    fetch('http://127.0.0.1:8000/api/admin/estadisticas/global_kpis')
      .then(res => res.json())
      .then(data => setGlobalKpis(data))
      .catch(err => console.error("Error cargando KPIs globales:", err));
  }, []);

  const [reporteProfesores, setReporteProfesores] = useState([]);

  React.useEffect(() => {
    fetch('http://127.0.0.1:8000/api/admin/estadisticas/desempeno_profesores')
      .then(res => res.json())
      .then(data => setReporteProfesores(data))
      .catch(err => console.error("Error cargando desempeño de profesores:", err));
  }, []);

  const [filtroFacultad, setFiltroFacultad] = useState("Todas");
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);

  const profesoresFiltrados = filtroFacultad === "Todas" 
    ? reporteProfesores 
    : reporteProfesores.filter(p => p.facultad === filtroFacultad);

  const profesoresParaChart = profesoresFiltrados.filter(p => p.calificacion > 0);
  
  const datosBarras = {
    labels: profesoresParaChart.map(p => p.nombre),
    datasets: [{
      label: 'Calificación Promedio',
      data: profesoresParaChart.map(p => p.calificacion),
      backgroundColor: profesoresParaChart.map(p => p.calificacion >= 4.0 ? '#1F0954' : '#dc3545'),
      borderRadius: 6,
    }],
  };

  const datosLineas = {
    labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4 (Actual)'],
    datasets: [{
      label: 'Volumen de Clases (Plataforma)',
      data: globalKpis.volumen_semanas || [0, 0, 0, 0],
      borderColor: '#1F0954',
      backgroundColor: 'rgba(31, 9, 84, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#1F0954'
    }],
  };

  // CONFIGURACIÓN CORREGIDA: Exclusiva para el gráfico de barras (Límite 5)
  const opcionesGraficoBarras = { 
    responsive: true, 
    maintainAspectRatio: false, 
    plugins: { legend: { display: false } }, 
    scales: { 
      y: { beginAtZero: true, max: 5, grid: { color: 'rgba(0, 0, 0, 0.05)' } }, 
      x: { grid: { display: false } } 
    } 
  };

  // CONFIGURACIÓN CORREGIDA: Exclusiva para el gráfico de líneas (Sin límite máximo)
  const opcionesGraficoLineas = { 
    responsive: true, 
    maintainAspectRatio: false, 
    plugins: { legend: { display: false } }, 
    scales: { 
      y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } }, // <-- Se eliminó el 'max: 5' aquí
      x: { grid: { display: false } } 
    } 
  };

  const generarDatosRadar = (metricas) => ({
    labels: ['Puntualidad', 'Claridad', 'Dominio', 'Profesionalismo', 'Exigencia', 'Disponibilidad'],
    datasets: [{
      label: 'Puntaje de Evaluación (0-5)',
      data: metricas || [0,0,0,0,0,0],
      backgroundColor: 'rgba(31, 9, 84, 0.2)', 
      borderColor: '#1F0954',
      pointBackgroundColor: '#1F0954',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#1F0954',
      borderWidth: 2,
    }]
  });

  const opcionesRadar = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: { 
        angleLines: { color: 'rgba(0, 0, 0, 0.1)' }, 
        grid: { color: 'rgba(0, 0, 0, 0.1)' }, 
        pointLabels: { font: { size: 11, weight: 'bold' }, color: '#6c757d' }, 
        ticks: { min: 0, max: 5, stepSize: 1, display: false } 
      }
    },
    plugins: { legend: { display: false } }
  };

  const descargarPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("ProfeMatch - Reporte de Rendimiento Docente", 14, 22);
      doc.setFontSize(10);
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 30);
      doc.text(`Filtro aplicado: ${filtroFacultad}`, 14, 36);

      const columnas = ["Profesor", "Facultad", "Clases Dictadas", "Alumnos", "Calificación"];
      const filas = profesoresFiltrados.map(p => [p.nombre, p.facultad, p.clasesDadas.toString(), p.alumnosAtendidos.toString(), `${p.calificacion} / 5.0`]);

      autoTable(doc, {
        startY: 45,
        head: [columnas],
        body: filas,
        theme: 'striped',
        headStyles: { fillColor: [31, 9, 84] },
        styles: { fontSize: 9 }
      });
      doc.save(`Reporte_Academico_${filtroFacultad.replace(" ", "_")}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Hubo un error al generar el documento.");
    }
  };

  const cardStyle = { transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", borderRadius: '15px' };
  const handleMouseEnter = (e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 15px rgba(0,0,0,0.1)"; };
  const handleMouseLeave = (e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; };

  return (
    <div className="d-flex">
      <Sidebar role="admin" />

      <div className="container-fluid p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', overflowX: 'hidden' }}>
        
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: '#1F0954' }}>Informes y Estadísticas</h2>
            <p className="text-muted small mb-0">Análisis académico y rendimiento del profesorado.</p>
          </div>
          <button className="btn text-white fw-semibold shadow-sm px-4 d-flex align-items-center gap-2 rounded-pill" style={{ backgroundColor: '#1F0954' }} onClick={descargarPDF}>
            <i className="bi bi-file-earmark-pdf-fill"></i> Exportar a PDF
          </button>
        </div>

        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '15px' }}>
          <div className="card-body p-3 d-flex align-items-center gap-3">
            <span className="fw-bold text-muted small"><i className="bi bi-funnel-fill me-1"></i> Filtros:</span>
            <select className="form-select bg-light border-0 w-auto fw-semibold text-secondary cursor-pointer" value={filtroFacultad} onChange={(e) => setFiltroFacultad(e.target.value)}>
              <option value="Todas">Todas las Facultades</option>
              <option value="Ingeniería">Ingeniería</option>
              <option value="Sistemas">Sistemas</option>
              <option value="Ciencias Básicas">Ciencias Básicas</option>
              <option value="Negocios">Negocios</option>
            </select>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle ms-auto">
              Mostrando: {profesoresFiltrados.length} docentes
            </span>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-4 mb-4 mb-md-0">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <div className="card-body p-3 border-start border-primary border-5 rounded-end">
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Clases Impartidas</span>
                <h3 className="fw-bold text-primary mb-1">{globalKpis.clases_impartidas}</h3>
                <small className="text-muted d-block mt-2">Mes de {globalKpis.mes_actual} (Global)</small>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4 mb-md-0">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <div className="card-body p-3 border-start border-success border-5 rounded-end">
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Alumnos Atendidos</span>
                <h3 className="fw-bold text-success mb-1">{globalKpis.alumnos_atendidos}</h3>
                <small className="text-muted d-block mt-2">Participaciones totales</small>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <div className="card-body p-3 border-start border-warning border-5 rounded-end">
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Calidad Promedio</span>
                <h3 className="fw-bold mb-1" style={{ color: '#D4AF37' }}>{globalKpis.calidad_promedio} <i className="bi bi-star-fill fs-5"></i></h3>
                <small className="text-muted d-block mt-2">Evaluación general docente</small>
              </div>
            </div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-6 mb-4 mb-md-0">
            <div className="card border-0 shadow-sm bg-white p-4 h-100" style={{ borderRadius: '15px' }}>
              <h6 className="fw-bold text-dark mb-3"><i className="bi bi-bar-chart-fill me-2" style={{ color: '#1F0954' }}></i>Rendimiento Docente (Calificación)</h6>
              <div style={{ height: '240px' }}>
                <Bar data={datosBarras} options={opcionesGraficoBarras} />
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm bg-white p-4 h-100" style={{ borderRadius: '15px' }}>
              <h6 className="fw-bold text-dark mb-3"><i className="bi bi-graph-up-arrow me-2" style={{ color: '#1F0954' }}></i>Volumen de Clases (Últimas 4 Semanas)</h6>
              <div style={{ height: '240px' }}>
                <Line data={datosLineas} options={opcionesGraficoLineas} />
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm bg-white" style={{ borderRadius: '15px' }}>
          <div className="card-body p-4">
            <h5 className="fw-bold text-dark mb-3"><i className="bi bi-card-checklist me-2" style={{ color: '#1F0954' }}></i>Desempeño Detallado por Profesor</h5>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light text-secondary">
                  <tr>
                    <th className="ps-3">Profesor</th>
                    <th>Facultad</th>
                    <th>Clases Dictadas</th>
                    <th>Alumnos Impactados</th>
                    <th>Calificación</th>
                    <th className="text-end pe-3">Análisis</th>
                  </tr>
                </thead>
                <tbody>
                  {profesoresFiltrados.length > 0 ? (
                    profesoresFiltrados.map(prof => (
                      <tr key={prof.id} style={{ cursor: 'pointer' }} onClick={() => setProfesorSeleccionado(prof)} title="Clic para ver expediente académico">
                        <td className="ps-3 py-3 fw-bold text-dark">{prof.nombre}</td>
                        <td className="text-muted">{prof.facultad}</td>
                        <td><span className="badge bg-light text-dark border px-2 py-1">{prof.clasesDadas} clases</span></td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold">{prof.alumnosAtendidos}</span>
                            <div className="progress flex-grow-1" style={{ height: "4px", maxWidth: "80px" }}>
                              <div className="progress-bar bg-info" style={{ width: `${(prof.alumnosAtendidos/500)*100}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`fw-bold ${prof.calificacion >= 4.5 ? 'text-success' : prof.calificacion >= 4.0 ? 'text-primary' : 'text-danger'}`}>
                            {prof.calificacion} <i className="bi bi-star-fill"></i>
                          </span>
                        </td>
                        <td className="text-end pe-3">
                          {prof.tendencia === 'sube' && <span className="badge bg-success-subtle text-success"><i className="bi bi-arrow-up"></i> Subiendo</span>}
                          {prof.tendencia === 'mantiene' && <span className="badge bg-secondary-subtle text-secondary"><i className="bi bi-arrow-right"></i> Estable</span>}
                          {prof.tendencia === 'baja' && <span className="badge bg-danger-subtle text-danger"><i className="bi bi-arrow-down"></i> Declive</span>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">No hay datos para esta facultad.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL EXPEDIENTE ACADÉMICO */}
      {profesorSeleccionado && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050, backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px', overflow: 'hidden' }}>
              
              <div className="text-white d-flex justify-content-between align-items-center p-3" style={{ backgroundColor: '#1F0954' }}>
                <h5 className="modal-title fw-bold m-0" style={{ fontSize: '1.1rem' }}>
                  <i className="bi bi-person-badge-fill me-2"></i>Expediente Académico: {profesorSeleccionado.nombre}
                </h5>
                <button type="button" className="btn-close btn-close-white shadow-none m-0" onClick={() => setProfesorSeleccionado(null)}></button>
              </div>

              <div className="modal-body p-0 bg-light" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                
                <div className="row g-0 bg-white border-bottom">
                  <div className="col-md-5 p-4 d-flex flex-column justify-content-center align-items-center border-end">
                    <h1 className="display-3 fw-bold text-dark mb-0">{profesorSeleccionado.calificacion}</h1>
                    <div className="text-warning fs-4 mb-2">
                      {(() => {
                        const r = profesorSeleccionado?.calificacion || 0;
                        const stars = [];
                        for (let i = 1; i <= 5; i++) {
                          if (r >= i) stars.push(<i key={i} className="bi bi-star-fill"></i>);
                          else if (r >= i - 0.5) stars.push(<i key={i} className="bi bi-star-half"></i>);
                          else stars.push(<i key={i} className="bi bi-star"></i>);
                        }
                        return stars;
                      })()}
                    </div>
                    <span className="text-muted small mb-3">Basado en {profesorSeleccionado.resenas?.length || 0} valoraciones</span>
                    
                    <div className="w-100 text-start mt-3">
                      <h6 className="fw-bold text-dark mb-1"><i className="bi bi-mortarboard-fill me-2" style={{ color: '#1F0954' }}></i>Información Académica</h6>
                      <p className="text-muted small mb-3">{profesorSeleccionado.infoAcademica}</p>
                      
                      <h6 className="fw-bold text-dark mb-1"><i className="bi bi-building-fill me-2" style={{ color: '#1F0954' }}></i>Instituciones Asociadas</h6>
                      <div className="d-flex flex-wrap gap-1">
                        {profesorSeleccionado?.universidades?.map((uni, idx) => (
                          <span key={idx} className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">{uni}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-7 p-4">
                    <h6 className="fw-bold text-dark text-center mb-3 text-uppercase" style={{ letterSpacing: '1px' }}>Rendimiento Estructural</h6>
                    <div style={{ height: '250px' }}>
                      <Radar data={generarDatosRadar(profesorSeleccionado?.metricasRadar)} options={opcionesRadar} />
                    </div>
                  </div>
                </div>

                <div className="p-4 row g-4">
                  <div className="col-12 mt-4">
                    <h6 className="fw-bold text-dark mb-3"><i className="bi bi-chat-quote-fill me-2 text-primary"></i>Últimas Reseñas de Alumnos</h6>
                    {profesorSeleccionado?.resenas && profesorSeleccionado.resenas.length > 0 ? (
                      <div className="row">
                        {profesorSeleccionado.resenas.slice(0, 4).map((resena, idx) => (
                          <div key={idx} className="col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100">
                              <div className="card-body p-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="fw-bold text-dark small">{resena.autor}</span>
                                  <span className="text-muted" style={{ fontSize: '0.7rem' }}>{resena.fecha}</span>
                                </div>
                                
                                <div className="d-flex gap-2 mb-2 flex-wrap" style={{ fontSize: '0.7rem' }}>
                                  <span className="text-success"><i className="bi bi-check-circle-fill me-1"></i>Claridad: {resena.criterios.Claridad || 0}/5</span>
                                  <span className="text-warning"><i className="bi bi-lightning-fill me-1"></i>Exigencia: {resena.criterios.Exigencia || 0}/5</span>
                                </div>
                                
                                <p className="mb-0 text-secondary fst-italic" style={{ fontSize: '0.8rem' }}>"{resena.comentario}"</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted small">No hay reseñas recientes registradas.</p>
                    )}
                  </div>
                </div>

              </div>
              <div className="modal-footer border-0 bg-white shadow-sm">
                <button className="btn btn-secondary px-4 fw-semibold rounded-pill w-100" onClick={() => setProfesorSeleccionado(null)}>Cerrar Expediente</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}