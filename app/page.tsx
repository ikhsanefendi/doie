import { redirect } from 'next/navigation';
import { getSessionCookie } from '@/lib/auth';

export default async function Home() {

  // IKHSAN EFENDI KALAU KEHABISAN COOKIE JWT
  const session = await getSessionCookie();  
  // console.log(session)
  // alert("Testing")
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
