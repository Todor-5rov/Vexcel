"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  FileSpreadsheet,
  Sparkles,
  Zap,
  Shield,
  Users,
  TrendingUp,
  ArrowRight,
  Play,
  CheckCircle,
  Star,
  Quote,
  BarChart3,
  Clock,
  Globe,
  Award,
  Lightbulb,
  Target,
} from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface LandingPageProps {
  onAuthChange: (user: User | null) => void
}

export default function LandingPage({ onAuthChange }: LandingPageProps) {
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [animatedNumbers, setAnimatedNumbers] = useState({ users: 0, files: 0, time: 0 })
  const [visibleSection, setVisibleSection] = useState("")

  useEffect(() => {
    // Animate numbers on mount
    const timer = setInterval(() => {
      setAnimatedNumbers((prev) => ({
        users: Math.min(prev.users + 47, 2847),
        files: Math.min(prev.files + 123, 15420),
        time: Math.min(prev.time + 2, 89),
      }))
    }, 50)

    setTimeout(() => clearInterval(timer), 2000)

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSection(entry.target.id)
          }
        })
      },
      { threshold: 0.1 },
    )

    const sections = document.querySelectorAll("[data-section]")
    sections.forEach((section) => observer.observe(section))

    return () => {
      clearInterval(timer)
      observer.disconnect()
    }
  }, [])

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error("Error signing in:", error)
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-xl border-b border-primary-100/50 z-50 transition-all duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-primary-400 to-primary-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-300" />
                <div className="relative bg-white p-2 rounded-lg">
                  <FileSpreadsheet className="h-6 w-6 text-primary-500" />
                </div>
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 bg-clip-text text-transparent">
                VExcel
              </span>
            </div>
            <Button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-2.5 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-primary-500/25"
            >
              {isSigningIn ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                "Get Started Free"
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-primary-50 via-white to-primary-50 relative overflow-hidden">
        {/* Enhanced Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-primary-200 to-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-green-200 to-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-40 w-96 h-96 bg-gradient-to-r from-yellow-200 to-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000" />

          {/* Floating Elements */}
          <div className="absolute top-20 right-20 w-4 h-4 bg-primary-400 rounded-full animate-float opacity-60" />
          <div className="absolute top-40 right-40 w-2 h-2 bg-primary-500 rounded-full animate-float animation-delay-2000 opacity-80" />
          <div className="absolute bottom-40 left-20 w-3 h-3 bg-primary-300 rounded-full animate-float animation-delay-4000 opacity-70" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-100 to-primary-50 text-primary-700 px-5 py-3 rounded-full text-sm font-medium border border-primary-200/50 shadow-sm">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  AI-Powered Excel Revolution
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                </div>
                <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight">
                  Transform Your{" "}
                  <span className="relative">
                    <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 bg-clip-text text-transparent">
                      Excel Files
                    </span>
                    <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transform scale-x-0 animate-scale-x" />
                  </span>{" "}
                  with Natural Language
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  Stop wrestling with complex formulas and functions. Just tell VExcel what you want in plain English,
                  and watch your spreadsheets transform instantly with the power of AI.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  size="lg"
                  className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-primary-500/25 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {isSigningIn ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    <>
                      Start Free Today
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-primary-300 text-primary-600 hover:bg-primary-50 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105 group bg-white/80 backdrop-blur-sm hover:shadow-lg"
                >
                  <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-6">
                {[
                  { value: animatedNumbers.users, label: "Happy Users", suffix: "+" },
                  { value: animatedNumbers.files, label: "Files Processed", suffix: "+" },
                  { value: animatedNumbers.time, label: "Time Saved", suffix: "%" },
                ].map((stat, index) => (
                  <div key={index} className="text-center group">
                    <div className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                      {stat.value.toLocaleString()}
                      {stat.suffix}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-in-right">
              <div className="relative">
                {/* Main Demo Card */}
                <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-all duration-700 border border-primary-100/50">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 to-primary-600 rounded-3xl blur opacity-20" />
                  <div className="relative">
                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6 rounded-2xl mb-6 shadow-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <Sparkles className="h-5 w-5 animate-pulse" />
                        </div>
                        <span className="font-semibold text-lg">AI Assistant</span>
                        <div className="ml-auto flex gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse animation-delay-2000" />
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse animation-delay-4000" />
                        </div>
                      </div>
                      <p className="text-primary-50 leading-relaxed">
                        "Sort the data by salary in descending order and highlight the top 10 performers with
                        conditional formatting"
                      </p>
                    </div>
                    <div className="space-y-4">
                      {[
                        { text: "Data sorted by salary", completed: true },
                        { text: "Top performers highlighted", completed: true },
                        { text: "Conditional formatting applied", completed: true },
                        { text: "Generating insights report", completed: false },
                      ].map((task, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                            task.completed
                              ? "bg-green-50 border border-green-200"
                              : "bg-primary-50 border border-primary-200"
                          }`}
                          style={{ animationDelay: `${index * 200}ms` }}
                        >
                          {task.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-500 animate-scale-in" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                          )}
                          <span className={`font-medium ${task.completed ? "text-green-700" : "text-primary-700"}`}>
                            {task.text}
                          </span>
                          {task.completed && <span className="ml-auto text-green-500 font-bold">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating Stats */}
                <div className="absolute -bottom-6 -right-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6 rounded-2xl shadow-xl animate-bounce-slow border-4 border-white">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-90">Processing Time</div>
                  <div className="text-2xl font-bold">2.3s</div>
                  <div className="text-xs opacity-90">Lightning Fast ⚡</div>
                </div>

                <div className="absolute -top-6 -left-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl shadow-lg animate-float">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-semibold">99.9% Accuracy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" data-section className="py-24 bg-gradient-to-b from-white to-gray-50 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Target className="h-4 w-4" />
              Powerful Features
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Why Choose{" "}
              <span className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                VExcel
              </span>
              ?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Experience the future of spreadsheet management with AI-powered automation, intuitive design, and
              enterprise-grade security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "Natural Language Processing",
                description:
                  "Simply describe what you want in plain English. Our advanced AI understands context and executes complex operations instantly.",
                color: "from-purple-500 to-pink-500",
                features: ["Context-aware AI", "Multi-language support", "Complex query handling"],
              },
              {
                icon: Zap,
                title: "Lightning Fast Results",
                description:
                  "Get instant results with our optimized AI engine. Process thousands of rows and complex calculations in seconds.",
                color: "from-yellow-500 to-orange-500",
                features: ["Sub-second processing", "Batch operations", "Real-time updates"],
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description:
                  "Your data is protected with bank-level encryption, secure cloud storage, and compliance with industry standards.",
                color: "from-green-500 to-teal-500",
                features: ["256-bit encryption", "SOC 2 compliant", "GDPR ready"],
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description:
                  "Share and collaborate on spreadsheets with your team in real-time. Track changes and manage permissions effortlessly.",
                color: "from-blue-500 to-indigo-500",
                features: ["Real-time sync", "Permission controls", "Change tracking"],
              },
              {
                icon: TrendingUp,
                title: "Smart Analytics",
                description:
                  "Get intelligent insights and recommendations based on your data patterns. Discover trends you never knew existed.",
                color: "from-red-500 to-pink-500",
                features: ["Predictive analytics", "Trend detection", "Smart recommendations"],
              },
              {
                icon: FileSpreadsheet,
                title: "Universal Compatibility",
                description:
                  "Works seamlessly with Excel, CSV, Google Sheets, and more. Import and export without losing formatting or formulas.",
                color: "from-indigo-500 to-purple-500",
                features: ["Format preservation", "Formula compatibility", "Seamless import/export"],
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 shadow-lg bg-white/80 backdrop-blur-sm relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-8 relative">
                  <div className="relative mb-6">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}
                    >
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-primary-600 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                  <div className="space-y-2">
                    {feature.features.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle className="h-4 w-4 text-primary-500" />
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section
        id="testimonials"
        data-section
        className="py-24 bg-gradient-to-br from-primary-50 via-primary-25 to-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-white/80 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary-200">
              <Award className="h-4 w-4" />
              Customer Success Stories
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">What Our Users Say</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of professionals who've transformed their workflow and boosted productivity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                name: "Sarah Johnson",
                role: "Data Analyst at TechCorp",
                company: "TechCorp",
                content:
                  "VExcel has revolutionized how I work with data. What used to take hours now takes minutes. The AI understands exactly what I need and executes complex operations flawlessly.",
                rating: 5,
                avatar: "/placeholder.svg?height=80&width=80",
                metrics: "300% faster analysis",
              },
              {
                name: "Michael Chen",
                role: "Financial Manager",
                company: "FinanceFlow",
                content:
                  "The natural language processing is incredible. I can just say 'show me the top 10 customers by revenue this quarter' and it's done instantly with beautiful formatting.",
                rating: 5,
                avatar: "/placeholder.svg?height=80&width=80",
                metrics: "5 hours saved daily",
              },
              {
                name: "Emily Rodriguez",
                role: "Operations Director",
                company: "OptiMax Solutions",
                content:
                  "Our team productivity has increased by 300% since switching to VExcel. It's like having a data scientist on demand. The collaboration features are game-changing.",
                rating: 5,
                avatar: "/placeholder.svg?height=80&width=80",
                metrics: "300% productivity boost",
              },
            ].map((testimonial, index) => (
              <Card
                key={index}
                className="bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 border-0 group hover:-translate-y-2"
              >
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                    <div className="ml-auto bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {testimonial.metrics}
                    </div>
                  </div>
                  <Quote className="h-8 w-8 text-primary-300 mb-4" />
                  <p className="text-gray-700 mb-8 italic leading-relaxed text-lg">"{testimonial.content}"</p>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={testimonial.avatar || "/placeholder.svg"}
                        alt={testimonial.name}
                        className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">{testimonial.name}</div>
                      <div className="text-primary-600 font-medium">{testimonial.role}</div>
                      <div className="text-sm text-gray-500">{testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <p className="text-gray-500 mb-8">Trusted by leading companies worldwide</p>
            <div className="flex items-center justify-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              {["TechCorp", "FinanceFlow", "OptiMax", "DataDrive", "CloudSync"].map((company, index) => (
                <div
                  key={index}
                  className="text-2xl font-bold text-gray-400 hover:text-primary-500 transition-colors duration-300"
                >
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        {/* Animated Background Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float" />
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/10 rounded-full blur-xl animate-float animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white/5 rounded-full blur-2xl animate-pulse-slow" />

        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
              <Lightbulb className="h-4 w-4" />
              Ready to Transform Your Workflow?
            </div>
            <h2 className="text-5xl lg:text-6xl font-bold mb-8 leading-tight">
              Start Your Excel Revolution
              <span className="block text-primary-200">Today</span>
            </h2>
            <p className="text-xl mb-12 opacity-90 max-w-3xl mx-auto leading-relaxed">
              Join thousands of professionals who've already discovered the power of AI-driven Excel manipulation.
              Transform your data workflow in minutes, not hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                size="lg"
                className="bg-white text-primary-600 hover:bg-gray-100 px-10 py-5 rounded-full text-xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-100/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {isSigningIn ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <>
                    Start Free Trial
                    <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-white/50 text-white hover:bg-white/10 px-10 py-5 rounded-full text-xl font-bold transition-all duration-300 hover:scale-105 bg-transparent backdrop-blur-sm hover:border-white"
              >
                <Play className="mr-3 h-6 w-6" />
                Watch Demo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { icon: Clock, text: "Setup in 2 minutes" },
                { icon: Shield, text: "Enterprise security" },
                { icon: Globe, text: "24/7 support" },
              ].map((feature, index) => (
                <div key={index} className="flex items-center justify-center gap-3 text-white/90">
                  <feature.icon className="h-5 w-5" />
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            <p className="text-sm mt-8 opacity-75">
              No credit card required • Free forever plan available • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="py-16 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <FileSpreadsheet className="h-8 w-8 text-primary-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse" />
                </div>
                <span className="font-bold text-2xl bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
                  VExcel
                </span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                Transform your Excel experience with AI-powered natural language processing. Make data manipulation as
                easy as having a conversation.
              </p>
              <div className="flex gap-4">
                {["Twitter", "LinkedIn", "GitHub"].map((social, index) => (
                  <div
                    key={index}
                    className="w-10 h-10 bg-gray-800 hover:bg-primary-500 rounded-full flex items-center justify-center transition-colors duration-300 cursor-pointer"
                  >
                    <span className="text-sm font-bold">{social[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6 text-primary-300">Product</h4>
              <ul className="space-y-3">
                {["Features", "Pricing", "API", "Integrations"].map((item, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6 text-primary-300">Support</h4>
              <ul className="space-y-3">
                {["Help Center", "Documentation", "Contact", "Status"].map((item, index) => (
                  <li key={index}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="text-gray-400 mb-4 md:mb-0">
                © 2024 VExcel. All rights reserved. Transform your data with AI.
              </div>
              <div className="flex gap-6 text-sm text-gray-400">
                <a href="#" className="hover:text-white transition-colors duration-300">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  Cookie Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
