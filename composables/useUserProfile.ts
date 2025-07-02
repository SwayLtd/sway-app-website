import { useSupabaseClient } from '#imports'

export async function useUserProfile(userId: number) {
  const supabase = useSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single()
  if (error) return null
  return data?.username || null
}
