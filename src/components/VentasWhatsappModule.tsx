import { useEffect, useState } from 'react';
import { MessageCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import type { VentaWhatsapp } from '../types';

export default function VentasWhatsappModule() {
  const [ventas, setVentas] = useState<VentaWhatsapp[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargar() {
    setError('');
    try {
      const { ventas } = await api.ventasWhatsapp();
      setVentas(ventas);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la lista.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function marcarGestionado(id: number) {
    await api.marcarVentaProcesada(id);
    cargar();
  }

  if (cargando) return <div className="text-slate-500">Cargando…</div>;
  if (error) return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        Ventas ya aprobadas por WhatsApp. No se maneja stock — cada una es algo que hay que buscar/comprar para
        cumplir el pedido. Márcala como gestionada cuando ya la tengas cubierta.
      </div>

      {ventas.length === 0 ? (
        <p className="text-sm text-slate-500">No hay ventas pendientes de gestionar.</p>
      ) : (
        <div className="space-y-2">
          {ventas.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <span className="font-medium">{v.contacto_nombre || v.telefono_cliente || 'Cliente'}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">{v.producto_texto}</span>
                {v.monto_estimado && <span className="text-slate-400">· ${v.monto_estimado}</span>}
                {v.marca_vendedora && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {v.marca_vendedora}
                  </span>
                )}
              </div>
              <button
                onClick={() => marcarGestionado(v.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ya lo tengo / gestionado
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
