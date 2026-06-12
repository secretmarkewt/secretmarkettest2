const SESSION_STORAGE_KEY = "secmarket-session";

function sessionUsers() {
  return window.SECMARKET_DATA.demoUsers;
}

function defaultSession() {
  return {
    role: "guest",
    user: null,
  };
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultSession();
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return defaultSession();
  }
}

function writeSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

function loginAs(role) {
  const user = sessionUsers().find((candidate) => candidate.role === role) || null;
  return writeSession({
    role,
    user,
    loggedAt: new Date().toISOString(),
  });
}

function loginUser(user, fallbackRole = "buyer") {
  const role = user?.role || fallbackRole;
  return writeSession({
    role,
    user: {
      id: user?.id,
      name: user?.name || user?.email?.split("@")[0] || "Пользователь",
      email: user?.email || "",
      telegram: user?.telegram || "",
      role,
      status: user?.status || "active",
    },
    loggedAt: new Date().toISOString(),
  });
}

function logout() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  return defaultSession();
}

function currentSession() {
  return readSession();
}

function hasRole(...roles) {
  const session = readSession();
  return roles.includes(session.role);
}

function roleLabel(role) {
  const labels = {
    admin: "Админ",
    buyer: "Покупатель",
    guest: "Гость",
    seller: "Продавец",
  };
  return labels[role] || role;
}

window.SECMARKET_SESSION = {
  currentSession,
  hasRole,
  loginAs,
  loginUser,
  logout,
  roleLabel,
};
