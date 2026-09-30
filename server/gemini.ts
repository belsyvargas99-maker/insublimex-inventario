// Prompt y JSON Schema portados de GeminiInvoiceService.kt (proyecto Android original de AI Studio).
// Misma logica de extraccion, mismas reglas anti-alucinacion. Solo cambia el runtime (Node en vez de Kotlin).

const MODEL = 'gemini-3.6-flash';

const SYSTEM_PROMPT_FACTURA = `Eres un asistente experto en procesamiento multimodal de documentos contables, facturas e inventarios comerciales.

TU OBJETIVO:
Analizar la imagen de la factura, recibo o comprobante de compra proporcionado, extraer todos los datos relevantes de la transaccion y estructurarlos en un formato JSON estricto sin alucinaciones ni suposiciones.

REGLAS DE EXTRACCION:
1. INFORMACION ENCABEZADO:
   - Extrae el nombre o razon social del proveedor.
   - Extrae el numero de factura o control si esta presente.
   - Formatea la fecha de emision a estandar ISO 'YYYY-MM-DD'. Si no es legible o no aparece, asigna null.

2. DETALLE DE PRODUCTOS (ITEMS):
   - Lee cada linea de producto adquirida.
   - Extrae el nombre exacto que figura en la factura ("descripcion_original").
   - Genera un nombre limpio y simplificado ("nombre_normalizado") eliminando codigos extranos para facilitar el cruce con el catalogo de la app.
   - Identifica la cantidad comprada como un numero entero o flotante positivo.
   - Extrae el precio de costo unitario y el subtotal por item. Si uno de ellos no aparece pero el otro si, calculalo matematicamente (Subtotal = Cantidad * Precio Unitario).
   - Sugiere una categoria/seccion estimada para el producto.

3. FINANZAS:
   - Extrae el monto total acumulado de la compra ("monto_total").
   - Extrae el impuesto/IVA si esta desglosado.
   - Identifica la moneda si esta explicita (ej. "USD", "VES", "EUR"); de lo contrario, asigna "USD" por defecto.

4. REGLAS DE SEGURIDAD Y PRECISION:
   - Si un dato no esta presente o es totalmente ilegible, asigna null.
   - Ignora notas escritas a mano y texto promocional no relevante.
   - No inventes productos ni precios que no aparezcan reflejados en el documento.
   - Tu respuesta DEBE ser EXCLUSIVAMENTE el objeto JSON conforme al esquema configurado, sin introducciones ni explicaciones en texto plano.`;

const SCHEMA_FACTURA = {
  type: 'OBJECT',
  properties: {
    proveedor: { type: 'STRING', description: 'Nombre o razon social de la empresa que emite la factura.' },
    numero_factura: { type: 'STRING', nullable: true, description: 'Numero de factura, comprobante o control.' },
    fecha: { type: 'STRING', nullable: true, description: 'Fecha de la compra en formato YYYY-MM-DD.' },
    moneda: { type: 'STRING', description: 'Codigo de moneda de la transaccion, por ejemplo USD o VES.' },
    items: {
      type: 'ARRAY',
      description: 'Lista de productos comprados detallados en la factura.',
      items: {
        type: 'OBJECT',
        properties: {
          descripcion_original: { type: 'STRING' },
          nombre_normalizado: { type: 'STRING' },
          categoria_sugerida: { type: 'STRING' },
          cantidad: { type: 'NUMBER' },
          precio_costo_unitario: { type: 'NUMBER' },
          subtotal_item: { type: 'NUMBER' },
        },
        required: ['descripcion_original', 'nombre_normalizado', 'cantidad', 'precio_costo_unitario', 'subtotal_item'],
      },
    },
    monto_impuestos: { type: 'NUMBER', nullable: true },
    monto_total: { type: 'NUMBER' },
  },
  required: ['proveedor', 'moneda', 'items', 'monto_total'],
};

const SCHEMA_SALIDA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      description: 'Productos identificados en la nota, cruzados contra el catalogo real que se te dio.',
      items: {
        type: 'OBJECT',
        properties: {
          producto_id: { type: 'NUMBER', description: 'id exacto del catalogo, nunca inventado. Si no hay match claro, omite el item.' },
          nombre_producto: { type: 'STRING' },
          cantidad: { type: 'NUMBER' },
        },
        required: ['producto_id', 'nombre_producto', 'cantidad'],
      },
    },
    destinatario: { type: 'STRING', nullable: true, description: 'A quien se le despacho, si la nota lo menciona.' },
    advertencias: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Menciones de la nota que no se pudieron cruzar con ningun producto del catalogo.',
    },
  },
  required: ['items', 'advertencias'],
};

async function callGemini(apiKey: string, systemPrompt: string, parts: any[], schema: object) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts }],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: schema,
      temperature: 0.1,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json: any = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Error HTTP ${res.status} llamando a Gemini`);
  }
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini no devolvio contenido.');
  const cleaned = String(text).trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

export async function extraerFactura(apiKey: string, base64Image: string, mimeType: string) {
  return callGemini(
    apiKey,
    SYSTEM_PROMPT_FACTURA,
    [
      { text: 'Analiza este documento contable / factura y extrae todos los datos requeridos segun el esquema JSON.' },
      { inline_data: { mime_type: mimeType, data: base64Image } },
    ],
    SCHEMA_FACTURA,
  );
}

export async function interpretarSalida(apiKey: string, nota: string, catalogo: { id: number; nombre_normalizado: string; stock: number }[]) {
  const catalogoTexto = catalogo.map((p) => `id=${p.id} | ${p.nombre_normalizado} | stock actual: ${p.stock}`).join('\n');
  const systemPrompt = `Eres el asistente que interpreta notas informales de despacho de un negocio (tipo mensaje de WhatsApp) y las cruza contra el catalogo real de productos.

CATALOGO DISPONIBLE (usa SOLO estos id, nunca inventes uno):
${catalogoTexto}

REGLAS:
- Identifica que productos del catalogo menciona la nota y en que cantidad.
- Si un producto mencionado en la nota NO esta en el catalogo, no inventes un id: agregalo a "advertencias" en vez de a "items".
- Si la cantidad no se menciona explicitamente para un producto, asume 1.
- No calcules ni asumas stock resultante, eso lo hace el sistema.
- Tu respuesta debe ser EXCLUSIVAMENTE el JSON del esquema, sin texto adicional.`;

  return callGemini(
    apiKey,
    systemPrompt,
    [{ text: `Nota de despacho: "${nota}"` }],
    SCHEMA_SALIDA,
  );
}
