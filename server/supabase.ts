import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key-not-configured';

if (!process.env.SUPABASE_URL || !key) {
  console.warn('[supabase] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env — las llamadas a la base de datos fallaran hasta que se configuren.');
}

export const supabase = createClient(url, key, {
  db: { schema: 'inventario' },
  auth: { persistSession: false },
});

// Cliente separado para el schema `wa` (bot de WhatsApp: contactos y mensajes en vivo para el CRM)
export const supabaseWa = createClient(url, key, {
  db: { schema: 'wa' },
  auth: { persistSession: false },
});

// El schema `wa` no esta expuesto en la Data API de Supabase (solo public/graphql_public/inventario),
// asi que el CRM lee por unas vistas espejo en `public` (crm_contactos, crm_mensajes) en vez de `wa` directo.
export const supabasePublic = createClient(url, key, {
  auth: { persistSession: false },
});

export const NEGOCIO_ID = process.env.NEGOCIO_ID || '';
