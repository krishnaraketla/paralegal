import { useState, useEffect, useRef } from 'react'
import './CreateModal.css'

interface CreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, description?: string) => Promise<void>
  title: string
  nameLabel?: string
  namePlaceholder?: string
  showDescription?: boolean
  descriptionLabel?: string
  descriptionPlaceholder?: string
}

export default function CreateModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  nameLabel = 'Name',
  namePlaceholder = 'Enter name...',
  showDescription = false,
  descriptionLabel = 'Description',
  descriptionPlaceholder = 'Enter description (optional)...',
}: CreateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setDescription('')
      setError(null)
      // Focus the input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit(name.trim(), showDescription ? description.trim() : undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={isSubmitting ? undefined : onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button 
            className="modal-close" 
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="name" className="form-label">{nameLabel}</label>
              <input
                ref={inputRef}
                type="text"
                id="name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={namePlaceholder}
                disabled={isSubmitting}
              />
            </div>

            {showDescription && (
              <div className="form-group">
                <label htmlFor="description" className="form-label">{descriptionLabel}</label>
                <textarea
                  id="description"
                  className="form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={descriptionPlaceholder}
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>
            )}

            {error && (
              <div className="form-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="btn-spinner" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

