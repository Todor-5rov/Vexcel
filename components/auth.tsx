"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { User } from "@supabase/supabase-js"
import { FileSpreadsheet, LogOut } from "lucide-react"

interface AuthProps {
  user: User | null
  onAuthChange: (user: User | null) => void
}

export default function Auth({ user, onAuthChange }: AuthProps) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      onAuthChange(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [onAuthChange])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-4 p-4 bg-white border-b border-primary-200">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary-500" />
          <span className="font-bold text-primary-600 text-xl">VExcel</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <p className="font-medium text-gray-900">{user.user_metadata?.full_name}</p>
            <p className="text-gray-500">{user.email}</p>
          </div>
          {user.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url || "/placeholder.svg"}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={loading}
            className="border-primary-300 text-primary-600 hover:bg-primary-50 bg-transparent"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileSpreadsheet className="h-8 w-8 text-primary-500" />
            <CardTitle className="text-2xl font-bold text-primary-600">VExcel</CardTitle>
          </div>
          <CardDescription>Transform your Excel files with natural language commands</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white"
          >
            {loading ? "Signing in..." : "Sign in with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
