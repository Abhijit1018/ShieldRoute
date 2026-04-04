import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type {
  AppState, AppAction, Policy, OnboardingData, Claim, Toast,
  LiveZoneReading, TriggerFeedItem, ClaimStatus,
} from '../types';

const STORAGE_KEY = 'shieldroute_app_state_v1';

const initialState: AppState = {
  onboarding: null,
  policy: null,
  claims: [],
  toasts: [],
  liveZoneReadings: [],
  triggerFeed: [],
  unreadClaimCount: 0,
};

interface PersistedAppState {
  onboarding: OnboardingData | null;
  policy: Policy | null;
  claims: Array<Omit<Claim, 'timestamp'> & { timestamp: string }>;
  unreadClaimCount: number;
}

function loadPersistedState(): AppState {
  if (typeof window === 'undefined') return initialState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;

    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
    const claims = Array.isArray(parsed.claims)
        ? parsed.claims.map((claim) => {
            const parsedDate = new Date(claim.timestamp);
            return {
              ...claim,
              timestamp: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
            };
          })
      : [];

    return {
      ...initialState,
      onboarding: parsed.onboarding ?? null,
      policy: parsed.policy ?? null,
      claims,
      unreadClaimCount: parsed.unreadClaimCount ?? 0,
    };
  } catch {
    return initialState;
  }
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ONBOARDING':
      return { ...state, onboarding: action.payload };
    case 'SET_POLICY':
      return { ...state, policy: action.payload };
    case 'ADD_CLAIM':
      return {
        ...state,
        claims: [action.payload, ...state.claims],
        unreadClaimCount: state.unreadClaimCount + 1,
      };
    case 'SET_CLAIMS':
      return { ...state, claims: action.payload };
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
    case 'SET_LIVE_READINGS':
      return { ...state, liveZoneReadings: action.payload };
    case 'SET_TRIGGER_FEED':
      return { ...state, triggerFeed: action.payload };
    case 'MARK_CLAIMS_READ':
      return { ...state, unreadClaimCount: 0 };
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
  setClaims: (claims: Claim[]) => void;
  updateClaim: (id: string, status: ClaimStatus) => void;
  addToast: (message: string, type: Toast['type']) => void;
  setLiveReadings: (readings: LiveZoneReading[]) => void;
  setTriggerFeed: (feed: TriggerFeedItem[]) => void;
  markClaimsRead: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersistedState);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const persistable: PersistedAppState = {
      onboarding: state.onboarding,
      policy: state.policy,
      claims: state.claims.map((claim) => ({
        ...claim,
        timestamp: (() => {
          const ts = claim.timestamp instanceof Date ? claim.timestamp : new Date(claim.timestamp);
          return Number.isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString();
        })(),
      })),
      unreadClaimCount: state.unreadClaimCount,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }, [state.onboarding, state.policy, state.claims, state.unreadClaimCount]);

  const setOnboarding = useCallback((data: OnboardingData) => {
    dispatch({ type: 'SET_ONBOARDING', payload: data });
  }, [dispatch]);

  const setPolicy = useCallback((policy: Policy) => {
    dispatch({ type: 'SET_POLICY', payload: policy });
  }, [dispatch]);

  const addClaim = useCallback((claim: Claim) => {
    dispatch({ type: 'ADD_CLAIM', payload: claim });
  }, [dispatch]);

  const setClaims = useCallback((claims: Claim[]) => {
    dispatch({ type: 'SET_CLAIMS', payload: claims });
  }, [dispatch]);

  const updateClaim = useCallback((id: string, status: ClaimStatus) => {
    dispatch({ type: 'UPDATE_CLAIM', payload: { id, status } });
  }, [dispatch]);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = Math.random().toString(36).slice(2);
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 4000);
  }, [dispatch]);

  const setLiveReadings = useCallback((readings: LiveZoneReading[]) => {
    dispatch({ type: 'SET_LIVE_READINGS', payload: readings });
  }, [dispatch]);

  const setTriggerFeed = useCallback((feed: TriggerFeedItem[]) => {
    dispatch({ type: 'SET_TRIGGER_FEED', payload: feed });
  }, [dispatch]);

  const markClaimsRead = useCallback(() => {
    dispatch({ type: 'MARK_CLAIMS_READ' });
  }, [dispatch]);

  const contextValue = useMemo(() => ({
    state,
    dispatch,
    setOnboarding,
    setPolicy,
    addClaim,
    setClaims,
    updateClaim,
    addToast,
    setLiveReadings,
    setTriggerFeed,
    markClaimsRead,
  }), [
    state,
    dispatch,
    setOnboarding,
    setPolicy,
    addClaim,
    setClaims,
    updateClaim,
    addToast,
    setLiveReadings,
    setTriggerFeed,
    markClaimsRead,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
