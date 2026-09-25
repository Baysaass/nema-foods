import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Product, ProductStatus, CatalogSettings, defaultCatalogSettings } from '@/lib/types'

// Database row interface matching PostgreSQL snake_case columns
export interface ProductRow {
  id?: number
  name: string
  sku: string
  price: number
  has_bulk_price: boolean
  bulk_price: number | null
  bulk_from: number | null
  category: string
  unit: string
  status: ProductStatus
  stock_count: number
  description: string | null
  badge: string | null
  color: string | null
  image: string | null
  created_at?: string
  updated_at?: string
}

export interface CategoryRow {
  id?: number
  name: string
  sort_order?: number
}

export interface SettingRow {
  key: string
  value: any
  updated_at?: string
}

// Convert DB snake_case row to frontend Product type
export function mapRowToProduct(row: ProductRow): Product {
  const status: ProductStatus = row.status || 'in_stock'
  return {
    id: row.id || Date.now(),
    name: row.name,
    sku: row.sku,
    price: Number(row.price),
    hasBulkPrice: Boolean(row.has_bulk_price),
    bulkPrice: row.bulk_price ? Number(row.bulk_price) : undefined,
    bulkFrom: row.bulk_from ? Number(row.bulk_from) : undefined,
    category: row.category,
    unit: row.unit || 'ш',
    status,
    inStock: status === 'in_stock',
    stockCount: Number(row.stock_count) || 0,
    description: row.description || undefined,
    badge: row.badge || undefined,
    color: row.color || 'from-teal-400 to-emerald-600',
    image: row.image || undefined,
  }
}

// Convert frontend Product type to DB snake_case row
export function mapProductToRow(prod: Product): Partial<ProductRow> {
  const status: ProductStatus = prod.status || (prod.inStock === false ? 'out_of_stock' : 'in_stock')
  const row: Partial<ProductRow> = {
    name: prod.name,
    sku: prod.sku,
    price: prod.price,
    has_bulk_price: prod.hasBulkPrice !== false,
    bulk_price: prod.hasBulkPrice && prod.bulkPrice ? prod.bulkPrice : null,
    bulk_from: prod.hasBulkPrice && prod.bulkFrom ? prod.bulkFrom : null,
    category: prod.category,
    unit: prod.unit || 'ш',
    status,
    stock_count: prod.stockCount || 0,
    description: prod.description || null,
    badge: prod.badge || null,
    color: prod.color || 'from-teal-400 to-emerald-600',
    image: prod.image || null,
    updated_at: new Date().toISOString(),
  }
  if (prod.id && prod.id < 1000000000000) {
    row.id = prod.id
  }
  return row
}

// Supabase configuration state (Environment variables or dynamic localStorage override)
export function getSupabaseCredentials(): { url: string; anonKey: string } | null {
  // 1. Check process.env (Next.js public vars)
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (envUrl && envKey && !envUrl.includes('your-project-id')) {
    return { url: envUrl.trim(), anonKey: envKey.trim() }
  }

  // 2. Check localStorage for in-browser configured credentials
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('catalog_pro_supabase_config')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.url && parsed.anonKey) {
          return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() }
        }
      }
    } catch (e) {
      console.error('Failed to read supabase config from localStorage', e)
    }
  }

  return null
}

let cachedClient: SupabaseClient | null = null
let cachedUrl = ''
let cachedKey = ''

export function getSupabaseClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials()
  if (!creds) return null

  if (cachedClient && cachedUrl === creds.url && cachedKey === creds.anonKey) {
    return cachedClient
  }

  try {
    cachedClient = createClient(creds.url, creds.anonKey)
    cachedUrl = creds.url
    cachedKey = creds.anonKey
    return cachedClient
  } catch (err) {
    console.error('Error creating Supabase client:', err)
    return null
  }
}

// Test Supabase connection
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    let client: SupabaseClient | null = null
    if (url && anonKey) {
      client = createClient(url, anonKey)
    } else {
      client = getSupabaseClient()
    }

    if (!client) {
      return { success: false, message: 'Supabase тохиргоо (URL & Anon Key) дутуу байна.' }
    }

    const { data, error } = await client.from('products').select('id').limit(1)
    if (error) {
      // Check if table does not exist
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Supabase холбогдсон боловч "products" хүснэгт үүсээгүй байна. SQL скриптийг ажиллуулна уу.',
        }
      }
      return { success: false, message: `Алдаа: ${error.message}` }
    }

    return { success: true, message: 'Supabase өгөгдлийн сантай амжилттай холбогдлоо!' }
  } catch (e: any) {
    return { success: false, message: e?.message || 'Холболт амжилтгүй боллоо.' }
  }
}

