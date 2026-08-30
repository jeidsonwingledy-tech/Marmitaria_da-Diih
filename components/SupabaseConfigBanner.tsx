import React from 'react';
import { AlertTriangle, ExternalLink, X, WifiOff } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const SupabaseConfigBanner: React.FC = () => {
  const { supabaseError } = useStore();
  const [dismissed, setDismissed] = React.useState(false);

  if (!supabaseError || dismissed) return null;

  const isPausedError =
    supabaseError.toLowerCase().includes('bloqueado') ||
    supabaseError.toLowerCase().includes('plano gratuito') ||
    supabaseError.toLowerCase().includes('paused');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: isPausedError ? '#7c3aed' : '#b91c1c',
        color: '#fff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ marginTop: 2 }}>
        {isPausedError ? <WifiOff size={18} /> : <AlertTriangle size={18} />}
      </div>
      <div style={{ flex: 1, fontSize: 13 }}>
        <strong>
          {isPausedError
            ? '⚠️ Supabase pausado — Modo Offline Ativo'
            : '⚠️ Erro de Banco de Dados'}
        </strong>
        <p style={{ margin: '3px 0 6px', opacity: 0.9, fontSize: 12, lineHeight: 1.4 }}>
          {isPausedError
            ? 'Seu projeto Supabase foi pausado pelo plano gratuito (inatividade). O cardápio está funcionando com dados de demonstração. Pedidos não serão salvos até a reativação.'
            : supabaseError}
        </p>
        {isPausedError && (
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 'bold',
              textDecoration: 'none',
            }}
          >
            Reativar no Supabase <ExternalLink size={11} />
          </a>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Fechar aviso"
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          padding: 4,
          opacity: 0.8,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default SupabaseConfigBanner;
