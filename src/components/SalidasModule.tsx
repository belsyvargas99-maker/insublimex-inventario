import { useState } from 'react';
import { Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import type { SalidaInterpretada } from '../types';

export default function SalidasModule() {
  const [nota, setNota] = useState('');
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [propuesta, setPropuesta] = useState<SalidaInterpretada | null>(null);

  async function interpretar() {
    if (!nota.trim()) return;
    setError('');
    setOk('');
    setPropuesta(null);
    setCargando(true);
    try {
      const data = await api.interpretarSalida(nota);
      setPropuesta(data);
    } catch (err: any) {
      setError(err.message || 'No se pudo interpretar la nota.');
    } finally {
      setCargando(false);
    }
  }

  async function confirmar() {
    if (!propuesta) return;
    setConfirmando(true);
    setError('');
    try {
      await api.confirmarSalida(nota, propuesta.destinatario, propuesta.items);
      setOk(`Despacho confirmado: ${propuesta.items.length} productos descontados del stock.`);
      setPropuesta(null);
      setNota('');
    } catch (err: any) {
      setError(err.message || 'No se pudo confirmar la salida.');
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Escribe o pega la nota de despacho, en lenguaje natural
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-300 p-3 text-sm"
          rows={3}
          placeholder='Ej: "Hoy despache 2 tintas DTF de 500ml y 1 prensa termica portatil para Carlos"'
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        <button
          onClick={interpretar}
          disabled={cargando || !nota.trim()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Interpretar con IA
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div>}

      {propuesta && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          {propuesta.destinatario && (
            <div className="mb-3 text-sm text-slate-600">
              Destinatario: <span className="font-medium">{propuesta.destinatario}</span>
            </div>
          )}

          {propuesta.items.length === 0 ? (
            <p className="text-sm text-slate-500">No se identificó ningún producto del catálogo en esa nota.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-2">Producto</th>
                  <th className="py-2 pr-2">Cant. a descontar</th>
                  <th className="py-2 pr-2">Stock actual</th>
                  <th className="py-2 pr-2">Stock resultante</th>
                </tr>
              </thead>
              <tbody>
                {propuesta.items.map((it) => (
                  <tr key={it.producto_id} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-medium">{it.nombre_producto}</td>
                    <td className="py-2 pr-2">{it.cantidad}</td>
                    <td className="py-2 pr-2">{it.stock_actual}</td>
                    <td className={`py-2 pr-2 font-medium ${it.stock_resultante < 0 ? 'text-red-600' : ''}`}>
                      {it.stock_resultante}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {propuesta.advertencias.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <div className="font-medium">No se pudo cruzar con el catálogo:</div>
                <ul className="list-disc pl-5">
                  {propuesta.advertencias.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {propuesta.items.length > 0 && (
            <button
              onClick={confirmar}
              disabled={confirmando}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar Salida
            </button>
          )}
        </div>
      )}
    </div>
  );
}
