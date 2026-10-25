import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'KATÁBASIS — A descent into the night', description: 'Cross the threshold. An intimate gathering for those drawn to the darker side of sound.', metadataBase: new URL('https://katabasis-ritual-251026.tinycharm9.chatgpt.site') };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b0b0a' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
