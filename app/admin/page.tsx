'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminView } from '@/components/AdminView'
import {
  Product,
  CatalogSettings,
  normalizeProduct,
  initialProducts,
  initialCategories,
} from '@/lib/types'
import {
  getSupabaseCredentials,
  testSupabaseConnection,
  fetchProductsFromSupabase,
  fetchCategoriesFromSupabase,
  fetchSettingsFromSupabase,
  seedInitialDataToSupabase,
} from '@/lib/supabase'

export default function AdminPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [categories, setCategories] = useState<string[]>(initialCategories)
  const [settings, setSettings] = useState<CatalogSettings>({ showStockCount: true })
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [isSubdomainMode, setIsSubdomainMode] = useState<boolean>(false)

  // Detect if accessing via subdomain
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname.startsWith('admin.') || hostname.includes('admin')) {
        setIsSubdomainMode(true)
      }
    }
  }, [])

  // 1. Initial Load: Check Supabase, fallback to localStorage
  const loadInitialData = async () => {
    setIsLoading(true)

    const creds = getSupabaseCredentials()
    if (creds) {
      try {
        const testRes = await testSupabaseConnection(creds.url, creds.anonKey)
        if (testRes.success) {
          setIsSupabaseConnected(true)

          const remoteProducts = await fetchProductsFromSupabase()
          const remoteCats = await fetchCategoriesFromSupabase()
          const remoteSettings = await fetchSettingsFromSupabase()

          if (remoteProducts !== null) {
            if (remoteProducts.length > 0) {
              setProducts(remoteProducts)
            } else {
              await seedInitialDataToSupabase(initialProducts, initialCategories)
              const reloaded = await fetchProductsFromSupabase()
              if (reloaded && reloaded.length > 0) {
                setProducts(reloaded)
              }
            }
          }

          if (remoteCats && remoteCats.length > 0) {
            setCategories(remoteCats)
          }

          if (remoteSettings) {
            setSettings(remoteSettings)
          }

          setIsLoading(false)
          setIsLoaded(true)
          return
        }
      } catch (e) {
        console.warn('Supabase connect attempt failed, using local cache:', e)
      }
    }

    // Fallback: LocalStorage
    try {
      const savedProducts = localStorage.getItem('catalog_pro_products_v2')
      if (savedProducts) {
        const parsed = JSON.parse(savedProducts)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed.map(normalizeProduct))
        }
      }
      const savedCats = localStorage.getItem('catalog_pro_categories_v2')
      if (savedCats) {
        setCategories(JSON.parse(savedCats))
      }
      const savedSettings = localStorage.getItem('catalog_pro_settings_v2')
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    } catch (e) {
      console.error('LocalStorage load error:', e)
    }

    setIsLoading(false)
    setIsLoaded(true)
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Sync to local cache on changes
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem('catalog_pro_products_v2', JSON.stringify(products))
    } catch (e) {}
  }, [products, isLoaded])

  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem('catalog_pro_categories_v2', JSON.stringify(categories))
    } catch (e) {}
  }, [categories, isLoaded])

  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem('catalog_pro_settings_v2', JSON.stringify(settings))
    } catch (e) {}
  }, [settings, isLoaded])

  const handleResetData = () => {
    if (confirm('Та анхны бодит Монгол бүтээгдэхүүний өгөгдлийг дахин сэргээхдээ итгэлтэй байна уу?')) {
      setProducts(initialProducts)
      setCategories(initialCategories)
      setSettings({ showStockCount: true })
      try {
        localStorage.removeItem('catalog_pro_products_v2')
        localStorage.removeItem('catalog_pro_categories_v2')
        localStorage.removeItem('catalog_pro_settings_v2')
      } catch (e) {}
    }
  }

  const handleBackToCatalog = () => {
    const catalogUrl = process.env.NEXT_PUBLIC_CATALOG_URL
    if (catalogUrl && typeof window !== 'undefined') {
      window.location.href = catalogUrl
      return
    }
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="size-10 border-4 border-[#DE3B28] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-800">
          НЕМА ФҮҮДС Админ системийг ачаалж байна...
        </p>
      </div>
    )
  }

  return (
    <AdminView
      products={products}
      setProducts={setProducts}
      categories={categories}
      setCategories={setCategories}
      settings={settings}
      setSettings={setSettings}
      isSupabaseConnected={isSupabaseConnected}
      onRefreshFromSupabase={loadInitialData}
      onCatalog={handleBackToCatalog}
      onResetData={handleResetData}
      isSubdomain={isSubdomainMode}
    />
  )
}
