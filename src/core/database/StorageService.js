const KEYS = {
  USERS: "users", // MOCK PARA AUTENTICACIÓN Y ADMINISTRACIÓN DE USUARIOS
};

export const StorageService = {
  initialize: () => {
    // Ya no se inicializan usuarios mock
  },

  // --- MÉTODOS DE AUTENTICACIÓN Y USUARIOS (MOCK DB PARA ADMIN) ---

  getUsers: () => {
    // Solo devolvemos un arreglo vacío como fallback seguro para evitar que la UI falle
    return [];
  },

  // Los métodos registerUser, loginUser y updateUserStatus han sido removidos
  // ya que la autenticación ahora es manejada íntegramente por JWT en el Backend.

  // --- STUBS COMPATIBILIDAD ANTERIOR (RETORNAN VACÍO/SEGURO) ---
  hydrateProfessors: () => { },
  initializeStudentStats: () => { },
  getProfessors: () => [],
  getProfessorByEmail: () => null,
  saveProfessorProfile: () => { },
  getCompleteProfessors: () => [],
  getStudentStats: () => ({ score: 100, totalHours: 0, badges: [] }),
  updateStudentStats: () => { },
  updateScore: () => { },
  getTutoringSessions: () => [],
  saveTutoringSession: () => { },
  updateTutoringSession: () => { },
  getReviews: () => [],
  saveReview: () => { },
  getNotifications: () => [],
  saveNotification: () => { },
  markNotificationAsRead: () => { },
  updateProfessorScore: () => { },
  getNotificationsProfesor: () => [],
  saveNotificationProfesor: () => { },
  markNotificationProfesorAsRead: () => { },
  getSessions: () => [],
  saveSession: () => { },
  updateSession: () => { }
};