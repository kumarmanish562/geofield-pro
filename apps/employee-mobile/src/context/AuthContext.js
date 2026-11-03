import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  acceptInvitation,
  login as loginRequest,
  logout as logoutRequest,
  restoreSession,
} from "../services/apiClient.js";
import { setOfflineOwner } from "../services/offlineStore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    restoreSession()
      .then((restoredUser) => {
        setOfflineOwner(restoredUser?.id);
        setUser(restoredUser);
      })
      .finally(() => setStatus("ready"));
  }, []);

  const login = useCallback(async (email, password) => {
    const authenticatedUser = await loginRequest(email, password);
    setOfflineOwner(authenticatedUser.id);
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setOfflineOwner(null);
      setUser(null);
    }
  }, []);

  const acceptInvite = useCallback(async (token, name, password) => {
    const authenticatedUser = await acceptInvitation(token, name, password);
    setOfflineOwner(authenticatedUser.id);
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading: status === "loading",
      isAuthenticated: Boolean(user),
      login,
      logout,
      acceptInvite,
    }),
    [acceptInvite, login, logout, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
