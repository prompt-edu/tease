import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ConstraintWrapper } from '../types'

interface ConstraintState {
  constraintWrappers: ConstraintWrapper[]

  addConstraint: (wrapper: ConstraintWrapper) => void
  updateConstraint: (id: string, updates: Partial<ConstraintWrapper>) => void
  removeConstraint: (id: string) => void
  setConstraints: (wrappers: ConstraintWrapper[]) => void
  toggleConstraint: (id: string) => void
  reset: () => void
}

export const useConstraintStore = create<ConstraintState>()(
  persist(
    set => ({
      constraintWrappers: [],

      addConstraint: wrapper =>
        set(state => ({ constraintWrappers: [...state.constraintWrappers, wrapper] })),

      updateConstraint: (id, updates) =>
        set(state => ({
          constraintWrappers: state.constraintWrappers.map(w =>
            w.id === id ? { ...w, ...updates } : w,
          ),
        })),

      removeConstraint: id =>
        set(state => ({
          constraintWrappers: state.constraintWrappers.filter(w => w.id !== id),
        })),

      setConstraints: constraintWrappers => set({ constraintWrappers }),

      toggleConstraint: id =>
        set(state => ({
          constraintWrappers: state.constraintWrappers.map(w =>
            w.id === id ? { ...w, isActive: !w.isActive } : w,
          ),
        })),

      reset: () => set({ constraintWrappers: [] }),
    }),
    { name: 'tease-constraints' },
  ),
)
