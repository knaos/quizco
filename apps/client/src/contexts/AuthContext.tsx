import React, { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./auth-context";
import { loginWithPassword } from "../auth";

const HOST_TOKEN_KEY = "quizco_host_token";
const ADMIN_TOKEN_KEY = "quizco_admin_token";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hostToken, setHostToken] = useState<string | null>(
    sessionStorage.getItem(HOST_TOKEN_KEY)
  );
  const [adminToken, setAdminToken] = useState<string | null>(
    sessionStorage.getItem(ADMIN_TOKEN_KEY)
  );

  const isHostAuthenticated = !!hostToken;
  const isAdminAuthenticated = !!adminToken;

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === HOST_TOKEN_KEY) {
        setHostToken(e.newValue);
      }
      if (e.key === ADMIN_TOKEN_KEY) {
        setAdminToken(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const loginHost = async (password: string): Promise<boolean> => {
    try {
      const { token } = await loginWithPassword("host", password);
      setHostToken(token);
      sessionStorage.setItem(HOST_TOKEN_KEY, token);
      return true;
    } catch {
      return false;
    }
  };

  const loginAdmin = async (password: string): Promise<boolean> => {
    try {
      const { token } = await loginWithPassword("admin", password);
      setAdminToken(token);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
      return true;
    } catch {
      return false;
    }
  };

  const logoutHost = () => {
    setHostToken(null);
    sessionStorage.removeItem(HOST_TOKEN_KEY);
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        isHostAuthenticated,
        isAdminAuthenticated,
        hostToken,
        adminToken,
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
