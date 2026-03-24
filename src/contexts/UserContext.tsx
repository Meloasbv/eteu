import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type UserContextType = {
  userCodeId: string | null;
  accessCode: string | null;
  logout: () => void;
};

const UserContext = createContext<UserContextType>({ userCodeId: null, accessCode: null, logout: () => {} });

export function useUser() {
  return useContext(UserContext);
}

const USER_KEY = "bible-access-code";
const USER_ID_KEY = "bible-user-code-id";

export function UserProvider({ children }: { children: ReactNode }) {
  const [userCodeId, setUserCodeId] = useState<string | null>(() => {
    try { return localStorage.getItem(USER_ID_KEY); } catch { return null; }
  });
  const [accessCode, setAccessCode] = useState<string | null>(() => {
    try { return localStorage.getItem(USER_KEY); } catch { return null; }
  });

  useEffect(() => {
    if (userCodeId && accessCode) {
      try {
        localStorage.setItem(USER_ID_KEY, userCodeId);
        localStorage.setItem(USER_KEY, accessCode);
      } catch {}
    }
  }, [userCodeId, accessCode]);

  const logout = () => {
    setUserCodeId(null);
    setAccessCode(null);
    try {
      localStorage.removeItem(USER_ID_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  };

  return (
    <UserContext.Provider value={{ userCodeId, accessCode, logout }}>
      {children}
    </UserContext.Provider>
  );
}

// Export a setter hook for the login component
export function useSetUser() {
  const [, setUserCodeId] = useState<string | null>(null);
  const [, setAccessCode] = useState<string | null>(null);
  return { setUserCodeId, setAccessCode };
}
