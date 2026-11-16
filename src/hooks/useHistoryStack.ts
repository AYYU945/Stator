import { useState, useCallback, useRef } from 'react';

export interface HistoryStackAction<T> {
  label: string;
  undo: () => T;
  redo: () => T;
}

export interface EditSnapshot<T> {
  label: string;
  before: T;
  after: T;
}

export function useHistoryStack<T>(maxEntries: number = 40) {
  const [past, setPast] = useState<EditSnapshot<T>[]>([]);
  const [future, setFuture] = useState<EditSnapshot<T>[]>([]);
  const pastRef = useRef<EditSnapshot<T>[]>([]);
  const futureRef = useRef<EditSnapshot<T>[]>([]);
  pastRef.current = past;
  futureRef.current = future;

  const pushSnapshot = useCallback(
    (label: string, before: T, after: T) => {
      const nextPast = [...pastRef.current, { label, before, after }].slice(-maxEntries);
      pastRef.current = nextPast;
      futureRef.current = [];
      setPast(nextPast);
      setFuture([]);
    },
    [maxEntries]
  );

  const undo = useCallback((): EditSnapshot<T> | null => {
    const currentPast = pastRef.current;
    if (currentPast.length === 0) return null;
    const entry = currentPast[currentPast.length - 1];
    const nextPast = currentPast.slice(0, -1);
    const nextFuture = [entry, ...futureRef.current].slice(0, maxEntries);
    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    setPast(nextPast);
    setFuture(nextFuture);
    return entry;
  }, [maxEntries]);

  const redo = useCallback((): EditSnapshot<T> | null => {
    const currentFuture = futureRef.current;
    if (currentFuture.length === 0) return null;
    const entry = currentFuture[0];
    const nextFuture = currentFuture.slice(1);
    const nextPast = [...pastRef.current, entry].slice(-maxEntries);
    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    setPast(nextPast);
    setFuture(nextFuture);
    return entry;
  }, [maxEntries]);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setPast([]);
    setFuture([]);
  }, []);

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoLabel: past[past.length - 1]?.label,
    redoLabel: future[0]?.label,
    pushSnapshot,
    undo,
    redo,
    clearHistory,
  };
}
