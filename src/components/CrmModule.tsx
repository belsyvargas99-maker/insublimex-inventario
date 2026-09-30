import { useEffect, useMemo, useRef, useState } from 'react';
import { Users, RefreshCcw, Clock } from 'lucide-react';
import { api } from '../services/api';
import type { CrmContacto, CrmMensaje } from '../types';

const REFRESCO_MS = 5000;

type Lista = 'todos' | 'prospectos' | 'seguimiento';

function tiempoRelativo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function CrmModule() {
  const [contactos, setContactos] = useState<CrmContacto[]>([]);
  const [lista, setLista] = useState<Lista>('todos');
  const [seleccionado, setSeleccionado] = useState<CrmContacto | null>(null);
  const [mensajes, setMensajes] = useState<CrmMensaje[]>([]);
  const [error, setError] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const hiloRef = useRef<HTMLDivElement>(null);

  const contactosFiltrados = useMemo(() => {
    if (lista === 'prospectos') return contactos.filter((c) => c.es_prospecto);
    if (lista === 'seguimiento') return contactos.filter((c) => c.seguimiento_pendiente_at);
    return contactos;
  }, [contactos, lista]);

  async function cargarContactos() {
    try {
      const { contactos } = await api.crmContactos();
      setContactos(contactos);
      setUltimaActualizacion(new Date());
      setError('');
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar el CRM.');
    }
  }

  async function cargarMensajes(contacto: CrmContacto) {
    try {
      const { mensajes } = await api.crmMensajes(contacto.id);
      setMensajes(mensajes);
      setTimeout(() => hiloRef.current?.scrollTo({ top: hiloRef.current.scrollHeight }), 50);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la conversación.');
    }
  }

  useEffect(() => {
    cargarContactos();
    const t = setInterval(cargarContactos, REFRESCO_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!seleccionado) return;
    cargarMensajes(seleccionado);
    const t = setInterval(() => cargarMensajes(seleccionado), REFRESCO_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado?.id]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white md:col-span-1">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Users className="h-4 w-4 text-indigo-500" />
            Contactos ({contactosFiltrados.length})
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <RefreshCcw className="h-3 w-3" />
            {ultimaActualizacion ? tiempoRelativo(ultimaActualizacion.toISOString()) : '…'}
          </div>
        </div>
        <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
          <ListaTab label="Todos" activo={lista === 'todos'} onClick={() => setLista('todos')} />
          <ListaTab
            label={`Prospectos (${contactos.filter((c) => c.es_prospecto).length})`}
            activo={lista === 'prospectos'}
            onClick={() => setLista('prospectos')}
          />
          <ListaTab
            label={`Seguimiento (${contactos.filter((c) => c.seguimiento_pendiente_at).length})`}
            activo={lista === 'seguimiento'}
            onClick={() => setLista('seguimiento')}
          />
        </div>
        {error && <div className="px-4 py-2 text-xs text-red-600">{error}</div>}
        <div className="max-h-[65vh] overflow-y-auto">
          {contactosFiltrados.map((c) => (
            <button
              key={c.id}
              onClick={() => setSeleccionado(c)}
              className={`block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${
                seleccionado?.id === c.id ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{c.nombre || c.telefono}</span>
                <span className="text-[10px] text-slate-400">{tiempoRelativo(c.ultima_interaccion_at)}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5">{c.negocio_nombre}</span>
                {c.estado_embudo && <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-indigo-700">{c.estado_embudo}</span>}
                {c.es_prospecto && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700">prospecto</span>}
                {c.seguimiento_pendiente_at && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">
                    <Clock className="h-3 w-3" />
                    seguimiento
                  </span>
                )}
              </div>
            </button>
          ))}
          {contactos.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Sin contactos todavía.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white md:col-span-2">
        {!seleccionado ? (
          <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-slate-400">
            Selecciona un contacto para ver la conversación
          </div>
        ) : (
          <div className="flex h-[70vh] flex-col">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-sm font-semibold text-slate-800">{seleccionado.nombre || seleccionado.telefono}</div>
              <div className="text-xs text-slate-500">
                {seleccionado.telefono} · {seleccionado.negocio_nombre}
              </div>
            </div>
            <div ref={hiloRef} className="flex-1 space-y-2 overflow-y-auto p-4">
              {mensajes.map((m) => (
                <div key={m.id} className={`flex ${m.direccion === 'salida' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      m.direccion === 'salida' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.texto || `[${m.tipo}]`}</div>
                    <div className={`mt-1 text-[10px] ${m.direccion === 'salida' ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(m.creado_at).toLocaleString('es-VE')}
                    </div>
                  </div>
                </div>
              ))}
              {mensajes.length === 0 && <p className="text-center text-sm text-slate-400">Sin mensajes todavía.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ListaTab({ label, activo, onClick }: { label: string; activo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
        activo ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
