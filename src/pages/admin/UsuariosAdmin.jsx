import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Swal from "sweetalert2";
import { StorageService } from "../../core/database/StorageService";
import { useLocation } from "react-router-dom";

export default function UsuariosAdmin() {
  const location = useLocation();

  // 1. ESTADOS PRINCIPALES
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState(location.state?.search || "");
  const [filtroRol, setFiltroRol] = useState("Todos");
  
  // CONTROL DE VISTA: 'activos' o 'papelera' o 'pendientes'
  const [vistaActual, setVistaActual] = useState("activos");
  
  // Estados para Modales
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [modalQuejasVisible, setModalQuejasVisible] = useState(false);
  const [usuarioViendoQuejas, setUsuarioViendoQuejas] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: "", email: "", rol: "Estudiante", score_confiabilidad: 100, plan: "N/A"
  });

  // 2. LECTURA DINÁMICA DE LA BASE DE DATOS SEGÚN LA VISTA
  const obtenerUsuarios = async () => {
    setCargando(true);
    
    // Cambiamos la URL según la pestaña seleccionada
    let url = `${import.meta.env.VITE_API_URL}/usuarios`;
    if (vistaActual === "papelera") url = `${import.meta.env.VITE_API_URL}/usuarios/papelera`;
    if (vistaActual === "pendientes") url = `${import.meta.env.VITE_API_URL}/usuarios/pendientes`;

    try {
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error("Error en la respuesta del servidor");
      const datos = await respuesta.json();
      setUsuarios(datos);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      Swal.fire({
        title: "Error de Conexión",
        text: "No se pudo sincronizar el directorio con el servidor backend. Mostrando datos locales mockeados como fallback.",
        icon: "warning",
        confirmButtonColor: "#1F0954",
        background: "#f8f9fa"
      });
      // Fallback a los usuarios en el mock según la vista actual
      let mockUsers = [];
      if (vistaActual === "activos") mockUsers = StorageService.getUsers().filter(u => u.status === "aprobado");
      else if (vistaActual === "pendientes") mockUsers = StorageService.getUsers().filter(u => u.status === "pendiente");
      else if (vistaActual === "papelera") mockUsers = StorageService.getUsers().filter(u => u.status === "bloqueado");

      setUsuarios(mockUsers.map(u => ({
        id: u.id,
        nombre: u.nombres || u.nombre,
        email: u.email,
        rol: u.role || u.rol,
        score_confiabilidad: 100,
        plan: "N/A"
      })));
    } finally {
      setCargando(false);
    }
  };

  // Se dispara automáticamente cada vez que cambias entre 'activos' y 'papelera'
  useEffect(() => {
    obtenerUsuarios();
  }, [vistaActual]);

  // 3. MANEJADORES DE INPUTS Y MODALES
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const abrirModal = (usuario = null) => {
    if (usuario) {
      setEditandoId(usuario.id);
      setFormData({ 
        nombre: usuario.nombre, 
        email: usuario.email, 
        rol: usuario.rol, 
        score_confiabilidad: usuario.score_confiabilidad, 
        plan: usuario.plan || "Gratuito" 
      });
    } else {
      setEditandoId(null);
      setFormData({ nombre: "", email: "", rol: "Estudiante", score_confiabilidad: 100, plan: "N/A" });
    }
    setMostrarModal(true);
  };

  const abrirModalQuejas = (usuario) => {
    const usuarioConQuejas = {
      ...usuario,
      detalleQuejas: usuario.quejas > 0 ? ["Infracción menor en los chats de tutoría."] : []
    };
    setUsuarioViendoQuejas(usuarioConQuejas);
    setModalQuejasVisible(true);
  };

  // 4. GUARDAR DATOS (POST / PUT)
  const guardarUsuario = async (e) => {
    e.preventDefault();
    
    const url = editandoId 
      ? `${import.meta.env.VITE_API_URL}/usuarios/${editandoId}`
      : `${import.meta.env.VITE_API_URL}/usuarios`;
      
    const metodo = editandoId ? "PUT" : "POST";

    try {
      const respuesta = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!respuesta.ok) throw new Error("Error procesando la solicitud");

      setMostrarModal(false);
      
      await Swal.fire({
        title: editandoId ? "¡Registro Actualizado!" : "¡Usuario Registrado!",
        text: editandoId ? "Los cambios se guardaron con éxito." : "La cuenta ha sido añadida a la base de datos.",
        icon: "success",
        confirmButtonColor: "#1F0954",
        background: "#f8f9fa"
      });

      obtenerUsuarios();

    } catch (error) {
      console.error("Error al procesar usuario:", error);
      Swal.fire({
        title: "Datos Inválidos",
        text: "Por favor, verifica que todos los campos tengan un formato válido (ej. correo electrónico correcto).",
        icon: "error",
        confirmButtonColor: "#1F0954",
        background: "#f8f9fa"
      });
    }
  };

  // 5. BORRADO LÓGICO (BLOQUEAR -> ENVIAR A PAPELERA)
  const eliminarUsuario = (id) => {
    Swal.fire({
      title: "¿Inhabilitar esta cuenta?",
      text: "El usuario será transferido a la papelera mediante borrado lógico.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, inhabilitar",
      cancelButtonText: "Cancelar",
      background: "#f8f9fa"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const respuesta = await fetch(`${import.meta.env.VITE_API_URL}/usuarios/bloquear/${id}`, {
            method: "PUT"
          });

          if (!respuesta.ok) throw new Error("Error en la inhabilitación");

          await Swal.fire({
            title: "Cuenta Inhabilitada",
            text: "El estado de la cuenta se ha actualizado correctamente.",
            icon: "success",
            confirmButtonColor: "#1F0954",
            background: "#f8f9fa"
          });

          obtenerUsuarios();

        } catch (error) {
          console.error("Error al inhabilitar usuario:", error);
          Swal.fire({
            title: "Error",
            text: "No se pudo completar la operación de bloqueo.",
            icon: "error",
            confirmButtonColor: "#1F0954"
          });
        }
      }
    });
  };

  // 6. ACCIÓN DE ACCESO INVERSO: RESTAURAR DESDE PAPELERA
  const restaurarUsuario = (id) => {
    Swal.fire({
      title: "¿Reactivar esta cuenta?",
      text: "El usuario recuperará el acceso total y volverá al directorio activo.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#1F0954",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, restaurar",
      cancelButtonText: "Volver",
      background: "#f8f9fa"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const respuesta = await fetch(`${import.meta.env.VITE_API_URL}/usuarios/restaurar/${id}`, {
            method: "PUT"
          });

          if (!respuesta.ok) throw new Error("Error al restaurar");

          await Swal.fire({
            title: "Cuenta Restaurada",
            text: "El usuario ha sido reincorporado con éxito.",
            icon: "success",
            confirmButtonColor: "#1F0954",
            background: "#f8f9fa"
          });

          obtenerUsuarios();

        } catch (error) {
          console.error("Error restaurando usuario:", error);
          Swal.fire({
            title: "Error",
            text: "No se pudo procesar la restauración.",
            icon: "error",
            confirmButtonColor: "#1F0954"
          });
        }
      }
    });
  };

  // 6.5 APROBAR USUARIO PENDIENTE
  const aprobarUsuario = (id) => {
    Swal.fire({
      title: "¿Aprobar registro?",
      text: "El usuario tendrá acceso a la plataforma.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#1F0954",
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, Aprobar"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const respuesta = await fetch(`${import.meta.env.VITE_API_URL}/usuarios/aprobar/${id}`, {
            method: "PUT"
          });
          
          if (!respuesta.ok) throw new Error("Error en el servidor al aprobar");
          
          Swal.fire("¡Aprobado!", "El usuario ya puede iniciar sesión.", "success");
          obtenerUsuarios();
        } catch (error) {
          // Fallback a LocalStorage si falla la API
          StorageService.updateUserStatus(id, "aprobado");
          Swal.fire("¡Aprobado (Local)!", "El usuario ya puede iniciar sesión.", "success");
          obtenerUsuarios();
        }
      }
    });
  };

  // 7. FILTRADO LOCAL EN FRONTEND
  const usuariosFiltrados = usuarios.filter(u => {
    const correoSeguro = u.email || "";
    const nombreSeguro = u.nombre || "";
    
    const coincideBusqueda = nombreSeguro.toLowerCase().includes(busqueda.toLowerCase()) || 
                             correoSeguro.toLowerCase().includes(busqueda.toLowerCase());
    const coincideRol = filtroRol === "Todos" || u.rol.toLowerCase() === filtroRol.toLowerCase();
    return coincideBusqueda && coincideRol;
  });

  const obtenerColorScore = (score) => {
    if (score >= 90) return "bg-success text-white"; 
    if (score >= 70) return "bg-warning text-dark"; 
    if (score >= 50) return "text-white"; 
    return "bg-danger text-white"; 
  };

  return (
    <div className="d-flex">
      <Sidebar role="admin" />
      
      <div className="container-fluid p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', overflowX: 'hidden' }}>
        
        {/* ENCABEZADO */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: '#1F0954' }}>Directorio de Usuarios</h2>
            <p className="text-muted small mb-0">Gestiona cuentas, planes y audita el Score de Confiabilidad.</p>
          </div>
          <button className="btn text-white fw-semibold shadow-sm px-4 d-flex align-items-center gap-2 rounded-pill" style={{ backgroundColor: '#1F0954' }} onClick={() => abrirModal()}>
            <i className="bi bi-person-plus-fill"></i> Agregar Usuario
          </button>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS (ADN VISUAL) */}
        <div className="d-flex gap-2 mb-3">
          <button 
            className={`btn rounded-pill px-4 fw-semibold shadow-sm d-flex align-items-center gap-2 transition-all ${vistaActual === 'activos' ? 'text-white' : 'btn-white text-secondary border'}`}
            style={vistaActual === 'activos' ? { backgroundColor: '#1F0954' } : {}}
            onClick={() => setVistaActual('activos')}
          >
            <i className="bi bi-person-check-fill"></i> Cuentas Activas
          </button>
          <button 
            className={`btn rounded-pill px-4 fw-semibold shadow-sm d-flex align-items-center gap-2 transition-all ${vistaActual === 'pendientes' ? 'btn-warning text-dark border-warning' : 'btn-white text-secondary border'}`}
            onClick={() => setVistaActual('pendientes')}
          >
            <i className="bi bi-hourglass-split"></i> Solicitudes Pendientes
          </button>
          <button 
            className={`btn rounded-pill px-4 fw-semibold shadow-sm d-flex align-items-center gap-2 transition-all ${vistaActual === 'papelera' ? 'btn-danger text-white' : 'btn-white text-secondary border'}`}
            onClick={() => setVistaActual('papelera')}
          >
            <i className="bi bi-trash-fill"></i> Papelera de Reciclaje
          </button>
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '15px' }}>
          <div className="card-body p-3 d-flex flex-wrap align-items-center gap-3">
            <div className="input-group flex-grow-1" style={{ minWidth: '250px' }}>
              <span className="input-group-text bg-white border-0 text-muted"><i className="bi bi-search"></i></span>
              <input 
                type="text" 
                className="form-control border-0 bg-light rounded" 
                placeholder="Buscar por nombre o correo..." 
                value={busqueda} 
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ boxShadow: 'none' }}
              />
            </div>
            
            <div className="d-flex align-items-center gap-2 border-start ps-3">
              <span className="fw-bold text-muted small"><i className="bi bi-funnel-fill"></i> Rol:</span>
              <select 
                className="form-select bg-light border-0 fw-semibold text-secondary cursor-pointer" 
                value={filtroRol} 
                onChange={(e) => setFiltroRol(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="Todos">Todos</option>
                <option value="Estudiante">Estudiantes</option>
                <option value="Profesor">Profesores</option>
                <option value="Admin">Administradores</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="card border-0 shadow-sm bg-white" style={{ borderRadius: '15px' }}>
          <div className="card-body p-4">
              <h5 className="fw-bold text-dark mb-3">
                <i className={`bi ${vistaActual === 'activos' ? 'bi-people-fill' : vistaActual === 'pendientes' ? 'bi-hourglass' : 'bi-trash-fill'} me-2`} style={{ color: vistaActual === 'activos' ? '#1F0954' : vistaActual === 'pendientes' ? '#ffc107' : '#dc3545' }}></i>
                {vistaActual === 'activos' ? 'Cuentas Registradas' : vistaActual === 'pendientes' ? 'Nuevos Registros en Revisión' : 'Historial de Cuentas Inhabilitadas'}
              </h5>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light text-secondary">
                  <tr>
                    <th className="ps-3">Usuario</th>
                    <th>Tipo de Cuenta</th>
                    <th>Score de Confiabilidad</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-muted">
                        <div className="spinner-border" style={{ color: '#1F0954' }} role="status">
                          <span className="visually-hidden">Cargando...</span>
                        </div>
                        <p className="mt-2 mb-0">Sincronizando registros...</p>
                      </td>
                    </tr>
                  ) : usuariosFiltrados.length > 0 ? (
                    usuariosFiltrados.map(u => (
                      <tr key={u.id}>
                        <td className="ps-3 py-3">
                          <div className="fw-bold text-dark">{u.nombre}</div>
                          <div className="text-muted small">{u.email}</div>
                        </td>
                        <td>
                          <span className={`badge px-2 py-1 rounded text-capitalize ${
                            u.rol.toLowerCase() === 'admin' ? 'bg-secondary' : 
                            u.rol.toLowerCase() === 'profesor' ? 'bg-primary-subtle text-primary border border-primary-subtle' : 
                            'bg-success-subtle text-success border border-success-subtle'
                          }`}>
                            {u.rol}
                          </span>
                        </td>
                        <td>
                          <span 
                            className={`badge rounded-pill px-3 py-1 ${obtenerColorScore(u.score_confiabilidad)}`}
                            style={u.score_confiabilidad >= 50 && u.score_confiabilidad <= 69 ? { backgroundColor: '#fd7e14' } : {}}
                          >
                            {u.score_confiabilidad} pts
                          </span>
                        </td>
                        <td className="text-end pe-3">
                          {vistaActual === 'activos' ? (
                            <>
                              <button className="btn btn-sm btn-outline-primary fw-bold me-2 px-3 rounded-pill" onClick={() => abrirModal(u)}>
                                Editar
                              </button>
                              <button className="btn btn-sm btn-outline-danger px-3 rounded-pill" onClick={() => eliminarUsuario(u.id)}>
                                Bloquear
                              </button>
                            </>
                          ) : vistaActual === 'pendientes' ? (
                            <button className="btn btn-sm fw-bold px-3 rounded-pill shadow-sm text-white" style={{ backgroundColor: '#1F0954' }} onClick={() => aprobarUsuario(u.id)}>
                              <i className="bi bi-check-circle me-1"></i> Aprobar Cuenta
                            </button>
                          ) : (
                            <button className="btn btn-sm btn-outline-success fw-bold px-3 rounded-pill shadow-sm" onClick={() => restaurarUsuario(u.id)}>
                              <i className="bi bi-arrow-counterclockwise me-1"></i> Restaurar Cuenta
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-muted">
                        No se encontraron cuentas en este segmento del directorio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL: REGISTRO / EDICIÓN */}
      {mostrarModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050, backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px', overflow: 'hidden' }}>
              
              <div className="text-white d-flex justify-content-between align-items-center p-3" style={{ backgroundColor: '#1F0954' }}>
                <h5 className="modal-title fw-bold m-0" style={{ fontSize: '1.1rem' }}>
                  <i className={`bi ${editandoId ? "bi-pencil-square" : "bi-person-plus-fill"} me-2`}></i>
                  {editandoId ? "Editar Usuario" : "Nuevo Usuario"}
                </h5>
                <button type="button" className="btn-close btn-close-white shadow-none m-0" onClick={() => setMostrarModal(false)}></button>
              </div>

              <form onSubmit={guardarUsuario}>
                <div className="modal-body p-4 bg-white">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Nombre Completo</label>
                    <input type="text" name="nombre" className="form-control bg-light border-0" required value={formData.nombre} onChange={handleInputChange} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Correo Institucional</label>
                    <input type="email" name="email" className="form-control bg-light border-0" required value={formData.email} onChange={handleInputChange} />
                  </div>
                  <div className="row">
                    <div className="col-6 mb-3">
                      <label className="form-label small fw-bold text-secondary">Tipo de Usuario</label>
                      <select name="rol" className="form-select bg-light border-0 cursor-pointer" value={formData.rol} onChange={handleInputChange}>
                        <option value="Estudiante">Estudiante</option>
                        <option value="Admin">Admin</option>
                        <option value="Profesor">Profesor</option>
                      </select>
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label small fw-bold text-secondary">Score Confiabilidad</label>
                      <input type="number" name="score_confiabilidad" className="form-control bg-light border-0 fw-bold" min="0" max="100" required value={formData.score_confiabilidad} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 bg-light">
                  <button type="button" className="btn btn-secondary px-4 fw-semibold rounded-pill" onClick={() => setMostrarModal(false)}>Cancelar</button>
                  <button type="submit" className="btn text-white px-4 fw-semibold rounded-pill" style={{ backgroundColor: '#1F0954' }}>
                    {editandoId ? "Actualizar Datos" : "Registrar Usuario"}
                  </button>
                </div>
              </form>
              
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTORIAL DE QUEJAS */}
      {modalQuejasVisible && usuarioViendoQuejas && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050, backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px', overflow: 'hidden' }}>
              
              <div className="text-white d-flex justify-content-between align-items-center p-3" style={{ backgroundColor: '#dc3545' }}>
                <h5 className="modal-title fw-bold m-0" style={{ fontSize: '1.1rem' }}>
                  <i className="bi bi-exclamation-triangle-fill me-2"></i> Auditoría de Quejas Formales
                </h5>
                <button type="button" className="btn-close btn-close-white shadow-none m-0" onClick={() => setModalQuejasVisible(false)}></button>
              </div>

              <div className="modal-body p-4 bg-white">
                <div className="mb-4 d-flex align-items-center gap-3 border-bottom pb-3">
                  <div className="bg-light rounded-circle d-flex justify-content-center align-items-center" style={{ width: '50px', height: '50px' }}>
                    <i className="bi bi-person-fill fs-3 text-secondary"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-dark mb-0">{usuarioViendoQuejas.nombre}</h6>
                    <small className="text-muted">{usuarioViendoQuejas.email}</small>
                  </div>
                </div>

                <h6 className="fw-bold mb-3 text-dark">Historial de Reportes:</h6>
                <ul className="list-group list-group-flush">
                  {usuarioViendoQuejas.detalleQuejas && usuarioViendoQuejas.detalleQuejas.map((queja, idx) => (
                    <li key={idx} className="list-group-item px-0 text-muted d-flex align-items-start gap-2 border-0 mb-2">
                      <i className="bi bi-caret-right-fill text-danger mt-1"></i>
                      <span>{queja}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="modal-footer border-0 bg-light">
                <button type="button" className="btn btn-secondary px-4 fw-semibold rounded-pill w-100" onClick={() => setModalQuejasVisible(false)}>Cerrar Reporte</button>
              </div>
              
            </div>
          </div>
        </div>
      )}

    </div>
  );
}