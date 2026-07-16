import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { StorageService } from "../core/database/StorageService";

export default function Sidebar({ role }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  // Notificaciones Reales
  const [notificaciones, setNotificaciones] = useState([]);
  const [scoreConfiabilidad, setScoreConfiabilidad] = useState(100);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (role === "estudiante") {
      cargarDatosEstudiante();
      verificarRecordatorios();

      // Suscribirse a cambios en el Storage (si ocurren en otras pestañas)
      window.addEventListener("storage", cargarDatosEstudiante);

      // Verificar recordatorios cada 1 minuto
      const interval = setInterval(() => {
        verificarRecordatorios();
        cargarDatosEstudiante();
      }, 60000);

      return () => {
        window.removeEventListener("storage", cargarDatosEstudiante);
        clearInterval(interval);
      };
    } else if (role === "profesor") {
      cargarDatosProfesor();
      window.addEventListener("storage", cargarDatosProfesor);
      
      const interval = setInterval(() => {
        cargarDatosProfesor();
      }, 60000);

      return () => {
        window.removeEventListener("storage", cargarDatosProfesor);
        clearInterval(interval);
      };
    }
  }, [role]);

  // CAMBIO MÍNIMO: Fallback para leer score correctamente
  const cargarDatosEstudiante = () => {
    const stats = StorageService.getStudentStats();
    // Lee scoreConfiabilidad si existe, sino lee score, sino 100
    setScoreConfiabilidad(stats?.scoreConfiabilidad ?? stats?.score ?? 100);
    setNotificaciones(StorageService.getNotifications());
  };

  // NUEVA FUNCIÓN PARA PROFESOR
  const cargarDatosProfesor = () => {
    setScoreConfiabilidad(Number(localStorage.getItem("score_profesor")) || 100);
    setNotificaciones(StorageService.getNotificationsProfesor());
  };

  const verificarRecordatorios = () => {
    if (role !== "estudiante") return;

    const sesiones = StorageService.getTutoringSessions();
    const ahora = new Date();
    let updated = false;

    sesiones.forEach(tut => {
      const fechaTutoria = new Date(tut.fechaHora);
      const difHoras = (fechaTutoria - ahora) / (1000 * 60 * 60);

      if (tut.estado === "Confirmada") {
        if (difHoras > 0 && difHoras <= 24 && !tut.notified24h) {
          StorageService.saveNotification({
            tipo: "recordatorio_24h",
            tutoriaId: tut.id,
            mensaje: `Tu tutoría de ${tut.curso} es en menos de 24 horas. ¿Necesitas cancelar?`,
            fechaHoraRef: new Date().toISOString()
          });
          StorageService.updateTutoringSession(tut.id, { notified24h: true });
          updated = true;
        }

        if (difHoras > 0 && difHoras <= 1 && !tut.notified1h) {
          StorageService.saveNotification({
            tipo: "recordatorio_1h",
            tutoriaId: tut.id,
            mensaje: `¡Urgente! Tu tutoría de ${tut.curso} comienza en menos de 1 hora. Entra a la sala virtual.`,
            enlace: "/tutorias-estudiante",
            fechaHoraRef: new Date().toISOString()
          });
          StorageService.updateTutoringSession(tut.id, { notified1h: true });
          updated = true;
        }

        // Regla de Inasistencia: Si ya pasó la hora de inicio + su duración y sigue en "Confirmada" (nunca entró)
        const duracion = tut.duracionEstimada || 1.5;
        if (difHoras < -duracion) {
          // Marcar como No Asistió
          StorageService.updateTutoringSession(tut.id, { estado: "Cancelada" });

          // Penalizar al estudiante
          const currentStats = StorageService.getStudentStats();
          const scoreActual = currentStats?.scoreConfiabilidad ?? currentStats?.score ?? 100;
          const newScore = Math.max(0, scoreActual - 10);
          StorageService.updateStudentStats({ scoreConfiabilidad: newScore });

          StorageService.saveNotification({
            tipo: "inasistencia",
            tutoriaId: tut.id,
            mensaje: `Has sido penalizado con -10 puntos por no asistir a tu tutoría de ${tut.curso}.`,
            fechaHoraRef: new Date().toISOString()
          });
          updated = true;
        }
      } else if (tut.estado === "Completada" || tut.estado === "Cancelada") {
        // Limpiar notificaciones fantasma de esta tutoría
        const notifs = StorageService.getNotifications();
        let changedNotifs = false;
        notifs.forEach(n => {
          if (n.tutoriaId === tut.id && n.tipo.startsWith("recordatorio") && !n.read) {
            StorageService.markNotificationAsRead(n.id);
            changedNotifs = true;
          }
        });
        if (changedNotifs) updated = true;

        if (tut.estado === "Completada" && difHoras <= -2 && !tut.notifiedReview) {
          StorageService.saveNotification({
            tipo: "solicitud_valoracion",
            tutoriaId: tut.id,
            mensaje: `¿Cómo fue tu experiencia en ${tut.curso} con ${tut.profesorNombre}? Déjanos tu opinión.`,
            enlace: "/resenas-estudiante",
            fechaHoraRef: new Date().toISOString()
          });
          StorageService.updateTutoringSession(tut.id, { notifiedReview: true });
          updated = true;
        }
      }
    });

    if (updated) {
      cargarDatosEstudiante();
    }
  };

  const menuConfig = {
    admin: {
      // DEGRADADO CORPORATIVO: Índigo base a Índigo Oscuro (#1F0954)
      color: "linear-gradient(180deg, #3F51B5 0%, #1F0954 100%)", 
      items: [
        { name: "Dashboard", icon: "bi-speedometer2", path: "/inicio-admin" },
        { name: "Usuarios", icon: "bi-people", path: "/usuarios-admin" },
        { name: "Reportes", icon: "bi-bar-chart", path: "/reportes-admin" },
      ]
    },
    profesor: {
      color: "linear-gradient(180deg, #3F51B5 0%, #3F51B5 75%, #5E35B1 100%)",
      items: [
        { name: "Mi Perfil", icon: "bi-person-badge", path: "/inicio-profesor" },
        { name: "Evaluaciones", icon: "bi-star", path: "/evaluaciones-profesor" },
        { name: "Tutorias", icon: "bi-book", path: "/tutorias-profesor" },
      ]
    },
    estudiante: {
      color: "linear-gradient(180deg, #6836c5ff 0%, #75149eff 100%)",
      items: [
        { name: "Inicio", icon: "bi-house-door", path: "/inicio-estudiante" },
        { name: "Buscar Profe", icon: "bi-search", path: "/buscar-estudiante" },
        { name: "Mis Reseñas", icon: "bi-chat-left-text", path: "/resenas-estudiante" },
        { name: "Buscar Tutorias", icon: "bi-mortarboard", path: "/tutorias-estudiante" },
      ]
    }
  };

  const config = menuConfig[role] || menuConfig["estudiante"];

  const obtenerColorScore = (score) => {
    if (score >= 90) return "#28a745"; 
    if (score >= 70) return "#ffc107"; 
    if (score >= 50) return "#fd7e14"; 
    return "#dc3545"; 
  };

  const handleLogout = () => {
    Swal.fire({
      title: "¿Cerrar Sesión?",
      text: "Tendrás que volver a ingresar para acceder a tu panel.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor:
        role === 'admin'
          ? '#1F0954'
          : role === 'profesor'
            ? '#3F51B5'
            : '#671572ff',
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("userSession");
        navigate("/login");
      }
    });
  };

  const marcarComoLeida = (id) => {
    if (role === "estudiante") {
      StorageService.markNotificationAsRead(id);
      cargarDatosEstudiante();
    } else if (role === "profesor") {
      StorageService.markNotificationProfesorAsRead(id);
      cargarDatosProfesor();
    }
  };

  const alertasNoLeidas = notificaciones.filter(n => !n.read).length;

  return (
    <div
      className={`sidebar-container ${isExpanded ? "expanded" : "collapsed"}`}
      style={{ background: config.color, minHeight: '100vh', transition: 'width 0.3s ease' }} 
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setMostrarNotificaciones(false);
      }}
    >
      {/* HEADER DE MARCA */}
      <div className="sidebar-header d-flex align-items-center justify-content-between px-3 w-100 py-3">
        <div className="d-flex align-items-center">
          <img src="/minilogo.png" alt="Logo" className="logo-img" style={{ width: '30px' }} />
          {isExpanded && <span className="logo-text ms-2 fw-bold text-white">ProfeMatch</span>}
        </div>
      </div>

      {/* NOTIFICACIONES - AHORA PARA ESTUDIANTE Y PROFESOR */}
      {(role === "estudiante" || role === "profesor") && (
        <div className="px-3 py-2 position-relative w-100">
          <button
            className="btn btn-link text-white p-0 d-flex align-items-center gap-2 style-none text-decoration-none"
            onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
            style={{ border: 'none', background: 'none' }}
          >
            <div className="position-relative">
              <i className="bi bi-bell-fill fs-5"></i>
              {alertasNoLeidas > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-circle bg-danger" style={{ fontSize: '0.6rem', padding: '0.25rem 0.4rem' }}>
                  {alertasNoLeidas}
                </span>
              )}
            </div>
            {isExpanded && <span className="small text-white">Notificaciones</span>}
          </button>

          {mostrarNotificaciones && (
            <div className="bg-white rounded shadow p-2 mt-2 position-relative" style={{ zIndex: 1100, border: '1px solid #ddd', maxHeight: '300px', overflowY: 'auto' }}>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-1 mb-1">
                <h6 className="fw-bold text-dark px-2 pt-1 m-0" style={{ fontSize: '0.8rem' }}>Notificaciones</h6>
              </div>
              {notificaciones.length > 0 ? (
                notificaciones.slice().reverse().map(n => (
                  <div
                    key={n.id}
                    className={`p-2 small mb-1 rounded ${n.read ? 'text-muted bg-light' : 'text-dark fw-medium bg-info-subtle hover-shadow'}`}
                    style={{ fontSize: '0.75rem', cursor: 'pointer', borderLeft: n.read ? 'none' : '3px solid #0dcaf0' }}
                    onClick={() => marcarComoLeida(n.id)}
                  >
                    <div className="mb-1">{n.mensaje}</div>
                    {n.enlace && (
                      <button
                        className="btn btn-sm btn-primary py-0 px-2 fw-bold d-inline-block mt-1 border-0 hover-shadow"
                        style={{ fontSize: '0.65rem', background: "linear-gradient(135deg, #7B1FA2 0%, #E91E63 100%)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          marcarComoLeida(n.id);
                          navigate(n.enlace);
                        }}
                      >
                        Ir a la sala
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-muted p-2 text-center small" style={{ fontSize: '0.75rem' }}>No tienes notificaciones.</div>
              )}
            </div>
          )}
        </div>
      )}

      <hr className="my-2 text-white opacity-25 w-100" />

      <nav className="sidebar-nav w-100">
        {config.items.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`nav-item d-flex align-items-center px-3 py-2 my-1 text-white text-decoration-none ${location.pathname === item.path ? "active bg-white bg-opacity-25 rounded" : ""}`}
            style={{ transition: 'background-color 0.2s' }}
          >
            <i className={`bi ${item.icon} fs-5 me-3`}></i>
            {isExpanded && <span className="nav-text small">{item.name}</span>}
          </Link>
        ))}
      </nav>
      {/* WIDGET DEL SCORE DE CONFIABILIDAD */}
      {role !== "admin" && (
        <div className="w-100 px-3 mt-auto mb-2">
          <div
            className="p-2 rounded bg-white bg-opacity-10 text-white"
            style={{ fontSize: '0.8rem' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <i className="bi bi-shield-check fs-6"></i>

              {isExpanded && (
                <span
                  className="fw-bold"
                  style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}
                >
                  CONFIABILIDAD
                </span>
              )}

              <span
                className="badge"
                style={{ backgroundColor: obtenerColorScore(scoreConfiabilidad) }}
              >
                {scoreConfiabilidad}%
              </span>
            </div>

            {isExpanded && (
              <div
                className="progress"
                style={{
                  height: '4px',
                  backgroundColor: 'rgba(255,255,255,0.2)'
                }}
              >
                <div
                  className="progress-bar"
                  style={{
                    width: `${scoreConfiabilidad}%`,
                    backgroundColor: obtenerColorScore(scoreConfiabilidad)
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="sidebar-footer w-100">
        <button onClick={handleLogout} className="nav-item logout-btn btn btn-link text-white text-decoration-none d-flex align-items-center px-3 py-2 w-100 style-none" style={{ border: 'none', background: 'none' }}>
          <i className="bi bi-box-arrow-left fs-5 me-3"></i>
          {isExpanded && <span className="nav-text small">Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
}