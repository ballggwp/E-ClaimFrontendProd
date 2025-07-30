// middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/claim/login',  // ถ้ายังไม่มี session ก็จะโยกไป /login
  },
})

// ให้ middleware ทำงานกับ path ที่ต้องการปกป้อง (protected routes)
export const config = {
  matcher: [
    '/claim/dashboard/:path*',
    '/claim/claims/:path*',
  ],
}
