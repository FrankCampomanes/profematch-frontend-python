import React, { useState, useEffect } from 'react';
import Sidebar from "../../components/Sidebar";
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; 

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2'; 

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

const InicioAdmin = () => {
  const [finanzas, setFinanzas] = useState({
    ingresoNetoTotal: 0,
    comisiones: 0,
    suscripciones: 0
  });

  const [moderacion, setModeracion] = useState({
    quejasPendientes: 0,
    usuariosRiesgo: 0
  });

  const [ingresosSemanales, setIngresosSemanales] = useState([0, 0, 0, 0]);
  const [saludComunidad, setSaludComunidad] = useState({ excelente: 0, bueno: 0, regular: 0, critico: 0 });
  const [historialAuditoria, setHistorialAuditoria] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);

  const cargarDashboard = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/admin`);
      if (!res.ok) throw new Error('Error al obtener el dashboard');
      const data = await res.json();

      setFinanzas(data.finanzas);
      setModeracion(data.moderacion);
      setIngresosSemanales(data.ingresosSemanales);
      setSaludComunidad(data.saludComunidad);
      setHistorialAuditoria(data.historialAuditoria);
    } catch (error) {
      console.error('Error cargando el dashboard admin:', error);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  const aplicarSancion = async (caso) => {
    const confirmacion = await Swal.fire({
      title: '¿Aplicar sanción?',
      html: `Se restarán <b>30 puntos</b> de score de confiabilidad a <b>${caso.acusado}</b>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, sancionar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D32F2F'
    });
    if (!confirmacion.isConfirmed) return;

    setProcesandoId(caso.id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/quejas/${caso.id}/sancionar`, {
        method: 'PUT'
      });
      if (!res.ok) throw new Error('Error al aplicar la sanción');

      Swal.fire({
        title: 'Sanción aplicada',
        text: `Se le restaron 30 puntos a ${caso.acusado}.`,
        icon: 'success',
        confirmButtonColor: '#1F0954'
      });

      await cargarDashboard();
    } catch (error) {
      console.error('Error al sancionar:', error);
      Swal.fire('Error', 'No se pudo aplicar la sanción. Intenta de nuevo.', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const desestimarCaso = async (caso) => {
    const confirmacion = await Swal.fire({
      title: '¿Desestimar caso?',
      text: `La queja contra ${caso.acusado} se cerrará sin aplicar penalidad.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, desestimar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1F0954'
    });
    if (!confirmacion.isConfirmed) return;

    setProcesandoId(caso.id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/quejas/${caso.id}/desestimar`, {
        method: 'PUT'
      });
      if (!res.ok) throw new Error('Error al desestimar');

      Swal.fire({
        title: 'Caso desestimado',
        icon: 'success',
        confirmButtonColor: '#1F0954'
      });

      await cargarDashboard();
    } catch (error) {
      console.error('Error al desestimar:', error);
      Swal.fire('Error', 'No se pudo desestimar el caso. Intenta de nuevo.', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const datosBarras = {
    labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
    datasets: [
      {
        label: 'Ingresos Plataforma (S/.)',
        data: ingresosSemanales,
        backgroundColor: '#1F0954', // Color corporativo principal
        borderRadius: 6,
      },
    ],
  };

  const datosDistribucion = {
    labels: ['Excelente (90-100)', 'Bueno (70-89)', 'Regular (50-69)', 'Crítico (0-49)'],
    datasets: [
      {
        data: [saludComunidad.excelente, saludComunidad.bueno, saludComunidad.regular, saludComunidad.critico],
        backgroundColor: ['#198754', '#ffc107', '#fd7e14', '#dc3545'],
        borderWidth: 0,
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

  const opcionesDoughnut = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    cutout: '75%'
  };

  const descargarPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("ProfeMatch - Reporte Gerencial de Administración", 14, 22);
      doc.setFontSize(10);
      doc.text(`Fecha de corte: ${new Date().toLocaleDateString()}`, 14, 30);
      doc.text(`Ingreso Total de la Plataforma: S/. ${finanzas.ingresoNetoTotal.toFixed(2)}`, 14, 46);
      doc.save(`Reporte_Gerencial_ProfeMatch.pdf`);
    } catch (error) {
      console.error("Error en jsPDF:", error);
      alert("Error al construir el documento PDF.");
    }
  };

  const cardStyle = {
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    borderRadius: '15px',
    cursor: 'pointer'
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
      <Sidebar role="admin" />
      
      <div className="container-fluid p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', overflowX: 'hidden' }}>
        
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: '#1F0954' }}>Centro de Comando Administrativo</h2>
            <p className="text-muted small mb-0">Monitorea los ingresos de la plataforma y el comportamiento de la comunidad.</p>
          </div>
          <button className="btn text-white fw-semibold shadow-sm px-4 d-flex align-items-center gap-2" style={{ backgroundColor: '#1F0954' }} onClick={descargarPDF}>
            <i className="bi bi-file-earmark-pdf-fill"></i> Exportar Reporte
          </button>
        </div>

        {moderacion.quejasPendientes > 0 && (
          <div className="alert border-0 text-white p-3 mb-4 d-flex justify-content-between align-items-center shadow-sm" style={{ backgroundColor: '#D32F2F', borderRadius: '12px' }}>
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-exclamation-triangle-fill fs-2"></i>
              <div>
                <strong className="d-block">Atención Requerida: Moderación de Comunidad</strong>
                <span className="small opacity-90">Existen {moderacion.quejasPendientes} quejas formales esperando resolución. Esto afecta el Score de Confiabilidad.</span>
              </div>
            </div>
            <button className="btn btn-light btn-sm text-danger fw-bold shadow-sm" onClick={() => setMostrarModal(true)}>Resolver ahora</button>
          </div>
        )}

        <div className="row mb-2">
          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <div className="card-body p-3 border-start border-success border-5 rounded-end">
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Caja ProfeMatch</span>
                <h3 className="fw-bold text-success mb-1">S/. {finanzas.ingresoNetoTotal.toFixed(2)}</h3>
                <small className="text-muted d-block mt-2">Mes Actual</small>
                <span className="badge bg-success-subtle text-success px-2 py-1 mt-1" style={{ fontSize: '0.7rem' }}>+14.5% Crecimiento</span>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <div className="card-body p-3 border-start border-primary border-5 rounded-end">
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Comisiones (15%)</span>
                <h3 className="fw-bold text-primary mb-1">S/. {finanzas.comisiones.toFixed(2)}</h3>
                <small className="text-muted d-block mt-2">Retención por tutorías</small>
                <span className="badge bg-primary-subtle text-primary px-2 py-1 mt-1" style={{ fontSize: '0.7rem' }}>Principal fuente</span>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <div className="card-body p-3 border-start border-warning border-5 rounded-end">
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Suscripciones Premium</span>
                <h3 className="fw-bold mb-1" style={{ color: '#D4AF37' }}>S/. {finanzas.suscripciones.toFixed(2)}</h3>
                <small className="text-muted d-block mt-2">Planes S/ 9.99 mensuales</small>
                <span className="badge px-2 py-1 mt-1" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' }}>Pagos Recurrentes</span>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={() => setMostrarModal(true)}>
              <div className="card-body p-3 border-start border-danger border-5 rounded-end">
                <span className="text-muted small fw-bold text-uppercase d-block mb-1">Usuarios en Riesgo</span>
                <h3 className="fw-bold text-danger mb-1">{moderacion.usuariosRiesgo} Cuentas</h3>
                <small className="text-muted d-block mt-2">Score crítico (0-49 pts)</small>
                <span className="badge bg-danger-subtle text-danger px-2 py-1 mt-1" style={{ fontSize: '0.7rem' }}>Auditoría necesaria</span>
              </div>
            </div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-7 mb-3">
            <div className="card border-0 shadow-sm bg-white p-4 h-100" style={{ borderRadius: '15px' }}>
              <h6 className="fw-bold text-dark mb-3"><i className="bi bi-bar-chart-fill me-2" style={{ color: '#1F0954' }}></i>Ingresos de ProfeMatch (Semanales)</h6>
              <div style={{ height: '240px' }}>
                <Bar data={datosBarras} options={opcionesGrafico} />
              </div>
            </div>
          </div>
          
          <div className="col-md-5 mb-3">
            <div className="card border-0 shadow-sm bg-white p-4 h-100" style={{ borderRadius: '15px' }}>
              <h6 className="fw-bold text-dark mb-3">Salud de Comunidad (Scores)</h6>
              <div className="row align-items-center h-100 pb-3">
                <div className="col-6 position-relative" style={{ height: '180px' }}>
                  <Doughnut data={datosDistribucion} options={opcionesDoughnut} />
                  <div className="position-absolute top-50 start-50 translate-middle text-center w-100">
                    <span className="fs-4 fw-bold text-success">{saludComunidad.excelente}%</span>
                  </div>
                </div>
                <div className="col-6">
                  <ul className="list-unstyled mb-0 small text-muted">
                    <li className="mb-2 d-flex align-items-center"><span className="bg-success rounded-circle me-2" style={{ width:"12px", height:"12px" }}></span> Excelente (90-100)</li>
                    <li className="mb-2 d-flex align-items-center"><span className="bg-warning rounded-circle me-2" style={{ width:"12px", height:"12px" }}></span> Bueno (70-89)</li>
                    <li className="mb-2 d-flex align-items-center"><span className="rounded-circle me-2" style={{ width:"12px", height:"12px", backgroundColor:"#fd7e14" }}></span> Regular (50-69)</li>
                    <li className="d-flex align-items-center"><span className="bg-danger rounded-circle me-2" style={{ width:"12px", height:"12px" }}></span> Crítico (0-49)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {mostrarModal && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050, backdropFilter: 'blur(3px)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                <div className="text-white d-flex justify-content-between align-items-center p-3" style={{ backgroundColor: '#1F0954' }}>
                  <h5 className="modal-title fw-bold m-0" style={{ fontSize: '1.1rem' }}><i className="bi bi-bank me-2"></i>Tribunal de Resolución de Penalizaciones</h5>
                  <button type="button" className="btn-close btn-close-white shadow-none m-0" onClick={() => setMostrarModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  {historialAuditoria.filter(c => c.estado !== "Resuelto").length === 0 ? (
                    <p className="text-muted text-center mb-0 py-3">No hay casos pendientes por resolver.</p>
                  ) : (
                    <table className="table table-hover border mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Acusado</th>
                          <th>Infracción</th>
                          <th>Penalidad Sugerida</th>
                          <th className="text-end">Acción Administrativa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialAuditoria.filter(c => c.estado !== "Resuelto").map(caso => (
                          <tr key={caso.id}>
                            <td className="fw-bold text-dark">{caso.acusado}</td>
                            <td>{caso.tipo}</td>
                            <td><span className="badge bg-danger px-2">-30 pts</span></td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-danger fw-bold me-2"
                                disabled={procesandoId === caso.id}
                                onClick={() => aplicarSancion(caso)}
                              >
                                {procesandoId === caso.id ? 'Procesando...' : 'Aplicar Sanción'}
                              </button>
                              <button
                                className="btn btn-sm btn-light text-muted"
                                disabled={procesandoId === caso.id}
                                onClick={() => desestimarCaso(caso)}
                              >
                                Desestimar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="modal-footer border-0 bg-light">
                  <button className="btn btn-secondary px-4 fw-semibold" onClick={() => setMostrarModal(false)}>Cerrar Tribunal</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InicioAdmin;
