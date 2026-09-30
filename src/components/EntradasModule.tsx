import { useState } from 'react';
import { UploadCloud, Loader2, Save, X } from 'lucide-react';
import { api, fileToBase64 } from '../services/api';
import type { FacturaExtraida, FacturaItem } from '../types';

export default function EntradasModule() {
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [factura, setFactura] = useState<FacturaExtraida | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setOk('');
    setFactura(null);
    setCargando(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const data = await api.extraerFactura(base64, mimeType);
      setFactura(data);
    } catch (err: any) {
      setError(err.message || 'No se pudo leer la factura.');
    } finally {
      setCargando(false);
      e.target.value = '';
    }
  }

  function actualizarItem(idx: number, campo: keyof FacturaItem, valor: string) {
    if (!factura) return;
    const items = [...factura.items];
    const num = ['cantidad', 'precio_costo_unitario', 'subtotal_item'].includes(campo);
    items[idx] = { ...items[idx], [campo]: num ? Number(valor) || 0 : valor } as FacturaItem;
    setFactura({ ...factura, items });
  }

  function quitarItem(idx: number) {
    if (!factura) return;
    setFactura({ ...factura, items: factura.items.filter((_, i) => i !== idx) });
  }

  async function guardar() {
    if (!factura) return;
    setGuardando(true);
    setError('');
    try {
      await api.guardarEntrada(
        {
          proveedor: factura.proveedor,
          numero_factura: factura.numero_factura,
          fecha: factura.fecha,
          moneda: factura.moneda,
          monto_impuestos: factura.monto_impuestos,
          monto_total: factura.monto_total,
        },
        factura.items,
      );
      setOk(`Guardado: ${factura.items.length} productos sumados al inventario.`);
      setFactura(null);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la entrada.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
        <UploadCloud className="mx-auto mb-3 h-10 w-10 text-slate-400" />
        <p className="mb-4 text-slate-600">Sube la foto o PDF de la factura de compra</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700">
          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {cargando ? 'Leyendo con IA...' : 'Elegir archivo'}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} disabled={cargando} />
        </label>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div>}

      {factura && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <div className="text-slate-500">Proveedor</div>
              <div className="font-medium">{factura.proveedor || '—'}</div>
            </div>
            <div>
              <div className="text-slate-500">Factura</div>
              <div className="font-medium">{factura.numero_factura || '—'}</div>
            </div>
            <div>
              <div className="text-slate-500">Fecha</div>
              <div className="font-medium">{factura.fecha || '—'}</div>
            </div>
            <div>
              <div className="text-slate-500">Total</div>
              <div className="font-semibold text-indigo-600">
                {factura.moneda} {factura.monto_total.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-2">Producto</th>
                  <th className="py-2 pr-2">Categoría</th>
                  <th className="py-2 pr-2">Cant.</th>
                  <th className="py-2 pr-2">Costo unit.</th>
                  <th className="py-2 pr-2">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {factura.items.map((it, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2 pr-2">
                      <input
                        className="w-full rounded border border-slate-200 px-2 py-1"
                        value={it.nombre_normalizado}
                        onChange={(e) => actualizarItem(idx, 'nombre_normalizado', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className="w-28 rounded border border-slate-200 px-2 py-1"
                        value={it.categoria_sugerida || ''}
                        onChange={(e) => actualizarItem(idx, 'categoria_sugerida', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className="w-20 rounded border border-slate-200 px-2 py-1"
                        value={it.cantidad}
                        onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className="w-24 rounded border border-slate-200 px-2 py-1"
                        value={it.precio_costo_unitario}
                        onChange={(e) => actualizarItem(idx, 'precio_costo_unitario', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2 font-medium">{it.subtotal_item.toFixed(2)}</td>
                    <td>
                      <button onClick={() => quitarItem(idx)} className="text-slate-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={guardar}
            disabled={guardando || factura.items.length === 0}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar en Inventario
          </button>
        </div>
      )}
    </div>
  );
}
