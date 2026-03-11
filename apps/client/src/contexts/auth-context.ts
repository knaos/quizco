import { createContext, useContext } from "react";

export interface AuthContextType {
  isHostAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  adminPassword: string | null;
  loginHost: (password: string) => boolean;
  loginAdmin: (password: string) => void;
  logoutHost: () => void;
  logoutAdmin: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
