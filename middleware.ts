import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './src/utils/supabase/proxy'

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request)
  } catch (e) {
    // Se o middleware falhar, deixa a requisição passar para não travar o site
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
  ],
}
