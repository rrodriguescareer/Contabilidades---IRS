import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IRS 2026 · RR.',
    short_name: 'IRS 2026',
    description: 'Prepare e acompanhe a entrega do seu IRS com um contabilista certificado.',
    id: '/',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A2344',
    theme_color: '#0A2344',
    lang: 'pt-PT',
    dir: 'ltr',
    categories: ['finance', 'business', 'productivity'],
    icons: [
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icone-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'O meu processo', url: '/app', description: 'Estado da entrega do IRS' },
      { name: 'Mensagens', url: '/app?separador=mensagens', description: 'Falar com o contabilista' },
      { name: 'Documentos', url: '/app?separador=documentos', description: 'Enviar documentos' },
    ],
  };
}
