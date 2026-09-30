import { useState } from 'react';
import { FileUp, PackageMinus, LayoutDashboard, Boxes, MessageCircle, Users } from 'lucide-react';
import EntradasModule from './components/EntradasModule';
import SalidasModule from './components/SalidasModule';
import DashboardModule from './components/DashboardModule';
import VentasWhatsappModule from './components/VentasWhatsappModule';
import CrmModule from './components/CrmModule';

type Tab = 'dashboard' | 'entradas' | 'salidas' | 'whatsapp' | 'crm';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Boxes className="h-6 w-6 text-indigo-600" />
          <h1 className="text-lg font-bold text-slate-800">Inventario Insublimex</h1>
        </div>
      </header>

      <nav className="mx-auto flex max-w-5xl gap-1 px-6 pt-4">
        <TabButton icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" active={tab === 'dashboard'} onClick={() => setTab('dashboard')} />
        <TabButton icon={<FileUp className="h-4 w-4" />} label="Entradas" active={tab === 'entradas'} onClick={() => setTab('entradas')} />
        <TabButton icon={<PackageMinus className="h-4 w-4" />} label="Salidas" active={tab === 'salidas'} onClick={() => setTab('salidas')} />
        <TabButton icon={<MessageCircle className="h-4 w-4" />} label="Ventas WhatsApp" active={tab === 'whatsapp'} onClick={() => setTab('whatsapp')} />
        <TabButton icon={<Users className="h-4 w-4" />} label="CRM" active={tab === 'crm'} onClick={() => setTab('crm')} />
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {tab === 'dashboard' && <DashboardModule />}
        {tab === 'entradas' && <EntradasModule />}
        {tab === 'salidas' && <SalidasModule />}
        {tab === 'whatsapp' && <VentasWhatsappModule />}
        {tab === 'crm' && <CrmModule />}
      </main>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
        active ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
