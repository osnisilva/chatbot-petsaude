import { type NextRequest } from 'next/server'
import { updateSession } from './src/utils/supabase/proxy'

export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
  ],
}
