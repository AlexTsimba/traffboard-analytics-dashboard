'use client'

import { useOptimistic, useTransition, startTransition } from 'react'
import { useCallback } from 'react'

export interface OptimisticState<T> {
  data: T
  isPending: boolean
  isOptimistic: boolean
}

export interface UseOptimisticActionOptions<T, P> {
  initialData: T
  optimisticUpdateFn: (currentData: T, pendingData: P) => T
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

/**
 * Custom hook for optimistic updates with Server Actions
 * Provides immediate UI feedback while server processes the request
 */
export function useOptimisticAction<T, P = Partial<T>>({
  initialData,
  optimisticUpdateFn,
  onSuccess,
  onError,
}: UseOptimisticActionOptions<T, P>) {
  const [isPending, startTransition] = useTransition()
  
  const [optimisticData, updateOptimisticData] = useOptimistic(
    initialData,
    optimisticUpdateFn
  )

  const executeAction = useCallback(
    async (
      action: (formData: FormData) => Promise<any>,
      formData: FormData,
      optimisticPayload: P
    ) => {
      try {
        // Apply optimistic update immediately
        updateOptimisticData(optimisticPayload)

        // Execute the server action
        const result = await new Promise((resolve, reject) => {
          startTransition(async () => {
            try {
              const actionResult = await action(formData)
              
              if (actionResult.errors || actionResult.message?.includes('error')) {
                reject(new Error(actionResult.message || 'Action failed'))
              } else {
                resolve(actionResult)
              }
            } catch (error) {
              reject(error)
            }
          })
        })

        onSuccess?.(result as T)
        return result
      } catch (error) {
        onError?.(error as Error)
        throw error
      }
    },
    [updateOptimisticData, onSuccess, onError]
  )

  const state: OptimisticState<T> = {
    data: optimisticData,
    isPending,
    isOptimistic: isPending,
  }

  return [state, executeAction] as const
}

/**
 * Simplified hook for basic optimistic updates
 * Useful for simple state changes like toggles or updates
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (current: T, update: Partial<T>) => T
) {
  const [optimisticData, updateOptimisticData] = useOptimistic(
    initialData,
    updateFn
  )

  const [isPending, startTransition] = useTransition()

  const update = useCallback(
    (updateData: Partial<T>, serverAction: () => Promise<void>) => {
      // Apply optimistic update
      updateOptimisticData(updateData)

      // Execute server action
      startTransition(async () => {
        try {
          await serverAction()
        } catch (error) {
          console.error('Server action failed:', error)
          // The UI will revert to server state automatically
        }
      })
    },
    [updateOptimisticData]
  )

  return {
    data: optimisticData,
    isPending,
    update,
  }
}

/**
 * Hook for optimistic list operations (add, remove, update items)
 */
export function useOptimisticList<T extends { id: string | number }>(
  initialItems: T[]
) {
  const [optimisticItems, updateOptimisticItems] = useOptimistic(
    initialItems,
    (currentItems: T[], action: { type: 'add' | 'remove' | 'update'; item: T | T['id'] }) => {
      switch (action.type) {
        case 'add':
          return [...currentItems, action.item as T]
        case 'remove':
          return currentItems.filter(item => item.id !== action.item)
        case 'update':
          return currentItems.map(item => 
            item.id === (action.item as T).id ? action.item as T : item
          )
        default:
          return currentItems
      }
    }
  )

  const [isPending, startTransition] = useTransition()

  const addOptimistic = useCallback(
    (item: T, serverAction: () => Promise<void>) => {
      updateOptimisticItems({ type: 'add', item })
      startTransition(serverAction)
    },
    [updateOptimisticItems]
  )

  const removeOptimistic = useCallback(
    (id: T['id'], serverAction: () => Promise<void>) => {
      updateOptimisticItems({ type: 'remove', item: id })
      startTransition(serverAction)
    },
    [updateOptimisticItems]
  )

  const updateOptimistic = useCallback(
    (item: T, serverAction: () => Promise<void>) => {
      updateOptimisticItems({ type: 'update', item })
      startTransition(serverAction)
    },
    [updateOptimisticItems]
  )

  return {
    items: optimisticItems,
    isPending,
    addOptimistic,
    removeOptimistic,
    updateOptimistic,
  }
}

/**
 * Hook for form submissions with optimistic updates
 * Integrates with useActionState for form handling
 */
export function useOptimisticForm<T, A>(
  initialData: T,
  optimisticUpdateFn: (current: T, formData: FormData) => T
) {
  const [optimisticData, updateOptimisticData] = useOptimistic(
    initialData,
    optimisticUpdateFn
  )

  const [isPending, startTransition] = useTransition()

  const submitForm = useCallback(
    (action: (prevState: A, formData: FormData) => Promise<A>, formData: FormData) => {
      // Apply optimistic update
      updateOptimisticData(formData)

      // Submit form with server action
      startTransition(() => {
        // The action will be handled by useActionState in the component
      })
    },
    [updateOptimisticData]
  )

  return {
    data: optimisticData,
    isPending,
    submitForm,
  }
}
