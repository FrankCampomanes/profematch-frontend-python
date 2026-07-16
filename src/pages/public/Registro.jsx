import "./Registro.css";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoginHero from "../../components/LoginHero";
import heroVideo from "../../images/hero.mp4";
import WhatsappBtn from "../../components/WhatsappBtn";
import Swal from "sweetalert2";
import { StorageService } from "../../core/database/StorageService";

const roleOptions = {
  estudiante: { 
    color: "#6247a0", 
    icon: "bi-mortarboard-fill",
    title: "Estudiante",
    desc: "Encuentra los mejores profesores",
    path: "/inicio-estudiante",
    fields: [
      { name: "nombres", label: "Nombres completos", icon: "bi-person", type: "text", placeholder: "Ej: Juan Carlos" },
      { name: "email", label: "Correo electrónico", icon: "bi-envelope", type: "email", placeholder: "tu.nombre@email.com" },
      { name: "pass", label: "Contraseña", icon: "bi-lock", type: "password", placeholder: "Mínimo 6 caracteres" },
      { name: "confirmPassword", label: "Confirmar contraseña", icon: "bi-lock-fill", type: "password", placeholder: "Repite tu contraseña" }
    ]
  },
  profesor: { 
    color: "#1d1c50", 
    icon: "bi-person-badge-fill",
    title: "Docente",
    desc: "Construye tu reputación académica",
    path: "/inicio-profesor",
    fields: [
      { name: "nombres", label: "Nombres completos", icon: "bi-person", type: "text", placeholder: "Ej: María García" },
      { name: "email", label: "Correo electrónico", icon: "bi-envelope", type: "email", placeholder: "profesor@email.com" },
      { name: "universidad", label: "Universidad", icon: "bi-building", type: "text", placeholder: "Ej: PUCP, UNMSM, UPC" },
      { name: "pass", label: "Contraseña", icon: "bi-lock", type: "password", placeholder: "Mínimo 6 caracteres" },
      { name: "confirmPassword", label: "Confirmar contraseña", icon: "bi-lock-fill", type: "password", placeholder: "Repite tu contraseña" }
    ]
  }
};

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

