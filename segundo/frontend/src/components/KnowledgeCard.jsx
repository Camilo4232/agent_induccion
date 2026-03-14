import { useState } from 'react'
import { teachAPI } from '../services/api'

const CATEGORY_COLORS = {
  precios: 'bg-blue-100 text-blue-700',
  procesos: 'bg-purple-100 text-purple-700',
  clientes: 'bg-green-100 text-green-700',
  proveedores: 'bg-orange-100 text-orange-700',
  horarios: 'bg-yellow-100 text-yellow-700',
  otro: 'bg-gray-100 text-gray-600',
}

export default function KnowledgeCard({ entry, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [fact, setFact] = useState(entry.processed_fact)
  const [category, setCategory] = useState(entry.category || 'otro')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await teachAPI.updateEntry(entry.id, { processed_fact: fact, category })
      onUpdate?.()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta entrada?')) return
    await teachAPI.deleteEntry(entry.id)
    onDelete?.()
  }

  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.otro

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={fact}
                onChange={(e) => setFact(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
              >
                {Object.keys(CATEGORY_COLORS).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setEditing(false); setFact(entry.processed_fact); setCategory(entry.category) }}
                  className="text-gray-500 px-3 py-1 rounded-lg text-xs hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-800">{fact}</p>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
              {category}
            </span>
            <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-blue-600 text-xs">
              Editar
            </button>
            <button onClick={handleDelete} className="text-gray-400 hover:text-red-600 text-xs">
              Borrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
