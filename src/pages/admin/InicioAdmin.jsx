import React, { useState, useEffect, useRef } from 'react';
import Sidebar from "../../components/Sidebar";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

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
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

const InicioAdmin = () => {
  const navigate = useNavigate();
  const [finanzas, setFinanzas] = useState({
    cajaTotal: 0,
    comisionEstudiantes: 0,
    comisionDocentes: 0,
    gananciaNeta: 0,
    caja_docentes: 0
  });
  const [periodo, setPeriodo] = useState({ mes: 'Cargando...', mes_num: 0, anio: 0 });
  const [moderacion, setModeracion] = useState({ quejasPendientes: 0 });
  const [saludComunidad, setSaludComunidad] = useState({
    profesores_activos: 0,
    profesores_inactivos: 0,
    estudiantes_activos: 0,
    estudiantes_inactivos: 0
  });
  const [ingresosSemanales, setIngresosSemanales] = useState([0, 0, 0, 0]);
  const [historialAuditoria, setHistorialAuditoria] = useState([]);
  const [busquedaQueja, setBusquedaQueja] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatosDashboard();
  }, []);

  const cargarDatosDashboard = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setFinanzas(data.finanzas);
        setPeriodo(data.periodo);
        setModeracion(data.moderacion);
        setHistorialAuditoria(data.historialAuditoria);
        setSaludComunidad(data.saludComunidad);
        setIngresosSemanales(data.ingresosSemanales);
      }
    } catch (error) {
      console.error("Error al cargar dashboard admin:", error);
    } finally {
      setCargando(false);
    }
  };

  const handleScrollAQuejas = () => {
    const el = document.getElementById('quejas-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      // Animación de parpadeo temporal
      el.style.transition = 'box-shadow 0.3s ease';
      el.style.boxShadow = '0 0 20px rgba(176, 0, 32, 0.5)';
      setTimeout(() => {
        el.style.boxShadow = 'none';
      }, 1500);
    }
  };

  const handleVerMasMotivo = (motivo) => {
    Swal.fire({
      title: 'Detalle de la Queja',
      text: motivo,
      icon: 'info',
      confirmButtonColor: '#1F0954',
      confirmButtonText: 'Cerrar'
    });
  };

  const handleEnviarAdvertencia = async (profesorId, nombre, resenaId) => {
    const { value: mensaje, isConfirmed } = await Swal.fire({
      title: `Advertir a ${nombre}`,
      html: `
        <p class="text-muted small mb-3">Escribe el mensaje de advertencia. El profesor lo verá en su panel de Reseñas y Calificaciones.</p>
        <textarea id="adv-msg" class="form-control" rows="4" placeholder="Ej: Su comportamiento durante la sesión del 18/07 fue reportado por un alumno. Por favor, revise sus reseñas..." style="width:100%; border-radius: 10px;"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Enviar Advertencia',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1F0954',
      preConfirm: () => {
        const val = document.getElementById('adv-msg').value.trim();
        if (!val) Swal.showValidationMessage('Debes escribir un mensaje antes de enviar.');
        return val;
      }
    });

    if (!isConfirmed || !mensaje) return;

    try {
      const adminSession = JSON.parse(localStorage.getItem('userSession'));
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/advertencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profesor_id: profesorId,
          admin_id: adminSession?.id || null,
          mensaje,
          resena_id: resenaId
        })
      });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: '¡Advertencia Enviada!', text: `${nombre} recibirá la notificación en su panel.`, confirmButtonColor: '#1F0954' });
      } else {
        Swal.fire('Error', 'No se pudo enviar la advertencia. Intenta de nuevo.', 'error');
      }
    } catch (e) {
      Swal.fire('Error de conexión', 'Verifica que el servidor esté activo.', 'error');
    }
  };

  const handleSuspender = (nombreProfesor) => {
    navigate('/usuarios-admin', { state: { search: nombreProfesor } });
  };

  // --- DATOS DE GRÁFICOS ---
  const datosBarras = {
    labels: ['Sem. 4 anterior', 'Sem. 3 anterior', 'Sem. 2 anterior', 'Esta semana'],
    datasets: [{
      label: 'Ganancia Neta (S/.)',
      data: ingresosSemanales,
      backgroundColor: ['rgba(31,9,84,0.5)', 'rgba(31,9,84,0.65)', 'rgba(31,9,84,0.8)', '#1F0954'],
      borderRadius: 8,
    }],
  };

  const totalActividad = saludComunidad.profesores_activos + saludComunidad.profesores_inactivos +
    saludComunidad.estudiantes_activos + saludComunidad.estudiantes_inactivos;

  const datosDistribucion = {
    labels: ['Prof. Activos', 'Prof. Inactivos', 'Est. Activos', 'Est. Inactivos'],
    datasets: [{
      data: [
        saludComunidad.profesores_activos,
        saludComunidad.profesores_inactivos,
        saludComunidad.estudiantes_activos,
        saludComunidad.estudiantes_inactivos
      ],
      backgroundColor: ['#198754', '#dc3545', '#0dcaf0', '#adb5bd'],
      borderWidth: 2,
      borderColor: '#fff',
      hoverOffset: 6
    }],
  };

  const opcionesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` S/. ${ctx.raw.toFixed(2)}`
        }
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => `S/. ${v}` } },
      x: { grid: { display: false } }
    }
  };

  const opcionesDoughnut = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw} usuarios`
        }
      }
    },
    cutout: '72%'
  };

  // --- EXPORTAR PDF ---
  const descargarPDF = () => {
    try {
      const doc = new jsPDF();
      const nombreMes = periodo.mes || new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

      // Cabecera
      doc.setFillColor(31, 9, 84);
      doc.rect(0, 0, 210, 38, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ProfeMatch', 14, 16);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Reporte Gerencial de Administración', 14, 24);
      doc.setFontSize(9);
      doc.text(`Período: ${nombreMes}   |   Generado el: ${new Date().toLocaleDateString('es-PE')}`, 14, 32);

      doc.setTextColor(31, 9, 84);

      // Sección 1: Resumen Financiero
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Resumen Financiero del Mes', 14, 52);

      autoTable(doc, {
        startY: 57,
        head: [['Concepto', 'Monto (S/.)']],
        body: [
          ['Caja ProfeMatch (Total Bruto)', `S/. ${finanzas.cajaTotal.toFixed(2)}`],
          ['Caja Docentes (Distribuido a Profesores)', `S/. ${finanzas.caja_docentes.toFixed(2)}`],
          ['Comisión Estudiantes (15% extra)', `S/. ${finanzas.comisionEstudiantes.toFixed(2)}`],
          ['Comisión Docentes (10% retenido)', `S/. ${finanzas.comisionDocentes.toFixed(2)}`],
          ['GANANCIA NETA ProfeMatch', `S/. ${finanzas.gananciaNeta.toFixed(2)}`],
        ],
        headStyles: { fillColor: [31, 9, 84], fontStyle: 'bold' },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        foot: [['Total verificado', `S/. ${finanzas.gananciaNeta.toFixed(2)}`]],
        footStyles: { fillColor: [31, 9, 84], textColor: [255, 255, 255], fontStyle: 'bold' },
      });

      // Sección 2: Actividad de la Comunidad
      const y2 = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Actividad de la Comunidad', 14, y2);

      autoTable(doc, {
        startY: y2 + 5,
        head: [['Segmento', 'Cantidad']],
        body: [
          ['Profesores Activos', saludComunidad.profesores_activos],
          ['Profesores Inactivos', saludComunidad.profesores_inactivos],
          ['Estudiantes Activos', saludComunidad.estudiantes_activos],
          ['Estudiantes Inactivos', saludComunidad.estudiantes_inactivos],
        ],
        headStyles: { fillColor: [31, 9, 84], fontStyle: 'bold' },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
      });

      // Sección 3: Quejas Pendientes
      const quejasPendientes = historialAuditoria.filter(q => q.estado === 'En Revisión');
      if (quejasPendientes.length > 0) {
        const y3 = doc.lastAutoTable.finalY + 12;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 0, 0);
        doc.text(`3. Quejas Formales Pendientes (${quejasPendientes.length})`, 14, y3);
        doc.setTextColor(31, 9, 84);

        autoTable(doc, {
          startY: y3 + 5,
          head: [['Profesor Acusado', 'Motivo', 'Estado']],
          body: quejasPendientes.map(q => [
            q.acusado,
            q.motivo.length > 60 ? q.motivo.substring(0, 60) + '...' : q.motivo,
            q.estado
          ]),
          headStyles: { fillColor: [180, 0, 0], fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [255, 245, 245] },
        });
      }

      doc.save(`Reporte_ProfeMatch_${nombreMes.replace(' ', '_')}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar el reporte PDF.");
    }
  };

  // --- ESTILOS ---
  const cardStyle = {
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    borderRadius: '14px',
    cursor: 'default'
  };
  const onHover = (e) => {
    e.currentTarget.style.transform = "translateY(-4px)";
    e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.1)";
  };
  const onLeave = (e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "none";
  };

  const quejasFiltradas = historialAuditoria.filter(q =>
    q.acusado.toLowerCase().includes(busquedaQueja.toLowerCase())
  );

  return (
    <div className="d-flex">
      <Sidebar role="admin" />

      <div className="container-fluid p-4" style={{ backgroundColor: '#f4f5f7', minHeight: '100vh', overflowX: 'hidden' }}>

        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: '#1F0954' }}>Centro de Comando Administrativo</h2>
            <p className="text-muted small mb-0">
            <i className="bi bi-calendar3 me-1"></i>
            Período: <strong>{periodo.mes}</strong> · Datos mensuales, actualiza cada mes automáticamente.
          </p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-light border fw-semibold px-3 d-flex align-items-center gap-2" onClick={cargarDatosDashboard}>
              <i className="bi bi-arrow-clockwise"></i> Actualizar
            </button>
            <button
              className="btn text-white fw-semibold shadow-sm px-4 d-flex align-items-center gap-2"
              style={{ backgroundColor: '#1F0954' }}
              onClick={descargarPDF}
            >
              <i className="bi bi-file-earmark-pdf-fill"></i> Exportar Reporte
            </button>
          </div>
        </div>

        {/* ALERTA QUEJAS */}
        {moderacion.quejasPendientes > 0 && (
          <div className="alert border-0 text-white p-3 mb-4 d-flex justify-content-between align-items-center shadow-sm"
            style={{ backgroundColor: '#b00020', borderRadius: '12px' }}>
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-exclamation-triangle-fill fs-3"></i>
              <div>
                <strong className="d-block">Quejas Formales Pendientes</strong>
                <span className="small opacity-90">{moderacion.quejasPendientes} quejas requieren tu atención. Revisa la sección al final de esta página.</span>
              </div>
            </div>
            <button onClick={handleScrollAQuejas} className="btn btn-light btn-sm text-danger fw-bold shadow-sm">Ver ahora</button>
          </div>
        )}

        {/* TARJETAS FINANCIERAS */}
        <div className="row mb-2">

          {/* CAJA PROFEMATCH */}
          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={onHover} onMouseLeave={onLeave}>
              <div className="card-body p-3 border-start border-5 rounded-end" style={{ borderColor: '#198754 !important' }}>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-muted small fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>Caja ProfeMatch</span>
                  <span className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, backgroundColor: 'rgba(25,135,84,0.1)' }}>
                    <i className="bi bi-building text-success" style={{ fontSize: '0.85rem' }}></i>
                  </span>
                </div>
                <h3 className="fw-bold text-success mb-0">S/. {finanzas.cajaTotal.toFixed(2)}</h3>
                <small className="text-muted d-block mt-1">Total bruto recaudado este mes</small>
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>Todo pasa primero por aquí antes de distribuirse.</small>
                </div>
              </div>
            </div>
          </div>

          {/* COMISION DOCENTE */}
          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={onHover} onMouseLeave={onLeave}>
              <div className="card-body p-3 border-start border-primary border-5 rounded-end">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-muted small fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>Comisión Docente</span>
                  <span className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, backgroundColor: 'rgba(13,110,253,0.1)' }}>
                    <i className="bi bi-person-badge text-primary" style={{ fontSize: '0.85rem' }}></i>
                  </span>
                </div>
                <h3 className="fw-bold text-primary mb-0">S/. {finanzas.comisionDocentes.toFixed(2)}</h3>
                <small className="text-muted d-block mt-1">10% retenido a docentes este mes</small>
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>Del total bruto generado por cada sesión.</small>
                </div>
              </div>
            </div>
          </div>

          {/* COMISION ESTUDIANTES */}
          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm h-100 bg-white" style={cardStyle} onMouseEnter={onHover} onMouseLeave={onLeave}>
              <div className="card-body p-3 border-start border-warning border-5 rounded-end">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-muted small fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>Comisión Estudiantes</span>
                  <span className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, backgroundColor: 'rgba(255,193,7,0.12)' }}>
                    <i className="bi bi-mortarboard text-warning" style={{ fontSize: '0.85rem' }}></i>
                  </span>
                </div>
                <h3 className="fw-bold mb-0" style={{ color: '#D4A017' }}>S/. {finanzas.comisionEstudiantes.toFixed(2)}</h3>
                <small className="text-muted d-block mt-1">15% extra cobrado a alumnos este mes</small>
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <small className="text-muted" style={{ fontSize: '0.72rem' }}>Cargo de servicio transparente de la plataforma.</small>
                </div>
              </div>
            </div>
          </div>

          {/* GANANCIA NETA */}
          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm h-100 text-white" style={{ ...cardStyle, background: 'linear-gradient(135deg, #1F0954 0%, #3b1a8f 100%)' }} onMouseEnter={onHover} onMouseLeave={onLeave}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="small fw-bold text-uppercase opacity-75" style={{ letterSpacing: '0.05em' }}>Ganancia Neta</span>
                  <span className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' }}>
                    <i className="bi bi-graph-up-arrow" style={{ fontSize: '0.85rem' }}></i>
                  </span>
                </div>
                <h3 className="fw-bold mb-0">S/. {finanzas.gananciaNeta.toFixed(2)}</h3>
                <small className="opacity-75 d-block mt-1">Lo que se queda ProfeMatch este mes</small>
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  <small className="opacity-60" style={{ fontSize: '0.72rem' }}>Comisión docentes + comisión estudiantes.</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GRÁFICOS */}
        <div className="row mb-4">

          {/* GRÁFICO DE BARRAS - Ingresos Semanales */}
          <div className="col-md-7 mb-3">
            <div className="card border-0 shadow-sm bg-white p-4 h-100" style={{ borderRadius: '14px' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="fw-bold text-dark mb-0">
                    <i className="bi bi-bar-chart-fill me-2" style={{ color: '#1F0954' }}></i>
                    Ganancia Neta Semanal
                  </h6>
                  <small className="text-muted">{periodo.mes}</small>
                </div>
                <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: 'rgba(31,9,84,0.08)', color: '#1F0954', fontSize: '0.75rem' }}>
                  Total: S/. {finanzas.gananciaNeta.toFixed(2)}
                </span>
              </div>
              <div style={{ height: '220px' }}>
                <Bar data={datosBarras} options={opcionesGrafico} />
              </div>
            </div>
          </div>

          {/* DOUGHNUT - Métrica de Actividad */}
          <div className="col-md-5 mb-3">
            <div className="card border-0 shadow-sm bg-white p-4 h-100" style={{ borderRadius: '14px' }}>
              <h6 className="fw-bold text-dark mb-3">
                <i className="bi bi-people-fill me-2" style={{ color: '#1F0954' }}></i>
                Métrica de Actividad
              </h6>
              <div style={{ height: '160px', position: 'relative' }}>
                <Doughnut data={datosDistribucion} options={opcionesDoughnut} />
                {/* Número en el centro */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div className="fw-bold" style={{ fontSize: '1.6rem', color: '#1F0954', lineHeight: 1 }}>{totalActividad}</div>
                  <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: 2 }}>usuarios</div>
                </div>
              </div>
              {/* Leyenda compacta con línea divisoria */}
              <div className="mt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '10px' }}>
                <div className="row g-1">
                  {[
                    { label: 'Prof. Activos', value: saludComunidad.profesores_activos, color: '#198754' },
                    { label: 'Prof. Inactivos', value: saludComunidad.profesores_inactivos, color: '#dc3545' },
                    { label: 'Est. Activos', value: saludComunidad.estudiantes_activos, color: '#0dcaf0' },
                    { label: 'Est. Inactivos', value: saludComunidad.estudiantes_inactivos, color: '#adb5bd' },
                  ].map((item, i) => (
                    <div key={i} className="col-6">
                      <div className="d-flex align-items-center gap-2 py-1">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }}></span>
                        <span className="text-muted" style={{ fontSize: '0.72rem' }}>{item.label}</span>
                        <span className="fw-bold ms-auto" style={{ fontSize: '0.78rem', color: '#333' }}>{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN DE QUEJAS */}
        <div id="quejas-section" className="card border-0 shadow-sm bg-white mb-4" style={{ borderRadius: '14px' }}>
          <div className="card-header bg-white border-0 p-4 pb-0">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h6 className="fw-bold text-dark mb-0">
                  <i className="bi bi-flag-fill me-2 text-danger"></i>
                  Quejas Formales Recibidas
                </h6>
                <small className="text-muted">Quejas enviadas por estudiantes al calificar sesiones</small>
              </div>
              {/* Buscador */}
              <div className="input-group" style={{ maxWidth: '280px' }}>
                <span className="input-group-text border-end-0 bg-white border" style={{ borderRadius: '10px 0 0 10px' }}>
                  <i className="bi bi-search text-muted" style={{ fontSize: '0.85rem' }}></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 border"
                  placeholder="Buscar profesor..."
                  value={busquedaQueja}
                  onChange={(e) => setBusquedaQueja(e.target.value)}
                  style={{ borderRadius: '0 10px 10px 0', fontSize: '0.88rem' }}
                />
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            {quejasFiltradas.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-shield-check fs-2 d-block mb-2 text-success"></i>
                {busquedaQueja ? 'No se encontraron quejas para ese profesor.' : 'No hay quejas formales registradas. ¡Todo en orden!'}
              </div>
            ) : (
              <table className="table table-hover mb-0 align-middle">
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th className="ps-4 text-muted fw-semibold" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profesor Acusado</th>
                    <th className="text-muted fw-semibold" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motivo</th>
                    <th className="text-muted fw-semibold" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                    <th className="text-muted fw-semibold text-end pe-4" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {quejasFiltradas.map(caso => (
                    <tr key={caso.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{ width: 34, height: 34, backgroundColor: '#1F0954', fontSize: '0.75rem', flexShrink: 0 }}>
                            {caso.acusado.charAt(0).toUpperCase()}
                          </div>
                          <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>{caso.acusado}</span>
                        </div>
                      </td>
                      <td style={{ maxWidth: '280px' }}>
                        <div>
                          <span
                            className="text-muted"
                            style={{ fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {caso.motivo}
                          </span>
                          {caso.motivo.length > 80 && (
                            <button className="btn btn-link p-0 text-decoration-none" style={{ fontSize: '0.75rem' }} onClick={() => handleVerMasMotivo(caso.motivo)}>
                              (ver más)
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge rounded-pill px-3 py-2 fw-normal ${
                          caso.estado === 'En Revisión' ? 'bg-danger-subtle text-danger' 
                          : caso.estado === 'Advertido' ? 'bg-warning-subtle text-warning-emphasis'
                          : 'bg-success-subtle text-success'
                        }`}
                          style={{ fontSize: '0.78rem' }}>
                          <i className={`bi bi-circle-fill me-1`} style={{ fontSize: '0.45rem' }}></i>
                          {caso.estado}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-sm me-2 fw-semibold"
                          style={{ backgroundColor: 'rgba(13,110,253,0.08)', color: '#0d6efd', borderRadius: '8px', fontSize: '0.8rem', border: 'none' }}
                          title="Enviar advertencia al profesor"
                          onClick={() => handleEnviarAdvertencia(caso.profesor_id, caso.acusado, caso.resena_id)}
                        >
                          <i className="bi bi-envelope-exclamation me-1"></i> Advertir
                        </button>
                        <button
                          className="btn btn-sm fw-semibold"
                          style={{ backgroundColor: 'rgba(220,53,69,0.08)', color: '#dc3545', borderRadius: '8px', fontSize: '0.8rem', border: 'none' }}
                          title="Ir a gestión de usuarios para suspender"
                          onClick={() => handleSuspender(caso.acusado)}
                        >
                          <i className="bi bi-slash-circle me-1"></i> Suspender
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default InicioAdmin;