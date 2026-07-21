import React, { useState, useEffect } from 'react';
import Sidebar from "../../components/Sidebar";

const EvaluacionesProfesor = () => {
  const [resenas, setResenas] = useState([]);
  const [filtro, setFiltro] = useState(0); // 0 = Ver todas
  const [palabraFiltro, setPalabraFiltro] = useState(''); // Filtro por Nube de Palabras
  const [respuestas, setRespuestas] = useState({});
  const [nubePalabras, setNubePalabras] = useState([]);
  const [advertencias, setAdvertencias] = useState([]);

  useEffect(() => {
    const fetchResenas = async () => {
      try {
        const userSession = JSON.parse(localStorage.getItem('userSession'));
        if (!userSession) return;
        
        const res = await fetch(`${import.meta.env.VITE_API_URL}/resenas/profesor/${userSession.id}`);
        if (res.ok) {
          const data = await res.json();
          setResenas(data);
          generarNubePalabras(data);
          // Pre-cargar respuestas
          const respMap = {};
          data.forEach(r => {
             if (r.respuesta_profesor) respMap[r.id] = r.respuesta_profesor;
          });
          setRespuestas(respMap);
        }
      } catch (err) {
        console.error("Error cargando reseñas:", err);
      }
    };

    const fetchAdvertencias = async () => {
      try {
        const userSession = JSON.parse(localStorage.getItem('userSession'));
        if (!userSession) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/advertencias/profesor/${userSession.id}`);
        if (res.ok) {
          const data = await res.json();
          setAdvertencias(data.filter(a => !a.leida));
        }
      } catch (err) {}
    };

    fetchResenas();
    fetchAdvertencias();
  }, []);

  // LÓGICA REQUERIDA: PROCESAR COMENTARIOS PARA LA NUBE DE PALABRAS (TAG CLOUD)
  const generarNubePalabras = (listaResenas) => {
    // Filtro estricto según requerimientos: solo estas palabras se mostrarán
    const palabrasPermitidas = ['excelente', 'metodologia', 'metodología', 'interesante', 'falta', 'mal', 'poco'];
    const conteo = {};

    listaResenas.forEach(r => {
      // Limpiar signos de puntuación y pasar a minúsculas
      const palabras = r.comentario
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/);

      palabras.forEach(palabra => {
        if (palabrasPermitidas.includes(palabra)) {
          // Normalizar metodología para agrupar
          const key = (palabra === 'metodologia') ? 'metodología' : palabra;
          conteo[key] = (conteo[key] || 0) + 1;
        }
      });
    });

    // Ensure all permitted words appear even with 0 count
    palabrasPermitidas.forEach(p => {
       const key = (p === 'metodologia') ? 'metodología' : p;
       if (!conteo[key]) conteo[key] = 0;
    });

    // Convertir a estructura de array con tamaños adaptativos para CSS
    const resultadoNube = Object.keys(conteo).map(text => {
      const repeticiones = conteo[text];
      let size = '0.75rem';
      if (repeticiones > 2) size = '1.3rem';
      else if (repeticiones === 2) size = '1.05rem';

      return { text, size, count: repeticiones };
    });

    setNubePalabras(resultadoNube.sort((a, b) => b.count - a.count));
  };

  // Función para manejar las respuestas del profesor
  const enviarRespuesta = async (id, texto) => {
    if (!texto.trim()) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/resenas/${id}/responder`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ respuesta: texto })
      });
      if (res.ok) {
         setRespuestas({ ...respuestas, [id]: texto });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const marcarAdvertenciaLeida = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/admin/advertencias/${id}/marcar-leida`, { method: 'PUT' });
      setAdvertencias(prev => prev.filter(a => a.id !== id));
    } catch (err) {}
  };

  // Calculate dynamic average rating
  const avgRating = resenas.length > 0 
    ? (resenas.reduce((sum, r) => sum + r.estrellas, 0) / resenas.length).toFixed(1)
    : '0.0';

  const renderEstrellas = (cantidad) => {
    return Array.from({ length: 5 }, (_, i) => {
      const index = i + 1;
      let iconClass = 'bi-star text-muted';
      if (cantidad >= index) iconClass = 'bi-star-fill text-warning';
      else if (cantidad >= index - 0.5) iconClass = 'bi-star-half text-warning';
      
      return (
        <i key={i} className={`bi ${iconClass} me-1`}></i>
      );
    });
  };

  // Lógica de filtrado combinada (Estrellas + Palabra seleccionada de la Nube)
  const resenasFiltradas = resenas.filter(r => {
    let cumpleEstrellas = true;
    if (filtro !== 0) {
      // 4 estrellas incluye desde 3.5 hasta 4.4
      cumpleEstrellas = r.estrellas >= (filtro - 0.5) && r.estrellas < (filtro + 0.5);
    }
    const cumplePalabra = !palabraFiltro || r.comentario.toLowerCase().includes(palabraFiltro.toLowerCase());
    return cumpleEstrellas && cumplePalabra;
  });

  return (
    <div className="d-flex">
      <Sidebar role="profesor" />
    
      <div className="container-fluid p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <h2 className="mb-4 fw-bold" style={{ color: '#1F0954' }}>Mis Reseñas y Calificaciones</h2>
        
        {/* BANNER DE ADVERTENCIAS */}
        {advertencias.length > 0 && (
          <div className="mb-4">
            {advertencias.map(adv => (
              <div key={adv.id} className="alert alert-danger d-flex justify-content-between align-items-center shadow-sm rounded-4 border-0" role="alert">
                <div>
                  <h6 className="alert-heading fw-bold mb-1"><i className="bi bi-exclamation-triangle-fill me-2"></i>Advertencia de Administración</h6>
                  <p className="mb-0 small">{adv.mensaje}</p>
                  <small className="opacity-75">{adv.fecha}</small>
                </div>
                <button type="button" className="btn btn-sm btn-outline-danger rounded-pill fw-bold" onClick={() => marcarAdvertenciaLeida(adv.id)}>
                  Marcar como leída
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* HEADER CON FILTRO */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <p className="text-muted small mb-0">Gestiona tu feedback y analiza los términos más comunes de tus alumnos.</p>
          </div>
          <div className="d-flex gap-3 align-items-center">
            {palabraFiltro && (
              <button 
                className="btn btn-sm btn-danger rounded-pill px-3 d-flex align-items-center gap-1"
                onClick={() => setPalabraFiltro('')}
              >
                Limpiar Filtro: "{palabraFiltro}" <i className="bi bi-x-circle-fill"></i>
              </button>
            )}
            <select 
              className="form-select shadow-sm border-0" 
              style={{ width: '200px' }}
              value={filtro}
              onChange={(e) => setFiltro(Number(e.target.value))}
            >
              <option value="0">Todas las estrellas</option>
              <option value="5">5 Estrellas</option>
              <option value="4">4 Estrellas</option>
              <option value="3">3 Estrellas</option>
              <option value="2">2 Estrellas</option>
              <option value="1">1 Estrella</option>
            </select>
            <div className="bg-white p-2 rounded shadow-sm border px-3 d-flex align-items-center gap-1">
              <span className="fw-bold text-primary">{avgRating} / 5</span>
              <i className="bi bi-star-fill text-warning"></i>
            </div>
          </div>
        </div>
        
        <div className="row">
          {/* COLUMNA IZQUIERDA: LISTA DE RESEÑAS */}
          <div className="col-lg-8">
            <div className="row">
              {resenasFiltradas.length > 0 ? (
                resenasFiltradas.map((res, index) => (
                  <div className="col-12 mb-4" key={index}>
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '15px' }}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between">
                          <h6 className="fw-bold mb-0">{res.alumno}</h6>
                          <small className="text-muted">{res.fecha}</small>
                        </div>
                        <div className="my-2">
                          {renderEstrellas(res.estrellas)}
                        </div>
                        <p className="card-text text-secondary fst-italic">"{res.comentario}"</p>
                        
                        {/* SECCIÓN DE RESPUESTA */}
                        <div className="mt-3 pt-3 border-top">
                          {respuestas[res.id] ? (
                            <div className="p-2 rounded bg-light border-start border-primary border-4">
                              <small className="fw-bold d-block text-primary">Tu respuesta:</small>
                              <span className="small text-muted">{respuestas[res.id]}</span>
                            </div>
                          ) : (
                            <div className="input-group input-group-sm">
                              <input 
                                type="text" 
                                className="form-control border-light-subtle" 
                                placeholder="Agradece el feedback..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    enviarRespuesta(res.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <button 
                                className="btn btn-outline-primary"
                                onClick={(e) => {
                                  const input = e.target.previousSibling;
                                  enviarRespuesta(res.id, input.value);
                                  input.value = '';
                                }}
                              >
                                Responder
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-12 text-center py-5">
                  <div className="alert alert-light border shadow-sm text-muted">
                    No se encontraron reseñas con los criterios seleccionados.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: DISTRIBUCIÓN Y NUEVA NUBE DE PALABRAS */}
          <div className="col-lg-4">
            {/* COMPONENTE EXIGIDO: NUBE DE PALABRAS (TAG CLOUD) */}
            <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: '15px' }}>
              <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                <i className="bi bi-cloud-text text-indigo"></i> Nube de Palabras
              </h5>
              <p className="text-muted small mb-3">Términos recurrentes en las opiniones. Haz clic en uno para filtrar.</p>
              
              <div className="d-flex flex-wrap justify-content-center align-items-center gap-2 p-2 bg-light rounded-4 border border-light-subtle" style={{ minHeight: '120px' }}>
                {nubePalabras.length > 0 ? (
                  nubePalabras.map((word, i) => (
                    <span
                      key={i}
                      className={`badge cursor-pointer p-2 rounded-pill shadow-sm transition-all ${
                        palabraFiltro === word.text ? 'bg-primary text-white' : 'bg-white text-dark border'
                      }`}
                      style={{ 
                        fontSize: word.size, 
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                      }}
                      onClick={() => setPalabraFiltro(word.text === palabraFiltro ? '' : word.text)}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    >
                      {word.text} <span className="opacity-50 fw-normal" style={{ fontSize: '0.65rem' }}>({word.count})</span>
                    </span>
                  ))
                ) : (
                  <span className="small text-muted text-center">No hay suficientes datos para compilar palabras clave.</span>
                )}
              </div>
            </div>

            {/* DISTRIBUCIÓN ESTADÍSTICA */}
            <div className="card border-0 shadow-sm p-4" style={{ borderRadius: '15px' }}>
              <h5 className="fw-bold mb-4">Distribución</h5>
              {[5, 4, 3, 2, 1].map(num => {
                const cantidad = resenas.filter(r => Math.round(r.estrellas) === num).length;
                const porcentaje = (cantidad / resenas.length) * 100 || 0;
                return (
                  <div className="mb-3" key={num}>
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="d-flex align-items-center gap-1">
                        {num} <i className="bi bi-star-fill text-warning" style={{ fontSize: '0.8rem' }}></i>
                      </span>
                      <span className="text-muted">{cantidad}</span>
                    </div>
                    <div className="progress" style={{ height: '8px', backgroundColor: '#e9ecef' }}>
                      <div 
                        className="progress-bar bg-warning" 
                        style={{ width: `${porcentaje}%`, borderRadius: '4px' }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECCIÓN INFORMATIVA CON COLOR ÍNDIGO SÓLIDO (#3F51B5) */}
        <div className="mt-4 p-3 text-white rounded-4 shadow-sm d-flex align-items-start gap-3" style={{ backgroundColor: '#3F51B5' }}>
          <i className="bi bi-lightbulb fs-5 mt-0.5"></i>
          <div>
            <h6 className="fw-bold mb-1">Tip de Reputación Docente</h6>
            <p className="mb-0 small opacity-90">
              Responder a las reseñas de tus alumnos mejora tu visibilidad en ProfeMatch en un 20%. Mantén un canal activo de retroalimentación.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluacionesProfesor;