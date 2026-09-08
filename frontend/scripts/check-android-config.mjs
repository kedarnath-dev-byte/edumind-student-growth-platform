import process from 'node:process'
for (const name of ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL', 'VITE_PUBLIC_APP_URL']) {
  const url = new URL(process.env[name] || '')
  if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    throw new Error(`${name} must be a deployed HTTPS address`)
  }
}
const key = process.env.VITE_SUPABASE_ANON_KEY || ''
if (!key) throw new Error('VITE_SUPABASE_ANON_KEY is required')
if (key.startsWith('sb_secret_')) throw new Error('Never package a secret Supabase key')
if (key.startsWith('ey')) {
  const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString())
  if (claims.role !== 'anon') throw new Error('Only the public anon key belongs in an APK')
}
