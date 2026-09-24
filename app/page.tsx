'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  FileText,
  BookOpen,
  Grid2X2,
  List,
  Pencil,
  Plus,
  Trash2,
  Printer,
  ArrowUpDown,
  Check,
  Copy,
  Sparkles,
  Layers,
  Boxes,
  Phone,
  Mail,
  MapPin,
  RotateCcw,
  Info,
  CheckCircle2,
  Utensils,
  Hammer,
  Sparkle,
  Cpu,
  Wrench,
  HeartPulse,
  Package,
  Shirt,
  Eye,
  EyeOff,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown,
  Upload,
  Image as ImageIcon,
  Clock,
  ShieldCheck,
  Building2,
  Table as TableIcon,
  Database,
  RefreshCw,
  ExternalLink,
  Key
} from 'lucide-react'
import {
  getSupabaseCredentials,
  getSupabaseClient,
  fetchProductsFromSupabase,
  saveProductToSupabase,
  updateProductStatusInSupabase,
  deleteProductFromSupabase,
  fetchCategoriesFromSupabase,
  saveCategoryToSupabase,
  deleteCategoryFromSupabase,
  fetchSettingsFromSupabase,
  saveSettingsToSupabase,
  seedInitialDataToSupabase,
  testSupabaseConnection,
} from '@/lib/supabase'

const FlipBookView = dynamic(() => import('@/components/FlipBookView'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
      <div className="size-10 border-4 border-[#FFCE00] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-semibold">Флипбүүк номыг ачаалж байна...</p>
    </div>
  ),
})

// --- Types ---
export type ProductStatus = 'in_stock' | 'temporarily_out' | 'out_of_stock'

export type Product = {
  id: number
  name: string
  sku: string
  price: number // Нэгж жижиглэнгийн үнэ (₮)
  hasBulkPrice?: boolean // Бөөний үнэтэй эсэх (Үгүй бол зөвхөн жижиглэн үнэ харагдана)
  bulkPrice?: number // Бөөний үнэ (₮)
  bulkFrom?: number // Бөөний үнэ хэрэгжих хамгийн бага тоо
  category: string
  unit: string // ш, хайрцаг, багц, уут, сав гэх мэт
  status?: ProductStatus // 'in_stock' | 'temporarily_out' | 'out_of_stock'
  inStock?: boolean // Буцах нийцтэй байдал
  stockCount: number
  description?: string
  badge?: string // 'Онцлох', 'Бөөний үнэ', 'Шинэ', 'Шилдэг'
  color?: string
  image?: string // WebP форматтай зургийн Data URL
}

export type CatalogSettings = {
  showStockCount: boolean // Үлдэгдлийн тоо ширхгийг нийтэд харуулах эсэх
}

// --- Status Helpers ---
export function getProductStatus(p: Product): ProductStatus {
  if (p.status) return p.status
  return p.inStock === false ? 'out_of_stock' : 'in_stock'
}

export function getStatusBadgeInfo(status: ProductStatus) {
  switch (status) {
    case 'in_stock':
      return {
        label: 'Бэлэн байгаа',
        shortLabel: 'Бэлэн',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      }
    case 'temporarily_out':
      return {
        label: 'Түр дууссан',
        shortLabel: 'Түр дууссан',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      }
    case 'out_of_stock':
      return {
        label: 'Дууссан',
        shortLabel: 'Дууссан',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
      }
  }
}

