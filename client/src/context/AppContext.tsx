import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { AppState, AppAction, Policy, OnboardingData, Claim, Toast } from '../types';

const initialState: AppState = {
  onboarding: null,
  policy: null,
  claims: [],
  toasts: [],
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ONBOARDING':
      return { ...state, onboarding: action.payload };
    case 'SET_POLICY':
      return { ...state, policy: action.payload };
    case 'ADD_CLAIM':
      return { ...state, claims: [action.payload, ...state.claims] };
    case 'UPDATE_CLAIM':
      return {
        ...state,
        claims: state.claims.map(c =>
          c.id === action.payload.id ? { ...c, status: action.payload.status } : c
        ),
      };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  setOnboarding: (data: OnboardingData) => void;
  setPolicy: (policy: Policy) => void;
  addClaim: (claim: Claim) => void;
  updateClaim: (id: string, status: Claim['status']) => void;
  addToast: (message: string, type: Toast['type']) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setOnboarding = (data: OnboardingData) =>
    dispatch({ type: 'SET_ONBOARDING', payload: data });

  const setPolicy = (policy: Policy) =>
    dispatch({ type: 'SET_POLICY', payload: policy });

  const addClaim = (claim: Claim) =>
    dispatch({ type: 'ADD_CLAIM', payload: claim });

  const updateClaim = (id: string, status: Claim['status']) =>
    dispatch({ type: 'UPDATE_CLAIM', payload: { id, status } });

  const addToast = (message: string, type: Toast['type']) => {
    const id = Math.random().toString(36).slice(2);
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 4000);
  };

  return (
    <AppContext.Provider value={{ state, dispatch, setOnboarding, setPolicy, addClaim, updateClaim, addToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
