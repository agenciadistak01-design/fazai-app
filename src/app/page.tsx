import { redirect } from 'next/navigation';

export default function Home() {
  // Em produção, redireciona para o chat
  // Futuramente pode ter uma landing page aqui
  redirect('/chat');
}
