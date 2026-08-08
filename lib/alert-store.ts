import { create } from 'zustand';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
  onConfirm?: () => void;
  showAlert: (title: string, message: string, type?: AlertType, onConfirm?: () => void) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  type: 'info',
  onConfirm: undefined,
  
  showAlert: (title, message, type = 'info', onConfirm) => set({
    isOpen: true,
    title,
    message,
    type,
    onConfirm
  }),
  
  hideAlert: () => set({
    isOpen: false,
    onConfirm: undefined
  })
}));