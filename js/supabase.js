// Initialize Supabase client
const SUPABASE_URL = 'https://rnhvxynawjkoiwdkkugj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_HkNtJkbYL9XXT2Iyv1FItw_6n2IQkP6'

const { createClient } = supabase  // from CDN
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
