// DopaBot: floating chat assistant with mocked keyword answers (type "error" to see the error state)
import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { mockProducts } from '../mocks/mockData'
import { formatDp } from '../utils/format'
import { focusRing } from '../utils/styles'

const WAKE_UP_MS = 1500
const REPLY_DELAY_MS = 600

const QUICK_QUESTIONS = [
  'How does tracking work?',
  'How do I top up my balance?',
  'Recommend a product',
]

const GREETING = "Hi! I'm DopaBot, your shopping assistant. How can I help?"

const ANSWERS = {
  tracking:
    'After payment you get a tracking number like DS-1A2B3C4D5E. Open "Track parcel" in the profile menu and enter it to see every step: Created, Processing, In transit, Delivered.',
  balance:
    'DP are virtual points, so there is nothing to top up with real money. Every account starts with 100 000 DP, and you can reset your balance on the Profile page.',
  recommend: 'Here are two products you might like:',
  hello: 'Hello! Ask me about tracking, your balance or product recommendations.',
  unknown: 'I did not understand. Try the buttons above.',
}

const smallButton = `rounded-full px-3 py-1.5 text-xs font-medium bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200 ${focusRing}`

function pickRandomProducts(count) {
  const shuffled = [...mockProducts].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Mock "AI": answers by keywords
function getReply(text) {
  const lower = text.toLowerCase()
  if (lower.includes('track')) return { text: ANSWERS.tracking }
  if (lower.includes('balance') || lower.includes('top up')) return { text: ANSWERS.balance }
  if (lower.includes('recommend') || lower.includes('product')) {
    return { text: ANSWERS.recommend, products: pickRandomProducts(2) }
  }
  if (/\b(hello|hi|hey)\b/.test(lower)) return { text: ANSWERS.hello }
  return { text: ANSWERS.unknown }
}

function ChatWidget() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isWaking, setIsWaking] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const nextIdRef = useRef(1)
  const timersRef = useRef([])
  const panelRef = useRef(null)
  const listRef = useRef(null)

  // Cancel pending bot replies when the widget unmounts
  useEffect(() => {
    const timers = timersRef.current
    return () => timers.forEach(clearTimeout)
  }, [])

  // Keep the newest message in view
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, isTyping, isWaking, hasError, isOpen])

  // Move keyboard focus into the window when it opens
  useEffect(() => {
    if (isOpen) panelRef.current?.focus()
  }, [isOpen])

  function later(callback, delay) {
    timersRef.current.push(setTimeout(callback, delay))
  }

  function addMessage(message) {
    const id = nextIdRef.current
    nextIdRef.current += 1
    setMessages((prev) => [...prev, { id, ...message }])
  }

  function openChat() {
    setIsOpen(true)
    if (hasStarted) return
    // First open: the assistant "wakes up" before greeting
    setHasStarted(true)
    setIsWaking(true)
    later(() => {
      setIsWaking(false)
      addMessage({ from: 'bot', text: GREETING })
    }, WAKE_UP_MS)
  }

  function send(text) {
    const trimmed = text.trim()
    if (!trimmed || isTyping || isWaking) return
    addMessage({ from: 'user', text: trimmed })
    setDraft('')

    if (trimmed.toLowerCase().includes('error')) {
      setHasError(true)
      return
    }

    setHasError(false)
    setIsTyping(true)
    later(() => {
      addMessage({ from: 'bot', ...getReply(trimmed) })
      setIsTyping(false)
    }, REPLY_DELAY_MS)
  }

  function handleSubmit(event) {
    event.preventDefault()
    send(draft)
  }

  return (
    <>
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="DopaBot chat"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false)
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
              aria-label="Close chat"
              onClick={() => setIsOpen(false)}
              className={`w-8 h-8 rounded-full hover:bg-gray-100 ${focusRing}`}
            >
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {isWaking && (
              <div role="status" className="flex items-center gap-2 text-sm text-gray-600">
                <span
                  className="shrink-0 w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin"
                  aria-hidden="true"
                />
                Assistant is waking up…
              </div>
            )}

            <div className="flex flex-col gap-3" aria-live="polite">
              {messages.map((message, index) => (
                <Fragment key={message.id}>
                  <p
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm break-words ${
                      message.from === 'user'
                        ? 'self-end bg-gray-900 text-white'
                        : 'self-start bg-gray-200'
                    }`}
                  >
                    {message.text}
                  </p>

                  {message.products && (
                    <div className="self-start w-[85%] flex flex-col gap-2">
                      {message.products.map((product) => (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 border border-gray-200 rounded-xl p-2 hover:bg-gray-100 ${focusRing}`}
                        >
                          <span className="bg-gray-200 rounded-lg w-12 h-12 shrink-0" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold truncate">
                              {product.title}
                            </span>
                            <span className="block text-xs text-gray-600">
                              {formatDp(product.price)} DP
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Quick questions go right after the greeting */}
                  {index === 0 && user && (
                    <div className="flex flex-wrap gap-2">
                      {QUICK_QUESTIONS.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => send(question)}
                          disabled={isTyping}
                          className={smallButton}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  )}
                </Fragment>
              ))}
            </div>

            {isTyping && (
              <p className="self-start bg-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 animate-pulse">
                DopaBot is typing…
              </p>
            )}

            {hasError && (
              <div
                role="alert"
                className="flex flex-col items-start gap-2 rounded-xl border border-red-200 p-3 text-sm text-red-600"
              >
                <p>Something went wrong. Try again.</p>
                <button type="button" onClick={() => setHasError(false)} className={smallButton}>
                  Try again
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-3">
            {user ? (
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <label htmlFor="chat-input" className="sr-only">
                  Message
                </label>
                <input
                  id="chat-input"
                  type="text"
                  autoComplete="off"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={isWaking}
                  className="flex-1 min-w-0 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:border-gray-900 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isWaking || isTyping}
                  className={`shrink-0 bg-gray-900 hover:bg-gray-700 text-white rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900 ${focusRing}`}
                >
                  Send
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Log in to use the assistant</p>
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className={`shrink-0 bg-gray-900 hover:bg-gray-700 text-white rounded-full px-4 py-2 text-sm font-medium ${focusRing}`}
                >
                  Log in
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={isOpen ? () => setIsOpen(false) : openChat}
        aria-label={isOpen ? 'Close DopaBot chat' : 'Open DopaBot chat'}
        aria-expanded={isOpen}
        className={`fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gray-900 hover:bg-gray-700 text-white text-2xl shadow-md flex items-center justify-center ${focusRing}`}
      >
        <span aria-hidden="true">{isOpen ? '✕' : '💬'}</span>
      </button>
    </>
  )
}

export default ChatWidget
