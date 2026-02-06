import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email?: string;
}

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  setUser: (user: User | null) => void;
  setGuest: (isGuest: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isGuest: false,
        }),
      setGuest: (isGuest) =>
        set({
          isGuest,
          isAuthenticated: !isGuest,
          user: null,
        }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isGuest: false,
        }),
    }),
    {
      name: 'user-storage',
    }
  )
);
