export const DEFAULT_SETTINGS = {
  shopName: 'СтройМаркет',
  tagline: 'Склад · Доставка · Опт и розница',
  phone: '[телефон]',
  email: '',
  address: '[адрес склада]',
  hours: '[часы работы]',
  base: 500,
  perKm: 40,
  heavyPerTon: 800,
  freeFrom: 50000,
  freeKm: 20,
  maxKm: 150,
}

export const DEMO_PRODUCTS = [
  { id: 'd1', sku: 'DEMO-001', name: 'Цемент М500, 50 кг', category: 'Сухие смеси', price: 480, unit: 'мешок', weight: 50, stock: 200, imageUrl: '', description: '', active: true },
  { id: 'd2', sku: 'DEMO-002', name: 'Кирпич красный полнотелый', category: 'Кирпич и блоки', price: 19, unit: 'шт', weight: 3.6, stock: 5000, imageUrl: '', description: '', active: true },
  { id: 'd3', sku: 'DEMO-003', name: 'Гипсокартон 12,5 мм, 1200×2500', category: 'Отделка', price: 520, unit: 'лист', weight: 29, stock: 120, imageUrl: '', description: '', active: true },
  { id: 'd4', sku: 'DEMO-004', name: 'Доска обрезная 50×150×6000', category: 'Пиломатериалы', price: 1150, unit: 'шт', weight: 32, stock: 80, imageUrl: '', description: '', active: true },
  { id: 'd5', sku: 'DEMO-005', name: 'Утеплитель минвата 100 мм', category: 'Утеплители', price: 1290, unit: 'упак', weight: 6, stock: 60, imageUrl: '', description: '', active: true },
  { id: 'd6', sku: 'DEMO-006', name: 'Краска фасадная белая, 10 л', category: 'Лакокраска', price: 2890, unit: 'ведро', weight: 14, stock: 40, imageUrl: '', description: '', active: true },
  { id: 'd7', sku: 'DEMO-007', name: 'Саморезы по дереву 4,2×70, 200 шт', category: 'Крепёж', price: 340, unit: 'упак', weight: 1.2, stock: 300, imageUrl: '', description: '', active: true },
  { id: 'd8', sku: 'DEMO-008', name: 'Песок строительный', category: 'Сыпучие', price: 2400, unit: 'тонна', weight: 1000, stock: 25, imageUrl: '', description: '', active: true },
]

export const fmt = (n) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(n) || 0)

export const rub = (n) => fmt(n) + ' ₽'

export const ZONE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export const PAY_METHODS = {
  card: 'Картой онлайн',
  receipt: 'При получении',
  invoice: 'По счёту',
}

export const STATUSES = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  shipped: 'Отгружен',
  done: 'Выполнен',
  canceled: 'Отменён',
}

// Расчёт доставки: подача + км × ставка + доплата за тяжёлый груз.
// Бесплатно при сумме заказа от freeFrom и расстоянии до freeKm.
export function calcDelivery(s, { km, subtotal, weight }) {
  const k = parseFloat(String(km).replace(',', '.'))
  if (!(k >= 0)) return { ok: false, cost: 0, text: 'Укажите расстояние от склада, км' }
  if (k > s.maxKm) {
    return { ok: false, bad: true, cost: 0, text: `Адрес вне зоны доставки (максимум ${s.maxKm} км)` }
  }
  if (subtotal >= s.freeFrom && k <= s.freeKm) {
    return {
      ok: true,
      cost: 0,
      text: `Бесплатная доставка: заказ от ${rub(s.freeFrom)}, до ${s.freeKm} км`,
    }
  }
  const heavy = Math.max(0, Math.ceil(weight / 1000) - 1) * s.heavyPerTon
  const raw = s.base + k * s.perKm + heavy
  return {
    ok: true,
    cost: Math.round(raw / 10) * 10,
    text:
      `Подача ${rub(s.base)} + ${k} км × ${rub(s.perKm)}` +
      (heavy ? ` + тяжёлый груз ${rub(heavy)}` : ''),
  }
}

export function routeLink(from, to) {
  return (
    'https://yandex.ru/maps/?rtext=' +
    encodeURIComponent(from || '') +
    '~' +
    encodeURIComponent(to || '') +
    '&rtt=auto'
  )
}
