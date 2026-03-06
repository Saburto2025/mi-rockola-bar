import { NextResponse } from 'next/server'

export async function GET() {
  const diagnostico = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    variables: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? {
        configured: true,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...',
        length: process.env.NEXT_PUBLIC_SUPABASE_URL.length
      } : { configured: false },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? {
        configured: true,
        prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...',
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length,
        isValidFormat: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ')
      } : { configured: false },
      NEXT_PUBLIC_YOUTUBE_API_KEY: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ? {
        configured: true,
        length: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY.length
      } : { configured: false }
    },
    allEnvVarsWithNextPublic: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC'))
      .reduce((acc, key) => {
        acc[key] = process.env[key] ? 'SET' : 'NOT SET'
        return acc
      }, {} as Record<string, string>)
  }

  return NextResponse.json(diagnostico, { status: 200 })
}
