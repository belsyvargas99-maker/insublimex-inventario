import 'dotenv/config';
import express from 'express';
import { extraerFactura, interpretarSalida } from './gemini.ts';
import { supabase, supabasePublic, NEGOCIO_ID } from './supabase.ts';

export const app = express();
app.use(express.json({ limit: '15mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ADMIN_PIN = process.env.ADMIN_PIN || '';

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!ADMIN_PIN) return next(); // sin PIN configurado, no bloquea (dev)
  const token = req.header('x-admin-token');
  if (token !== ADMIN_PIN) return res.status(401).json({ error: 'No autorizado' });
  next();
}

app.use('/api', requireAuth);

// ---------- Entradas (facturas de compra) ----------

app.post('/api/entradas/extraer', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor.' });
    const { base64Image, mimeType } = req.body || {};
    if (!base64Image) return res.status(400).json({ error: 'Falta la imagen.' });
    const data = await extraerFactura(GEMINI_API_KEY, base64Image, mimeType || 'image/jpeg');
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error extrayendo la factura.' });
  }
});

app.post('/api/entradas/guardar', async (req, res) => {
  try {
    const { factura, items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No hay items para guardar.' });
    const { data, error } = await supabase.rpc('registrar_entrada', {
      p_negocio_id: NEGOCIO_ID,
      p_factura: factura || {},
      p_items: items,
    });
    if (error) throw error;
    res.json({ ok: true, factura_id: data });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error guardando la entrada.' });
  }
});

// ---------- Salidas (despachos por nota) ----------

app.post('/api/salidas/interpretar', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor.' });
    const { nota } = req.body || {};
    if (!nota || !String(nota).trim()) return res.status(400).json({ error: 'La nota esta vacia.' });

    const { data: catalogo, error } = await supabase
      .from('productos')
      .select('id, nombre_normalizado, stock')
      .eq('negocio_id', NEGOCIO_ID)
      .order('nombre_normalizado');
    if (error) throw error;

    const resultado = await interpretarSalida(GEMINI_API_KEY, nota, catalogo || []);

    // Enriquecer con stock actual real (nunca confiar en lo que devuelva el LLM para esto)
    const mapa = new Map((catalogo || []).map((p) => [p.id, p]));
    const items = (resultado.items || [])
      .filter((it: any) => mapa.has(it.producto_id))
      .map((it: any) => {
        const p = mapa.get(it.producto_id)!;
        return {
          producto_id: p.id,
          nombre_producto: p.nombre_normalizado,
          cantidad: Number(it.cantidad) || 1,
          stock_actual: p.stock,
          stock_resultante: Number(p.stock) - (Number(it.cantidad) || 1),
        };
      });

    res.json({ items, destinatario: resultado.destinatario || '', advertencias: resultado.advertencias || [] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error interpretando la nota.' });
  }
});

app.post('/api/salidas/confirmar', async (req, res) => {
  try {
    const { nota, destinatario, items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No hay items para confirmar.' });
    const { data, error } = await supabase.rpc('registrar_salida', {
      p_negocio_id: NEGOCIO_ID,
      p_nota: nota || '',
      p_destinatario: destinatario || null,
      p_items: items,
    });
    if (error) throw error;
    res.json({ ok: true, despacho_id: data });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error confirmando la salida.' });
  }
});

// ---------- Ventas de WhatsApp pendientes de convertir en salida ----------

app.get('/api/ventas-whatsapp', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('ventas_whatsapp_pendientes')
      .select('id, contacto_nombre, telefono_cliente, producto_texto, monto_estimado, marca_vendedora, creado_at')
      .eq('negocio_id', NEGOCIO_ID)
      .eq('procesado', false)
      .order('creado_at', { ascending: false });
    if (error) throw error;
    res.json({ ventas: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error cargando las ventas pendientes.' });
  }
});

app.post('/api/ventas-whatsapp/:id/marcar-procesada', async (req, res) => {
  try {
    const { error } = await supabase
      .from('ventas_whatsapp_pendientes')
      .update({ procesado: true, procesado_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('negocio_id', NEGOCIO_ID);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error marcando la venta como procesada.' });
  }
});

// ---------- CRM (contactos y mensajes del bot de WhatsApp, tiempo real) ----------

app.get('/api/crm/contactos', async (_req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('crm_contactos')
      .select('id, negocio_id, negocio_nombre, nombre, telefono, estado_embudo, total_entrada, total_salida, ultima_interaccion_at, bloqueado, es_prospecto, seguimiento_pendiente_at')
      .order('ultima_interaccion_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    res.json({ contactos: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error cargando contactos.' });
  }
});

app.get('/api/crm/mensajes/:contactoId', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('crm_mensajes')
      .select('id, direccion, tipo, texto, creado_at')
      .eq('contacto_id', req.params.contactoId)
      .order('creado_at', { ascending: true })
      .limit(300);
    if (error) throw error;
    res.json({ mensajes: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error cargando mensajes.' });
  }
});

// ---------- Dashboard ----------

app.get('/api/dashboard', async (_req, res) => {
  try {
    const { data: productos, error } = await supabase
      .from('productos')
      .select('id, nombre_normalizado, categoria, unidad, stock, costo_promedio, stock_minimo')
      .eq('negocio_id', NEGOCIO_ID)
      .order('nombre_normalizado');
    if (error) throw error;

    const lista = productos || [];
    const totalProductos = lista.length;
    const unidadesTotales = lista.reduce((s, p) => s + Number(p.stock || 0), 0);
    const valoracionTotal = lista.reduce((s, p) => s + Number(p.stock || 0) * Number(p.costo_promedio || 0), 0);
    const stockBajo = lista.filter((p) => Number(p.stock) <= Number(p.stock_minimo ?? 3));

    res.json({ totalProductos, unidadesTotales, valoracionTotal, stockBajo, productos: lista });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error cargando el dashboard.' });
  }
});