export default function Registro() {
  const navigate = useNavigate();
  const [role, setRole] = useState("estudiante");
  const [formData, setFormData] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentRole = roleOptions[role];

  // Protección de sesión 
  useEffect(() => {
    const sessionActiva = localStorage.getItem("userSession");
    if (sessionActiva) {
      const { role: savedRole } = JSON.parse(sessionActiva);
      const redirectPath = savedRole === "admin" ? "/inicio-admin" : 
                          savedRole === "profesor" ? "/inicio-profesor" : "/inicio-estudiante";
      navigate(redirectPath);
    }
  }, [navigate]);

  const handleRoleChange = (newRole) => {
    if (newRole !== role) {
      setIsAnimating(true);
      setRole(newRole);
      setFormData({});
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const { pass, confirmPassword, email, nombres } = formData;
    
    if (!nombres || nombres.trim().length < 3) {
      Swal.fire({
        icon: "warning",
        title: "Campo incompleto",
        text: "Por favor ingresa tus nombres completos",
        confirmButtonColor: currentRole.color
      });
      return false;
    }

    if (!email || !email.includes("@") || !email.includes(".")) {
      Swal.fire({
        icon: "warning",
        title: "Correo inválido",
        text: "Ingresa un correo electrónico válido",
        confirmButtonColor: currentRole.color
      });
      return false;
    }

    if (!pass || pass.length < 6) {
      Swal.fire({
        icon: "warning",
        title: "Contraseña débil",
        text: "La contraseña debe tener al menos 6 caracteres",
        confirmButtonColor: currentRole.color
      });
      return false;
    }

    if (pass !== confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "Contraseñas no coinciden",
        text: "Verifica que ambas contraseñas sean iguales",
        confirmButtonColor: currentRole.color
      });
      return false;
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const payload = {
        nombre: formData.nombres,
        email: formData.email,
        password: formData.pass,
        rol: role
      };

      if (role === 'profesor') {
        payload.universidad = formData.universidad;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          title: "¡Cuenta creada!",
          text: `Gracias por registrarte, ${formData.nombres.split(' ')[0]}. Tu cuenta está a la espera de aprobación por un administrador.`,
          icon: "info",
          timer: 4000,
          showConfirmButton: true,
          confirmButtonText: "Ir al Login",
          confirmButtonColor: currentRole.color,
          timerProgressBar: true,
        }).then(() => {
          navigate("/login");
        });
      } else {
        const errorDetail = getErrorMessage(data);
        Swal.fire({
          icon: "error",
          title: "Error al registrar",
          text: errorDetail || "Ocurrió un error al crear la cuenta",
          confirmButtonColor: currentRole.color
        });
      }
    } catch (error) {
      console.error("Error en el registro:", error);
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor.",
        confirmButtonColor: currentRole.color
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container-fluid p-0 min-vh-100 overflow-hidden" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="row g-0 flex-grow-1">
        {/* Hero Section */}
        <div className="col-lg-6 d-none d-lg-block p-0 d-flex flex-column">
          <LoginHero 
            video={heroVideo} 
            titulo="Únete a" 
            highlight="ProfeMatch" 
            subtitulo="Forma parte de la comunidad que está transformando la educación universitaria."
          />
        </div>

        {/* Form Section */}
        <div className="col-lg-6 d-flex align-items-center justify-content-center position-relative px-3 px-md-4 py-5">
          <div className="position-absolute top-0 end-0 p-3 p-md-4">
            <span className="text-muted small">¿Ya tienes cuenta?</span>
            <Link to="/login" className="ms-2 fw-bold text-decoration-none small hover-link">
              Inicia sesión
            </Link>
          </div>

          <div className={`registro-card p-4 p-md-5 shadow-lg bg-white w-100 position-relative ${isAnimating ? 'role-swap' : ''}`} 
               style={{ zIndex: 1, maxWidth: "520px" }}>
            
            {/* Selector de rol */}
            <div className="role-selector mb-4">
              <div className="row g-2">
                {Object.keys(roleOptions).map((r) => (
                  <div className="col" key={r}>
                    <button
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      className={`role-btn w-100 py-3 d-flex align-items-center justify-content-center gap-2 ${role === r ? 'active' : ''}`}
                      style={{
                        background: role === r ? roleOptions[r].color : "#f8f9fa",
                        color: role === r ? "#fff" : "#64748b"
                      }}
                    >
                      <i className={`bi ${roleOptions[r].icon}`}></i>
                      <span className="fw-bold small text-capitalize">{roleOptions[r].title}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-4">
              <div className="icon-badge-mx-auto" style={{ backgroundColor: currentRole.color }}>
                <i className={`bi ${currentRole.icon}`}></i>
              </div>
              <h2 className="fw-bold text-dark mb-1">Crear cuenta</h2>
              <p className="text-muted small mb-0">Registro para <strong className="text-capitalize" style={{ color: 'var(--violet-main)' }}>{currentRole.title}</strong></p>
              <p className="text-muted small fst-italic mt-2">{currentRole.desc}</p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleRegister} className="mb-4">
              <div className="row g-3">
                {currentRole.fields.map((field) => (
                  <div className="col-12" key={field.name}>
                    <label className="form-label">
                      {field.label}
                    </label>
                    <div className="input-group">
                      <span className="input-group-text rounded-start-4">
                        <i className={`bi ${field.icon}`}></i>
                      </span>
                      <input
                        type={field.type}
                        name={field.name}
                        className="form-control py-3 rounded-end-4"
                        placeholder={field.placeholder}
                        value={formData[field.name] || ""}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Términos y condiciones */}
              <div className="form-check mt-4 mb-4">
                <input className="form-check-input" type="checkbox" id="terms" required />
                <label className="form-check-label small text-muted" htmlFor="terms">
                  Acepto los <a href="#!" className="fw-bold text-decoration-none" style={{ color: 'var(--violet-main)' }}>términos y condiciones</a> y la <a href="#!" className="fw-bold text-decoration-none" style={{ color: 'var(--violet-main)' }}>política de privacidad</a>
                </label>
              </div>

              {/* Botón de registro */}
              <div className="d-grid gap-3">
                <button 
                  type="submit" 
                  className="btn btn-register py-3 shadow-lg border-0 fw-bold text-white"
                  disabled={isLoading}
                  style={{
                    background: `linear-gradient(135deg, ${currentRole.color} 0%, ${currentRole.color}dd 100%)`,
                    borderRadius: '12px'
                  }}
                >
                  {isLoading ? (
                    <span className="d-flex align-items-center justify-content-center gap-2">
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      Creando cuenta...
                    </span>
                  ) : (
                    <>
                      <i className="bi bi-person-plus me-2"></i>
                      Registrarme ahora
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Info adicional */}
            <div className="text-center mt-4 p-3" style={{ backgroundColor: '#f8f7ff', borderRadius: '12px' }}>
              <p className="small text-muted mb-0">
                <i className="bi bi-info-circle me-2" style={{ color: 'var(--violet-main)' }}></i>
                Al registrarte, aceptas recibir actualizaciones académicas
              </p>
            </div>
          </div>
        </div>
      </div>

      <WhatsappBtn />
    </main>
  );
}