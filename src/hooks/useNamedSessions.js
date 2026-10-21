// src/hooks/useNamedSessions.js
import { useState, useEffect, useCallback, useRef } from 'react';

const SESSIONS_KEY = 'strand.sessions';
const CURRENT_KEY = 'strand.currentSessionId';

const loadSessions = () => {
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveSessions = (sessions) => {
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    /* quota or private mode — silently ignore */
  }
};

const makeId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const makeEmptySession = () => ({
  id: makeId(),
  name: 'Untitled',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  data: {
    sequence: '',
    inputValue: '',
    sequenceB: '',
    inputValueB: '',
    annotations: [],
    selectedAnnotationId: null,
    desktopView: 'dna',
    mobileView: 'setup',
  },
});

/**
 * Manages a list of named sessions in localStorage.
 * Each session holds a full snapshot of the workspace state.
 */
export function useNamedSessions() {
  const [sessions, setSessions] = useState(() => {
    const existing = loadSessions();
    if (existing.length > 0) return existing;
    // First-ever launch: seed with one empty session
    const seed = [makeEmptySession()];
    saveSessions(seed);
    return seed;
  });

  const [currentId, setCurrentId] = useState(() => {
    const stored = window.localStorage.getItem(CURRENT_KEY);
    const existing = loadSessions();
    if (stored && existing.some((s) => s.id === stored)) return stored;
    return existing[0]?.id ?? null;
  });

  // Debounced write of the sessions list
  const writeTimer = useRef(null);
  useEffect(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      saveSessions(sessions);
    }, 300);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [sessions]);

  // Persist current session ID immediately
  useEffect(() => {
    if (currentId) {
      try {
        window.localStorage.setItem(CURRENT_KEY, currentId);
      } catch {
        /* ignore */
      }
    }
  }, [currentId]);

  const currentSession = sessions.find((s) => s.id === currentId) || null;

  /**
   * Update the current session's data with a partial patch.
   * Merges into the existing data object.
   */
  const updateCurrentData = useCallback(
    (patch) => {
      if (!currentId) return;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentId
            ? { ...s, data: { ...s.data, ...patch }, updatedAt: Date.now() }
            : s
        )
      );
    },
    [currentId]
  );

  /**
   * Create a new session, optionally seeded with data. Switches to it.
   */
  const createSession = useCallback(
    (name, data = {}) => {
      const newSession = {
        id: makeId(),
        name: name || 'Untitled',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: { ...makeEmptySession().data, ...data },
      };
      setSessions((prev) => [newSession, ...prev]);
      setCurrentId(newSession.id);
      return newSession.id;
    },
    []
  );

  /**
   * Switch to a different session.
   */
  const switchSession = useCallback((id) => {
    setCurrentId(id);
  }, []);

  /**
   * Rename a session by ID.
   */
  const renameSession = useCallback((id, name) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name, updatedAt: Date.now() } : s))
    );
  }, []);

  /**
   * Delete a session. If it was current, switch to another.
   */
  const deleteSession = useCallback(
    (id) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (next.length === 0) {
          const fresh = makeEmptySession();
          return [fresh];
        }
        return next;
      });
      // If we deleted the current one, pick a new one
      if (currentId === id) {
        const remaining = loadSessions().filter((s) => s.id !== id);
        const nextId = remaining[0]?.id ?? null;
        // If none left, we just created one above — re-read
        setTimeout(() => {
          const fresh = loadSessions();
          if (fresh.length > 0) setCurrentId(fresh[0].id);
          else setCurrentId(nextId);
        }, 0);
      }
    },
    [currentId]
  );

  return {
    sessions,
    currentSession,
    currentId,
    updateCurrentData,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
  };
}