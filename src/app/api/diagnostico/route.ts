import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const diagnostico = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    variables: {
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? {
        configured: true,
        value: process.env.TURSO_DATABASE_URL.substring(0, 30) + '...',
        length: process.env.TURSO_DATABASE_URL.length
      } : { configured: false },
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? {
        configured: true,
        prefix: process.env.TURSO_AUTH_TOKEN.substring(0, 20) + '...',
        length: process.env.TURSO_AUTH_TOKEN.length
      } : { configured: false },
      NEXT_PUBLIC_YOUTUBE_API_KEY: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ? {
        configured: true,
        length: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY.length
      } : { configured: false }
    },
    allEnvVarsWithNextPublic: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC') || key.startsWith('TURSO'))
      .reduce((acc, key) => {
        acc[key] = process.env[key] ? 'SET' : 'NOT SET'
        return acc
      }, {} as Record<string, string>)
  }

  return NextResponse.json(diagnostico)
}

