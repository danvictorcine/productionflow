
// This file can be removed or left as is. 
// It's not actively used, but doesn't hurt to keep for potential future root-level public pages.
import { redirect } from 'next/navigation';

export default function PublicRootPage() {
    redirect('/');
}
