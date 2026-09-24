'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Lock, User, Eye, EyeOff, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react'

interface AdminLoginProps {
  onLoginSuccess: (user: string) => void
  catalogUrl?: string
}

export function AdminLogin({ onLoginSuccess, catalogUrl }: AdminLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const defaultAdminUser = (process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin').toLowerCase()
  const defaultAdminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'nema2026'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const enteredUser = username.trim().toLowerCase()
    const enteredPass = password.trim()

    // Match against default configured user/pass, or allow alias 'nemafoods'
    const isUserValid = enteredUser === defaultAdminUser || enteredUser === 'nemafoods'
    const isPassValid = enteredPass === defaultAdminPass

    setTimeout(() => {
      if (isUserValid && isPassValid) {
        const sessionData = {
          user: enteredUser,
          authenticated: true,
          timestamp: Date.now(),
        }

        try {
          if (rememberMe) {
            localStorage.setItem('nema_admin_auth', JSON.stringify(sessionData))
          }
          sessionStorage.setItem('nema_admin_auth', JSON.stringify(sessionData))
        } catch (err) {
          console.error('Storage error:', err)
        }

        setIsLoading(false)
        onLoginSuccess(enteredUser)
      } else {
        setIsLoading(false)
        setError('Нэвтрэх нэр эсвэл нууц үг буруу байна. Мэдээллээ дахин шалгана уу.')
      }
    }, 400)
  }

  const handleBackToCatalog = () => {
    const target = catalogUrl || process.env.NEXT_PUBLIC_CATALOG_URL || 'https://nemafoods.online'
    if (typeof window !== 'undefined') {
      window.location.href = target
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5EE] flex flex-col justify-center items-center p-4 selection:bg-[#DE3B28] selection:text-white">
      {/* Background Decorative subtle blur circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-[12px] border border-amber-200/70 shadow-xl shadow-amber-900/5 p-6 sm:p-8">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative size-16 overflow-hidden rounded-[8px] border border-amber-300 bg-white p-1.5 shadow-sm mb-3">
              <Image
                src="/nema-foods-logo.svg"
                alt="Нема Фүүдс Лого"
                fill
                priority
                className="object-contain p-1"
              />
            </div>
            
            <div className="inline-flex items-center gap-1.5 rounded-[8px] bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 mb-2">
              <ShieldCheck className="size-3.5 text-[#DE3B28]" />
              <span>Админ Удирдлагын Систем</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              НЕМА <span className="text-[#DE3B28]">ФҮҮДС</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Бараа бүтээгдэхүүний үнэ, зураг, ангилал удирдахын тулд нэвтэрнэ үү.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-[8px] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Нэвтрэх нэр
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="size-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full rounded-[8px] border border-slate-300 bg-slate-50/50 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#DE3B28] focus:ring-2 focus:ring-[#DE3B28]/20 transition-all outline-hidden"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Нууц үг
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="size-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-[8px] border border-slate-300 bg-slate-50/50 pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#DE3B28] focus:ring-2 focus:ring-[#DE3B28]/20 transition-all outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Нууц үг нуух' : 'Нууц үг харах'}
                  className="cursor-pointer absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded-[4px] border-slate-300 text-[#DE3B28] focus:ring-[#DE3B28]/20 accent-[#DE3B28]"
                />
                <span className="text-xs font-medium text-slate-600">Намайг санах</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer w-full mt-2 inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#DE3B28] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-900/10 hover:bg-[#C53020] active:scale-[0.99] disabled:opacity-70 transition-all"
            >
              {isLoading ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Шалгаж байна...</span>
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  <span>Нэвтрэх</span>
                </>
              )}
            </button>
          </form>

          {/* Credentials Info Box */}
          <div className="mt-6 rounded-[8px] bg-slate-50 border border-slate-200/80 p-3 text-[11px] text-slate-600">
            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>Админ нэвтрэх анхны мэдээлэл:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1.5 font-mono text-[11px] bg-white rounded-[6px] p-2 border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Нэвтрэх нэр</span>
                <span className="text-slate-900 font-bold">admin</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Нууц үг</span>
                <span className="text-[#DE3B28] font-bold">nema2026</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              (Та хүсвэл .env.local эсвэл Vercel Environment Variables дээр NEXT_PUBLIC_ADMIN_USERNAME, NEXT_PUBLIC_ADMIN_PASSWORD-оор сольж болно)
            </p>
          </div>

          {/* Back to Catalog */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={handleBackToCatalog}
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#DE3B28] transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Үндсэн каталог руу буцах (nemafoods.online)</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Нема Фүүдс ХХК • Бүх эрх хуулиар хамгаалагдсан.
        </div>
      </div>
    </div>
  )
}
