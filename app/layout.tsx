import type { Metadata } from 'next';
import './globals.css';
import { AccountProvider } from '@/providers/account-provider';
import { AtmosProvider } from '@/providers/atmos-provider';
import { SpotifyProvider } from '@/providers/spotify-provider';
import { Shell } from '@/components/shell';
export const metadata: Metadata = { icons: { icon: '/farfly-orca.png', apple: '/farfly-orca.png' }, title: 'Far.Fly — Your visual world, in sound', description: 'Scroll what you feel. Hear what it sounds like. Discover a soundtrack through your visual world.' };
export default function RootLayout({children}: {children: React.ReactNode}) {
 return <html lang="en"><body><AccountProvider><AtmosProvider><SpotifyProvider><Shell>{children}</Shell></SpotifyProvider></AtmosProvider></AccountProvider></body></html>;
}

