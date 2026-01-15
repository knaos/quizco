import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

const HOST_AUTH_KEY = "quizco_host_authenticated";
const ADMIN_PASSWORD_KEY = "quizco_admin_password";

interface AuthContextType {
  isHostAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  adminPassword: string | null;
  loginHost: (password: string) => boolean;
  loginAdmin: (password: string) => void;
  logoutHost: () => void;
  logoutAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isHostAuthenticated, setIsHostAuthenticated] = useState(
    localStorage.getItem(HOST_AUTH_KEY) === "true"
  );
  const [adminPassword, setAdminPassword] = useState<string | null>(
    localStorage.getItem(ADMIN_PASSWORD_KEY)
  );

  const isAdminAuthenticated = !!adminPassword;

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === HOST_AUTH_KEY) {
        setIsHostAuthenticated(e.newValue === "true");
      }
      if (e.key === ADMIN_PASSWORD_KEY) {
        setAdminPassword(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const loginHost = (password: string): boolean => {
    if (password === "host123") {
      setIsHostAuthenticated(true);
      localStorage.setItem(HOST_AUTH_KEY, "true");
      return true;
    }
    return false;
  };

  const loginAdmin = (password: string) => {
    setAdminPassword(password);
    localStorage.setItem(ADMIN_PASSWORD_KEY, password);
  };

  const logoutHost = () => {
    setIsHostAuthenticated(false);
    localStorage.removeItem(HOST_AUTH_KEY);
  };

  const logoutAdmin = () => {
    setAdminPassword(null);
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        isHostAuthenticated,
        isAdminAuthenticated,
        adminPassword,
        loginHost,
        loginAdmin,
        logoutHost,
        logoutAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
