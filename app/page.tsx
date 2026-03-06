import { redirect } from 'next/navigation';
import { getSessionCookie } from '@/lib/auth';

export default async function Home() {
  const session = await getSessionCookie();
  
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