// --- Fetch all products from Supabase ---
export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  const client = getSupabaseClient()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.warn('Supabase products fetch warning:', error.message)
      return null
    }

    if (!data || data.length === 0) {
      return []
    }

    return (data as ProductRow[]).map(mapRowToProduct)
  } catch (e) {
    console.error('Supabase fetch exception:', e)
    return null
  }
}

// --- Save (Insert or Update) a product to Supabase ---
export async function saveProductToSupabase(product: Product): Promise<Product | null> {
  const client = getSupabaseClient()
  if (!client) return null

  const row = mapProductToRow(product)

  try {
    // For existing products (id < 1e12 means it's a real DB id, not a Date.now() temp id)
    const isExistingId = product.id && product.id < 1_000_000_000_000

    if (isExistingId) {
      // Try update first
      const { data, error } = await client
        .from('products')
        .update(row)
        .eq('id', product.id)
        .select()
        .single()

      if (!error && data) {
        return mapRowToProduct(data as ProductRow)
      }
    }

    // Insert new (omit id so Postgres auto-increments)
    const { id: _omit, ...newRow } = row
    const { data: insertData, error: insertErr } = await client
      .from('products')
      .insert(newRow)
      .select()
      .single()

    if (insertErr) {
      // Last resort: upsert by SKU
      const { data: upsertData, error: upsertErr } = await client
        .from('products')
        .upsert({ ...newRow }, { onConflict: 'sku' })
        .select()
        .single()
      if (upsertErr) throw upsertErr
      return mapRowToProduct(upsertData as ProductRow)
    }

    return mapRowToProduct(insertData as ProductRow)
  } catch (e) {
    console.error('Error saving product to Supabase:', e)
    return null
  }
}

// --- Update quick status in Supabase (1-click) ---
export async function updateProductStatusInSupabase(
  id: number,
  status: ProductStatus,
  stockCount?: number
): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (stockCount !== undefined) {
      updates.stock_count = stockCount
    }

    const { error } = await client
      .from('products')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Failed to update status in Supabase:', error.message)
      return false
    }
    return true
  } catch (e) {
    console.error('Exception updating status in Supabase:', e)
    return false
  }
}

// --- Delete product from Supabase ---
export async function deleteProductFromSupabase(id: number): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { error, count } = await client
      .from('products')
      .delete({ count: 'exact' })
      .eq('id', id)

    if (error) {
      console.error('Failed to delete product from Supabase:', error.message)
      return false
    }

    // count === 0 means no row matched that id (maybe id was a temp Date.now() value)
    if (count === 0) {
      console.warn(`deleteProductFromSupabase: no row with id=${id} found in DB (may have been a local-only product)`)
    }

    return true
  } catch (e) {
    console.error('Exception deleting from Supabase:', e)
    return false
  }
}

// --- Fetch Categories from Supabase ---
export async function fetchCategoriesFromSupabase(): Promise<string[] | null> {
  const client = getSupabaseClient()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('categories')
      .select('name')
      .order('sort_order', { ascending: true })

    if (error) {
      console.warn('Supabase categories fetch warning:', error.message)
      return null
    }

    if (!data || data.length === 0) return ['Бүх ангилал']

    const cats = data.map((c: any) => c.name)
    if (!cats.includes('Бүх ангилал')) {
      cats.unshift('Бүх ангилал')
    }
    return cats
  } catch (e) {
    console.error('Supabase categories fetch exception:', e)
    return null
  }
}

// --- Save Category to Supabase ---
export async function saveCategoryToSupabase(name: string): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  const cleanName = name.trim()
  if (!cleanName || cleanName === 'Бүх ангилал') return false

  try {
    const { error } = await client
      .from('categories')
      .upsert({ name: cleanName, sort_order: 10 }, { onConflict: 'name' })

    if (error) {
      console.error('Error saving category to Supabase:', error.message)
      return false
    }
    return true
  } catch (e) {
    console.error('Exception saving category:', e)
    return false
  }
}

