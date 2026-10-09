import { createClient } from '@supabase/supabase-js'
import { DEFAULT_SETTINGS, DEMO_PRODUCTS } from './data'
import type { Product, Settings, Order } from './types'

// Если переменные окружения не заданы — сайт работает в демо-режиме
// (данные хранятся в браузере). После подключения Supabase всё идёт в базу.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const sb = url && key ? createClient(url as string, key as string) : null
export const isDemo = !sb

const DEMO_PIN = '1234'

/* ---------- локальное хранилище (демо) ---------- */
const ls = {
  get(k: string, d: any) {
    try {
      const v = localStorage.getItem(k)
      return v ? JSON.parse(v) : d
    } catch {
      return d
    }
  },
  set(k: string, v: any) {
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {
      throw new Error('Не хватило места в браузере. Загрузите картинку поменьше.')
    }
  },
}

/* ---------- преобразование строк БД ---------- */
const fromRow = (r: any): Product => ({
  id: r.id,
  sku: r.sku || '',
  name: r.name,
  category: r.category,
  price: Number(r.price),
  unit: r.unit,
  weight: Number(r.weight_kg || 0),
  stock: r.stock == null ? null : Number(r.stock),
  imageUrl: r.image_url || '',
  description: r.description || '',
  active: r.active !== false,
})

const toRow = (p: any) => {
  const o: any = {
    sku: p.sku || null,
    name: p.name,
    category: p.category || 'Без категории',
    price: Number(p.price) || 0,
    unit: p.unit || 'шт',
    weight_kg: Number(p.weight) || 0,
    stock: p.stock === '' || p.stock == null ? null : Number(p.stock),
    image_url: p.imageUrl || null,
    description: p.description || null,
    active: p.active !== false,
    updated_at: new Date().toISOString(),
  }
  if (p.id) o.id = p.id
  return o
}

const fromOrder = (r: any): Order => ({
  id: r.id,
  code: r.public_code,
  date: r.created_at,
  name: r.customer_name,
  phone: r.phone,
  comment: r.comment || '',
  delivery: r.delivery_type,
  address: r.address || '',
  km: r.distance_km,
  pay: r.pay_method,
  paid: !!r.paid,
  items: r.items || [],
  subtotal: Number(r.subtotal),
  deliveryCost: Number(r.delivery_cost),
  total: Number(r.total),
  status: r.status || 'new',
})

const fail = (error: { message?: string } | null) => {
  if (error) throw new Error(error.message || 'Ошибка базы данных')
}

/* ---------- каталог ---------- */
export async function listProducts(): Promise<Product[]> {
  if (isDemo) return ls.get('sm_products', DEMO_PRODUCTS)
  const { data, error } = await sb.from('products').select('*').order('category').order('name')
  fail(error)
  return data.map(fromRow)
}

export async function saveProduct(p: any) {
  if (isDemo) {
    const list = ls.get('sm_products', DEMO_PRODUCTS)
    const item = { ...p, id: p.id || 'p' + Date.now() }
    const next = list.some((x) => x.id === item.id)
      ? list.map((x) => (x.id === item.id ? item : x))
      : [...list, item]
    ls.set('sm_products', next)
    return item
  }
  const { data, error } = await sb.from('products').upsert(toRow(p)).select().single()
  fail(error)
  return fromRow(data)
}

export async function deleteProduct(id: string) {
  if (isDemo) {
    ls.set('sm_products', ls.get('sm_products', DEMO_PRODUCTS).filter((x) => x.id !== id))
    return
  }
  const { error } = await sb.from('products').delete().eq('id', id)
  fail(error)
}

// Массовая загрузка из CSV. Товары с артикулом обновляются, без артикула — добавляются.
export async function importProducts(rows: any[]) {
  if (isDemo) {
    const list = ls.get('sm_products', DEMO_PRODUCTS)
    const bySku = new Map<string, any>(list.filter((x: Product) => x.sku).map((x: Product) => [x.sku, x]))
    const added = []
    rows.forEach((r, i) => {
      const old = r.sku && bySku.get(r.sku)
      if (old) Object.assign(old, { ...r, id: old.id, imageUrl: old.imageUrl, description: old.description })
      else added.push({ ...r, id: 'i' + Date.now() + '_' + i, imageUrl: '', description: '' })
    })
    ls.set('sm_products', [...list, ...added])
    return rows.length
  }
  const withSku = rows.filter((r) => r.sku).map(toRow)
  const noSku = rows.filter((r) => !r.sku).map(toRow)
  if (withSku.length) {
    const { error } = await sb.from('products').upsert(withSku, { onConflict: 'sku' })
    fail(error)
  }
  if (noSku.length) {
    const { error } = await sb.from('products').insert(noSku)
    fail(error)
  }
  return rows.length
}

