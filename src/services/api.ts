function authHeaders(): HeadersInit {
  const token = localStorage.getItem('admin_token') || '';
  return token ? { 'x-admin-token': token } : {};
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Error en ${url}`);
  return data;
}

async function get(url: string) {
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Error en ${url}`);
  return data;
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] || '';
      resolve({ base64, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const api = {
  extraerFactura: (base64Image: string, mimeType: string) => post('/api/entradas/extraer', { base64Image, mimeType }),
  guardarEntrada: (factura: unknown, items: unknown[]) => post('/api/entradas/guardar', { factura, items }),
  interpretarSalida: (nota: string) => post('/api/salidas/interpretar', { nota }),
  confirmarSalida: (nota: string, destinatario: string, items: unknown[]) =>
    post('/api/salidas/confirmar', { nota, destinatario, items }),
  dashboard: () => get('/api/dashboard'),
  ventasWhatsapp: () => get('/api/ventas-whatsapp'),
  marcarVentaProcesada: (id: number) => post(`/api/ventas-whatsapp/${id}/marcar-procesada`, {}),
  crmContactos: () => get('/api/crm/contactos'),
  crmMensajes: (contactoId: string) => get(`/api/crm/mensajes/${contactoId}`),
};
