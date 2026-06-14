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
      balance: Number(user?.balance || 0),
      frozenBalance: Number(user?.frozenBalance || 0),
    },
    loggedAt: new Date().toISOString(),
  });
}

function updateBalance(balance = {}) {
  const session = readSession();
  if (!session.user) return session;
  return writeSession({
    ...session,
    user: {
      ...session.user,
      balance: Number(balance.balance || 0),
      frozenBalance: Number(balance.frozenBalance || 0),
    },
  });
}

function updateRole(role, user = null) {
  const session = readSession();
  if (!session.user) return session;
  const nextUser = user || session.user;
  return writeSession({
    ...session,
    role,
    user: {
      ...session.user,
      ...nextUser,
      role,
    },
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
  updateBalance,
  updateRole,
};
