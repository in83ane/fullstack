import { Google, generateCodeVerifier, generateState } from 'arctic'

export const googleClient = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!
)

export { generateCodeVerifier, generateState }
