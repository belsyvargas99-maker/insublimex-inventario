import { useEffect, useState } from 'react';
import { Package, Layers, DollarSign, AlertTriangle, Copy, Check } from 'lucide-react';
import { api } from '../services/api';
import type { DashboardData } from '../types';

export default function DashboardModule() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  async function cargar() {
    setError('');
    try {
      const d = await api.dashboard();
      setData(d);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar el dashboard.');
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function copiarReporte() {
    if (!data) return;
    const lineas = [
      `*Reporte de inventario — ${new Date().toLocaleDateString('es-VE')}*`,
      `Productos: ${data.totalProductos} | Unidades: ${data.unidadesTotales} | Valorización: $${data.valoracionTotal.toFixed(2)}`,
      '',
    ];
    if (data.stockBajo.length > 0) {
      lineas.push('*Urge reponer:*');
      data.stockBajo.forEach((p) => lineas.push(`- ${p.nombre_normalizado}: quedan ${p.stock} ${p.unidad}`));
    } else {
      lineas.push('Sin alertas de stock bajo.');
    }
    navigator.clipboard.writeText(lineas.join('\n'));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (error) return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="text-slate-500">Cargando…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi icon={<Package className="h-5 w-5" />} label="Productos" value={String(data.totalProductos)} />
        <Kpi icon={<Layers className="h-5 w-5" />} label="Unidades en bodega" value={String(data.unidadesTotales)} />
        <Kpi icon={<DollarSign className="h-5 w-5" />} label="Valorización total" value={`$${data.valoracionTotal.toFixed(2)}`} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Stock bajo ({data.stockBajo.length})
          </h3>
          <button
            onClick={copiarReporte}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copiado ? 'Copiado' : 'Copiar reporte'}
          </button>
        </div>
        {data.stockBajo.length === 0 ? (
          <p className="text-sm text-slate-500">Todo el inventario está por encima del mínimo.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.stockBajo.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>{p.nombre_normalizado}</span>
                <span className="font-medium text-red-600">
                  {p.stock} {p.unidad} (mín. {p.stock_minimo})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-slate-800">Catálogo completo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2">Producto</th>
                <th className="py-2 pr-2">Categoría</th>
                <th className="py-2 pr-2">Stock</th>
                <th className="py-2 pr-2">Costo prom.</th>
              </tr>
            </thead>
            <tbody>
              {data.productos.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{p.nombre_normalizado}</td>
                  <td className="py-2 pr-2 text-slate-500">{p.categoria || '—'}</td>
                  <td className="py-2 pr-2">
                    {p.stock} {p.unidad}
                  </td>
                  <td className="py-2 pr-2">${Number(p.costo_promedio).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}