// Client-side image to WebP converter
export function convertImageFileToWebP(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = document.createElement('img')
      img.onerror = reject
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 800
        let w = img.width
        let h = img.height
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        // Convert to WebP format with quality 0.85
        const webpData = canvas.toDataURL('image/webp', 0.85)
        resolve(webpData)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Normalize products loaded from storage for seamless backward compatibility
export function normalizeProduct(p: any): Product {
  const status: ProductStatus =
    p.status || (p.inStock === false ? 'out_of_stock' : 'in_stock')
  const hasBulkPrice =
    p.hasBulkPrice !== undefined
      ? Boolean(p.hasBulkPrice)
      : Boolean(p.bulkPrice && p.bulkPrice < p.price)
  return {
    ...p,
    status,
    inStock: status === 'in_stock',
    hasBulkPrice,
    price: Number(p.price) || 0,
    bulkPrice: Number(p.bulkPrice) || p.price,
    bulkFrom: Number(p.bulkFrom) || 5,
    stockCount: Number(p.stockCount) || 0,
    image: p.image || undefined,
  }
}

// --- Анхны бодит Монгол барааны өгөгдөл ---
const initialCategories: string[] = [
  'Бүх ангилал',
  'Хүнс, ундаа',
  'Барилгын материал',
  'Гоо сайхан',
  'Цахилгаан бараа',
  'Авто сэлбэг',
  'Эмийн сан, эрүүл мэнд',
  'Гэрийн тэжээвэр амьтан',
  'Бөөний бэлэн хувцас',
]

const initialProducts: Product[] = [
  {
    id: 1,
    name: 'Атар талх (зүссэн, шинэхэн)',
    sku: 'MN-1001',
    price: 2800,
    hasBulkPrice: true,
    bulkPrice: 2450,
    bulkFrom: 10,
    category: 'Хүнс, ундаа',
    unit: 'ш',
    status: 'in_stock',
    inStock: true,
    stockCount: 180,
    badge: 'Шилдэг борлуулалт',
    description: 'Өдөр тутмын хэрэгцээт Атар зүссэн цагаан талх. Бөөнөөр авах дэлгүүр, цайны газарт тохиромжтой.',
    color: 'from-amber-400 to-amber-600',
  },
  {
    id: 2,
    name: 'Өглөө сүү 3.2% 1л (Теч Тетрапак)',
    sku: 'MN-1002',
    price: 4700,
    hasBulkPrice: true,
    bulkPrice: 4150,
    bulkFrom: 12,
    category: 'Хүнс, ундаа',
    unit: 'ш',
    status: 'in_stock',
    inStock: true,
    stockCount: 96,
    badge: 'Эрэлттэй',
    description: 'Үнээний цэвэр ариутгасан өндөр чанартай сүү. 12 ширхэгийн багц хайрцагтай.',
    color: 'from-sky-400 to-blue-600',
  },
  {
    id: 3,
    name: 'Алтан тариа дээд гурил 1кг',
    sku: 'MN-1003',
    price: 3500,
    hasBulkPrice: false, // Бөөний үнэгүй бараа (Зөвхөн 1 үнэтэй)
    category: 'Хүнс, ундаа',
    unit: 'уут',
    status: 'in_stock',
    inStock: true,
    stockCount: 240,
    badge: 'Үндсэн үнэ',
    description: 'Монголын шилдэг нэгдүгээр зэргийн цагаан гурил.',
    color: 'from-amber-300 to-yellow-600',
  },
  {
    id: 4,
    name: 'Аянчин байгалийн овьёос 250г',
    sku: 'MN-1004',
    price: 5900,
    hasBulkPrice: true,
    bulkPrice: 4950,
    bulkFrom: 8,
    category: 'Хүнс, ундаа',
    unit: 'хайрцаг',
    status: 'in_stock',
    inStock: true,
    stockCount: 65,
    badge: 'Эрүүл мэнд',
    description: 'Эслэгээр баялаг өглөөний эрүүл хоол.',
    color: 'from-emerald-400 to-teal-600',
  },
  {
    id: 5,
    name: 'Бонаква цэвэр ус 1.5л (6 ширхэгийн багц)',
    sku: 'MN-1005',
    price: 11800,
    hasBulkPrice: true,
    bulkPrice: 9900,
    bulkFrom: 5,
    category: 'Хүнс, ундаа',
    unit: 'багц',
    status: 'in_stock',
    inStock: true,
    stockCount: 75,
    badge: 'Багцын үнэ',
    description: 'Эрдэст цэвэршүүлсэн ундааны цэвэр ус, багцаар нь бөөний үнээр.',
    color: 'from-cyan-400 to-blue-500',
  },
  {
    id: 6,
    name: 'Хаан цай сүүтэй 25ш ууттай',
    sku: 'MN-1006',
    price: 14200,
    hasBulkPrice: true,
    bulkPrice: 12500,
    bulkFrom: 6,
    category: 'Хүнс, ундаа',
    unit: 'хайрцаг',
    status: 'in_stock',
    inStock: true,
    stockCount: 110,
    badge: 'Онцлох',
    description: 'Уламжлалт Монгол хийцтэй сүүтэй хуурай цай.',
    color: 'from-orange-400 to-amber-700',
  },
  {
    id: 7,
    name: 'Эмульс цагаан 25кг (Герман чанар, угаагддаг)',
    sku: 'BL-2001',
    price: 89000,
    hasBulkPrice: true,
    bulkPrice: 78000,
    bulkFrom: 4,
    category: 'Барилгын материал',
    unit: 'сав',
    status: 'in_stock',
    inStock: true,
    stockCount: 32,
    badge: 'Онцлох чанар',
    description: 'Дотор засал, хана таазны өнгөлгөөний дээд зэргийн угаагддаг цагаан эмульс.',
    color: 'from-slate-400 to-slate-700',
  },
  {
    id: 8,
    name: 'Хөтөл Цемент М500 50кг',
    sku: 'BL-2002',
    price: 22000,
    hasBulkPrice: true,
    bulkPrice: 19800,
    bulkFrom: 20,
    category: 'Барилгын материал',
    unit: 'шуудай',
    status: 'in_stock',
    inStock: true,
    stockCount: 180,
    badge: 'Бөөний үнэ',
    description: 'Монгол улсад үйлдвэрлэсэн чанарын баталгаатай барилгын цемент.',
    color: 'from-stone-400 to-stone-700',
  },
  {
    id: 9,
    name: 'Цахилгааны зэс кабель 3x2.5мм² 100м',
    sku: 'BL-2003',
    price: 165000,
    hasBulkPrice: true,
    bulkPrice: 145000,
    bulkFrom: 3,
    category: 'Барилгын материал',
    unit: 'ороомог',
    status: 'in_stock',
    inStock: true,
    stockCount: 22,
    badge: 'ГОСТ Стандарт',
    description: 'Галд тэсвэртэй давхар дулаалгатай 100% цэвэр зэс цахилгааны утас.',
    color: 'from-rose-400 to-red-600',
  },
  {
    id: 10,
    name: 'Lhamour Органик чацарганатай гар хийцийн саван',
    sku: 'CS-3001',
    price: 12500,
    hasBulkPrice: false, // Бөөний үнэгүй бараа
    category: 'Гоо сайхан',
    unit: 'ш',
    status: 'in_stock',
    inStock: true,
    stockCount: 85,
    badge: '100% Эко',
    description: 'Монгол чацарганы тосоор баяжуулсан арьс чийгшүүлэгч байгалийн саван.',
    color: 'from-amber-400 to-orange-500',
  },
  {
    id: 11,
    name: 'Goo брэндийн нүүрний чийгшүүлэгч тос 50мл',
    sku: 'CS-3002',
    price: 39000,
    hasBulkPrice: true,
    bulkPrice: 33500,
    bulkFrom: 6,
    category: 'Гоо сайхан',
    unit: 'ш',
    status: 'temporarily_out', // Түр дууссан
    inStock: false,
    stockCount: 0,
    badge: 'Шилдэг',
    description: 'Хуурай болон эмзэг арьсанд зориулсан байгалийн гаралтай тэжээлийн тос.',
    color: 'from-pink-400 to-rose-600',
  },
  {
    id: 12,
    name: 'Ухаалаг LED гэрэл 12W 10 ширхэгийн багц',
    sku: 'EL-4001',
    price: 45000,
    hasBulkPrice: true,
    bulkPrice: 38000,
    bulkFrom: 5,
    category: 'Цахилгаан бараа',
    unit: 'багц',
    status: 'in_stock',
    inStock: true,
    stockCount: 50,
    badge: 'Хэмнэлттэй',
    description: 'Эрчим хүчний А+ хэмнэлттэй, 25000 цагийн насжилттай цагаан гэрэл.',
    color: 'from-yellow-400 to-amber-500',
  },
  {
    id: 13,
    name: 'Type-C 65W Түргэн цэнэглэгч кабель 2м',
    sku: 'EL-4002',
    price: 22000,
    hasBulkPrice: true,
    bulkPrice: 17500,
    bulkFrom: 10,
    category: 'Цахилгаан бараа',
    unit: 'ш',
    status: 'in_stock',
    inStock: true,
    stockCount: 130,
    badge: 'Шинэ',
    description: 'Бүх төрлийн утас, таблет, нөүтбүүк цэнэглэх бат бөх сүлжмэл кабель.',
    color: 'from-indigo-400 to-blue-700',
  },
  {
    id: 14,
    name: 'Моторын синтетик тос 5W-30 4л (Япон чанар)',
    sku: 'AP-5001',
    price: 125000,
    hasBulkPrice: true,
    bulkPrice: 108000,
    bulkFrom: 4,
    category: 'Авто сэлбэг',
    unit: 'канистр',
    status: 'in_stock',
    inStock: true,
    stockCount: 28,
    badge: 'Оригинал',
    description: 'Өвлийн хүйтэнд хөдөлгүүрийг найдвартай хамгаалах синтетик тос.',
    color: 'from-emerald-500 to-teal-800',
  },
  {
    id: 15,
    name: 'Өвлийн шил арчигч шингэн -35°C 4л',
    sku: 'AP-5002',
    price: 13500,
    hasBulkPrice: false,
    category: 'Авто сэлбэг',
    unit: 'сав',
    status: 'out_of_stock', // Дууссан
    inStock: false,
    stockCount: 0,
    badge: 'Өвлийн эрэлт',
    description: 'Хөлдөхгүй, шил зурахгүй дээд зэргийн өвлийн шингэн.',
    color: 'from-blue-400 to-cyan-700',
  },
  {
    id: 16,
    name: 'Витамин С 1000мг хөөсөрдөг үрэл 20ш',
    sku: 'PH-6001',
    price: 19500,
    hasBulkPrice: true,
    bulkPrice: 16500,
    bulkFrom: 8,
    category: 'Эмийн сан, эрүүл мэнд',
    unit: 'хайрцаг',
    status: 'in_stock',
    inStock: true,
    stockCount: 65,
    badge: 'Дархлаа',
    description: 'Дархлаа сэргээх, ядаргаа тайлах өндөр тунтай витамин С.',
    color: 'from-orange-400 to-red-500',
  },
  {
    id: 17,
    name: '3 давхаргат эмнэлгийн маск 50ш хайрцагтай',
    sku: 'PH-6002',
    price: 9900,
    hasBulkPrice: true,
    bulkPrice: 7900,
    bulkFrom: 10,
    category: 'Эмийн сан, эрүүл мэнд',
    unit: 'хайрцаг',
    status: 'in_stock',
    inStock: true,
    stockCount: 140,
    badge: 'Бөөний үнэ',
    description: 'Бактери шүүгчтэй, зөөлөн чихэвчтэй ариутгасан маск.',
    color: 'from-sky-300 to-teal-500',
  },
  {
    id: 18,
    name: 'Нохойн шим тэжээлт хуурай хоол 3кг',
    sku: 'PT-7001',
    price: 48000,
    hasBulkPrice: true,
    bulkPrice: 41000,
    bulkFrom: 5,
    category: 'Гэрийн тэжээвэр амьтан',
    unit: 'уут',
    status: 'in_stock',
    inStock: true,
    stockCount: 35,
    badge: 'Премиум',
    description: 'Үхрийн мах, ногоотой бүх насны нохойд зориулсан тэжээллэг хоол.',
    color: 'from-amber-500 to-stone-600',
  },
  {
    id: 19,
    name: 'Хөвөн даавуун подволк 10ш багц (S-XXL сонголт)',
    sku: 'FS-8001',
    price: 190000,
    hasBulkPrice: true,
    bulkPrice: 160000,
    bulkFrom: 3,
    category: 'Бөөний бэлэн хувцас',
    unit: 'багц',
    status: 'in_stock',
    inStock: true,
    stockCount: 20,
    badge: '100% Хөвөн',
    description: 'Бөөний худалдаа, хэвлэл болон ажлын хувцсанд зориулсан чанартай подволк.',
    color: 'from-violet-400 to-purple-700',
  },
  {
    id: 20,
    name: 'Өвлийн дулаан ноосон оймс 20 хос',
    sku: 'FS-8002',
    price: 95000,
    hasBulkPrice: true,
    bulkPrice: 79000,
    bulkFrom: 4,
    category: 'Бөөний бэлэн хувцас',
    unit: 'багц',
    status: 'temporarily_out', // Түр дууссан
    inStock: false,
    stockCount: 0,
    badge: 'Дулаан',
    description: 'Тэмээний ноосны орцтой, хасах хэмд дулаанаа найдвартай барих өвлийн оймс.',
    color: 'from-yellow-600 to-amber-900',
  },
]

// --- Валют форматлагч (Монгол төгрөг) ---
export function formatMNT(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 ₮'
  return new Intl.NumberFormat('mn-MN').format(Math.round(amount)) + ' ₮'
}

// --- Ангиллын дүрс тэмдэг ---
function getCategoryIcon(cat: string) {
  switch (cat) {
    case 'Хүнс, ундаа':
      return <Utensils className="size-4" />
    case 'Барилгын материал':
      return <Hammer className="size-4" />
    case 'Гоо сайхан':
      return <Sparkle className="size-4" />
    case 'Цахилгаан бараа':
      return <Cpu className="size-4" />
    case 'Авто сэлбэг':
      return <Wrench className="size-4" />
    case 'Эмийн сан, эрүүл мэнд':
      return <HeartPulse className="size-4" />
    case 'Гэрийн тэжээвэр амьтан':
      return <Package className="size-4" />
    case 'Бөөний бэлэн хувцас':
      return <Shirt className="size-4" />
    default:
      return <Boxes className="size-4" />
  }
}

// --- Барааны зураг & график дүрслэл (8px roundness, WebP Image Support, 3 Statuses) ---
function ProductVisual({
  product,
  showStockCount = true,
}: {
  product: Product
  showStockCount?: boolean
}) {
  const status = getProductStatus(product)
  const badgeInfo = getStatusBadgeInfo(status)
  const gradient = product.color || 'from-teal-400 to-emerald-600'

  return (
    <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-t-[8px] bg-slate-100 p-2 transition-all duration-300 group-hover:bg-slate-50">
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:12px_12px]" />

      {product.image ? (
        <div className="relative h-full w-full flex items-center justify-center overflow-hidden rounded-[8px]">
          <img
            src={product.image}
            alt={product.name}
            className={`h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 ${
              status === 'out_of_stock'
                ? 'grayscale-80 opacity-40'
                : status === 'temporarily_out'
                ? 'opacity-75'
                : ''
            }`}
          />
        </div>
      ) : (
        <div
          className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
            status === 'out_of_stock'
              ? 'grayscale-70 opacity-40'
              : status === 'temporarily_out'
              ? 'opacity-70'
              : ''
          }`}
        >
          <div
            className={`flex h-20 w-16 -rotate-2 flex-col items-center justify-between rounded-[8px] bg-gradient-to-b ${gradient} p-2 text-white shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:rotate-0`}
          >
            <div className="flex w-full justify-between items-center text-[8px] font-black tracking-widest text-white/90">
              <span>PRO</span>
              <span>★</span>
            </div>
            <div className="my-auto text-center">
              <div className="text-[10px] font-extrabold leading-tight tracking-tight text-white drop-shadow-xs line-clamp-2">
                {product.name.split(' ')[0]}
              </div>
              <div className="mt-0.5 text-[7px] font-medium tracking-wider text-white/80">
                {product.unit.toUpperCase()}
              </div>
            </div>
            <div className="w-full text-center text-[7px] font-mono tracking-tighter text-white/90 bg-black/15 py-0.5 rounded-[4px]">
              {product.sku}
            </div>
          </div>
          <div className="mt-1 h-1.5 w-14 rounded-full bg-slate-400/20 blur-xs" />
        </div>
      )}

      {product.badge && (
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-[8px] bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-xs border border-slate-200/80 backdrop-blur-xs">
          <Sparkles className="size-3 text-amber-500" />
          {product.badge}
        </span>
      )}

      {status === 'temporarily_out' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="rounded-[8px] bg-amber-600/95 px-3 py-1 text-xs font-black tracking-wider text-white shadow-md">
            ТҮР ДУУССАН
          </span>
        </div>
      )}
      {status === 'out_of_stock' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="rounded-[8px] bg-rose-600/95 px-3 py-1 text-xs font-black tracking-wider text-white shadow-md">
            ДУУССАН
          </span>
        </div>
      )}

      <div className="absolute right-2.5 bottom-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-[8px] px-2 py-0.5 text-[10px] font-bold shadow-2xs border ${badgeInfo.bg} ${badgeInfo.text} ${badgeInfo.border}`}
        >
          <span className={`size-1.5 rounded-full ${badgeInfo.dot}`} />
          {status === 'in_stock'
            ? showStockCount
              ? `Нөөцөд: ${product.stockCount} ${product.unit}`
              : 'Бэлэн байгаа'
            : badgeInfo.label}
        </span>
      </div>
    </div>
  )
}

