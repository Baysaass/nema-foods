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
  phone?: string // Холбогдох утас (жишээ: "7711-2233, 9911-0000")
  secondaryPhone?: string // Нэмэлт утас
  email?: string // Холбогдох Gmail / И-мэйл (жишээ: "sales@nemafoods.mn")
  address?: string // Хаяг байршил
  workingHours?: string // Ажлын цагийн хуваарь
  bankAccounts?: string // Банк дансны мэдээлэл
}

export const defaultCatalogSettings: CatalogSettings = {
  showStockCount: false,
  phone: '7711-2233, 9911-0000',
  secondaryPhone: '9911-0000',
  email: 'sales@nemafoods.mn',
  address: 'Улаанбаатар хот, Сүхбаатар дүүрэг, 1-р хороо',
  workingHours: 'Даваа - Баасан: 09:00 - 18:00',
  bankAccounts: 'Хаан Банк: 5000 1234 5678, Голомт Банк: 1100 9876 5432',
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

// --- Валют форматлагч (Монгол төгрөг) ---
export function formatMNT(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 ₮'
  return new Intl.NumberFormat('mn-MN').format(Math.round(amount)) + ' ₮'
}

// --- Анхны бодит Монгол барааны өгөгдөл ---
export const initialCategories: string[] = [
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

export const initialProducts: Product[] = [
  {
    id: 1,
    name: 'Алтан Тариа Дээд Гурил 25кг (Ууттай)',
    sku: 'MN-1001',
    price: 68000,
    hasBulkPrice: true,
    bulkPrice: 62000,
    bulkFrom: 10,
    category: 'Хүнс, ундаа',
    unit: 'уут',
    status: 'in_stock', // Бэлэн байгаа
    inStock: true,
    stockCount: 180,
    badge: 'Бөөний үнэ',
    description: 'Монгол Улсын стандартын шаардлага хангасан шилмэл улаан буудайн 1-р зэргийн дээд гурил.',
    color: 'from-amber-400 to-yellow-600',
  },
  {
    id: 2,
    name: 'Сүү ХК Миний Монголын Сүү 1л (Хайрцагтай, 12ш)',
    sku: 'MN-1002',
    price: 54000,
    hasBulkPrice: true,
    bulkPrice: 49500,
    bulkFrom: 5,
    category: 'Хүнс, ундаа',
    unit: 'хайрцаг',
    status: 'in_stock',
    inStock: true,
    stockCount: 65,
    badge: 'Эрэлт ихтэй',
    description: '3.2%-ийн тослогтой, тетрапак савлагаатай, хадгалах хугацаа урт ариутгасан үнээний сүү.',
    color: 'from-blue-400 to-sky-600',
  },
  {
    id: 3,
    name: 'Талх Чихэр Атар Талх (Багц, 10ш)',
    sku: 'MN-1003',
    price: 26000,
    hasBulkPrice: true,
    bulkPrice: 24000,
    bulkFrom: 5,
    category: 'Хүнс, ундаа',
    unit: 'багц',
    status: 'temporarily_out', // Түр дууссан
    inStock: false,
    stockCount: 0,
    badge: 'Шилдэг бүтээгдэхүүн',
    description: 'Уламжлалт жороор исгэсэн Монгол түмний дуртай хөх тарианы хольцтой хэвийн талх.',
    color: 'from-amber-500 to-orange-700',
  },
  {
    id: 4,
    name: 'Ургац Цэвэр Ургамлын Тос 5л',
    sku: 'MN-1004',
    price: 38000,
    hasBulkPrice: true,
    bulkPrice: 34500,
    bulkFrom: 6,
    category: 'Хүнс, ундаа',
    unit: 'сав',
    status: 'in_stock',
    inStock: true,
    stockCount: 42,
    badge: 'Бөөний үнэ',
    description: 'Наранцэцгийн 100% цэвэршүүлсэн, үнэргүй, холестеролгүй дээд зэргийн ургамлын тос.',
    color: 'from-yellow-400 to-amber-600',
  },
  {
    id: 5,
    name: 'АПУ Сэнгүр Шар Айл 0.5л (Хайрцагтай, 24ш)',
    sku: 'MN-1005',
    price: 72000,
    hasBulkPrice: false, // Бөөний үнэгүй бараа
    category: 'Хүнс, ундаа',
    unit: 'хайрцаг',
    status: 'in_stock',
    inStock: true,
    stockCount: 110,
    description: 'Монголын тэргүүлэгч брэндийн зөөлөн амттай, арвайн соёолжоор исгэсэн лаазтай шар айраг.',
    color: 'from-amber-300 to-yellow-500',
  },
  {
    id: 6,
    name: 'Эрдэнэт Хивс Ноосон Хивс 2x3м (Сонгодог улаан)',
    sku: 'ER-2001',
    price: 490000,
    hasBulkPrice: true,
    bulkPrice: 440000,
    bulkFrom: 3,
    category: 'Барилгын материал',
    unit: 'ш',
    status: 'in_stock',
    inStock: true,
    stockCount: 15,
    badge: 'Премиум',
    description: '100% хонины цэвэр ноосоор нэхсэн, өнгө алдахгүй, дулаан хадгалалт өндөртэй тансаг хивс.',
    color: 'from-red-600 to-rose-900',
  },
  {
    id: 7,
    name: 'Цемент Евростандарт M-400 (50кг ууттай)',
    sku: 'BM-2002',
    price: 19500,
    hasBulkPrice: true,
    bulkPrice: 17500,
    bulkFrom: 40,
    category: 'Барилгын материал',
    unit: 'уут',
    status: 'out_of_stock', // Дууссан
    inStock: false,
    stockCount: 0,
    badge: 'Барилгачдад',
    description: 'Өндөр бэхжилттэй портландцемент, суурь цутгалт болон бүх төрлийн өрлөг зуурмагт тохиромжтой.',
    color: 'from-slate-400 to-zinc-600',
  },
  {
    id: 8,
    name: 'Барилгын Арматур Төмөр 16мм (12 метр урт)',
    sku: 'BM-2003',
    price: 36000,
    hasBulkPrice: true,
    bulkPrice: 32000,
    bulkFrom: 50,
    category: 'Барилгын материал',
    unit: 'урт',
    status: 'in_stock',
    inStock: true,
    stockCount: 320,
    description: 'ОХУ-ын ГОСТ стандартын дагуу үйлдвэрлэсэн, чанартай төмөр бетон хийцийн үндсэн бэхэлгээний арматур.',
    color: 'from-zinc-500 to-slate-800',
  },
  {
    id: 9,
    name: 'Говь Ноолуур Сонгодог Эмэгтэй Цамц (100% Ноолуур)',
    sku: 'GV-3001',
    price: 380000,
    hasBulkPrice: true,
    bulkPrice: 330000,
    bulkFrom: 5,
    category: 'Бөөний бэлэн хувцас',
    unit: 'ш',
    status: 'in_stock',
    inStock: true,
    stockCount: 28,
    badge: '100% Ноолуур',
    description: 'Дэлхийд танигдсан Монгол ямааны тансаг зөөлөн ноолуураар урласан, дэгжин загвартай цамц.',
    color: 'from-amber-200 to-stone-400',
  },
  {
    id: 10,
    name: 'Lhamour Байгалийн Гаралтай Чацарганатай Саван 100гр',
    sku: 'LH-4001',
    price: 14500,
    hasBulkPrice: true,
    bulkPrice: 11500,
    bulkFrom: 12,
    category: 'Гоо сайхан',
    unit: 'ш',
    status: 'in_stock',
    inStock: true,
    stockCount: 95,
    badge: 'Органик',
    description: 'Монгол чацарганын тос, сүүлэн тосны найрлагатай арьс чийгшүүлэгч гар хийцийн эко саван.',
    color: 'from-orange-400 to-amber-500',
  },
  {
    id: 11,
    name: 'Goo Брэндийн Ямааны Сүүтэй Биеийн Тос 250мл',
    sku: 'GO-4002',
    price: 28000,
    hasBulkPrice: false,
    category: 'Гоо сайхан',
    unit: 'ш',
    status: 'temporarily_out', // Түр дууссан
    inStock: false,
    stockCount: 0,
    description: 'Хуурай болон эмзэг арьсыг гүн чийгшүүлж, тэжээл өгөх зориулалттай байгалийн сүүн лосьон.',
    color: 'from-rose-300 to-pink-500',
  },
  {
    id: 12,
    name: 'Гэрийн Ухаалаг Цахилгаан Халаагуур 2000W (Эко)',
    sku: 'EL-5001',
    price: 245000,
    hasBulkPrice: true,
    bulkPrice: 215000,
    bulkFrom: 4,
    category: 'Цахилгаан бараа',
    unit: 'ш',
    status: 'in_stock',
    inStock: true,
    stockCount: 18,
    badge: 'Эрчим хүчний хэмнэлттэй',
    description: 'Агаар хуурайшуулахгүй, алсын удирдлагатай, ухаалаг температур тохируулагчтай халаагуур.',
    color: 'from-emerald-400 to-teal-700',
  },
  {
    id: 13,
    name: 'Гүний Худагны Цахилгаан Насос 1.5кВт',
    sku: 'EL-5002',
    price: 420000,
    hasBulkPrice: true,
    bulkPrice: 380000,
    bulkFrom: 2,
    category: 'Цахилгаан бараа',
    unit: 'ш',
    status: 'in_stock',
    inStock: true,
    stockCount: 12,
    description: 'Зуслан болон хашааны гүний худгаас цэвэр ус татах өндөр бүтээмжтэй зэвэрдэггүй ган насос.',
    color: 'from-cyan-500 to-blue-700',
  },
  {
    id: 14,
    name: 'Өвлийн Автомашины Моторын Тос 5W-40 (4л)',
    sku: 'AU-6001',
    price: 115000,
    hasBulkPrice: true,
    bulkPrice: 98000,
    bulkFrom: 6,
    category: 'Авто сэлбэг',
    unit: 'сав',
    status: 'in_stock',
    inStock: true,
    stockCount: 40,
    badge: 'Өвлийн онцлох',
    description: '-40 хэмд царцахгүй, хөдөлгүүрийн эдэлгээг уртасгах синтетик технологийн дээд зэргийн тос.',
    color: 'from-slate-700 to-zinc-900',
  },
  {
    id: 15,
    name: 'Автомашины Акумлятор 12V 65Ah (Солонгос)',
    sku: 'AU-6002',
    price: 210000,
    hasBulkPrice: false,
    category: 'Авто сэлбэг',
    unit: 'ш',
    status: 'out_of_stock', // Дууссан
    inStock: false,
    stockCount: 0,
    description: 'Хүйтэнд асалт сайтай, засвар үйлчилгээ шаардахгүй кальцийн технологийн батарей.',
    color: 'from-red-500 to-rose-700',
  },
  {
    id: 16,
    name: 'Монхимо Витамин С 500мг (100 ширхэгтэй)',
    sku: 'PH-7001',
    price: 16000,
    hasBulkPrice: true,
    bulkPrice: 13500,
    bulkFrom: 10,
    category: 'Эмийн сан, эрүүл мэнд',
    unit: 'хайрцаг',
    status: 'in_stock',
    inStock: true,
    stockCount: 150,
    badge: 'Дархлаа дэмжигч',
    description: 'Ханиад томуунаас сэргийлэх, биеийн ерөнхий дархлааг дэмжих байгалийн гаралтай витамин.',
    color: 'from-amber-400 to-yellow-500',
  },
  {
    id: 17,
    name: 'Азифарм Гар Ариутгагч Санитол 5л',
    sku: 'PH-7002',
    price: 45000,
    hasBulkPrice: true,
    bulkPrice: 39000,
    bulkFrom: 4,
    category: 'Эмийн сан, эрүүл мэнд',
    unit: 'сав',
    status: 'in_stock',
    inStock: true,
    stockCount: 35,
    description: '75% спиртийн агууламжтай, нян бактерийг 99.9% устгах албан байгууллагын гар ариутгагч гель.',
    color: 'from-sky-400 to-blue-600',
  },
  {
    id: 18,
    name: 'Тэжээвэр Нохойн Тэжээллэг Хоол 15кг (Үхрийн махтай)',
    sku: 'PT-8001',
    price: 135000,
    hasBulkPrice: true,
    bulkPrice: 118000,
    bulkFrom: 3,
    category: 'Гэрийн тэжээвэр амьтан',
    unit: 'уут',
    status: 'in_stock',
    inStock: true,
    stockCount: 22,
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
