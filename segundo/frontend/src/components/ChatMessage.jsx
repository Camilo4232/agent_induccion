export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
        }`}
      >
        {!isUser && (
          <p className="text-xs font-medium text-blue-600 mb-1">Segundo</p>
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">Fuentes: {message.sources.length} entrada(s)</p>
          </div>
        )}
      </div>
    </div>
  )
}
