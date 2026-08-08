import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  userRole: 'patient' | 'doctor' | 'admin' | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setUserRole: (role: 'patient' | 'doctor' | 'admin' | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      userRole: null,
      loading: true,
      setUser: (user) => {
        set({ user });
        if (typeof window !== 'undefined' && user) {
          localStorage.setItem('myhealth_user', JSON.stringify(user));
        }
      },
      setUserRole: (userRole) => {
        set({ userRole });
        if (typeof window !== 'undefined' && userRole) {
          localStorage.setItem('myhealth_role', userRole);
        }
      },
      setLoading: (loading) => set({ loading }),
      signOut: () => {
        set({ user: null, userRole: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('myhealth_user');
          localStorage.removeItem('myhealth_role');
        }
      },
    }),
    {
      name: 'myhealth-auth-storage',
      partialize: (state) => ({
        user: state.user,
        userRole: state.userRole,
      }),
    }
  )
);
