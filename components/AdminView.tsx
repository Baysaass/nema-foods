'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import {
  Search,
  X,
  ChevronLeft,
  Grid2X2,
  Table as TableIcon,
  Pencil,
  Plus,
  Trash2,
  Check,
  Copy,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  Database,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  Globe,
  LogOut,
} from 'lucide-react'
import {
  Product,
  ProductStatus,
  CatalogSettings,
  getProductStatus,
  normalizeProduct,
  formatMNT,
  convertImageFileToWebP,
  initialProducts,
  initialCategories,
} from '@/lib/types'
import {
  getSupabaseCredentials,
  saveProductToSupabase,
  updateProductStatusInSupabase,
  deleteProductFromSupabase,
  saveCategoryToSupabase,
  deleteCategoryFromSupabase,
  saveSettingsToSupabase,
  seedInitialDataToSupabase,
  testSupabaseConnection,
} from '@/lib/supabase'

// --- БАРАА НЭМЭХ / ЗАСАХ МОДАЛ (WebP Image & Delete support) ---
export function ProductEditModal({
  product,
  categories,
  onSave,
  onClose,
  onDelete,
}: {
  product: Product
  categories: string[]
  onSave: (p: Product) => void
  onClose: () => void
  onDelete?: (id: number, name: string) => void
}) {
  const [formData, setFormData] = useState<Product>({
    ...product,
    status: getProductStatus(product),
    hasBulkPrice:
      product.hasBulkPrice !== undefined
        ? product.hasBulkPrice
        : Boolean(product.bulkPrice && product.bulkPrice < product.price),
  })
  const [error, setError] = useState<string>('')
  const [isConvertingImage, setIsConvertingImage] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const availableCategories = categories.filter((c) => c !== 'Бүх ангилал')

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsConvertingImage(true)
    setError('')
    try {
      const webpBase64 = await convertImageFileToWebP(file)
      setFormData((prev) => ({
        ...prev,
        image: webpBase64,
      }))
    } catch (err) {
      console.error('Image convert error:', err)
      setError('Зургийг хөрвүүлэхэд алдаа гарлаа. Өөр зураг сонгоно уу.')
    } finally {
      setIsConvertingImage(false)
    }
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      setError('Барааны нэрийг оруулна уу!')
      return
    }
    if (!formData.sku.trim()) {
      setError('SKU кодыг оруулна уу!')
      return
    }
    if (formData.price <= 0) {
      setError('Жижиглэнгийн үнэ 0-ээс их байх ёстой!')
      return
    }

    if (formData.hasBulkPrice) {
      if (!formData.bulkPrice || formData.bulkPrice <= 0) {
        setError('Бөөний үнэ 0-ээс их байх ёстой!')
        return
      }
      if (formData.bulkPrice > formData.price) {
        setError('Бөөний үнэ нь жижиглэнгийн үнээс бага байх ёстой!')
        return
      }
    }

    onSave({
      ...formData,
      inStock: formData.status === 'in_stock',
    })
  }

  const savingsPercent =
    formData.hasBulkPrice && formData.price > 0 && formData.bulkPrice && formData.bulkPrice > 0
      ? Math.round(((formData.price - formData.bulkPrice) / formData.price) * 100)
      : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-[8px] sm:rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl my-0 sm:my-8">
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-[8px] bg-amber-50 text-[#DE3B28] border border-amber-200/60">
              <Pencil className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {product.id && product.name ? 'Барааны мэдээлэл засах' : 'Шинэ бараа нэмэх'}
              </h3>
              <p className="text-xs text-slate-400">Монгол хэл, төгрөгийн үнэ, WebP зурагтайгаар</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-[8px] bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* WebP Image Upload Section */}
          <div className="rounded-[8px] border border-slate-200 bg-slate-50/70 p-3.5">
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Бүтээгдэхүүний бодит зураг (WebP хөрвүүлэгч):
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative size-24 shrink-0 rounded-[8px] bg-white border border-slate-300 overflow-hidden flex items-center justify-center shadow-xs">
                {formData.image ? (
                  <img
                    src={formData.image}
                    alt="Барааны зураг"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="size-8" />
                    <span className="text-[9px] mt-1">Зураггүй</span>
                  </div>
                )}
                {isConvertingImage && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                    <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-[8px] border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 shadow-2xs transition-all"
                >
                  <Upload className="size-4 text-[#DE3B28]" />
                  <span>Компьютер / Утаснаас зураг сонгох</span>
                </button>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>PNG, JPG, HEIC зургийг WebP болгоно</span>
                  {formData.image && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: undefined })}
                      className="cursor-pointer text-rose-600 hover:underline font-semibold"
                    >
                      Зураг арилгах
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Барааны нэр *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Жишээ: Алтан Тариа Дээд Гурил 25кг"
              className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">SKU Код *</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Жишээ: MN-1001"
                className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm font-mono focus:border-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Ангилал *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="cursor-pointer mt-1 h-11 w-full rounded-[8px] border border-slate-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-hidden"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="rounded-[8px] border border-amber-200 bg-amber-50/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950">Үнийн тохиргоо (Монгол төгрөг)</span>
              <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.hasBulkPrice}
                  onChange={(e) => setFormData({ ...formData, hasBulkPrice: e.target.checked })}
                  className="cursor-pointer size-4 accent-[#DE3B28] rounded-[4px]"
                />
                <span>Бөөний үнэтэй бараа</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700">
                  Жижиглэнгийн нэгж үнэ (₮) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.price || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: Number(e.target.value) || 0,
                    })
                  }
                  className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                  {formatMNT(formData.price || 0)}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">Хэмжих нэгж</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="ш, хайрцаг, уут..."
                  className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            {formData.hasBulkPrice && (
              <div className="border-t border-amber-200/70 pt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-emerald-800">
                    Бөөний нэгж үнэ (₮) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bulkPrice || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bulkPrice: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-[8px] border border-emerald-300 bg-white px-3 text-sm font-bold text-emerald-800 focus:border-emerald-500 focus:outline-hidden"
                  />
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-emerald-700 font-mono">
                      {formatMNT(formData.bulkPrice || 0)}
                    </span>
                    {savingsPercent > 0 && (
                      <span className="rounded-[4px] bg-emerald-100 px-1 text-[9px] font-bold text-emerald-800">
                        -{savingsPercent}% хэмнэлт
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700">
                    Бөөний хамгийн бага тоо
                  </label>
                  <input
                    type="number"
                    min="2"
                    value={formData.bulkFrom || 5}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bulkFrom: Number(e.target.value) || 2,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formData.bulkFrom}+ {formData.unit} авбал бөөний үнээр
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Төлөв сонгох</label>
              <select
                value={formData.status}
                onChange={(e) => {
                  const st = e.target.value as ProductStatus
                  setFormData({
                    ...formData,
                    status: st,
                    inStock: st === 'in_stock',
                    stockCount: st === 'in_stock' ? (formData.stockCount > 0 ? formData.stockCount : 25) : 0,
                  })
                }}
                className="cursor-pointer mt-1 h-11 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 text-xs font-bold focus:border-amber-500 focus:outline-hidden"
              >
                <option value="in_stock">✓ Бэлэн байгаа</option>
                <option value="temporarily_out">⏱ Түр дууссан</option>
                <option value="out_of_stock">✕ Дууссан</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Нөөцийн тоо ширхэг</label>
              <input
                type="number"
                min="0"
                value={formData.stockCount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stockCount: Number(e.target.value) || 0,
                  })
                }
                className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm focus:border-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Онцлох шошго</label>
              <input
                type="text"
                value={formData.badge || ''}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                placeholder="Жишээ: Шилдэг, Шинэ"
                className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Тайлбар</label>
            <textarea
              rows={2}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Бүтээгдэхүүний дэлгэрэнгүй тайлбар..."
              className="mt-1 w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Modal Footer with Delete & Save buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          {product.id && product.name && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(formData.id, formData.name)
                onClose()
              }}
              className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-400 transition-colors"
            >
              <Trash2 className="size-4" />
              <span>Барааг устгах</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer min-h-[44px] rounded-[8px] border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Болих
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="cursor-pointer min-h-[44px] rounded-[8px] bg-[#DE3B28] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#b82a1a] transition-all"
            >
              Хадгалах
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- SUPABASE ХОЛБОЛТ ТОХИРУУЛАХ МОДАЛ ---
export function SupabaseConfigModal({
  isOpen,
  isSupabaseConnected,
  onClose,
  onSuccessConnect,
  initialProducts,
  initialCategories,
}: {
  isOpen: boolean
  isSupabaseConnected: boolean
  onClose: () => void
  onSuccessConnect: () => void
  initialProducts: Product[]
  initialCategories: string[]
}) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null)
  const [copiedSql, setCopiedSql] = useState(false)

  useEffect(() => {
    const creds = getSupabaseCredentials()
    if (creds) {
      setUrl(creds.url)
      setAnonKey(creds.anonKey)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleTestAndSave = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: 'URL болон Anon Key-г бүрэн оруулна уу.' })
      return
    }

    setIsLoading(true)
    setTestResult(null)

    const res = await testSupabaseConnection(url.trim(), anonKey.trim())
    setTestResult(res)
    setIsLoading(false)

    if (res.success) {
      localStorage.setItem(
        'catalog_pro_supabase_config',
        JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
      )
      onSuccessConnect()
    }
  }

  const handleSeed = async () => {
    setIsSeeding(true)
    setSeedResult(null)
    const res = await seedInitialDataToSupabase(initialProducts, initialCategories)
    setSeedResult(res)
    setIsSeeding(false)
    if (res.success) {
      onSuccessConnect()
    }
  }

  const handleCopySql = () => {
    const sampleSql = `-- Supabase SQL Editor-д дараах тушаалыг ажиллуулаарай:
CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL,
  has_bulk_price BOOLEAN NOT NULL DEFAULT true,
  bulk_price NUMERIC,
  bulk_from INTEGER DEFAULT 5,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ш',
  status TEXT NOT NULL DEFAULT 'in_stock',
  stock_count INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  badge TEXT,
  color TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public Write" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Write" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Write" ON public.settings FOR ALL USING (true) WITH CHECK (true);`

    navigator.clipboard.writeText(sampleSql)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-600">
              <Database className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Supabase Өгөгдлийн Сангийн Тохиргоо
              </h3>
              <p className="text-xs text-slate-400">PostgreSQL Cloud Database холболт</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Status Indicator Banner */}
        <div className="mt-4">
          <div
            className={`flex items-center justify-between rounded-[8px] p-3 text-xs font-semibold border ${
              isSupabaseConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${
                  isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>
                {isSupabaseConnected
                  ? 'Supabase Cloud өгөгдлийн сантай амжилттай холбогдсон байна.'
                  : 'Одоогоор Supabase холбогдоогүй (Түр локал горимд ажиллаж байна).'}
              </span>
            </div>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#DE3B28] hover:underline"
            >
              <span>Dashboard</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        {/* Inputs */}
        <div className="mt-4 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700">Project URL *</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-xs font-mono focus:border-amber-500 focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Supabase Project Settings &gt; API &gt; Project URL
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Anon Public Key *</label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-xs font-mono focus:border-amber-500 focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Supabase Project Settings &gt; API &gt; Project API keys (anon public)
            </p>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`mt-3 rounded-[8px] p-2.5 text-xs font-semibold border ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {testResult.message}
          </div>
        )}

        {/* Seed Result Message */}
        {seedResult && (
          <div
            className={`mt-3 rounded-[8px] p-2.5 text-xs font-semibold border ${
              seedResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {seedResult.message}
          </div>
        )}

        {/* Helper Action: Copy SQL & Seed */}
        <div className="mt-4 rounded-[8px] bg-slate-50 p-3.5 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">1-товшилтоор өгөгдөл хуулах:</span>
            <button
              onClick={handleCopySql}
              className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              {copiedSql ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{copiedSql ? 'SQL Хуулагдлаа!' : 'SQL скрипт хуулах'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Мөн <code className="bg-slate-100 px-1 py-0.5 rounded-[4px] font-mono text-[10px]">supabase/schema.sql</code> файл дотор хүснэгт үүсгэх бүрэн SQL код бэлэн байгаа.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="cursor-pointer min-h-[44px] rounded-[8px] border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Хаах
          </button>
          <button
            onClick={handleTestAndSave}
            disabled={isLoading}
            className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] bg-[#DE3B28] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#b82a1a] disabled:opacity-60 transition-all"
          >
            {isLoading && <RefreshCw className="size-3.5 animate-spin" />}
            <span>Холболт шалгах & Хадгалах</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// --- АДМИН УДИРДЛАГЫН ХЭСЭГ (SUBDOMAIN CAPABLE, SUPABASE CLOUD SYNC & DELETION) ---
export function AdminView({
  products,
  setProducts,
  categories,
  setCategories,
  settings,
  setSettings,
  isSupabaseConnected,
  onRefreshFromSupabase,
  onCatalog,
  onResetData,
  isSubdomain = false,
  onLogout,
}: {
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  categories: string[]
  setCategories: React.Dispatch<React.SetStateAction<string[]>>
  settings: CatalogSettings
  setSettings: React.Dispatch<React.SetStateAction<CatalogSettings>>
  isSupabaseConnected: boolean
  onRefreshFromSupabase: () => void
  onCatalog: () => void
  onResetData: () => void
  isSubdomain?: boolean
  onLogout?: () => void
}) {
  const [editing, setEditing] = useState<Product | null>(null)
  const [adminViewMode, setAdminViewMode] = useState<'cards' | 'table'>('cards')
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all')
  const [syncNotice, setSyncNotice] = useState<string>('')

  const showSyncNotification = (msg: string) => {
    setSyncNotice(msg)
    setTimeout(() => setSyncNotice(''), 3500)
  }

  const handleSaveProduct = async (savedProduct: Product) => {
    const normalized = normalizeProduct(savedProduct)

    // 1. Optimistic Local State update
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === normalized.id)
      if (exists) {
        return prev.map((p) => (p.id === normalized.id ? normalized : p))
      }
      return [normalized, ...prev]
    })
    setEditing(null)

    // 2. Persist to Supabase if connected
    if (isSupabaseConnected) {
      showSyncNotification('Supabase өгөгдлийн санд хадгалж байна...')
      const remoteSaved = await saveProductToSupabase(normalized)
      if (remoteSaved) {
        showSyncNotification('✓ Supabase өгөгдлийн санд амжилттай хадгалагдлаа!')
        setProducts((prev) =>
          prev.map((p) => (p.sku === remoteSaved.sku ? remoteSaved : p))
        )
      } else {
        showSyncNotification('⚠️ Supabase-д хадгалахад алдаа гарлаа (Локал хадгалагдсан).')
      }
    }
  }

  // 1-Click Status Switcher directly on card or row!
  const handleChangeProductStatus = async (id: number, nextStatus: ProductStatus) => {
    const count = nextStatus === 'in_stock' ? 25 : 0

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            status: nextStatus,
            inStock: nextStatus === 'in_stock',
            stockCount: nextStatus === 'in_stock' ? (p.stockCount > 0 ? p.stockCount : 25) : 0,
          }
        }
        return p
      })
    )

    // Sync to Supabase
    if (isSupabaseConnected) {
      showSyncNotification(`Төлөвийг "${nextStatus}" болгон шинэчиллээ...`)
      await updateProductStatusInSupabase(id, nextStatus, count)
    }
  }

  // --- DELETE PRODUCT HANDLER (Requested by user) ---
  const handleDeleteProduct = async (id: number, name: string) => {
    if (confirm(`"${name}" барааг каталогоос бүрмөсөн устгахдаа итгэлтэй байна уу?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
      showSyncNotification(`✓ "${name}" барааг амжилттай устгалаа.`)
      if (isSupabaseConnected) {
        await deleteProductFromSupabase(id)
      }
    }
  }

  const handleAddCategory = async () => {
    const trimmed = newCat.trim()
    if (!trimmed) return
    if (categories.includes(trimmed)) {
      alert('Энэ ангилал аль хэдийн бүртгэгдсэн байна!')
      return
    }
    setCategories([...categories, trimmed])
    setNewCat('')

    if (isSupabaseConnected) {
      await saveCategoryToSupabase(trimmed)
      showSyncNotification(`✓ "${trimmed}" ангиллыг Supabase-д хадгаллаа.`)
    }
  }

  const handleDeleteCategory = async (cat: string) => {
    if (cat === 'Бүх ангилал') {
      alert('Энэ ангиллыг устгах боломжгүй!')
      return
    }
    const count = products.filter((p) => p.category === cat).length
    if (count > 0) {
      if (
        !confirm(
          `"${cat}" ангилалд ${count} бараа байна. Устгавал эдгээр бараануудын ангилал хоосон болно. Үргэлжлүүлэх үү?`
        )
      ) {
        return
      }
    }
    setCategories(categories.filter((c) => c !== cat))

    if (isSupabaseConnected) {
      await deleteCategoryFromSupabase(cat)
      showSyncNotification(`✓ "${cat}" ангиллыг Supabase-ээс хаслаа.`)
    }
  }

  const filteredProducts = useMemo(() => {
    let list = [...products]

    if (statusFilter !== 'all') {
      list = list.filter((p) => getProductStatus(p) === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    }

    return list
  }, [products, search, statusFilter])

  // Catalog back link destination
  const handleBackToCatalog = () => {
    const catalogUrl = process.env.NEXT_PUBLIC_CATALOG_URL
    if (catalogUrl && typeof window !== 'undefined') {
      window.location.href = catalogUrl
      return
    }
    onCatalog()
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Sync notification toast */}
      {syncNotice && (
        <div className="fixed bottom-4 right-4 z-50 rounded-[8px] bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl flex items-center gap-2 animate-in fade-in duration-150">
          <Database className="size-4 text-[#FFCE00]" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="relative size-11 overflow-hidden rounded-[8px] bg-white p-1 border border-slate-200 shadow-xs">
              <Image src="/nema-foods-logo.svg" alt="Нема Фүүдс Лого" fill className="object-contain p-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-[8px] bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-900">
                  Админ удирдлага
                </span>

                {/* Subdomain Mode Indicator */}
                {isSubdomain && (
                  <span className="inline-flex items-center gap-1 rounded-[8px] bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-800">
                    <Globe className="size-3 text-blue-600" />
                    Дэд домэйн горим
                  </span>
                )}

                {/* Supabase Status Pill */}
                <button
                  onClick={() => setIsSupabaseModalOpen(true)}
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-[8px] px-2 py-0.5 text-[10px] font-bold border transition-colors ${
                    isSupabaseConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <Database className="size-3" />
                  <span>{isSupabaseConnected ? 'Supabase: Холбогдсон' : 'Supabase: Тохируулах'}</span>
                </button>
              </div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 leading-tight mt-0.5">
                НЕМА <span className="text-[#DE3B28]">ФҮҮДС</span> • Бараа Бүтээгдэхүүний Самбар
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Supabase Connection Button */}
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Database className="size-3.5 text-[#DE3B28]" />
              <span>Өгөгдлийн сан</span>
            </button>

            <button
              onClick={onResetData}
              title="Анхны өгөгдлийг сэргээх"
              className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Өгөгдөл сэргээх</span>
            </button>
            <button
              onClick={handleBackToCatalog}
              className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] border border-amber-400/60 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              <ChevronLeft className="size-4" />
              <span>Каталог харах</span>
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Админ системээс гарах"
                className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Гарах</span>
              </button>
            )}
            <button
              onClick={() =>
                setEditing({
                  id: Date.now(),
                  name: '',
                  sku: `MN-${Math.floor(1000 + Math.random() * 9000)}`,
                  price: 10000,
                  hasBulkPrice: true,
                  bulkPrice: 8500,
                  bulkFrom: 6,
                  category: categories.find((c) => c !== 'Бүх ангилал') || 'Хүнс, ундаа',
                  unit: 'ш',
                  status: 'in_stock',
                  inStock: true,
                  stockCount: 50,
                  badge: 'Шинэ',
                  description: '',
                  color: 'from-amber-400 to-amber-600',
                })
              }
              className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] bg-[#DE3B28] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#b82a1a] transition-all"
            >
              <Plus className="size-4" />
              <span>Шинэ бараа нэмэх</span>
            </button>
          </div>
        </div>
      </header>

      {/* Settings Card: Stock Count Visibility Toggle */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-5">
        <div className="rounded-[8px] border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50/40 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-[#DE3B28] text-white shadow-xs">
              <SlidersHorizontal className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Каталогийн Үлдэгдэл Харуулах Тохиргоо
              </h3>
              <p className="text-xs text-slate-600">
                {settings.showStockCount
                  ? 'Одоогоор хэрэглэгчдэд барааны тодорхой үлдэгдлийн тоо (жишээ: "Нөөцөд: 180 ш") харагдаж байна.'
                  : 'Үлдэгдлийн тоо ширхгийг нуусан. Хэрэглэгчдэд зөвхөн "Бэлэн байгаа", "Түр дууссан", "Дууссан" гэж харагдана.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const updated = { ...settings, showStockCount: !settings.showStockCount }
              setSettings(updated)
              if (isSupabaseConnected) {
                saveSettingsToSupabase(updated)
              }
            }}
            className={`cursor-pointer min-h-[44px] inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-xs font-bold transition-all shadow-xs shrink-0 ${
              settings.showStockCount
                ? 'bg-[#DE3B28] text-white hover:bg-[#b82a1a]'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {settings.showStockCount ? (
              <>
                <Eye className="size-4" />
                <span>Үлдэгдэл ил харуулах: АСААЛТТАЙ</span>
              </>
            ) : (
              <>
                <EyeOff className="size-4" />
                <span>Үлдэгдлийг нуух: ХААЛТТАЙ</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* KPI Stats Bar with 3 Status Counters */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-[8px] border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="text-[11px] sm:text-xs font-semibold text-slate-400">Нийт барааны тоо</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900">{products.length}</div>
            <div className="mt-0.5 text-[10px] sm:text-[11px] text-amber-800 font-semibold">
              {isSupabaseConnected ? 'Cloud DB синк хийгдсэн' : 'Каталогт бүртгэгдсэн'}
            </div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'in_stock' ? 'all' : 'in_stock')}
            className={`cursor-pointer rounded-[8px] border p-3.5 sm:p-4 shadow-xs transition-all ${
              statusFilter === 'in_stock'
                ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-emerald-300'
            }`}
          >
            <div className="text-[11px] sm:text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Бэлэн байгаа</span>
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-800">
              {products.filter((p) => getProductStatus(p) === 'in_stock').length}
            </div>
            <div className="mt-0.5 text-[10px] sm:text-[11px] text-slate-500">Шууд нийлүүлэх боломжтой</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'temporarily_out' ? 'all' : 'temporarily_out')}
            className={`cursor-pointer rounded-[8px] border p-3.5 sm:p-4 shadow-xs transition-all ${
              statusFilter === 'temporarily_out'
                ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                : 'border-slate-200 bg-white hover:border-amber-300'
            }`}
          >
            <div className="text-[11px] sm:text-xs font-semibold text-amber-800 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              <span>Түр дууссан</span>
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-amber-900">
              {products.filter((p) => getProductStatus(p) === 'temporarily_out').length}
            </div>
            <div className="mt-0.5 text-[10px] sm:text-[11px] text-slate-500">Хүлээгдэж буй бараа</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
            className={`cursor-pointer rounded-[8px] border p-3.5 sm:p-4 shadow-xs transition-all ${
              statusFilter === 'out_of_stock'
                ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                : 'border-slate-200 bg-white hover:border-rose-300'
            }`}
          >
            <div className="text-[11px] sm:text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-500" />
              <span>Дууссан</span>
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-rose-800">
              {products.filter((p) => getProductStatus(p) === 'out_of_stock').length}
            </div>
            <div className="mt-0.5 text-[10px] sm:text-[11px] text-slate-500">Нөөц дууссан</div>
          </div>
        </div>
      </section>

      {/* Main Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Left: Category Manager */}
          <aside className="space-y-4">
            <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Ангилал нэмэх
              </h3>
              <div className="mt-2.5 flex gap-1.5">
                <input
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Шинэ ангиллын нэр..."
                  className="h-9 w-full rounded-[8px] border border-slate-300 px-2.5 text-xs focus:border-amber-500 focus:outline-hidden"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory()
                  }}
                />
                <button
                  onClick={handleAddCategory}
                  className="cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[8px] bg-slate-900 text-white hover:bg-[#DE3B28] transition-colors shrink-0"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <div className="mt-4 space-y-1 max-h-96 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const count =
                    cat === 'Бүх ангилал'
                      ? products.length
                      : products.filter((p) => p.category === cat).length

                  return (
                    <div
                      key={cat}
                      className="group flex items-center justify-between rounded-[8px] px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{cat}</span>
                        <span className="font-mono text-[10px] text-slate-400">({count})</span>
                      </div>
                      {cat !== 'Бүх ангилал' && (
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          title="Ангилал устгах"
                          className="cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>

          {/* Right: Products Management (Card Grid vs Table view) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[8px] border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Админ хайлт: Барааны нэр, SKU, ангилал..."
                  className="h-10 w-full rounded-[8px] border border-slate-300 py-2 pl-10 pr-3 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {statusFilter !== 'all' && (
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="cursor-pointer text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Шүүлтүүр арилгах
                  </button>
                )}

                <div className="inline-flex rounded-[8px] border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setAdminViewMode('cards')}
                    className={`cursor-pointer inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-bold transition-colors ${
                      adminViewMode === 'cards'
                        ? 'bg-white text-[#DE3B28] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Grid2X2 className="size-3.5" />
                    <span>Зурагт картууд</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminViewMode('table')}
                    className={`cursor-pointer inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-bold transition-colors ${
                      adminViewMode === 'table'
                        ? 'bg-white text-[#DE3B28] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <TableIcon className="size-3.5" />
                    <span>Хүснэгт</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VIEW 1: VISUAL CARD GRID (DEFAULT) */}
            {adminViewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((p) => {
                  const status = getProductStatus(p)
                  const hasBulk = Boolean(p.hasBulkPrice && p.bulkPrice && p.bulkPrice < p.price)

                  return (
                    <div
                      key={p.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xs hover:border-amber-400 hover:shadow-md transition-all"
                    >
                      <div>
                        {/* Thumbnail Header */}
                        <div className="relative h-40 w-full overflow-hidden bg-slate-100 flex items-center justify-center p-2 border-b border-slate-100">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-full w-full object-contain rounded-[8px]"
                            />
                          ) : (
                            <div
                              className={`flex h-20 w-16 -rotate-2 flex-col items-center justify-between rounded-[8px] bg-gradient-to-b ${
                                p.color || 'from-amber-400 to-amber-600'
                              } p-2 text-white shadow-sm`}
                            >
                              <span className="text-[8px] font-black">NEMA</span>
                              <span className="text-[10px] font-extrabold line-clamp-1">
                                {p.name.split(' ')[0]}
                              </span>
                              <span className="text-[7px] font-mono">{p.sku}</span>
                            </div>
                          )}

                          <span className="absolute left-2.5 top-2.5 rounded-[8px] bg-white/95 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-slate-200 shadow-2xs">
                            {p.category}
                          </span>

                          <span className="absolute right-2.5 top-2.5 rounded-[8px] bg-slate-900/80 px-2 py-0.5 text-[10px] font-mono font-bold text-white shadow-2xs">
                            {p.sku}
                          </span>
                        </div>

                        {/* Product Info */}
                        <div className="p-3.5">
                          <h3 className="font-bold text-sm text-slate-900 line-clamp-2 min-h-10">
                            {p.name}
                          </h3>

                          {/* Pricing */}
                          <div className="mt-2.5 flex items-baseline justify-between border-t border-slate-100 pt-2 text-xs">
                            <div>
                              <span className="text-slate-400 text-[10px]">Жижиглэн: </span>
                              <b className="font-bold text-slate-800">{formatMNT(p.price)}</b>
                            </div>
                            {hasBulk ? (
                              <div className="text-right">
                                <span className="text-[10px] text-emerald-600 font-semibold">
                                  Бөөний ({p.bulkFrom}+):{' '}
                                </span>
                                <b className="font-extrabold text-emerald-700">
                                  {formatMNT(p.bulkPrice || p.price)}
                                </b>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded-[8px]">
                                Бөөний үнэгүй
                              </span>
                            )}
                          </div>

                          {/* Quick 1-Click 3-Status Selector */}
                          <div className="mt-3 rounded-[8px] bg-slate-50 p-2 border border-slate-200/80">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                              Төлөв солих (1 товшилтоор):
                            </span>
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                onClick={() => handleChangeProductStatus(p.id, 'in_stock')}
                                className={`cursor-pointer rounded-[8px] py-1 text-[11px] font-bold transition-all border ${
                                  status === 'in_stock'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                ✓ Бэлэн
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChangeProductStatus(p.id, 'temporarily_out')}
                                className={`cursor-pointer rounded-[8px] py-1 text-[11px] font-bold transition-all border ${
                                  status === 'temporarily_out'
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              >
                                ⏱ Түр дууссан
                              </button>
                              <button
                                type="button"
                                onClick={() => handleChangeProductStatus(p.id, 'out_of_stock')}
                                className={`cursor-pointer rounded-[8px] py-1 text-[11px] font-bold transition-all border ${
                                  status === 'out_of_stock'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                                }`}
                              >
                                ✕ Дууссан
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions: Edit and Prominent Delete (Requested by user) */}
                      <div className="border-t border-slate-100 bg-slate-50/60 p-2.5 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Үлдэгдэл: <b>{p.stockCount} {p.unit}</b>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditing(p)}
                            className="cursor-pointer min-h-[34px] inline-flex items-center gap-1 rounded-[8px] border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
                          >
                            <Pencil className="size-3.5" />
                            <span>Засах</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            title="Барааг устгах"
                            className="cursor-pointer min-h-[34px] inline-flex items-center gap-1 rounded-[8px] border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Устгах</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* VIEW 2: TABLE VIEW */
              <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[720px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3">Зураг</th>
                        <th className="py-3 px-3">Бараа</th>
                        <th className="py-3 px-2">SKU</th>
                        <th className="py-3 px-2">Ангилал</th>
                        <th className="py-3 px-3 text-right">Жижиглэн</th>
                        <th className="py-3 px-3 text-right text-emerald-800">Бөөний үнэ</th>
                        <th className="py-3 px-3 text-center">Төлөв сонгох</th>
                        <th className="py-3 px-4 text-right">Үйлдэл</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((p) => {
                        const status = getProductStatus(p)
                        const hasBulk = Boolean(p.hasBulkPrice && p.bulkPrice && p.bulkPrice < p.price)

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="size-10 rounded-[8px] bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <div
                                    className={`size-full bg-gradient-to-br ${
                                      p.color || 'from-amber-400 to-amber-600'
                                    } flex items-center justify-center text-[8px] font-bold text-white`}
                                  >
                                    NEMA
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-xs">
                              <div className="line-clamp-1">{p.name}</div>
                              {p.badge && (
                                <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded-[4px]">
                                  {p.badge}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 font-mono font-medium text-slate-500">
                              {p.sku}
                            </td>
                            <td className="py-2.5 px-2 text-slate-600">{p.category}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                              {formatMNT(p.price)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                              {hasBulk ? (
                                <div>
                                  {formatMNT(p.bulkPrice || p.price)}
                                  <div className="text-[10px] text-emerald-600 font-normal">
                                    ({p.bulkFrom}+ {p.unit})
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-normal">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <select
                                value={status}
                                onChange={(e) =>
                                  handleChangeProductStatus(p.id, e.target.value as ProductStatus)
                                }
                                className={`cursor-pointer rounded-[8px] px-2 py-1 text-xs font-bold border ${
                                  status === 'in_stock'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : status === 'temporarily_out'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-rose-50 text-rose-700 border-rose-300'
                                }`}
                              >
                                <option value="in_stock">✓ Бэлэн байгаа</option>
                                <option value="temporarily_out">⏱ Түр дууссан</option>
                                <option value="out_of_stock">✕ Дууссан</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditing(p)}
                                  title="Засах"
                                  className="cursor-pointer min-h-[34px] inline-flex items-center gap-1 rounded-[8px] border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
                                >
                                  <Pencil className="size-3.5" />
                                  <span>Засах</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id, p.name)}
                                  title="Барааг устгах"
                                  className="cursor-pointer min-h-[34px] inline-flex items-center gap-1 rounded-[8px] border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors"
                                >
                                  <Trash2 className="size-3.5" />
                                  <span>Устгах</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Edit/Add Modal with Delete support */}
      {editing && (
        <ProductEditModal
          product={editing}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => setEditing(null)}
          onDelete={handleDeleteProduct}
        />
      )}

      {/* Supabase Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        isSupabaseConnected={isSupabaseConnected}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSuccessConnect={onRefreshFromSupabase}
        initialProducts={initialProducts}
        initialCategories={initialCategories}
      />
    </main>
  )
}
