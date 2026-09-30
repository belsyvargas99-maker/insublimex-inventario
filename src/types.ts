export interface FacturaItem {
  descripcion_original: string;
  nombre_normalizado: string;
  categoria_sugerida?: string;
  cantidad: number;
  precio_costo_unitario: number;
  subtotal_item: number;
}

export interface FacturaExtraida {
  proveedor: string;
  numero_factura: string | null;
  fecha: string | null;
  moneda: string;
  items: FacturaItem[];
  monto_impuestos: number | null;
  monto_total: number;
}

export interface SalidaItem {
  producto_id: number;
  nombre_producto: string;
  cantidad: number;
  stock_actual: number;
  stock_resultante: number;
}

export interface SalidaInterpretada {
  items: SalidaItem[];
  destinatario: string;
  advertencias: string[];
}

export interface ProductoInventario {
  id: number;
  nombre_normalizado: string;
  categoria: string | null;
  unidad: string;
  stock: number;
  costo_promedio: number;
  stock_minimo: number;
}

export interface VentaWhatsapp {
  id: number;
  contacto_nombre: string | null;
  telefono_cliente: string | null;
  producto_texto: string;
  monto_estimado: string | null;
  marca_vendedora: string | null;
  creado_at: string;
}

export interface CrmContacto {
  id: string;
  negocio_id: string;
  negocio_nombre: string;
  nombre: string | null;
  telefono: string;
  estado_embudo: string | null;
  total_entrada: number;
  total_salida: number;
  ultima_interaccion_at: string;
  bloqueado: boolean;
  es_prospecto: boolean;
  seguimiento_pendiente_at: string | null;
}

export interface CrmMensaje {
  id: number;
  direccion: 'entrada' | 'salida';
  tipo: string;
  texto: string;
  creado_at: string;
}

export interface DashboardData {
  totalProductos: number;
  unidadesTotales: number;
  valoracionTotal: number;
  stockBajo: ProductoInventario[];
  productos: ProductoInventario[];
}