// --- БҮТЭЭГДЭХҮҮНИЙ ДЭЛГЭРЭНГҮЙ ХАРАХ МОДАЛ (ЗАХИАЛАХ ХЭСЭГГҮЙ ЦЭВЭР ТАНИЛЦУУЛГА) ---
function ProductDetailModal({
  product,
  showStockCount = true,
  onClose,
}: {
  product: Product
  showStockCount?: boolean
  onClose: () => void
}) {
  const status = getProductStatus(product)
  const badgeInfo = getStatusBadgeInfo(status)
  const hasBulk = Boolean(product.hasBulkPrice && product.bulkPrice && product.bulkPrice < product.price)
  const savingsPercent = hasBulk
    ? Math.round(((product.price - (product.bulkPrice || product.price)) / product.price) * 100)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-[8px] sm:rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-[8px] bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-200/60">
                {product.category}
              </span>
              <span className="font-mono text-xs text-slate-400">SKU {product.sku}</span>
              {product.badge && (
                <span className="inline-flex items-center gap-1 rounded-[8px] bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                  <Sparkles className="size-3 text-amber-600" />
                  {product.badge}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Хаах"
            className="cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="size-6 sm:size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="relative h-48 sm:h-56 w-full overflow-hidden rounded-[8px] bg-slate-100 p-2 flex items-center justify-center border border-slate-200">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-contain rounded-[8px]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div
                  className={`flex h-24 w-20 flex-col items-center justify-between rounded-[8px] bg-gradient-to-b ${
                    product.color || 'from-amber-400 to-amber-600'
                  } p-2 text-white shadow-lg`}
                >
                  <span className="text-[9px] font-black tracking-widest text-white/90">NEMA</span>
                  <div className="text-center font-bold text-xs">{product.name.split(' ')[0]}</div>
                  <div className="text-[8px] font-mono">{product.sku}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-[8px] bg-slate-50 p-3 border border-slate-200">
            <span className="text-xs font-semibold text-slate-600">Нөөцийн төлөв:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1 text-xs font-bold border ${badgeInfo.bg} ${badgeInfo.text} ${badgeInfo.border}`}
            >
              <span className={`size-2 rounded-full ${badgeInfo.dot}`} />
              {status === 'in_stock'
                ? showStockCount
                  ? `Бэлэн нөөцтэй (${product.stockCount} ${product.unit})`
                  : 'Бэлэн байгаа'
                : badgeInfo.label}
            </span>
          </div>

          {hasBulk ? (
            <div className="grid grid-cols-2 gap-2.5 rounded-[8px] bg-slate-50 p-2.5 border border-slate-200/80">
              <div className="rounded-[8px] bg-white p-3 border border-slate-200/70 shadow-xs">
                <div className="text-[11px] font-medium text-slate-500">
                  Жижиглэн үнэ (1–{(product.bulkFrom || 5) - 1} {product.unit})
                </div>
                <div className="mt-1 text-base sm:text-lg font-bold text-slate-800">
                  {formatMNT(product.price)}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[8px] bg-emerald-50/90 p-3 border border-emerald-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-emerald-800">
                    Бөөний үнэ ({product.bulkFrom}+ {product.unit})
                  </div>
                  <span className="rounded-[8px] bg-emerald-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
                    -{savingsPercent}%
                  </span>
                </div>
                <div className="mt-1 text-base sm:text-lg font-extrabold text-emerald-700">
                  {formatMNT(product.bulkPrice || product.price)}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[8px] bg-white p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500">Нэгжийн үнэ:</span>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {formatMNT(product.price)} <span className="text-xs font-normal text-slate-500">/ 1 {product.unit}</span>
                </div>
              </div>
              <span className="rounded-[8px] bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                Тогтмол үнэ
              </span>
            </div>
          )}

          {product.description && (
            <div className="rounded-[8px] border border-slate-200 bg-slate-50/50 p-3.5">
              <h4 className="text-xs font-bold text-slate-800 mb-1">Бүтээгдэхүүний тайлбар:</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          <div className="rounded-[8px] bg-[#FFF8E7] p-3.5 border border-[#FDE68A] text-xs text-slate-800 space-y-1.5">
            <div className="font-bold text-[#DE3B28] flex items-center gap-1.5">
              <Building2 className="size-4 text-[#DE3B28]" />
              <span>Нема Фүүдс ХХК • Шоурүүм & Лавлах:</span>
            </div>
            <div className="text-[11px] text-slate-700 flex items-center gap-2">
              <Phone className="size-3.5 text-[#DE3B28]" />
              <span>Утас: 7711-2233, 9911-0000</span>
            </div>
            <div className="text-[11px] text-slate-700 flex items-center gap-2">
              <Mail className="size-3.5 text-[#DE3B28]" />
              <span>И-мэйл: sales@nemafoods.mn</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-100 pt-3">
          <button
            onClick={onClose}
            className="cursor-pointer min-h-[44px] w-full sm:w-auto rounded-[8px] bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-[#DE3B28] transition-colors"
          >
            Хаах
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Барааны карт бүрэлдэхүүн хэсэг (Grid view, 8px corners, no ordering button) ---
function ProductCard({
  product,
  showStockCount = true,
  onOpenDetail,
}: {
  product: Product
  showStockCount?: boolean
  onOpenDetail: (p: Product) => void
}) {
  const hasBulk = Boolean(product.hasBulkPrice && product.bulkPrice && product.bulkPrice < product.price)
  const savingsPercent = hasBulk
    ? Math.round(((product.price - (product.bulkPrice || product.price)) / product.price) * 100)
    : 0

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-[8px] border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#DE3B28]/60 hover:shadow-lg">
      <div>
        <ProductVisual product={product} showStockCount={showStockCount} />

        <div className="p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-amber-900 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-[8px] truncate max-w-[130px]">
              {product.category}
            </span>
            <span className="font-mono text-slate-400">SKU {product.sku}</span>
          </div>

          <h3 className="mt-2 min-h-10 text-xs sm:text-sm font-bold leading-snug text-slate-900 group-hover:text-[#DE3B28] transition-colors line-clamp-2">
            {product.name}
          </h3>

          {product.description && (
            <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
              {product.description}
            </p>
          )}

          {hasBulk ? (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-[8px] bg-slate-50/80 p-2 sm:p-2.5 border border-slate-100">
              <div>
                <p className="text-[9px] sm:text-[10px] font-medium text-slate-500">
                  1–{(product.bulkFrom || 5) - 1} {product.unit}
                </p>
                <p className="mt-0.5 text-sm sm:text-base font-bold text-slate-800 truncate">
                  {formatMNT(product.price)}
                </p>
              </div>

              <div className="rounded-[8px] bg-emerald-50 px-2 py-1 border border-emerald-200/60">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] sm:text-[10px] font-bold text-emerald-800">
                    {product.bulkFrom}+ {product.unit}
                  </p>
                  <span className="text-[8px] sm:text-[9px] font-extrabold text-emerald-700">
                    -{savingsPercent}%
                  </span>
                </div>
                <p className="mt-0.5 text-sm sm:text-base font-extrabold text-emerald-700 truncate">
                  {formatMNT(product.bulkPrice || product.price)}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-[8px] bg-slate-50/90 p-2.5 border border-slate-100">
              <div>
                <p className="text-[9px] text-slate-400 font-medium">Үндсэн үнэ</p>
                <p className="mt-0.5 text-sm sm:text-base font-bold text-slate-900">
                  {formatMNT(product.price)} <span className="text-[10px] font-normal text-slate-400">/ {product.unit}</span>
                </p>
              </div>
              <span className="rounded-[8px] bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">
                Нэгж үнэ
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50/40">
        <button
          onClick={() => onOpenDetail(product)}
          className="cursor-pointer min-h-[44px] flex w-full items-center justify-center gap-1.5 rounded-[8px] py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-amber-50 hover:text-[#DE3B28] hover:border-amber-300 transition-all duration-200 active:scale-[0.98]"
        >
          <Info className="size-4 text-[#DE3B28]" />
          <span>Дэлгэрэнгүй мэдээлэл</span>
        </button>
      </div>
    </article>
  )
}

// --- Барааны жагсаалт харагдац (List view, 8px corners, no ordering button) ---
function ProductListItem({
  product,
  showStockCount = true,
  onOpenDetail,
}: {
  product: Product
  showStockCount?: boolean
  onOpenDetail: (p: Product) => void
}) {
  const status = getProductStatus(product)
  const badgeInfo = getStatusBadgeInfo(status)
  const hasBulk = Boolean(product.hasBulkPrice && product.bulkPrice && product.bulkPrice < product.price)
  const savingsPercent = hasBulk
    ? Math.round(((product.price - (product.bulkPrice || product.price)) / product.price) * 100)
    : 0

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-[8px] border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs transition-all hover:border-[#DE3B28]/50 hover:shadow-md">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
        <div className="size-14 sm:size-16 shrink-0 rounded-[8px] bg-slate-100 border border-slate-200 p-1 flex items-center justify-center overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-contain rounded-[8px]"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center rounded-[8px] bg-gradient-to-br ${
                product.color || 'from-amber-400 to-amber-600'
              } text-white shadow-xs font-bold text-[10px]`}
            >
              {product.sku.slice(0, 4)}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[8px] bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
              {product.category}
            </span>
            <span className="font-mono text-xs text-slate-400">SKU {product.sku}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-[8px] px-2 py-0.5 text-[10px] font-bold border ${badgeInfo.bg} ${badgeInfo.text} ${badgeInfo.border}`}
            >
              <span className={`size-1.5 rounded-full ${badgeInfo.dot}`} />
              {badgeInfo.shortLabel}
            </span>
          </div>
          <h4 className="mt-1 font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#DE3B28] transition-colors">
            {product.name}
          </h4>
          <p className="text-xs text-slate-500">
            Нэгж: <b>1 {product.unit}</b>
            {showStockCount && status === 'in_stock' && (
              <span> | Үлдэгдэл: <b>{product.stockCount} {product.unit}</b></span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2.5 sm:pt-0">
        <div className="text-left sm:text-right">
          <div className="text-xs text-slate-500">
            Үнэ: <b className="font-bold text-slate-900">{formatMNT(product.price)}</b>
          </div>
          {hasBulk && (
            <div className="text-xs font-extrabold text-emerald-700">
              Бөөний: {formatMNT(product.bulkPrice || product.price)}{' '}
              <span className="text-[10px] font-semibold text-emerald-600">
                ({product.bulkFrom}+ {product.unit}, -{savingsPercent}%)
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => onOpenDetail(product)}
          className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] bg-slate-900 px-3.5 sm:px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#DE3B28] transition-all shrink-0"
        >
          <Info className="size-3.5" />
          <span>Дэлгэрэнгүй</span>
        </button>
      </div>
    </div>
  )
}

// --- PDF Хэвлэх Бүрэн Ном Горим ---
type BookPageData =
  | { type: 'cover' }
  | { type: 'toc'; entries: { name: string; count: number; startPage: number }[] }
  | {
      type: 'products'
      category: string
      partIndex: number
      totalParts: number
      items: Product[]
    }
  | { type: 'back_cover' }

// Helper to get title and metadata for any PDF page
function getBookPageInfo(page: { pageNum: number; data: BookPageData }): {
  title: string
  subTitle: string
  tag: string
} {
  switch (page.data.type) {
    case 'cover':
      return {
        title: 'Нүүр хуудас',
        subTitle: 'Нема Фүүдс 2026',
        tag: 'Cover',
      }
    case 'toc':
      return {
        title: 'Гарчиг & Хуваарь',
        subTitle: 'Ангиллууд & Хуудасны заалт',
        tag: 'TOC',
      }
    case 'products':
      return {
        title: page.data.category,
        subTitle: `Хэсэг ${page.data.partIndex}/${page.data.totalParts} (${page.data.items.length} бараа)`,
        tag: `${page.data.partIndex}/${page.data.totalParts}`,
      }
    case 'back_cover':
      return {
        title: 'Байгууллагын танилцуулга',
        subTitle: 'Холбоо барих & Банкны данс',
        tag: 'Төгсгөл',
      }
  }
}

// PDF Хуудас бүрийн дээр ба доор гарах Навигацийн мөр (no-print)
function PdfPageNavBar({
  position,
  pageIndex,
  totalPages,
  pageInfo,
  viewMode,
  allPages,
  onPrev,
  onNext,
  onFirst,
  onLast,
  onJumpToPage,
  onScrollToTop,
  onSwitchToSingle,
}: {
  position: 'top' | 'bottom'
  pageIndex: number
  totalPages: number
  pageInfo: { title: string; subTitle: string; tag: string }
  viewMode: 'all' | 'single'
  allPages: { pageNum: number; data: BookPageData }[]
  onPrev: () => void
  onNext: () => void
  onFirst: () => void
  onLast: () => void
  onJumpToPage: (idx: number) => void
  onScrollToTop?: () => void
  onSwitchToSingle?: (idx: number) => void
}) {
  const isFirst = pageIndex === 0
  const isLast = pageIndex === totalPages - 1

  if (position === 'top') {
    return (
      <div className="no-print rounded-[8px] border border-amber-200/90 bg-gradient-to-r from-amber-50/95 via-white to-orange-50/40 p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Left: First & Prev Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onFirst}
            disabled={isFirst}
            title="Эхний хуудас руу очих"
            className="cursor-pointer min-h-[40px] px-2.5 inline-flex items-center gap-1 rounded-[8px] border border-slate-200 bg-white font-bold text-slate-700 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsLeft className="size-4 text-[#DE3B28]" />
            <span className="hidden sm:inline">Эхлэл</span>
          </button>

          <button
            type="button"
            onClick={onPrev}
            disabled={isFirst}
            title="Өмнөх хуудас"
            className="cursor-pointer min-h-[40px] px-3 inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white font-bold text-slate-800 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
          >
            <ChevronLeft className="size-4 text-[#DE3B28]" />
            <span>Өмнөх хуудас</span>
          </button>
        </div>

        {/* Center: Current Page Badge & Direct Dropdown Jump */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 rounded-[8px] bg-amber-100/90 px-2.5 py-1 text-amber-950 font-extrabold text-[11px] border border-amber-300/80">
            <FileText className="size-3.5 text-[#DE3B28]" />
            <span>{pageInfo.title}</span>
            <span className="rounded-[4px] bg-white/80 px-1 py-0.2 text-[10px] text-amber-900">
              {pageInfo.tag}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600 text-[11px] hidden sm:inline">Хуудас:</span>
            <select
              value={pageIndex}
              onChange={(e) => onJumpToPage(Number(e.target.value))}
              aria-label="Хуудас сонгох"
              className="cursor-pointer min-h-[40px] rounded-[8px] border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
            >
              {allPages.map((p, i) => {
                const info = getBookPageInfo(p)
                return (
                  <option key={i} value={i}>
                    Хуудас {p.pageNum} / {totalPages}: {info.title}
                  </option>
                )
              })}
            </select>
          </div>

          {viewMode === 'all' && onSwitchToSingle && (
            <button
              type="button"
              onClick={() => onSwitchToSingle(pageIndex)}
              title="Энэ хуудсыг ганцаарчлан томруулж харах"
              className="hidden lg:inline-flex cursor-pointer min-h-[40px] px-2.5 items-center gap-1 rounded-[8px] border border-slate-200 bg-white text-slate-600 hover:text-amber-900 hover:bg-amber-50 transition-colors font-medium text-[11px]"
            >
              <Eye className="size-3.5 text-[#DE3B28]" />
              <span>Ганцаарчлан</span>
            </button>
          )}
        </div>

        {/* Right: Next & Last Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onNext}
            disabled={isLast}
            title="Дараах хуудас"
            className="cursor-pointer min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-[8px] border border-[#DE3B28] bg-[#DE3B28] text-white font-bold hover:bg-[#b82a1a] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 transition-colors shadow-2xs"
          >
            <span>Дараах хуудас</span>
            <ChevronRight className="size-4" />
          </button>

          <button
            type="button"
            onClick={onLast}
            disabled={isLast}
            title="Сүүлийн хуудас руу очих"
            className="cursor-pointer min-h-[40px] px-2.5 inline-flex items-center gap-1 rounded-[8px] border border-slate-200 bg-white font-bold text-slate-700 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">Төгсгөл</span>
            <ChevronsRight className="size-4 text-[#DE3B28]" />
          </button>
        </div>
      </div>
    )
  }

  // BOTTOM NAVIGATION BAR
  return (
    <div className="no-print rounded-[8px] border border-slate-200 bg-white p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-700">
      {/* Left: First & Prev Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          title="Өмнөх хуудас руу шилжих"
          className="cursor-pointer min-h-[40px] px-3 inline-flex items-center gap-1.5 rounded-[8px] border border-slate-300 bg-white font-bold text-slate-800 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="size-4 text-[#DE3B28]" />
          <span>Өмнөх хуудас</span>
        </button>

        <button
          type="button"
          onClick={onFirst}
          disabled={isFirst}
          title="Хамгийн эхний хуудас руу буцах"
          className="hidden sm:inline-flex cursor-pointer min-h-[40px] px-2.5 items-center gap-1 rounded-[8px] border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium text-[11px]"
        >
          <ChevronsLeft className="size-3.5 text-slate-500" />
          <span>Эхнийх</span>
        </button>
      </div>

      {/* Center: Scroll to top of sheet & Page Indicator */}
      <div className="flex items-center gap-2">
        {onScrollToTop && (
          <button
            type="button"
            onClick={onScrollToTop}
            title="Энэ хуудасны эхлэл рүү буцах"
            className="cursor-pointer min-h-[40px] inline-flex items-center gap-1.5 rounded-[8px] bg-slate-100 hover:bg-amber-100/60 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-amber-950 border border-slate-200 transition-colors"
          >
            <ArrowUp className="size-3.5 text-[#DE3B28]" />
            <span>Дээш гүйлгэх</span>
          </button>
        )}

        <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-[6px] border border-slate-200 text-[11px]">
          Хуудас {pageIndex + 1} / {totalPages}
        </span>
      </div>

      {/* Right: Next & Last Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onLast}
          disabled={isLast}
          title="Хамгийн сүүлийн хуудас руу очих"
          className="hidden sm:inline-flex cursor-pointer min-h-[40px] px-2.5 items-center gap-1 rounded-[8px] border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium text-[11px]"
        >
          <span>Сүүлчийнх</span>
          <ChevronsRight className="size-3.5 text-slate-500" />
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={isLast}
          title="Дараах хуудас руу шилжих"
          className="cursor-pointer min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-[8px] bg-[#DE3B28] text-white font-bold hover:bg-[#b82a1a] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-2xs"
        >
          <span>Дараах хуудас</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

function PdfCatalogView({
  products,
  categories,
  activeCategory,
  showStockCount = true,
  onBack,
}: {
  products: Product[]
  categories: string[]
  activeCategory: string
  showStockCount?: boolean
  onBack: () => void
}) {
  const [selectedScope, setSelectedScope] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'all' | 'single'>('single')
  const [pageIndex, setPageIndex] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState<number>(4)
  const [includeCovers, setIncludeCovers] = useState<boolean>(true)
  const [showPrintTip, setShowPrintTip] = useState<boolean>(true)

  const bookPages: { pageNum: number; data: BookPageData }[] = useMemo(() => {
    const pages: { pageNum: number; data: BookPageData }[] = []
    let currentNum = 1

    const activeCats =
      selectedScope === 'all'
        ? categories.filter((c) => c !== 'Бүх ангилал' && products.some((p) => p.category === c))
        : [selectedScope]

    const catPageSlices: { category: string; partIndex: number; totalParts: number; items: Product[] }[] = []
    const tocEntries: { name: string; count: number; startPage: number }[] = []

    let productStartPage = 1
    if (includeCovers) {
      productStartPage = 3 // Cover = 1, TOC = 2
    }

    let runningPage = productStartPage
    activeCats.forEach((cat) => {
      const catProducts = products.filter((p) => p.category === cat)
      if (catProducts.length === 0) return

      const totalParts = Math.ceil(catProducts.length / itemsPerPage)
      tocEntries.push({
        name: cat,
        count: catProducts.length,
        startPage: runningPage,
      })

      for (let i = 0; i < totalParts; i++) {
        const slice = catProducts.slice(i * itemsPerPage, (i + 1) * itemsPerPage)
        catPageSlices.push({
          category: cat,
          partIndex: i + 1,
          totalParts,
          items: slice,
        })
        runningPage++
      }
    })

    if (includeCovers) {
      pages.push({ pageNum: currentNum++, data: { type: 'cover' } })
      pages.push({ pageNum: currentNum++, data: { type: 'toc', entries: tocEntries } })
    }

    catPageSlices.forEach((slice) => {
      pages.push({
        pageNum: currentNum++,
        data: {
          type: 'products',
          category: slice.category,
          partIndex: slice.partIndex,
          totalParts: slice.totalParts,
          items: slice.items,
        },
      })
    })

    if (includeCovers) {
      pages.push({ pageNum: currentNum++, data: { type: 'back_cover' } })
    }

    return pages
  }, [selectedScope, categories, products, itemsPerPage, includeCovers])

  const totalPages = bookPages.length || 1

  // Хурдан очих товчнууд (Section Pills)
  const quickPills = useMemo(() => {
    const pills: { label: string; pageIndex: number; pageNum: number }[] = []
    bookPages.forEach((p, idx) => {
      if (p.data.type === 'cover') {
        pills.push({ label: 'Нүүр', pageIndex: idx, pageNum: p.pageNum })
      } else if (p.data.type === 'toc') {
        pills.push({ label: 'Гарчиг', pageIndex: idx, pageNum: p.pageNum })
      } else if (p.data.type === 'products' && p.data.partIndex === 1) {
        pills.push({ label: p.data.category, pageIndex: idx, pageNum: p.pageNum })
      } else if (p.data.type === 'back_cover') {
        pills.push({ label: 'Төгсгөл', pageIndex: idx, pageNum: p.pageNum })
      }
    })
    return pills
  }, [bookPages])

  const goToPage = (targetIndex: number) => {
    const safeIdx = Math.max(0, Math.min(totalPages - 1, targetIndex))
    if (viewMode === 'single') {
      setPageIndex(safeIdx)
      setTimeout(() => {
        const el = document.getElementById('pdf-single-sheet-container')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 30)
    } else {
      const el = document.getElementById(`pdf-page-block-${safeIdx}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const scrollToPageTop = (targetIndex: number) => {
    if (viewMode === 'single') {
      const el = document.getElementById('pdf-single-sheet-container')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      const el = document.getElementById(`pdf-page-block-${targetIndex}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  // Keyboard navigation: ArrowLeft / ArrowRight / PageUp / PageDown / Home / End / Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        goToPage(pageIndex - 1)
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        goToPage(pageIndex + 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        goToPage(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        goToPage(totalPages - 1)
      } else if (e.key === 'Escape') {
        onBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pageIndex, totalPages, viewMode, onBack])

  const handlePrint = () => {
    window.print()
  }

  return (
    <main className="min-h-screen bg-[#edf2ef] p-2 sm:p-4 text-[#20374f]">
      {/* Дээд Тохиргооны Хэсэг (no-print) */}
      <div className="no-print mx-auto max-w-[940px] mb-5 rounded-[8px] border border-amber-200/90 bg-white p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="cursor-pointer min-h-[44px] flex items-center gap-2 text-sm font-bold text-[#DE3B28] hover:text-[#b82a1a] transition-colors"
            >
              <ChevronLeft className="size-5" />
              <span>Каталог руу буцах</span>
            </button>
            <span className="hidden sm:inline-block rounded-[8px] bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900 border border-amber-200">
              Бүрэн PDF Ном горим
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="cursor-pointer min-h-[44px] inline-flex items-center gap-2 rounded-[8px] bg-[#DE3B28] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#b82a1a] transition-all"
            >
              <Printer className="size-4" />
              <span>Хэвлэх / PDF татах</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 text-[11px]">Хамрах хүрээ:</span>
              <select
                value={selectedScope}
                onChange={(e) => {
                  setSelectedScope(e.target.value)
                  setPageIndex(0)
                }}
                className="cursor-pointer min-h-[40px] rounded-[8px] border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                <option value="all">Бүх бүтээгдэхүүн (Бүрэн ном - {products.length} бараа)</option>
                {categories
                  .filter((c) => c !== 'Бүх ангилал')
                  .map((c) => (
                    <option key={c} value={c}>
                      Зөвхөн: {c} ({products.filter((p) => p.category === c).length})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 text-[11px]">Харагдац:</span>
              <div className="inline-flex rounded-[8px] border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('single')}
                  className={`cursor-pointer rounded-[8px] px-2.5 py-1 text-xs font-semibold transition-colors ${
                    viewMode === 'single'
                      ? 'bg-white text-amber-950 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Нэг нэгээр харах
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`cursor-pointer rounded-[8px] px-2.5 py-1 text-xs font-semibold transition-colors ${
                    viewMode === 'all'
                      ? 'bg-white text-amber-950 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Бүх хуудсаар (Ном)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 text-[11px]">Нэг хуудсанд:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="cursor-pointer min-h-[40px] rounded-[8px] border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                <option value={4}>4 бараа (2x2 стандарт)</option>
                <option value={6}>6 бараа (2x3 нягтрал)</option>
              </select>
            </div>
          </div>

          <label className="cursor-pointer flex items-center gap-1.5 font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={includeCovers}
              onChange={(e) => setIncludeCovers(e.target.checked)}
              className="size-4 accent-[#DE3B28] rounded-[4px]"
            />
            <span>Нүүр & Гарчиг & Төгсгөлийн хуудас оруулах</span>
          </label>
        </div>

        {/* Хурдан шилжих Ангилал / Бүлгийн товчнууд (Quick Pills) */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="shrink-0 text-slate-400 font-semibold text-[11px] mr-1">Хурдан очих:</span>
          {quickPills.map((pill) => {
            const isActive = viewMode === 'single' ? pageIndex === pill.pageIndex : false
            return (
              <button
                key={`${pill.pageIndex}-${pill.pageNum}`}
                type="button"
                onClick={() => goToPage(pill.pageIndex)}
                className={`cursor-pointer shrink-0 min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[11px] font-bold transition-all border ${
                  isActive
                    ? 'bg-[#DE3B28] text-white border-[#DE3B28] shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900'
                }`}
              >
                <span>{pill.label}</span>
                <span className={`text-[9px] font-mono px-1 py-0.2 rounded-[4px] ${isActive ? 'bg-black/25 text-white' : 'bg-slate-200/80 text-slate-600'}`}>
                  #{pill.pageNum}
                </span>
              </button>
            )
          })}
        </div>

        {/* Хэвлэх заавар & Товч зөвлөмж */}
        {showPrintTip && (
          <div className="mt-3 rounded-[8px] bg-[#FFF8E7] p-3 border border-[#FDE68A] text-xs text-amber-950 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Info className="size-4 text-[#DE3B28] shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Хэвлэх & Шилжих заавар:</span> &quot;Хэвлэх / PDF татах&quot; товч дээр дарахад браузерын хэвлэх цонх нээгдэнэ. Тохиргооноос <b>&quot;Background graphics&quot;</b>-ийг чагталж, <b>&quot;Headers and footers&quot;</b>-ийг чагтгүй болгосноор төгс A4 ном болж хадгалагдана. Мөн гар дээрх <b>←</b> ба <b>→</b> сумаар хуудсуудаа шилжүүлж болно.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPrintTip(false)}
              className="cursor-pointer text-[#DE3B28] hover:text-[#b82a1a] p-1 shrink-0"
              title="Хаах"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[940px] space-y-8 print:space-y-0 print:m-0 print:p-0">
        {(viewMode === 'single'
          ? [{ page: bookPages[pageIndex], actualIdx: pageIndex }]
          : bookPages.map((page, idx) => ({ page, actualIdx: idx }))
        ).map(({ page, actualIdx }) => {
          if (!page) return null
          const pageInfo = getBookPageInfo(page)

          return (
            <div
              key={`${page.pageNum}-${actualIdx}`}
              id={`pdf-page-block-${actualIdx}`}
              className="space-y-2.5 print:space-y-0"
            >
              {/* PDF ХУУДАС БҮРИЙН ДЭЭД НАВИГАЦИ */}
              <PdfPageNavBar
                position="top"
                pageIndex={actualIdx}
                totalPages={totalPages}
                pageInfo={pageInfo}
                viewMode={viewMode}
                allPages={bookPages}
                onPrev={() => goToPage(actualIdx - 1)}
                onNext={() => goToPage(actualIdx + 1)}
                onFirst={() => goToPage(0)}
                onLast={() => goToPage(totalPages - 1)}
                onJumpToPage={(idx) => goToPage(idx)}
                onSwitchToSingle={(idx) => {
                  setPageIndex(idx)
                  setViewMode('single')
                  setTimeout(() => {
                    const el = document.getElementById('pdf-single-sheet-container')
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 50)
                }}
              />

              {/* ҮНДСЭН A4 ХЭВЛЭХ ХУУДАС */}
              <div
                id={viewMode === 'single' ? 'pdf-single-sheet-container' : undefined}
                className="a4-page-sheet pdf-book-page bg-white p-6 sm:p-8 rounded-[8px] shadow-sm border border-slate-200/90 print:border-none print:shadow-none print:rounded-none relative"
              >
              {page.data.type === 'cover' && (
                <div className="relative flex flex-col justify-between overflow-hidden rounded-[8px] bg-gradient-to-br from-[#1E1E1E] via-[#2D1B1B] to-[#DE3B28] p-8 sm:p-12 text-white min-h-[720px] sm:min-h-[820px]">
                  <div className="pointer-events-none absolute -right-20 -top-20 size-96 rounded-full border-[40px] border-[#FFCE00]/10" />
                  <div className="pointer-events-none absolute -bottom-20 -left-20 size-96 rounded-full border-[40px] border-[#FFCE00]/10" />

                  <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-6">
                    <div className="flex items-center gap-3">
                      <div className="relative size-14 overflow-hidden rounded-[8px] bg-white p-1 border border-white/30 shadow-md">
                        <Image src="/nema-foods-logo.svg" alt="Нема Фүүдс Лого" fill className="object-contain p-0.5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-wider text-white">НЕМА <span className="text-[#FFCE00]">ФҮҮДС</span></h2>
                        <p className="text-[10px] text-amber-200 tracking-widest uppercase font-semibold">
                          Хүнсний бөөний нэгдсэн цахим каталог
                        </p>
                      </div>
                    </div>
                    <span className="rounded-[8px] bg-[#FFCE00] text-slate-900 px-3 py-1 text-xs font-mono font-black tracking-widest shadow-sm">
                      2026 EDITION
                    </span>
                  </div>

                  <div className="relative z-10 my-auto py-10">
                    <span className="inline-block rounded-[8px] bg-[#FFCE00]/20 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-[#FFCE00] border border-[#FFCE00]/40">
                      NEMA FOODS LLC • WHOLESALE CATALOGUE
                    </span>
                    <h1 className="mt-4 text-4xl sm:text-5xl font-black leading-tight tracking-tight text-white">
                      Дээд Зэргийн Чанартай <br />
                      <span className="text-[#FFCE00]">Хүнсний Нэгдсэн Сан</span>
                    </h1>
                    <p className="mt-4 max-w-lg text-sm sm:text-base text-amber-100 leading-relaxed">
                      Баталгаат чанартай хүнсний бараа бүтээгдэхүүн, бөөний хөнгөлөлт, шуурхай нийлүүлэлтийн албан ёсны үнийн цэс.
                    </p>
                  </div>

                  <div className="relative z-10 flex flex-wrap items-center justify-between border-t border-white/15 pt-6 text-xs text-amber-100/90">
                    <div>
                      <span>Нийт бүтээгдэхүүн: <b className="text-white">{products.length} төрөл</b></span>
                      <span className="mx-2">•</span>
                      <span>Ангилал: <b className="text-white">{categories.length - 1}</b></span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#FFCE00] font-bold">www.nemafoods.mn</span>
                      <p className="text-[10px] text-white/80 mt-0.5">sales@nemafoods.mn | 7711-2233</p>
                    </div>
                  </div>
                </div>
              )}

              {page.data.type === 'toc' && (
                <div className="flex flex-col justify-between min-h-[720px] sm:min-h-[820px]">
                  <div>
                    <div className="border-b-2 border-[#DE3B28] pb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DE3B28]">
                          TABLE OF CONTENTS • ГАРЧИГ
                        </p>
                        <h2 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">
                          Ангилал & Хуудасны Хуваарь
                        </h2>
                      </div>
                      <div className="relative size-10 overflow-hidden rounded-[8px] bg-white p-0.5 border border-slate-200">
                        <Image src="/nema-foods-logo.svg" alt="Нема Фүүдс" fill className="object-contain" />
                      </div>
                    </div>

                    <div className="mt-6 divide-y divide-slate-100">
                      {page.data.entries.map((entry, idx) => (
                        <div
                          key={entry.name}
                          className="flex items-center justify-between py-3.5 hover:bg-amber-50/50 px-2 rounded-[8px]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex size-7 items-center justify-center rounded-[8px] bg-amber-50 text-xs font-mono font-bold text-amber-900 border border-amber-200/60">
                              {(idx + 1).toString().padStart(2, '0')}
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">{entry.name}</h3>
                              <p className="text-[11px] text-slate-400">
                                {entry.count} бүтээгдэхүүн бүртгэлтэй
                              </p>
                            </div>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-sm font-bold text-[#DE3B28]">
                              Хуудас {entry.startPage.toString().padStart(2, '0')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 rounded-[8px] bg-[#FFF8E7] p-4 border border-[#FDE68A]">
                      <h4 className="text-xs font-bold text-[#DE3B28] flex items-center gap-1.5">
                        <Check className="size-4 text-[#DE3B28]" />
                        Бүтээгдэхүүний чанарын баталгаа:
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-700 leading-relaxed">
                        Бүх үнэ Монгол төгрөгөөр, НӨАТ багтсан болно. Барааны бөөний үнэтэй бүтээгдэхүүнүүд нь заагдсан доод тоо ширхгээс эхлэн бөөний үнээр шууд бодогдоно.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] text-slate-400">
                    <span>НЕМА ФҮҮДС • Хүнсний бөөний каталог</span>
                    <span className="font-mono font-bold text-slate-700">
                      Хуудас {page.pageNum.toString().padStart(2, '0')} / {totalPages.toString().padStart(2, '0')}
                    </span>
                    <span>sales@nemafoods.mn</span>
                  </div>
                </div>
              )}

              {page.data.type === 'products' && (
                <div className="flex flex-col justify-between min-h-[720px] sm:min-h-[820px]">
                  <div>
                    <div className="relative overflow-hidden rounded-[8px] bg-[#DE3B28] px-6 sm:px-8 py-5 sm:py-6 text-white shadow-xs">
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFCE00]">
                            NEMA FOODS • БҮТЭЭГДЭХҮҮНИЙ КАТАЛОГ
                          </p>
                          <h2 className="mt-1.5 text-2xl sm:text-3xl font-black leading-tight tracking-tight text-white">
                            A selection worth sharing.
                          </h2>
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-100">
                              {page.data.category}
                            </span>
                            {page.data.totalParts > 1 && (
                              <span className="rounded-[8px] bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white">
                                Хэсэг {page.data.partIndex}/{page.data.totalParts}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-[8px] bg-white p-1 shadow-xs hidden sm:block">
                          <Image src="/nema-foods-logo.svg" alt="Нема Фүүдс" fill className="object-contain" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      {page.data.items.map((prod) => {
                        const status = getProductStatus(prod)
                        const badgeInfo = getStatusBadgeInfo(status)
                        const hasBulk = Boolean(prod.hasBulkPrice && prod.bulkPrice && prod.bulkPrice < prod.price)

                        return (
                          <article
                            key={prod.id}
                            className="overflow-hidden rounded-[8px] border border-slate-200 bg-white print-page-break flex flex-col justify-between"
                          >
                            <div className="flex h-36 sm:h-40 items-center justify-center bg-[#fbf9f4] p-3 relative">
                              {prod.image ? (
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="h-full w-full object-contain rounded-[8px]"
                                />
                              ) : (
                                <div
                                  className={`flex h-20 w-14 -rotate-3 items-center justify-center rounded-[8px] bg-gradient-to-b ${
                                    prod.color || 'from-amber-400 to-amber-600'
                                  } shadow-md`}
                                >
                                  <span className="text-center text-[9px] font-black leading-tight text-white drop-shadow-xs">
                                    {prod.name.split(' ')[0]}
                                    <br />
                                    <span className="text-[7px] text-white/80 font-mono">
                                      {prod.sku}
                                    </span>
                                  </span>
                                </div>
                              )}

                              <span
                                className={`absolute top-2 right-2 rounded-[8px] px-2 py-0.5 text-[9px] font-bold border shadow-xs ${badgeInfo.bg} ${badgeInfo.text} ${badgeInfo.border}`}
                              >
                                {badgeInfo.shortLabel}
                              </span>
                            </div>

                            <div className="p-3.5 sm:p-4">
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span className="font-mono">SKU {prod.sku}</span>
                                <span>
                                  {status === 'in_stock'
                                    ? showStockCount
                                      ? `Нөөц: ${prod.stockCount} ${prod.unit}`
                                      : 'Бэлэн'
                                    : badgeInfo.label}
                                </span>
                              </div>

                              <h3 className="mt-2 min-h-9 text-xs sm:text-sm font-bold leading-snug text-slate-900 line-clamp-2">
                                {prod.name}
                              </h3>

                              {hasBulk ? (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-[10px] text-slate-500">
                                      1–{(prod.bulkFrom || 5) - 1} {prod.unit}
                                    </p>
                                    <p className="text-base sm:text-lg font-black text-slate-900">
                                      {formatMNT(prod.price)}
                                    </p>
                                  </div>

                                  <div className="rounded-[8px] bg-emerald-50 px-2.5 py-1.5 border border-emerald-200">
                                    <p className="text-[10px] font-bold text-emerald-800">
                                      {prod.bulkFrom}+ {prod.unit}
                                    </p>
                                    <p className="text-base sm:text-lg font-black text-emerald-700">
                                      {formatMNT(prod.bulkPrice || prod.price)}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 flex items-center justify-between rounded-[8px] bg-slate-50 px-2.5 py-1.5 border border-slate-200/60">
                                  <p className="text-[10px] text-slate-500">Үндсэн үнэ</p>
                                  <p className="text-base sm:text-lg font-black text-slate-900">
                                    {formatMNT(prod.price)}{' '}
                                    <span className="text-[10px] font-normal text-slate-500">
                                      / {prod.unit}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] text-slate-400">
                    <span>НЕМА ФҮҮДС • Хүнсний бөөний каталог</span>
                    <span className="font-mono font-bold text-slate-700">
                      Хуудас {page.pageNum.toString().padStart(2, '0')} / {totalPages.toString().padStart(2, '0')}
                    </span>
                    <span>sales@nemafoods.mn | 7711-2233</span>
                  </div>
                </div>
              )}

              {page.data.type === 'back_cover' && (
                <div className="min-h-[720px] sm:min-h-[820px] flex flex-col justify-between">
                  <div>
                    <div className="relative overflow-hidden rounded-[8px] bg-[#DE3B28] px-6 sm:px-8 py-6 text-white shadow-xs">
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFCE00]">
                            COMPANY INFORMATION & SHOWROOM
                          </p>
                          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                            НЕМА ФҮҮДС ХХК • Байгууллагын Мэдээлэл
                          </h2>
                          <p className="mt-1 text-xs text-amber-100">
                            Дэлгүүр, сүлжээ ресторан, байгууллагуудад зориулсан найдвартай хүнсний ханган нийлүүлэгч
                          </p>
                        </div>
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-[8px] bg-white p-1 shadow-md hidden sm:block">
                          <Image src="/nema-foods-logo.svg" alt="Нема Фүүдс" fill className="object-contain" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-[8px] border border-slate-200 bg-slate-50/80 p-4">
                        <ShieldCheck className="size-6 text-[#DE3B28]" />
                        <h3 className="mt-2 text-xs font-bold text-slate-900">Баталгаат Чанар</h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Үйлдвэрийн албан ёсны стандартын дагуу 100% шалгагдсан хүнсний бүтээгдэхүүнүүд.
                        </p>
                      </div>

                      <div className="rounded-[8px] border border-slate-200 bg-slate-50/80 p-4">
                        <Building2 className="size-6 text-[#DE3B28]" />
                        <h3 className="mt-2 text-xs font-bold text-slate-900">Байнгын Нөөц</h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Төв агуулахад бэлэн хадгалагдаж буй бүтээгдэхүүнүүдийг шуурхай нийлүүлнэ.
                        </p>
                      </div>

                      <div className="rounded-[8px] border border-slate-200 bg-slate-50/80 p-4">
                        <FileText className="size-6 text-[#DE3B28]" />
                        <h3 className="mt-2 text-xs font-bold text-slate-900">Албан Ёсны НӨАТ</h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                          И-Баримт болон албан ёсны нэхэмжлэх, гэрээг түргэн шуурхай гаргаж өгнө.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-[8px] border border-[#FDE68A] bg-[#FFF8E7] p-4">
                      <h4 className="text-xs font-bold text-[#DE3B28] flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-[#DE3B28]" />
                        Албан ёсны банкны дансны мэдээлэл:
                      </h4>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-[8px] bg-white p-3 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-semibold">ХААН БАНК</span>
                          <div className="font-mono font-bold text-slate-900 mt-0.5 text-sm">5000 1234 5678</div>
                          <div className="text-[10px] text-slate-500">Хүлээн авагч: Нема Фүүдс ХХК</div>
                        </div>
                        <div className="rounded-[8px] bg-white p-3 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-semibold">ГОЛОМТ БАНК</span>
                          <div className="font-mono font-bold text-slate-900 mt-0.5 text-sm">1100 9876 5432</div>
                          <div className="text-[10px] text-slate-500">Хүлээн авагч: Нема Фүүдс ХХК</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="size-4 text-[#DE3B28] shrink-0 mt-0.5" />
                        <div>
                          <b className="text-slate-900">Төв оффис & Шоурүүм:</b>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Монгол Улс, Улаанбаатар хот, Нема Фүүдс төв байр
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Phone className="size-4 text-[#DE3B28] shrink-0 mt-0.5" />
                        <div>
                          <b className="text-slate-900">Лавлах утас:</b>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            7711-2233, 9911-0000 | Ажлын өдрүүдэд: 09:00 - 18:00
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] text-slate-400">
                    <span>© 2026 Нема Фүүдс ХХК. Бүх эрх хуулиар хамгаалагдсан.</span>
                    <span className="font-mono font-bold text-slate-700">
                      Хуудас {page.pageNum.toString().padStart(2, '0')} / {totalPages.toString().padStart(2, '0')}
                    </span>
                    <span>www.nemafoods.mn</span>
                  </div>
                </div>
              )}
            </div>

            {/* PDF ХУУДАС БҮРИЙН ДООД НАВИГАЦИ (no-print) */}
            <PdfPageNavBar
              position="bottom"
              pageIndex={actualIdx}
              totalPages={totalPages}
              pageInfo={pageInfo}
              viewMode={viewMode}
              allPages={bookPages}
              onPrev={() => goToPage(actualIdx - 1)}
              onNext={() => goToPage(actualIdx + 1)}
              onFirst={() => goToPage(0)}
              onLast={() => goToPage(totalPages - 1)}
              onJumpToPage={(idx) => goToPage(idx)}
              onScrollToTop={() => scrollToPageTop(actualIdx)}
            />
          </div>
        )
      })}
    </div>
    </main>
  )
}

// --- БАРАА НЭМЭХ / ЗАСАХ МОДАЛ ---
function ProductEditModal({
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
    hasBulkPrice: product.hasBulkPrice !== undefined ? product.hasBulkPrice : Boolean(product.bulkPrice && product.bulkPrice < product.price),
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

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer min-h-[40px] inline-flex items-center gap-1.5 rounded-[8px] bg-[#DE3B28] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#b82a1a] shadow-xs transition-colors"
                  >
                    <Upload className="size-3.5" />
                    <span>{formData.image ? 'Зураг солих' : 'Зураг оруулах'}</span>
                  </button>

                  {formData.image && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: undefined })}
                      className="cursor-pointer min-h-[40px] inline-flex items-center gap-1 rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Устгах</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  JPG, PNG, WebP дурын зураг оруулж болно. Хадгалахдаа автоматаар <b>.webp</b> хэмжээ багатай өргөтгөл рүү хөрвүүлэн хадгална.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[8px] bg-slate-50 p-3 border border-slate-200">
            <label className="text-xs font-bold text-slate-700 mb-2 block">
              Бүтээгдэхүүний статус сонгох (3 төлөв):
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    status: 'in_stock',
                    stockCount: formData.stockCount > 0 ? formData.stockCount : 20,
                  })
                }
                className={`cursor-pointer min-h-[44px] flex flex-col items-center justify-center p-2 rounded-[8px] text-xs font-bold border transition-all ${
                  formData.status === 'in_stock'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  <span>Бэлэн</span>
                </div>
                <span className="text-[9px] font-normal opacity-90 mt-0.5">Нөөцтэй байгаа</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'temporarily_out' })}
                className={`cursor-pointer min-h-[44px] flex flex-col items-center justify-center p-2 rounded-[8px] text-xs font-bold border transition-all ${
                  formData.status === 'temporarily_out'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  <span>Түр дууссан</span>
                </div>
                <span className="text-[9px] font-normal opacity-90 mt-0.5">Хүлээгдэж буй</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'out_of_stock', stockCount: 0 })}
                className={`cursor-pointer min-h-[44px] flex flex-col items-center justify-center p-2 rounded-[8px] text-xs font-bold border transition-all ${
                  formData.status === 'out_of_stock'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1">
                  <AlertCircle className="size-3.5" />
                  <span>Дууссан</span>
                </div>
                <span className="text-[9px] font-normal opacity-90 mt-0.5">Нөөцгүй болсон</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Барааны нэр *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Жишээ: Атар талх зүссэн"
              className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">SKU код *</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Жишээ: MN-1099"
                className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm font-mono focus:border-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Ангилал *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="cursor-pointer mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm focus:border-amber-500 focus:outline-hidden"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Бөөний үнийн тохиргоо</span>
                <p className="text-[11px] text-slate-500">
                  {formData.hasBulkPrice
                    ? 'Бөөний шаталсан хямдралтай үнэ тооцно.'
                    : 'Бөөний үнэгүй (Зөвхөн 1 жижиглэн үнэ ашиглана).'}
                </p>
              </div>

              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(formData.hasBulkPrice)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hasBulkPrice: e.target.checked,
                      bulkPrice: e.target.checked
                        ? formData.bulkPrice || Math.round(formData.price * 0.85)
                        : undefined,
                    })
                  }
                  className="cursor-pointer size-4 accent-[#DE3B28] rounded-[4px]"
                />
                <span className="text-xs font-bold text-[#DE3B28]">
                  {formData.hasBulkPrice ? 'Бөөний үнэтэй' : 'Бөөний үнэгүй'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60">
              <div>
                <label className="text-xs font-semibold text-slate-700">Жижиглэн үнэ (₮) *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                  placeholder="4500"
                  className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {formData.hasBulkPrice ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Бөөний үнэ (₮) *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.bulkPrice || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, bulkPrice: Number(e.target.value) || 0 })
                      }
                      placeholder="3900"
                      className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm font-bold text-emerald-700 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Бөөний доод тоо *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.bulkFrom || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, bulkFrom: Number(e.target.value) || 1 })
                      }
                      placeholder="6"
                      className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 flex items-center p-3 rounded-[8px] bg-slate-100/80 text-xs text-slate-500">
                  <Info className="size-4 mr-2 text-slate-400 shrink-0" />
                  <span>Энэ бараанд зөвхөн 1 жижиглэн үнэ мөрдөгдөх ба бөөний үнийн хайрцаг нуугдана.</span>
                </div>
              )}
            </div>

            {savingsPercent > 0 && formData.hasBulkPrice && (
              <div className="rounded-[8px] bg-emerald-50 px-3 py-2 text-xs text-emerald-800 border border-emerald-200 flex items-center justify-between">
                <span>Бөөний хөнгөлөлт: <b>{savingsPercent}%</b></span>
                <span>1 {formData.unit} тутмаас <b>{formatMNT(formData.price - (formData.bulkPrice || 0))}</b> хэмнэнэ</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Хэмжих нэгж</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="cursor-pointer mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-sm focus:border-amber-500 focus:outline-hidden"
              >
                <option value="ш">ш (ширхэг)</option>
                <option value="хайрцаг">хайрцаг</option>
                <option value="багц">багц</option>
                <option value="уут">уут</option>
                <option value="сав">сав</option>
                <option value="шуудай">шуудай</option>
                <option value="ороомог">ороомог</option>
                <option value="кг">кг</option>
                <option value="литр">литр</option>
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

// --- SUPABASE ХОЛБОЛТ & ТОХИРГООНЫ МОДАЛ ---
function SupabaseConfigModal({
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
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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
      // Save to localStorage for instant runtime persistence
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
-- 1. Products хүснэгт үүсгэх
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
CREATE TABLE IF NOT EXISTS public.catalog_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public all cats" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public all settings" ON public.catalog_settings FOR ALL USING (true) WITH CHECK (true);`
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
              className="inline-flex items-center gap-1 text-teal-700 hover:underline"
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
              className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-xs font-mono focus:border-teal-500 focus:outline-hidden"
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
              className="mt-1 h-11 w-full rounded-[8px] border border-slate-300 px-3 text-xs font-mono focus:border-teal-500 focus:outline-hidden"
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

        {/* Database Quick Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          <div className="text-xs font-bold text-slate-800">Өгөгдлийн сангийн нэмэлт үйлдлүүд:</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSeed}
              disabled={isSeeding || !isSupabaseConnected}
              className="cursor-pointer min-h-[36px] inline-flex items-center gap-1.5 rounded-[8px] bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`size-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? 'Хуулж байна...' : 'Анхны 20 барааг Supabase-д хуулах'}</span>
            </button>

            <button
              onClick={handleCopySql}
              className="cursor-pointer min-h-[36px] inline-flex items-center gap-1.5 rounded-[8px] border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
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

// --- АДМИН УДИРДЛАГЫН ХЭСЭГ (SUPABASE CLOUD SYNC & 1-CLICK 3-STATUS & CARD GRID) ---
function AdminView({
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
    setTimeout(() => setSyncNotice(''), 3000)
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
        // Update local with server id if newly created
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
      showSyncNotification(`Төлөвийг "${nextStatus}" болгон Supabase-д шинэчиллээ...`)
      await updateProductStatusInSupabase(id, nextStatus, count)
    }
  }

  const handleDeleteProduct = async (id: number, name: string) => {
    if (confirm(`"${name}" барааг каталогоос устгахдаа итгэлтэй байна уу?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
      if (isSupabaseConnected) {
        showSyncNotification('Supabase-ээс устгаж байна...')
        await deleteProductFromSupabase(id)
        showSyncNotification('✓ Барааг амжилттай устгалаа.')
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
              onClick={onCatalog}
              className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] border border-amber-400/60 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              <ChevronLeft className="size-4" />
              <span>Каталог харах</span>
            </button>
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
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-emerald-300'
            }`}
          >
            <div className="text-[11px] sm:text-xs font-semibold text-emerald-700">Бэлэн байгаа</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-700">
              {products.filter((p) => getProductStatus(p) === 'in_stock').length}
            </div>
            <div className="mt-0.5 text-[10px] sm:text-[11px] text-emerald-600">Шууд олгох нөөцтэй</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'temporarily_out' ? 'all' : 'temporarily_out')}
            className={`cursor-pointer rounded-[8px] border p-3.5 sm:p-4 shadow-xs transition-all ${
              statusFilter === 'temporarily_out'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
                : 'border-slate-200 bg-white hover:border-amber-300'
            }`}
          >
            <div className="text-[11px] sm:text-xs font-semibold text-amber-700">Түр дууссан</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-amber-700">
              {products.filter((p) => getProductStatus(p) === 'temporarily_out').length}
            </div>
            <div className="mt-0.5 text-[10px] sm:text-[11px] text-amber-600">Удахгүй ирэх</div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
            className={`cursor-pointer rounded-[8px] border p-3.5 sm:p-4 shadow-xs transition-all ${
              statusFilter === 'out_of_stock'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20'
                : 'border-slate-200 bg-white hover:border-rose-300'
            }`}
          >
            <div className="text-[11px] sm:text-xs font-semibold text-rose-600">Дууссан бараа</div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-rose-600">
              {products.filter((p) => getProductStatus(p) === 'out_of_stock').length}
            </div>
            <div className="mt-0.5 text-[10px] sm:text-[11px] text-rose-500">Одоогоор нөөцгүй</div>
          </div>
        </div>
      </section>

      {/* Main Admin Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-5">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[280px_1fr]">
          {/* Left: Category Management */}
          <aside className="space-y-4">
            <div className="rounded-[8px] border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Layers className="size-4 text-[#DE3B28]" />
                Ангилал удирдах
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Шинэ ангилал нэмэх эсвэл хасах
              </p>

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Ангиллын нэр..."
                  className="h-10 w-full rounded-[8px] border border-slate-300 px-3 text-xs focus:border-amber-500 focus:outline-hidden"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory()
                  }}
                />
                <button
                  onClick={handleAddCategory}
                  className="cursor-pointer min-h-[40px] rounded-[8px] bg-[#DE3B28] px-3 text-white hover:bg-[#b82a1a] transition-colors shrink-0"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <div className="mt-3 space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const count =
                    cat === 'Бүх ангилал'
                      ? products.length
                      : products.filter((p) => p.category === cat).length
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between rounded-[8px] bg-slate-50 px-3 py-2 text-xs transition-colors hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-500 shrink-0">{getCategoryIcon(cat)}</span>
                        <span className="font-semibold text-slate-800 truncate">{cat}</span>
                        <span className="rounded-[8px] bg-white px-1.5 py-0.2 text-[10px] font-bold text-slate-400 border border-slate-200 shrink-0">
                          {count}
                        </span>
                      </div>

                      {cat !== 'Бүх ангилал' && (
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          title={`${cat} ангиллыг устгах`}
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
                      className="group relative flex flex-col justify-between overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xs hover:border-teal-400 hover:shadow-md transition-all"
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
                                p.color || 'from-teal-400 to-emerald-600'
                              } p-2 text-white shadow-sm`}
                            >
                              <span className="text-[8px] font-black">PRO</span>
                              <span className="text-[10px] font-extrabold line-clamp-1">
                                {p.name.split(' ')[0]}
                              </span>
                              <span className="text-[7px] font-mono">{p.sku}</span>
                            </div>
                          )}

                          <span className="absolute left-2.5 top-2.5 rounded-[8px] bg-white/95 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-slate-200 shadow-2xs">
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
                                      p.color || 'from-teal-400 to-emerald-600'
                                    } flex items-center justify-center text-[8px] font-bold text-white`}
                                  >
                                    PRO
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-xs">
                              <div className="line-clamp-1">{p.name}</div>
                              {p.badge && (
                                <span className="inline-block mt-0.5 text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded-[4px]">
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

      {/* Edit/Add Modal */}
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

// --- ХЭРЭГЛЭГЧИЙН КАТАЛОГ ҮЗЭХ ГОРИМ (8px corners, No order buttons) ---
function CatalogView({
  products,
  categories,
  settings,
  onAdmin,
  onPdf,
  onFlipBook,
}: {
  products: Product[]
  categories: string[]
  settings: CatalogSettings
  onAdmin?: () => void
  onPdf: () => void
  onFlipBook: () => void
}) {
  const [activeCategory, setActiveCategory] = useState('Бүх ангилал')
  const [search, setSearch] = useState('')
  const [sortOption, setSortOption] = useState<'default' | 'priceAsc' | 'priceDesc' | 'name'>('default')
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  const scrollCategory = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const filteredProducts = useMemo(() => {
    let result = [...products]

    if (activeCategory !== 'Бүх ангилал') {
      result = result.filter((p) => p.category === activeCategory)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      )
    }

    if (onlyInStock) {
      result = result.filter((p) => getProductStatus(p) === 'in_stock')
    }

    if (sortOption === 'priceAsc') {
      result.sort((a, b) => a.price - b.price)
    } else if (sortOption === 'priceDesc') {
      result.sort((a, b) => b.price - a.price)
    } else if (sortOption === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'mn'))
    }

    return result
  }, [products, activeCategory, search, sortOption, onlyInStock])

  return (
    <main className="min-h-screen bg-[#FBF9F4] text-slate-800">
      <header className="sticky top-0 z-30 border-b border-amber-200/60 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative size-10 sm:size-12 overflow-hidden rounded-[8px] border border-amber-300/70 bg-white p-1 shadow-xs shrink-0">
              <Image
                src="/nema-foods-logo.svg"
                alt="Нема Фүүдс Лого"
                fill
                priority
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-xl font-black tracking-tight text-slate-900 leading-none">
                  НЕМА <span className="text-[#DE3B28]">ФҮҮДС</span>
                </span>
                <span className="hidden md:inline-block rounded-[8px] bg-amber-500/10 border border-amber-400/40 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-amber-900">
                  ЦАХИМ КАТАЛОГ
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 hidden xs:block">
                Хүнсний бүтээгдэхүүний албан ёсны бөөний цахим каталог
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onFlipBook}
              title="Флипбүүк ном горим"
              className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] border border-amber-400/60 bg-amber-50 px-2.5 sm:px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 hover:border-amber-500 transition-all shadow-2xs"
            >
              <BookOpen className="size-4 text-[#DE3B28] shrink-0" />
              <span className="hidden sm:inline">Флипбүүк</span>
              <span className="sm:hidden">Ном</span>
              <span className="hidden md:inline rounded-[8px] bg-[#DE3B28] px-1.5 py-0.2 text-[8px] font-extrabold text-white">
                ШИНЭ
              </span>
            </button>

            <button
              onClick={onPdf}
              title="PDF хэвлэх горим"
              className="cursor-pointer min-h-[44px] inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50/50 hover:border-amber-300 hover:text-[#DE3B28] transition-all shadow-2xs"
            >
              <FileText className="size-4 text-[#DE3B28] shrink-0" />
              <span className="hidden sm:inline">Хэвлэх /</span> <span>PDF</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white relative">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-2 sm:px-6 py-2">
            <button
              onClick={() => scrollCategory('left')}
              aria-label="Өмнөх ангиллууд"
              className="cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[8px] bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-900 transition-colors shrink-0 mr-1"
            >
              <ChevronLeft className="size-4" />
            </button>

            <div
              ref={categoryScrollRef}
              className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar scroll-smooth flex-1 px-1"
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat
                const count =
                  cat === 'Бүх ангилал'
                    ? products.length
                    : products.filter((p) => p.category === cat).length
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`cursor-pointer group min-h-[38px] flex shrink-0 items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#DE3B28] text-white shadow-sm shadow-red-700/25'
                        : 'bg-slate-100/90 text-slate-700 hover:bg-amber-50 hover:text-amber-950 border border-transparent hover:border-amber-200'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#DE3B28]'}>
                      {getCategoryIcon(cat)}
                    </span>
                    <span>{cat}</span>
                    <span
                      className={`rounded-[8px] px-1.5 py-0.2 text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-slate-500 shadow-2xs group-hover:text-amber-900'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => scrollCategory('right')}
              aria-label="Дараах ангиллууд"
              className="cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[8px] bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-900 transition-colors shrink-0 ml-1"
            >
              <ChevronRight className="size-4" />
            </button>

            <div className="relative shrink-0 ml-2">
              <button
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="cursor-pointer min-h-[38px] flex items-center gap-1.5 rounded-[8px] border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:border-amber-300 shadow-2xs"
              >
                <span>Бүх төрөл</span>
                <ChevronDown className={`size-3.5 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-[8px] border border-amber-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5 flex items-center justify-between">
                    <span>Бүх ангилал</span>
                    <span className="text-amber-700 font-bold">{categories.length}</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {categories.map((cat) => {
                      const count =
                        cat === 'Бүх ангилал'
                          ? products.length
                          : products.filter((p) => p.category === cat).length
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setActiveCategory(cat)
                            setCategoryDropdownOpen(false)
                          }}
                          className={`cursor-pointer flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors ${
                            activeCategory === cat
                              ? 'bg-amber-50 text-[#DE3B28] font-bold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{getCategoryIcon(cat)}</span>
                            <span>{cat}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>


      {/* Search and Filters Bar */}
      <section className="mx-auto max-w-7xl px-3.5 sm:px-6 pt-4 sm:pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 rounded-[8px] border border-amber-200/70 bg-white p-3.5 sm:p-4 shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Барааны нэр, SKU код, түлхүүр үгээр хайх..."
              className="h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50/60 py-2 pl-10 pr-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#DE3B28] focus:bg-white focus:outline-hidden transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="cursor-pointer min-h-[36px] min-w-[36px] absolute right-2 top-1.5 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer min-h-[44px] flex items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:border-amber-300 transition-colors">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="cursor-pointer size-4 accent-[#DE3B28] rounded-[4px]"
              />
              <span>Зөвхөн бэлэн байгаа</span>
            </label>

            <div className="relative flex items-center flex-1 sm:flex-initial">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="cursor-pointer min-h-[44px] w-full sm:w-auto appearance-none rounded-[8px] border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-hidden"
              >
                <option value="default">Санал болгох (Эхэндээ)</option>
                <option value="priceAsc">Үнэ: Багаас их рүү (₮)</option>
                <option value="priceDesc">Үнэ: Ихээс бага руу (₮)</option>
                <option value="name">Нэрээр (А - Я)</option>
              </select>
              <ArrowUpDown className="pointer-events-none absolute right-2.5 size-3.5 text-slate-400" />
            </div>

            <div className="hidden sm:flex items-center rounded-[8px] border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`cursor-pointer rounded-[8px] p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#DE3B28] shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Хүснэгтээр харах"
              >
                <Grid2X2 className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`cursor-pointer rounded-[8px] p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-[#DE3B28] shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Жагсаалтаар харах"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid / List */}
      <section className="mx-auto max-w-7xl px-3.5 sm:px-6 py-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {activeCategory}
            </h2>
            <p className="text-xs text-slate-400">
              Нийт {filteredProducts.length} бүтээгдэхүүн харуулж байна
            </p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[8px] border border-dashed border-slate-300 bg-white py-16 px-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-[8px] bg-amber-50 text-amber-600">
              <Search className="size-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-800">
              Таны хайсан илэрц олдсонгүй
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Хайлтын үгээ өөрчлөх эсвэл шүүлтүүрийг арилган дахин шалгана уу.
            </p>
            <button
              onClick={() => {
                setSearch('')
                setActiveCategory('Бүх ангилал')
                setOnlyInStock(false)
              }}
              className="cursor-pointer min-h-[44px] mt-4 rounded-[8px] bg-[#DE3B28] px-4 py-2 text-xs font-semibold text-white hover:bg-[#C62828] transition-colors"
            >
              Шүүлтүүрийг цэвэрлэх
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                showStockCount={settings.showStockCount}
                onOpenDetail={(p) => setSelectedProduct(p)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                showStockCount={settings.showStockCount}
                onOpenDetail={(p) => setSelectedProduct(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Contact Section */}
      <section className="mx-auto max-w-7xl px-3.5 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[8px] border border-amber-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-[8px] bg-amber-100 text-[#DE3B28]">
              <Phone className="size-5 sm:size-6" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Нема Фүүдс каталог ба захиалгын лавлах утас:
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Бөөний нийлүүлэлт, гэрээ хамтын ажиллагаа болон шоурүүмийн лавлагаа авах боломжтой.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <a
              href="tel:+97677112233"
              className="cursor-pointer min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-[#DE3B28] transition-colors"
            >
              <Phone className="size-3.5" />
              <span>7711-2233</span>
            </a>
            <a
              href="mailto:sales@nemafoods.mn"
              className="cursor-pointer min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-[#DE3B28] hover:border-amber-300 transition-colors"
            >
              <Mail className="size-3.5" />
              <span>И-мэйл илгээх</span>
            </a>
          </div>
        </div>
      </section>

      {/* Branded Footer */}
      <footer className="border-t border-amber-200/70 bg-white py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="relative size-10 overflow-hidden rounded-[8px] border border-amber-300/80 bg-white p-1 shrink-0 shadow-2xs">
              <Image
                src="/nema-foods-logo.svg"
                alt="Нема Фүүдс"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 tracking-tight">
                НЕМА <span className="text-[#DE3B28]">ФҮҮДС</span> ХХК
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Албан ёсны импорт ба хүнсний бөөний дистрибьютер
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600">
            <button onClick={onFlipBook} className="hover:text-[#DE3B28] cursor-pointer transition-colors">
              Флипбүүк ном
            </button>
            <span className="text-slate-300">•</span>
            <button onClick={onPdf} className="hover:text-[#DE3B28] cursor-pointer transition-colors">
              PDF каталог
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} Нема Фүүдс ХХК. Бүх эрх хуулиар хамгаалагдсан.
          </div>
        </div>
      </footer>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          showStockCount={settings.showStockCount}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </main>
  )
}

// --- ҮНДСЭН ХУУДАС (ROOT COMPONENT WITH SUPABASE INTEGRATION) ---
export default function Page() {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [categories, setCategories] = useState<string[]>(initialCategories)
  const [currentMode, setCurrentMode] = useState<'catalog' | 'pdf' | 'admin' | 'flipbook'>('catalog')
  const [settings, setSettings] = useState<CatalogSettings>({ showStockCount: true })
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false)
  const [isLoadingFromSupabase, setIsLoadingFromSupabase] = useState<boolean>(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // 1. Initial Load: Check Supabase, fallback to localStorage
  const loadInitialData = async () => {
    setIsLoadingFromSupabase(true)

    // Check if Supabase credentials exist
    const creds = getSupabaseCredentials()
    if (creds) {
      try {
        const testRes = await testSupabaseConnection(creds.url, creds.anonKey)
        if (testRes.success) {
          setIsSupabaseConnected(true)

          // Fetch from Supabase
          const remoteProducts = await fetchProductsFromSupabase()
          const remoteCats = await fetchCategoriesFromSupabase()
          const remoteSettings = await fetchSettingsFromSupabase()

          if (remoteProducts !== null) {
            if (remoteProducts.length > 0) {
              setProducts(remoteProducts)
            } else {
              // Connected but table is empty -> seed initial data automatically
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

          setIsLoadingFromSupabase(false)
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

    setIsLoadingFromSupabase(false)
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

  // Reset to initial mock data
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

  if (currentMode === 'flipbook') {
    return (
      <FlipBookView
        products={products}
        categories={categories}
        showStockCount={settings.showStockCount}
        onBackToCatalog={() => setCurrentMode('catalog')}
      />
    )
  }

  if (currentMode === 'pdf') {
    return (
      <PdfCatalogView
        products={products}
        categories={categories}
        activeCategory="Бүх ангилал"
        showStockCount={settings.showStockCount}
        onBack={() => setCurrentMode('catalog')}
      />
    )
  }

  if (currentMode === 'admin') {
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
        onCatalog={() => setCurrentMode('catalog')}
        onResetData={handleResetData}
      />
    )
  }

  return (
    <CatalogView
      products={products}
      categories={categories}
      settings={settings}
      onAdmin={() => setCurrentMode('admin')}
      onPdf={() => setCurrentMode('pdf')}
      onFlipBook={() => setCurrentMode('flipbook')}
    />
  )
}
