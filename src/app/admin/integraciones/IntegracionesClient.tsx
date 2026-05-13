'use client'

import { useState } from 'react'
import { saveIntegrationMapping } from './actions'
import { Loader2, CheckCircle2, Save } from 'lucide-react'

type Item = {
  id: number
  nombre: string
  categoria: string
  precioCents: number
  ubereatsId: string
  pedidosyaId: string
}

export default function IntegracionesClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [savingId, setSavingId] = useState<{ id: number, platform: string } | null>(null)
  const [successId, setSuccessId] = useState<{ id: number, platform: string } | null>(null)

  const handleSave = async (id: number, platform: string, value: string) => {
    setSavingId({ id, platform })
    try {
      await saveIntegrationMapping(id, platform, value)
      setSuccessId({ id, platform })
      setTimeout(() => setSuccessId(null), 2000)
    } catch (e) {
      alert('Error guardando mapping')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
          <tr>
            <th className="p-4 font-semibold">Producto Interno</th>
            <th className="p-4 font-semibold">ID en UberEats</th>
            <th className="p-4 font-semibold">ID en PedidosYa</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4">
                <p className="font-bold text-slate-800">{item.nombre}</p>
                <p className="text-xs text-slate-400">{item.categoria}</p>
              </td>
              <td className="p-4">
                <MappingInput 
                  value={item.ubereatsId}
                  onChange={(v) => {
                    const newItems = [...items]
                    const idx = newItems.findIndex(i => i.id === item.id)
                    newItems[idx].ubereatsId = v
                    setItems(newItems)
                  }}
                  onSave={(v) => handleSave(item.id, 'ubereats', v)}
                  isSaving={savingId?.id === item.id && savingId?.platform === 'ubereats'}
                  isSuccess={successId?.id === item.id && successId?.platform === 'ubereats'}
                  placeholder="ej. ub-123"
                />
              </td>
              <td className="p-4">
                <MappingInput 
                  value={item.pedidosyaId}
                  onChange={(v) => {
                    const newItems = [...items]
                    const idx = newItems.findIndex(i => i.id === item.id)
                    newItems[idx].pedidosyaId = v
                    setItems(newItems)
                  }}
                  onSave={(v) => handleSave(item.id, 'pedidosya', v)}
                  isSaving={savingId?.id === item.id && savingId?.platform === 'pedidosya'}
                  isSuccess={successId?.id === item.id && successId?.platform === 'pedidosya'}
                  placeholder="ej. py-456"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MappingInput({ value, onChange, onSave, isSaving, isSuccess, placeholder }: any) {
  return (
    <div className="flex items-center gap-2">
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        className="border border-slate-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      />
      <button 
        onClick={() => onSave(value)}
        disabled={isSaving}
        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex-shrink-0"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : 
         isSuccess ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
         <Save className="w-4 h-4" />}
      </button>
    </div>
  )
}
