import type { Metadata } from 'next';
import './globals.css';
import { AtmosProvider } from '@/providers/atmos-provider';
import { Shell } from '@/components/shell';
export const metadata: Metadata = { title: 'Far.Fly — Your visual world, in sound', description: 'Scroll what you feel. Hear what it sounds like. Discover a soundtrack through your visual world.' };
export default function RootLayout({children}: {children: React.ReactNode}) {
 return <html lang="en"><body><AtmosProvider><Shell>{children}</Shell></AtmosProvider></body></html>;
}
