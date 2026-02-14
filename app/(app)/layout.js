import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AppShell from '@/app/components/AppShell'
import { ToastProvider } from '@/app/components/Toast'

export default async function AppLayout({ children }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <AppShell user={user} profile={profile}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AppShell>
  )
}