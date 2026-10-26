// La clave publicable identifica el proyecto; los permisos los aplica RLS.
const db = supabase.createClient('https://mhvvpuvkyjrjvmhowwme.supabase.co',
  'sb_publishable_LCK17AcmINHv8d_X14yuxg_LyeQj172');
window.escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.safePhoto = value => /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(value || '') ? value : '';
window.readProfile = async () => {
  const {data: {user}, error} = await db.auth.getUser();
  if (error || !user) return null;
  const result = await db.from('profiles')
    .select('id, username, email, is_approved, auth_user_id')
    .eq('auth_user_id', user.id).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
};
