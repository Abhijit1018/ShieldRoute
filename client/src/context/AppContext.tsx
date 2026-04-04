import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react';
import type {
  AppState,
  AppAction,
  Policy,
  OnboardingData,
  Claim,
  Toast,
  AuthSession,
  Payment,
} from '../types';
import { getStoredRiderAuth, setStoredRiderAuth, clearStoredRiderAuth } from '../utils/riderAuth';
import { getApiErrorMessage, getMyClaims, getMyPayments, getMyPolicy, isApiError } from '../utils/api';

const initialState: AppState = {
  auth: null,
  onboarding: null,
  policy: null,
  claims: [],
  payments: [],
  toasts: [],
  isHydrating: true,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, auth: action.payload };
    case 'CLEAR_AUTH':
      return {
        ...state,
        auth: null,
        onboarding: null,
        policy: null,
        claims: [],
        payments: [],
      };
    case 'SET_HYDRATING':
      return { ...state, isHydrating: action.payload };
    case 'SET_ONBOARDING':
      return { ...state, onboarding: action.payload };
    case 'SET_POLICY':
      return {
        ...state,
        policy: action.payload,
        onboarding: action.payload?.onboarding || null,
      };
    case 'SET_CLAIMS':
      return { ...state, claims: action.payload };
    case 'ADD_CLAIM':
      return { ...state, claims: [action.payload, ...state.claims] };
    case 'UPDATE_CLAIM':
      return {
        ...state,
        claims: state.claims.map(c =>
          c.id === action.payload.id ? { ...c, status: action.payload.status } : c
        ),
      };
    case 'SET_PAYMENTS':
      return { ...state, payments: action.payload };
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
  setAuth: (auth: AuthSession) => void;
  clearAuth: () => void;
  setOnboarding: (data: OnboardingData) => void;
  setPolicy: (policy: Policy | null) => void;
  setClaims: (claims: Claim[]) => void;
  setPayments: (payments: Payment[]) => void;
  refreshData: (options?: { silent?: boolean }) => Promise<void>;
  addToast: (message: string, type: Toast['type']) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = Math.random().toString(36).slice(2);
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 4000);
  }, []);

  const setAuth = useCallback((auth: AuthSession) => {
    setStoredRiderAuth(auth);
    dispatch({ type: 'SET_AUTH', payload: auth });
  }, []);

  const clearAuth = useCallback(() => {
    clearStoredRiderAuth();
    dispatch({ type: 'CLEAR_AUTH' });
  }, []);

  const setOnboarding = useCallback((data: OnboardingData) => {
    dispatch({ type: 'SET_ONBOARDING', payload: data });
  }, []);

  const setPolicy = useCallback((policy: Policy | null) => {
    dispatch({ type: 'SET_POLICY', payload: policy });
  }, []);

  const setClaims = useCallback((claims: Claim[]) => {
    dispatch({ type: 'SET_CLAIMS', payload: claims });
  }, []);

  const setPayments = useCallback((payments: Payment[]) => {
    dispatch({ type: 'SET_PAYMENTS', payload: payments });
  }, []);

  const syncServerState = useCallback(async (token: string, silent = false) => {
    try {
      const policy = await getMyPolicy(token);

      if (!policy) {
        dispatch({ type: 'SET_POLICY', payload: null });
        dispatch({ type: 'SET_CLAIMS', payload: [] });
        dispatch({ type: 'SET_PAYMENTS', payload: [] });
        return;
      }

      const [claims, payments] = await Promise.all([
        getMyClaims(token),
        getMyPayments(token),
      ]);

      dispatch({ type: 'SET_POLICY', payload: policy });
      dispatch({ type: 'SET_CLAIMS', payload: claims });
      dispatch({ type: 'SET_PAYMENTS', payload: payments });
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        clearAuth();
        if (!silent) {
          addToast('Session expired. Please verify OTP again.', 'warning');
        }
        return;
      }

      if (!silent) {
        addToast(getApiErrorMessage(error, 'Unable to sync server data.'), 'danger');
      }
    }
  }, [addToast, clearAuth]);

  const refreshData = useCallback(async (options?: { silent?: boolean }) => {
    if (!state.auth?.token) return;
    await syncServerState(state.auth.token, options?.silent || false);
  }, [state.auth?.token, syncServerState]);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const stored = getStoredRiderAuth();

      if (!stored) {
        if (active) {
          dispatch({ type: 'SET_HYDRATING', payload: false });
        }
        return;
      }

      dispatch({ type: 'SET_AUTH', payload: stored });
      await syncServerState(stored.token, true);

      if (active) {
        dispatch({ type: 'SET_HYDRATING', payload: false });
      }
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, [syncServerState]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        setAuth,
        clearAuth,
        setOnboarding,
        setPolicy,
        setClaims,
        setPayments,
        refreshData,
        addToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
