import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { reconcile, type AppData } from './schema';
import { browserStorage, loadData, saveData } from './storage';
type DataContextValue = {
  data: AppData;
  update: (change: (data: AppData) => AppData) => void;
  storageError: string;
  blocked: boolean;
  enableSaving: () => void;
};
const DataContext = createContext<DataContextValue | null>(null);
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => loadData(browserStorage()));
  const current = useRef(state);
  const update = (change: (data: AppData) => AppData) => {
    const previous = current.current;
    const data = reconcile(change(previous.data));
    const next = {
      ...previous,
      data,
      error: previous.blocked
        ? previous.error
        : saveData(browserStorage(), data),
    };
    current.current = next;
    setState(next);
  };
  const enableSaving = () => {
    const next = {
      ...current.current,
      blocked: false,
      error: saveData(browserStorage(), current.current.data),
    };
    current.current = next;
    setState(next);
  };
  return (
    <DataContext
      value={{
        data: state.data,
        update,
        storageError: state.error,
        blocked: state.blocked,
        enableSaving,
      }}
    >
      {children}
    </DataContext>
  );
}
export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('DataProvider is missing');
  return context;
}
