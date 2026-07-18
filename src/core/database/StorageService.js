const KEYS = {
  USERS: "users", // MOCK PARA AUTENTICACIÓN Y ADMINISTRACIÓN DE USUARIOS
};

export const StorageService = {
  initialize: () => {
    // NUEVO: Inicializar Usuarios (Auth Mock y Admin)
    if (!localStorage.getItem(KEYS.USERS)) {
      const demoUsers = [
        { id: 1, email: "admin@profematch.com", pass: "admin123", role: "admin", status: "aprobado", nombres: "Admin" },
        { id: 2, email: "prof@profematch.com", pass: "prof123", role: "profesor", status: "aprobado", nombres: "Profesor Demo" },
        { id: 3, email: "estu@profematch.com", pass: "estu123", role: "estudiante", status: "aprobado", nombres: "Estudiante Demo" }
      ];
      localStorage.setItem(KEYS.USERS, JSON.stringify(demoUsers));
    }
  },

  // --- MÉTODOS DE AUTENTICACIÓN Y USUARIOS (MOCK DB PARA ADMIN) ---
  
  getUsers: () => {
    const data = localStorage.getItem(KEYS.USERS);
    let users = data ? JSON.parse(data) : [];
    
    if (users.length === 0) {
      const demoUsers = [
        { id: 1, email: "admin@profematch.com", pass: "admin123", role: "admin", status: "aprobado", nombres: "Admin" },
        { id: 2, email: "prof@profematch.com", pass: "prof123", role: "profesor", status: "aprobado", nombres: "Profesor Demo" },
        { id: 3, email: "estu@profematch.com", pass: "estu123", role: "estudiante", status: "aprobado", nombres: "Estudiante Demo" }
      ];
      localStorage.setItem(KEYS.USERS, JSON.stringify(demoUsers));
      users = demoUsers;
    }
    return users;
  },

  registerUser: (userData) => {
    const users = StorageService.getUsers();
    const newUser = {
      ...userData,
      id: Date.now(),
      status: userData.status || "pendiente",
      registeredAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return newUser;
  },

  loginUser: (email, password) => {
    const users = StorageService.getUsers();
    const user = users.find(u => u.email === email && u.pass === password);
    
    if (!user) {
      return { success: false, error: "invalid_credentials" };
    }

    if (user.status === "pendiente") {
      return { success: false, error: "pending_approval" };
    }

    return { success: true, user };
  },

  updateUserStatus: (userId, newStatus) => {
    const users = StorageService.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].status = newStatus;
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      return true;
    }
    return false;
  },

  // --- STUBS COMPATIBILIDAD ANTERIOR (RETORNAN VACÍO/SEGURO) ---
  hydrateProfessors: () => {},
  initializeStudentStats: () => {},
  getProfessors: () => [],
  getProfessorByEmail: () => null,
  saveProfessorProfile: () => {},
  getCompleteProfessors: () => [],
  getStudentStats: () => ({ score: 100, totalHours: 0, badges: [] }),
  updateStudentStats: () => {},
  updateScore: () => {},
  getTutoringSessions: () => [],
  saveTutoringSession: () => {},
  updateTutoringSession: () => {},
  getReviews: () => [],
  saveReview: () => {},
  getNotifications: () => [],
  saveNotification: () => {},
  markNotificationAsRead: () => {},
  updateProfessorScore: () => {},
  getNotificationsProfesor: () => [],
  saveNotificationProfesor: () => {},
  markNotificationProfesorAsRead: () => {},
  getSessions: () => [],
  saveSession: () => {},
  updateSession: () => {}
};