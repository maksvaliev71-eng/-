// Серверная функция Vercel: считает расстояние по дорогам между двумя адресами.
// По умолчанию использует бесплатные OpenStreetMap (Nominatim + OSRM), ключи не нужны.
// Если в Vercel заданы YANDEX_GEOCODER_KEY и YANDEX_ROUTER_KEY, используются сервисы Яндекса.

const UA = 'stroymarket-site/1.0 (delivery distance calculator)'
const cache = new Map() // адрес -> координаты
let lastOsmCall = 0

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, headers = {}) {
  const r = await fetch(url, { headers })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

async function geocodeOSM(q) {
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

async function geocodeYandex(q, key) {
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

async function routeOSRM(a, b) {
  const j = await getJson(
    `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`,
    { 'User-Agent': UA }
  )
  if (j.code !== 'Ok' || !j.routes?.length) return null
  return j.routes[0].distance / 1000
}

async function routeYandex(a, b, key) {
  const j = await getJson(
    `https://api.routing.yandex.net/v2/route?mode=driving&apikey=${encodeURIComponent(key)}` +
      `&waypoints=${a.lat},${a.lon}|${b.lat},${b.lon}`
  )
  let meters = 0
  for (const leg of j?.route?.legs || []) for (const s of leg.steps || []) meters += s.length || 0
  return meters ? meters / 1000 : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const from = String(req.query.from || '').trim().slice(0, 200)
  const to = String(req.query.to || '').trim().slice(0, 200)
  if (!from || !to) return res.status(400).json({ error: 'Укажите адрес' })

  const gKey = process.env.YANDEX_GEOCODER_KEY
  const rKey = process.env.YANDEX_ROUTER_KEY
  const useYandex = Boolean(gKey && rKey)

  const geocode = async (q) => {
    const k = (useYandex ? 'y:' : 'o:') + q.toLowerCase()
    if (cache.has(k)) return cache.get(k)
    const p = useYandex ? await geocodeYandex(q, gKey) : await geocodeOSM(q)
    if (p) cache.set(k, p)
    return p
  }

  try {
    const a = await geocode(from)
    if (!a) return res.status(422).json({ error: 'Не удалось найти адрес склада. Проверьте его в настройках админки.' })
    const b = await geocode(to)
    if (!b) return res.status(422).json({ error: 'Адрес не найден. Укажите город, улицу и дом, например: Тула, ул. Ленина, 5.' })
    const km = useYandex ? await routeYandex(a, b, rKey) : await routeOSRM(a, b)
    if (km == null) return res.status(422).json({ error: 'Не удалось построить маршрут по дорогам до этого адреса.' })
    return res.status(200).json({ km: Math.round(km * 10) / 10, provider: useYandex ? 'yandex' : 'osm' })
  } catch (e) {
    return res.status(502).json({ error: 'Сервис расчёта временно недоступен. Введите расстояние вручную.' })
  }
}
