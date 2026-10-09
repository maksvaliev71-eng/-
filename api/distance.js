// Серверная функция Vercel: считает расстояние по дорогам между двумя адресами.
// По умолчанию использует бесплатные OpenStreetMap (Nominatim + OSRM), ключи не нужны.
// Если в Vercel заданы YANDEX_GEOCODER_KEY и YANDEX_ROUTER_KEY, используются сервисы Яндекса.

interface Point {
  lat: number
  lon: number
}

const UA = 'stroymarket-site/1.0 (delivery distance calculator)'
const cache = new Map<string, Point>() // адрес -> координаты
let lastOsmCall = 0

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const r = await fetch(url, { headers })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

async function geocodeOSM(q: string): Promise<Point | null> {
  // Правила Nominatim: не чаще 1 запроса в секунду
  const wait = 1100 - (Date.now() - lastOsmCall)
  if (wait > 0) await sleep(wait)
  lastOsmCall = Date.now()
  const j = await getJson(
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ru&q=' +
      encodeURIComponent(q),
    { 'User-Agent': UA }
  )
  if (!j.length) return null
  return { lat: Number(j[0].lat), lon: Number(j[0].lon) }
}

async function geocodeYandex(q: string, key: string): Promise<Point | null> {
  const j = await getJson(
    'https://geocode-maps.yandex.ru/1.x/?format=json&results=1&lang=ru_RU&apikey=' +
      encodeURIComponent(key) +
      '&geocode=' +
      encodeURIComponent(q)
  )
  const pos = j?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos
  if (!pos) return null
  const [lon, lat] = pos.split(' ').map(Number)
  return { lat, lon }
}

async function routeOSRM(a: Point, b: Point): Promise<number | null> {
  const j = await getJson(
    `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`,
    { 'User-Agent': UA }
  )
  if (j.code !== 'Ok' || !j.routes?.length) return null
  return j.routes[0].distance / 1000
}

async function routeYandex(a: Point, b: Point, key: string): Promise<number | null> {
  const j = await getJson(
    `https://api.routing.yandex.net/v2/route?mode=driving&apikey=${encodeURIComponent(key)}` +
      `&waypoints=${a.lat},${a.lon}|${b.lat},${b.lon}`
  )
  let meters = 0
  for (const leg of j?.route?.legs || []) for (const s of leg.steps || []) meters += s.length || 0
  return meters ? meters / 1000 : null
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  const from = String(req.query.from || '').trim().slice(0, 200)
  const to = String(req.query.to || '').trim().slice(0, 200)
  if (!from || !to) return res.status(400).json({ error: 'Укажите адрес' })

  const gKey = process.env.YANDEX_GEOCODER_KEY
  const rKey = process.env.YANDEX_ROUTER_KEY
  const yandex = gKey && rKey ? { geo: gKey, route: rKey } : null

  const geocode = async (q: string): Promise<Point | null> => {
    const k = (yandex ? 'y:' : 'o:') + q.toLowerCase()
    const hit = cache.get(k)
    if (hit) return hit
    const p = yandex ? await geocodeYandex(q, yandex.geo) : await geocodeOSM(q)
    if (p) cache.set(k, p)
    return p
  }

  try {
    const a = await geocode(from)
    if (!a) return res.status(422).json({ error: 'Не удалось найти адрес склада. Проверьте его в настройках админки.' })
    const b = await geocode(to)
    if (!b) return res.status(422).json({ error: 'Адрес не найден. Укажите город, улицу и дом, например: Тула, ул. Ленина, 5.' })
    const km = yandex ? await routeYandex(a, b, yandex.route) : await routeOSRM(a, b)
    if (km == null) return res.status(422).json({ error: 'Не удалось построить маршрут по дорогам до этого адреса.' })
    return res.status(200).json({ km: Math.round(km * 10) / 10, provider: yandex ? 'yandex' : 'osm' })
  } catch {
    return res.status(502).json({ error: 'Сервис расчёта временно недоступен. Введите расстояние вручную.' })
  }
}