// --- Update Category in Supabase (Rename & cascade to products) ---
export async function updateCategoryInSupabase(oldName: string, newName: string): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  const cleanNew = newName.trim()
  if (!cleanNew || cleanNew === 'Бүх ангилал' || cleanNew === oldName) return false

  try {
    // 1. Update in categories table
    const { error: catErr } = await client
      .from('categories')
      .update({ name: cleanNew })
      .eq('name', oldName)

    if (catErr) {
      console.error('Error updating category in Supabase:', catErr.message)
      return false
    }

    // 2. Cascade update to products table
    const { error: prodErr } = await client
      .from('products')
      .update({ category: cleanNew })
      .eq('category', oldName)

    if (prodErr) {
      console.warn('Warning updating products on category rename:', prodErr.message)
    }

    return true
  } catch (e) {
    console.error('Exception updating category:', e)
    return false
  }
}

// --- Delete Category from Supabase ---
export async function deleteCategoryFromSupabase(name: string): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    // 1. Delete from categories table
    const { error } = await client
      .from('categories')
      .delete({ count: 'exact' })
      .eq('name', name)

    if (error) {
      console.error('Error deleting category from Supabase:', error.message)
      return false
    }

    // 2. Update any products that had this category to 'Бусад' so they remain valid
    const { data: updatedProds, error: prodErr } = await client
      .from('products')
      .update({ category: 'Бусад' })
      .eq('category', name)
      .select('id')

    if (prodErr) {
      console.warn('Warning updating orphaned products on category delete:', prodErr.message)
    }

    // 3. If products were reassigned to 'Бусад', ensure 'Бусад' exists in categories
    if (updatedProds && updatedProds.length > 0) {
      await client.from('categories').upsert({ name: 'Бусад', sort_order: 99 }, { onConflict: 'name' })
    }

    return true
  } catch (e) {
    console.error('Exception deleting category:', e)
    return false
  }
}

// --- Fetch Settings from Supabase ---
export async function fetchSettingsFromSupabase(): Promise<CatalogSettings | null> {
  const client = getSupabaseClient()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('catalog_settings')
      .select('value')
      .eq('key', 'general')
      .maybeSingle()

    if (error || !data) return defaultCatalogSettings
    return {
      ...defaultCatalogSettings,
      ...(data.value as Partial<CatalogSettings>),
    }
  } catch (e) {
    console.error('Failed to fetch settings from Supabase:', e)
    return null
  }
}

// --- Save Settings to Supabase ---
export async function saveSettingsToSupabase(settings: CatalogSettings): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { error } = await client.from('catalog_settings').upsert({
      key: 'general',
      value: settings,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Error saving settings to Supabase:', error.message)
      return false
    }
    return true
  } catch (e) {
    console.error('Exception saving settings:', e)
    return false
  }
}

// --- Seed Initial Data to Supabase ---
export async function seedInitialDataToSupabase(
  initialProducts: Product[],
  initialCategories: string[]
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient()
  if (!client) {
    return { success: false, message: 'Supabase холболт олдсонгүй.' }
  }

  try {
    // 1. Seed Categories
    const catRows = initialCategories
      .filter((c) => c !== 'Бүх ангилал')
      .map((name, idx) => ({
        name,
        sort_order: idx + 1,
      }))

    await client.from('categories').upsert(catRows, { onConflict: 'name' })

    // 2. Seed Products
    const prodRows = initialProducts.map((p, idx) => ({
      id: idx + 1,
      name: p.name,
      sku: p.sku,
      price: p.price,
      has_bulk_price: p.hasBulkPrice !== false,
      bulk_price: p.hasBulkPrice && p.bulkPrice ? p.bulkPrice : null,
      bulk_from: p.hasBulkPrice && p.bulkFrom ? p.bulkFrom : null,
      category: p.category,
      unit: p.unit,
      status: p.status || 'in_stock',
      stock_count: p.stockCount,
      description: p.description || null,
      badge: p.badge || null,
      color: p.color || 'from-teal-400 to-emerald-600',
      image: p.image || null,
    }))

    const { error: prodErr } = await client.from('products').upsert(prodRows, { onConflict: 'sku' })
    if (prodErr) throw prodErr

    // 3. Seed Settings
    await client.from('catalog_settings').upsert({
      key: 'general',
      value: { showStockCount: true },
      updated_at: new Date().toISOString(),
    })

    return {
      success: true,
      message: `Supabase өгөгдлийн санд ${prodRows.length} бараа, ${catRows.length} ангилал амжилттай байршлаа!`,
    }
  } catch (e: any) {
    console.error('Error seeding data to Supabase:', e)
    return { success: false, message: `Өгөгдөл оруулахад алдаа: ${e?.message || e}` }
  }
}
