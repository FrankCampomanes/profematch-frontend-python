import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import ProfesorCard from "../../components/ProfesorCard";

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

export default function BuscarEstudiante() {

  const [busqueda, setBusqueda] = useState("");
  const [deptoSel, setDeptoSel] = useState("Todos");

  const [profesores, setProfesores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfesores = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/professors`);
        const data = await res.json();
        if (res.ok) {
          setProfesores(data);
        } else {
          setError(getErrorMessage(data) || "Error al cargar los profesores");
        }
      } catch (err) {
        setError("Error de conexión al servidor");
      } finally {
        setCargando(false);
      }
    };
    fetchProfesores();
  }, []);

  const todosLosCursos = profesores.flatMap(p => {
    if (!p.cursos) return [];
    return p.cursos.map(c => typeof c === 'object' ? c.nombre : c);
  });
  const especialidades = [
    "Todos",
    ...new Set(todosLosCursos)
  ];



  // FILTRADO DINÁMICO SOBRE PROFESORES
  let profesoresFiltrados = profesores.filter((profe) => {

    const textoBusqueda = busqueda.trim().toLowerCase();
    
    // Convertir el arreglo de cursos a string para la búsqueda
    const cursosStr = Array.isArray(profe.cursos) 
      ? profe.cursos.map(c => (typeof c === 'object' ? c.nombre : c)).join(" ").toLowerCase() 
      : "";

    const cumpleBusqueda =
      profe.nombre.toLowerCase().includes(textoBusqueda) ||
      cursosStr.includes(textoBusqueda) ||
      (profe.curso && profe.curso.toLowerCase().includes(textoBusqueda)); // Respaldo por si hay profes antiguos

    const cumpleDepto =
      deptoSel === "Todos" ||
      (Array.isArray(profe.cursos) && profe.cursos.map(c => typeof c === 'object' ? c.nombre : c).includes(deptoSel));

    return (
      cumpleBusqueda &&
      cumpleDepto
    );
  });

  // LÍMITE DE 10 SI NO HAY BÚSQUEDA ACTIVA
  const isBuscando = busqueda.trim() !== "" || deptoSel !== "Todos";
  if (!isBuscando) {
    profesoresFiltrados = profesoresFiltrados.slice(0, 10);
  }

  const textGradient = {
    background: "linear-gradient(135deg, #57227ae5 0%, #9f39c7fa 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  };

  return (
    <div className="main-layout">

      <Sidebar role="estudiante" />

      <main className="dashboard-content">

        <header className="mb-4">
          <h2 className="fw-bold" style={textGradient}>
            Explorar Profesores
          </h2>

          <p className="text-muted">
            Encuentra al mentor ideal basado en su especialidad y desempeño real.
          </p>
        </header>

        {/* FILTROS */}
        <section className="card border-0 shadow-sm p-4 rounded-4 mb-5 bg-white">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0">Búsqueda Principal</h6>
          </div>

          <div className="row g-4 align-items-end">

            {/* BUSCADOR */}
            <div className="col-lg-4">

              <label className="form-label small fw-bold text-secondary">
                Buscar por nombre o curso
              </label>

              <div className="input-group">

                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>

                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder="Ej: Miguel o Redacción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />

              </div>
            </div>

            {/* ESPECIALIDAD */}
            <div className="col-md-4 col-lg-3">

              <label className="form-label small fw-bold text-secondary">
                Especialidad / Curso
              </label>

              <select
                className="form-select bg-light"
                value={deptoSel}
                onChange={(e) => setDeptoSel(e.target.value)}
              >

                {especialidades.map((esp) => (
                  <option key={esp} value={esp}>
                    {esp}
                  </option>
                ))}

              </select>
            </div>



            {/* RESET */}
            <div className="col-lg-1">

              <button
                className="btn btn-light w-100 border text-muted"
                onClick={() => {
                  setBusqueda("");
                  setDeptoSel("Todos");
                }}
                title="Limpiar filtros"
              >
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>

            </div>

          </div>
        </section>

        {/* RESULTADOS */}
        <div className="d-flex justify-content-between align-items-center mb-4">

          <h5 className="fw-bold mb-0">
            Resultados ({cargando ? "..." : profesoresFiltrados.length})
          </h5>

        </div>

        {/* CARDS */}
        {cargando ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <h5 className="text-muted">Cargando profesores...</h5>
          </div>
        ) : error ? (
          <div className="text-center py-5">
            <div className="bg-light d-inline-block p-4 rounded-circle mb-3">
              <i className="bi bi-exclamation-triangle fs-1 text-danger"></i>
            </div>
            <h5 className="text-danger">{error}</h5>
          </div>
        ) : profesoresFiltrados.length > 0 ? (

          <div className="row g-4">

            {profesoresFiltrados.map((profe, index) => (

              <div
                key={profe.id || `profe-${index}`}
                className="col-sm-6 col-lg-4 col-xl-3"
              >
                <ProfesorCard profesor={profe} isTutoria={false} />
              </div>

            ))}

          </div>

        ) : (

          <div className="text-center py-5">

            <div className="bg-light d-inline-block p-4 rounded-circle mb-3">
              <i className="bi bi-emoji-frown fs-1 text-muted"></i>
            </div>

            <h5 className="text-muted">
              {profesores.length === 0 
                ? "Aún no hay profesores registrados en la plataforma." 
                : "No encontramos resultados para tu búsqueda."}
            </h5>

          </div>

        )}

      </main>
    </div>
  );
}