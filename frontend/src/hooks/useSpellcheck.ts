import { useState, useCallback } from 'react'
import { getSpellcheck } from '../api/documents'
import type { SpellError } from '../App'

export function useSpellcheck(documentId: string) {
  const [errors, setErrors] = useState<SpellError[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSpellcheck = useCallback(async () => {
    if (!documentId) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getSpellcheck(documentId)
      setErrors(result.errors)
    } catch (err) {
      setError('Failed to run spellcheck')
      console.error('Spellcheck error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  const dismissError = useCallback((word: string) => {
    setErrors(prev => prev.filter(e => e.word !== word))
  }, [])

  return {
    errors,
    isLoading,
    error,
    runSpellcheck,
    dismissError,
  }
}

