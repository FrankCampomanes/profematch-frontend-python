import { useState } from "react";
import { StorageService } from "../core/database/StorageService";
import { courseDurations } from "../data/profesoresData";

export default function CheckoutModal({ sesion, onClose, onSuccess }) {
  const [tarjeta, setTarjeta] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [cvv, setCvv] = useState("");
  const [paso, setPaso] = useState(1);
  const [transaccionId, setTransaccionId] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");

  const duracion = courseDurations[sesion.curso] || 1.5;
  const tarifa = sesion.precioHora || 10;
  const comision = tarifa * 0.15;
  const total = tarifa + comision;

  const handleTarjetaChange = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, "");
    if (soloNumeros.length <= 16) setTarjeta(soloNumeros);
  };

  const handleVencimientoChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.substring(0, 4);

    if (val.length > 2) {
      val = val.substring(0, 2) + "/" + val.substring(2);
    }
    setVencimiento(val);
  };

  const handleCvvChange = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, "");
    if (soloNumeros.length <= 3) setCvv(soloNumeros);
  };

  const validarFormulario = () => {
    if (!tarjeta || !vencimiento || !cvv) {
      setErrorValidacion("Por favor completa todos los campos de la tarjeta.");
      return false;
    }

    if (tarjeta.length !== 16) {
      setErrorValidacion("La tarjeta debe tener exactamente 16 dígitos.");
      return false;
    }

    if (cvv.length !== 3) {
      setErrorValidacion("El CVV debe tener 3 dígitos.");
      return false;
    }

    if (vencimiento.length !== 5) {
      setErrorValidacion("El formato de vencimiento debe ser MM/AA.");
      return false;
    }

    const [mesStr] = vencimiento.split("/");
    const mes = parseInt(mesStr, 10);
    if (mes < 1 || mes > 12) {
      setErrorValidacion("El mes de vencimiento debe estar entre 01 y 12.");
      return false;
    }

    // Ya no se valida fecha/hora aquí porque la sesión ya tiene un horario fijo válido.
    // Solo validamos que la sesión aún no se haya llenado
    if (sesion.inscritos >= sesion.cuposMaximos) {
      setErrorValidacion("Lo sentimos, esta sesión ya ha alcanzado su límite de cupos.");
      return false;
    }

    // Validación de conflicto de horarios para el alumno
    const todasSesiones = StorageService.getSessions();
    const misSesionesRaw = StorageService.getTutoringSessions();
    
    // Sincronizar el estado de la reserva con el estado real de la sesión (igual que en TutoriasEstudiante)
    const misSesiones = misSesionesRaw.map(reserva => {
      const sesionReal = todasSesiones.find(s => s.id === reserva.sesionId);
      if (sesionReal && sesionReal.estado === "Finalizada" && reserva.estado !== "Cancelada") {
        return { ...reserva, estado: "Completada" };
      }
      return reserva;
    });

    const fechaHoraSesion = new Date(`${sesion.fecha}T${sesion.hora}:00`);
    const tiempoInicioNuevo = fechaHoraSesion.getTime();
    const tiempoFinNuevo = tiempoInicioNuevo + duracion * 60 * 60 * 1000;

    const hayConflicto = misSesiones.some(miSesion => {
      // Ignorar sesiones que no estén activamente programadas/confirmadas
      if (miSesion.estado !== "Confirmada") return false;
      
      const tiempoInicioExistente = new Date(miSesion.fechaHora).getTime();
      const duracionExistente = miSesion.duracionEstimada || 1.5;
      const tiempoFinExistente = tiempoInicioExistente + duracionExistente * 60 * 60 * 1000;

      return (tiempoInicioNuevo < tiempoFinExistente) && (tiempoFinNuevo > tiempoInicioExistente);
    });

    if (hayConflicto) {
      setErrorValidacion("Ya tienes una tutoría agendada que se cruza con este horario. Por favor elige otra sesión.");
      return false;
    }

    setErrorValidacion("");
    return true;
  };

  const handleConfirmar = (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const fechaHoraStr = `${sesion.fecha}T${sesion.hora}:00`;
    const fechaHora = new Date(fechaHoraStr).toISOString();

    const nuevaInscripcion = {
      sesionId: sesion.id,
      profesorId: sesion.profesorId,
      profesorNombre: sesion.profesorNombre,
      curso: sesion.curso,
      foto: sesion.foto,
      fechaHora,
      fechaOriginal: sesion.fecha,
      horaOriginal: sesion.hora,
      totalPagado: total,
      estado: "Confirmada",
      duracionEstimada: duracion,
      enlace_reunion: sesion.enlace_reunion
    };

    // Guardar inscripción del alumno
    StorageService.saveTutoringSession(nuevaInscripcion);
    
    // Actualizar cupos de la sesión en el profesor
    StorageService.updateSession(sesion.id, { inscritos: (sesion.inscritos || 0) + 1 });

    setTransaccionId(`TXN-${Math.floor(Math.random() * 1000000)}`);
    setPaso(2);
  };

  const handleCerrar = () => {
    if (paso === 2) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 rounded-4 shadow">
          {paso === 1 ? (
            <>
              <div className="modal-header border-bottom-0 pb-0" style={{ background: "linear-gradient(135deg, #7B1FA2 0%, #E91E63 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                <h5 className="modal-title fw-bold">Confirmar Inscripción</h5>
                <button type="button" className="btn-close" onClick={onClose} style={{ filter: "invert(0)" }}></button>
              </div>
              <div className="modal-body pt-2">
                <div className="d-flex align-items-center mb-4 bg-light p-3 rounded-3">
                  <img src={sesion.foto} alt={sesion.profesorNombre} className="rounded-circle me-3" width="50" height="50" style={{ objectFit: 'cover' }} />
                  <div>
                    <h6 className="mb-0 fw-bold">{sesion.curso} con {sesion.profesorNombre}</h6>
                    <small className="text-primary d-block fw-bold mb-1">Tema: {sesion.tema || "General"}</small>
                    <small className="text-muted d-block">
                      <i className="bi bi-calendar-event me-1"></i> {sesion.fecha} a las {sesion.hora}
                    </small>
                    <small className="text-muted d-block">
                      <i className="bi bi-clock me-1"></i> Duración: {duracion}h
                    </small>
                  </div>
                </div>

                <form onSubmit={handleConfirmar}>
                  <div className="bg-light p-3 rounded-3 mb-4">
                    <h6 className="fw-bold mb-3">Detalle de Pago</h6>
                    <div className="d-flex justify-content-between mb-1 small">
                      <span className="text-muted">Tarifa de sesión ({duracion}h)</span>
                      <span>S/ {tarifa.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2 small">
                      <span className="text-muted">Comisión ProfeMatch (15%)</span>
                      <span>S/ {comision.toFixed(2)}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="d-flex justify-content-between fw-bold">
                      <span>Total a pagar</span>
                      <span className="text-primary">S/ {total.toFixed(2)}</span>
                    </div>
                  </div>

                  <h6 className="fw-bold mb-3">Método de Pago (Simulado)</h6>
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Número de Tarjeta (16 dígitos)"
                      value={tarjeta}
                      onChange={handleTarjetaChange}
                      required
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="MM/AA"
                        value={vencimiento}
                        onChange={handleVencimientoChange}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <input
                        type="password"
                        className="form-control"
                        placeholder="CVV"
                        value={cvv}
                        onChange={handleCvvChange}
                        required
                      />
                    </div>
                  </div>

                  {errorValidacion && (
                    <div className="alert alert-danger p-2 small mb-3">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {errorValidacion}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary w-100 fw-bold py-2 border-0 hover-shadow" style={{ background: "linear-gradient(135deg, #7B1FA2 0%, #403fa0ff 100%)" }}>
                    Confirmar y Unirse a la Clase
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="modal-body text-center py-5">
              <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: "60px", height: "60px" }}>
                <i className="bi bi-check-lg fs-1"></i>
              </div>
              <h4 className="fw-bold text-dark mb-2">¡Inscripción Exitosa!</h4>
              <p className="text-muted mb-4">Te has unido a la sesión correctamente.</p>
              <div className="bg-light rounded p-3 mb-4 text-start">
                <small className="d-block text-muted mb-1">ID de Transacción</small>
                <strong className="text-dark">{transaccionId}</strong>
              </div>
              <button className="btn btn-primary w-100 fw-bold py-2 border-0 hover-shadow" style={{ background: "linear-gradient(135deg, #7B1FA2 0%, #403fa0ff 100%)" }} onClick={handleCerrar}>
                Ver mis tutorías
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}