/* ---------- картинки ---------- */
function compressImage(file: File, max = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Это не картинка'))
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * k)
        c.height = Math.round(img.height * k)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось сжать картинку'))), 'image/jpeg', 0.82)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('Не удалось прочитать картинку'))
    r.readAsDataURL(blob)
  })

export async function uploadImage(file: File): Promise<string> {
  const blob = await compressImage(file, isDemo ? 700 : 1200)
  if (isDemo) return blobToDataUrl(blob)
  const path = `${crypto.randomUUID()}.jpg`
  const { error } = await sb.storage
    .from('product-images')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  fail(error)
  return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl
}

/* ---------- заказы ---------- */
export async function createOrder(o: Order) {
  if (isDemo) {
    const list = ls.get('sm_orders', [])
    list.push({ ...o, id: Date.now(), date: new Date().toISOString(), status: 'new' })
    ls.set('sm_orders', list)
    return
  }
  const { error } = await sb.from('orders').insert({
    public_code: o.code,
    customer_name: o.name,
    phone: o.phone,
    comment: o.comment || null,
    delivery_type: o.delivery,
    address: o.address || null,
    distance_km: o.km === '' || o.km == null ? null : Number(o.km),
    pay_method: o.pay,
    paid: !!o.paid,
    items: o.items,
    subtotal: o.subtotal,
    delivery_cost: o.deliveryCost,
    total: o.total,
  })
  fail(error)
}

export async function listOrders(): Promise<Order[]> {
  if (isDemo) return ls.get('sm_orders', []).slice().reverse()
  const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false })
  fail(error)
  return data.map(fromOrder)
}

export async function updateOrder(id: number | string | undefined, patch: { status?: string; paid?: boolean }) {
  if (isDemo) {
    ls.set('sm_orders', ls.get('sm_orders', []).map((o) => (o.id === id ? { ...o, ...patch } : o)))
    return
  }
  const row: any = {}
  if (patch.status !== undefined) row.status = patch.status
  if (patch.paid !== undefined) row.paid = patch.paid
  const { error } = await sb.from('orders').update(row).eq('id', id)
  fail(error)
}

/* ---------- настройки ---------- */
export async function getSettings(): Promise<Settings> {
  if (isDemo) return { ...DEFAULT_SETTINGS, ...ls.get('sm_settings', {}) }
  const { data } = await sb.from('settings').select('value').eq('key', 'shop').maybeSingle()
  return { ...DEFAULT_SETTINGS, ...(data ? data.value : {}) }
}

export async function saveSettings(s: Settings) {
  if (isDemo) {
    ls.set('sm_settings', s)
    return
  }
  const { error } = await sb.from('settings').upsert({ key: 'shop', value: s })
  fail(error)
}

/* ---------- вход администратора ---------- */
export async function getSession() {
  if (isDemo) return sessionStorage.getItem('sm_admin') === '1'
  const { data } = await sb.auth.getSession()
  return !!data.session
}

export async function signIn(login: string, password: string) {
  if (isDemo) {
    if (password !== DEMO_PIN) throw new Error('Неверный PIN (в демо-режиме: 1234)')
    sessionStorage.setItem('sm_admin', '1')
    return
  }
  const { error } = await sb.auth.signInWithPassword({ email: login, password })
  if (error) throw new Error('Неверная почта или пароль')
}

export async function signOut() {
  if (isDemo) {
    sessionStorage.removeItem('sm_admin')
    return
  }
  await sb.auth.signOut()
}

/* ---------- расстояние доставки ---------- */
export async function calcDistance(from: string, to: string): Promise<{ km: number; provider?: string }> {
  let r
  try {
    r = await fetch('/api/distance?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to))
  } catch {
    throw new Error('Нет связи с сервером. Введите расстояние вручную.')
  }
  let j: any = {}
  try {
    j = await r.json()
  } catch {
    throw new Error('Автоматический расчёт недоступен. Введите расстояние вручную.')
  }
  if (!r.ok) throw new Error(j.error || 'Не удалось рассчитать расстояние')
  return j
}
