import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import './ConfirmContext.css'

// Imperative confirm() dialog. Wraps window.confirm's mental model —
// `const ok = await confirm({...}); if (!ok) return;` — but renders
// a proper modal so we can style it, brand it, and honor the site
// palette instead of showing a jarring native OS dialog.
//
// Usage from a component:
//   const confirm = useConfirm()
//   const ok = await confirm({
//     title: 'Delete this post?',
//     message: 'This cannot be undone.',
//     confirmLabel: 'Delete',
//     danger: true,
//   })

const ConfirmContext = createContext(async () => false)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolverRef = useRef(null)
  const confirmBtnRef = useRef(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        title: opts?.title ?? 'Are you sure?',
        message: opts?.message ?? '',
        confirmLabel: opts?.confirmLabel ?? 'Confirm',
        cancelLabel: opts?.cancelLabel ?? 'Cancel',
        danger: !!opts?.danger,
      })
    })
  }, [])

  const close = useCallback(
    (result) => {
      const resolver = resolverRef.current
      resolverRef.current = null
      setState(null)
      resolver?.(result)
    },
    []
  )

  // Escape cancels, Enter confirms while the modal is open. Also
  // autofocus the primary action so keyboard-only flows are quick.
  useEffect(() => {
    if (!state) return
    confirmBtnRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(false)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        close(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => close(false)}
        >
          <div
            className="confirm-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="confirm-title">
              {state.title}
            </h2>
            {state.message && (
              <p id="confirm-message" className="confirm-message">
                {state.message}
              </p>
            )}
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-btn confirm-btn-ghost"
                onClick={() => close(false)}
              >
                {state.cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className={`confirm-btn ${state.danger ? 'confirm-btn-danger' : ''}`}
                onClick={() => close(true)}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
