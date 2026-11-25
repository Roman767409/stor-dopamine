// DopaBot: floating chat assistant backed by POST /api/chat (rule-based, no AI).
// The conversation lives only in component state and is lost on page reload.
// Interface texts follow the UI language. The bot answers in the language of the message
// (English, Polish or Ukrainian); for a neutral message it uses the UI language sent as `lang`.
import { Fragment, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { focusRing } from '../utils/styles'

const MAX_LENGTH = 500
const COUNTER_THRESHOLD = 50

// Starting quick replies: the button sends exactly the text it shows, in the UI language
const INITIAL_SUGGESTIONS = [
  { labelKey: 'chat.suggestions.balance' },
  { labelKey: 'chat.suggestions.parcel' },
  { labelKey: 'chat.suggestions.tip' },
]

// Translation keys of the error kinds
const ERROR_KEYS = {
  auth: 'chat.errors.auth',
  validation: 'chat.errors.validation',
  retry: 'chat.errors.retry',
}

const smallButton = `rounded-full px-3 py-1.5 text-xs font-medium bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200 ${focusRing}`

// The greeting text is not stored: it is translated on every render, so it follows the language
function greetingMessage() {
  return { id: 0, from: 'bot', isGreeting: true, suggestions: INITIAL_SUGGESTIONS }
}

// Maps a failed request to one of the error kinds.
// 401 reaches here only after api.js failed to refresh the tokens.
function errorKind(error) {
  const status = error?.response?.status
  if (status === 401) return 'auth'
  if (status === 422) return 'validation'
  return 'retry'
}

function ChatWidget() {
  const { t, i18n } = useTranslation()
  const { user, isLoading } = useAuth()
  const userId = user?.id ?? null
  const [isOpen, setIsOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  // { kind: 'auth' | 'validation' | 'retry', text: message to resend on Retry }
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState(() => [greetingMessage()])
  const [draft, setDraft] = useState('')
  // Last signed-in user the conversation belongs to
  const [chatOwner, setChatOwner] = useState(userId)
  const nextIdRef = useRef(1)
  // Synchronous double-submit guard: state updates are async, a ref is not
  const sendingRef = useRef(false)
  const abortRef = useRef(null)
  const refocusRef = useRef(false)
  const panelRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const toggleRef = useRef(null)

  // Another user signed in: start a fresh conversation (adjusting state during render).
  // On logout the history stays visible, but the input is replaced by a login prompt.
  if (userId && userId !== chatOwner) {
    setChatOwner(userId)
    setMessages([greetingMessage()])
    setError(null)
    setIsTyping(false)
    setDraft('')
  }

  // Drop a reply that belongs to the previous user
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [userId])

  // Keep the newest message in view
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, isTyping, error, isOpen])

  // Move keyboard focus into the window when it opens
  useEffect(() => {
    if (isOpen) panelRef.current?.focus()
  }, [isOpen])

  // Give the focus back to the input after a reply (it was disabled while waiting)
  useEffect(() => {
    if (!isTyping && refocusRef.current) {
      refocusRef.current = false
      inputRef.current?.focus()
    }
  }, [isTyping])

  function addMessage(message) {
    const id = nextIdRef.current
    nextIdRef.current += 1
    setMessages((prev) => [...prev, { id, ...message }])
  }

  function closeChat() {
    setIsOpen(false)
    toggleRef.current?.focus()
  }

  // Sends the text to the API; `isRetry` resends without adding the user bubble again
  async function send(text, { isRetry = false } = {}) {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_LENGTH || !user || sendingRef.current) return
    sendingRef.current = true

    if (!isRetry) {
      addMessage({ from: 'user', text: trimmed })
      setDraft('')
    }
    setError(null)
    setIsTyping(true)

    const controller = new AbortController()
    abortRef.current = controller
    try {
      const { data } = await api.post(
        '/api/chat',
        // lang: the UI language, used by the bot only when the message is neutral ("ok")
        { message: trimmed, lang: i18n.resolvedLanguage },
        { signal: controller.signal }
      )
      // Suggestions from the bot are already in the reply's language
      const suggestions = Array.isArray(data.suggestions)
        ? data.suggestions.slice(0, 3).map((suggestion) => ({ label: suggestion }))
        : []
      addMessage({ from: 'bot', text: data.reply, suggestions })
    } catch (requestError) {
      // Cancelled because the user changed or the widget unmounted: nothing to show
      if (axios.isCancel(requestError)) return
      setError({ kind: errorKind(requestError), text: trimmed })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      sendingRef.current = false
      // Refocus only after a real answer, not after a cancelled request
      refocusRef.current = !controller.signal.aborted
      setIsTyping(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    send(draft)
  }

  const lastBotIndex = messages.findLastIndex((message) => message.from === 'bot')
  const remaining = MAX_LENGTH - draft.length

  return (
    <>
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('chat.dialogLabel')}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeChat()
          }}
          className="fixed z-50 inset-x-2 top-2 bottom-20 sm:inset-auto sm:right-4 sm:bottom-24 sm:w-[360px] sm:h-[520px] flex flex-col overflow-hidden bg-white border border-gray-200 rounded-xl shadow-md outline-none"
        >
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" aria-hidden="true" />
              <h2 className="font-semibold">DopaBot</h2>
            </div>
            <button
              type="button"
              aria-label={t('chat.close')}
              onClick={closeChat}
              className={`w-8 h-8 rounded-full hover:bg-gray-100 ${focusRing}`}
            >
              ✕
            </button>
          </div>

          <div
            ref={listRef}
            aria-live="polite"
            aria-label={t('chat.messages')}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
          >
            {messages.map((message, index) => (
              <Fragment key={message.id}>
                <p
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm break-words whitespace-pre-line ${
                    message.from === 'user'
                      ? 'self-end bg-gray-900 text-white'
                      : 'self-start bg-gray-200'
                  }`}
                >
                  {message.isGreeting ? t('chat.greeting') : message.text}
                </p>

                {/* Quick replies only under the latest bot answer */}
                {index === lastBotIndex && user && message.suggestions?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion) => {
                      const label = suggestion.labelKey ? t(suggestion.labelKey) : suggestion.label
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-label={t('chat.ask', { text: label })}
                          onClick={() => send(label)}
                          disabled={isTyping}
                          className={smallButton}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </Fragment>
            ))}

            {isTyping && (
              <p
                role="status"
                className="self-start bg-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 animate-pulse"
              >
                {t('chat.typing')}
              </p>
            )}

            {error && (
              <div
                role="alert"
                className="flex flex-col items-start gap-2 rounded-xl border border-red-200 p-3 text-sm text-red-600"
              >
                <p>{t(ERROR_KEYS[error.kind], { max: MAX_LENGTH })}</p>
                {error.kind === 'retry' && user && (
                  <button
                    type="button"
                    aria-label={t('chat.retryLabel')}
                    onClick={() => send(error.text, { isRetry: true })}
                    disabled={isTyping}
                    className={smallButton}
                  >
                    {t('chat.retry')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-3">
            {user ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="chat-input" className="sr-only">
                    {t('chat.message')}
                  </label>
                  <input
                    ref={inputRef}
                    id="chat-input"
                    type="text"
                    autoComplete="off"
                    placeholder={t('chat.placeholder')}
                    maxLength={MAX_LENGTH}
                    aria-describedby={remaining < COUNTER_THRESHOLD ? 'chat-counter' : undefined}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    disabled={isTyping}
                    className="flex-1 min-w-0 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:border-gray-900 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    aria-label={t('chat.sendLabel')}
                    disabled={!draft.trim() || isTyping}
                    className={`shrink-0 bg-gray-900 hover:bg-gray-700 text-white rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900 ${focusRing}`}
                  >
                    {t('chat.send')}
                  </button>
                </div>
                {remaining < COUNTER_THRESHOLD && (
                  <p id="chat-counter" className="px-4 text-xs text-gray-600">
                    {t('chat.charactersLeft', { count: remaining })}
                  </p>
                )}
              </form>
            ) : (
              !isLoading && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">{t('chat.loginPrompt')}</p>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className={`shrink-0 bg-gray-900 hover:bg-gray-700 text-white rounded-full px-4 py-2 text-sm font-medium ${focusRing}`}
                  >
                    {t('common.logIn')}
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? t('chat.closeToggle') : t('chat.open')}
        aria-expanded={isOpen}
        className={`fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gray-900 hover:bg-gray-700 text-white text-2xl shadow-md flex items-center justify-center ${focusRing}`}
      >
        <span aria-hidden="true">{isOpen ? '✕' : '💬'}</span>
      </button>
    </>
  )
}

export default ChatWidget
