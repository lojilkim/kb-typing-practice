import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      studentId: string
      profilePicture: string | null
      level: number
      xp: number
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    username: string
    studentId: string
    profilePicture: string | null
    level: number
    xp: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    studentId: string
    profilePicture: string | null
    level: number
    xp: number
  }
}
