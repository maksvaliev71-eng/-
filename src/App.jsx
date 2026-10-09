import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './api.js'
import { DEFAULT_SETTINGS, ZONE_LETTERS } from './data.js'
import { Header, Footer, Toast } from './components.jsx'
import { Home, Catalog, ProductPage, DeliveryPage } from './pages/Shop.jsx'
import { Cart, OrderDone } from './pages/Cart.jsx'
import { Admin } from './pages/Admin.jsx'

function useRoute() {
  const read = () => {
    const h = (location.hash || '#/').slice(1)
    const [path, qs] = h.split('?')
    return { path: path || '/', query: new URLSearchParams(qs || '') }
  }
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('sm_cart') || '{}')
  } catch {
    return {}
  }
}

export default function App() {
  const route = useRoute()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [cartMap, setCartMap] = useState(loadCart)
  const [toastText, setToastText] = useState('')
  const timer = useRef(null)

  const toast = useCallback((t) => {
    setToastText(t)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToastText(''), 2400)
  }, [])

  const reload = useCallback(async () => {
    setAllProducts(await api.listProducts())
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const [s] = await Promise.all([api.getSettings(), reload()])
        setSettings(s)
      } catch (e) {
        setLoadError(e.message)
      }
      setLoading(false)
    })()
  }, [reload])

  useEffect(() => {
    document.title = settings.shopName + ' — стройматериалы со склада'
  }, [settings.shopName])

  useEffect(() => {
    try {
      localStorage.setItem('sm_cart', JSON.stringify(cartMap))
    } catch {
      /* корзина просто не сохранится между визитами */
    }
  }, [cartMap])

  const products = useMemo(() => allProducts.filter((p) => p.active), [allProducts])
  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products])
  const zoneOf = useCallback(
    (cat) => {
      const i = categories.indexOf(cat)
      return i < 0 ? '—' : ZONE_LETTERS[i % ZONE_LETTERS.length]
    },
    [categories]
  )

  const cart = useMemo(() => {
    const lines = Object.keys(cartMap)
      .map((id) => ({ p: products.find((p) => String(p.id) === id), qty: cartMap[id] }))
      .filter((l) => l.p && l.qty > 0)
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.p.price * l.qty, 0),
      weight: lines.reduce((w, l) => w + (l.p.weight || 0) * l.qty, 0),
      add: (id, q = 1) => {
        setCartMap((m) => ({ ...m, [id]: (m[id] || 0) + q }))
        toast('Добавлено в корзину')
      },
      setQty: (id, q) => setCartMap((m) => ({ ...m, [id]: Math.max(1, q) })),
      remove: (id) =>
        setCartMap((m) => {
          const n = { ...m }
          delete n[id]
          return n
        }),
      clear: () => setCartMap({}),
    }
  }, [cartMap, products, toast])

  const ctx = {
    settings,
    setSettings,
    products,
    allProducts,
    categories,
    zoneOf,
    cart,
    reload,
    toast,
  }

  let page
  const { path, query } = route
  if (loading) page = <div className="empty mono">ЗАГРУЗКА…</div>
  else if (loadError)
    page = (
      <div className="wrap sec">
        <div className="note bad">Не удалось загрузить данные: {loadError}</div>
      </div>
    )
  else if (path === '/') page = <Home ctx={ctx} />
  else if (path === '/catalog') page = <Catalog ctx={ctx} query={query} />
  else if (path.startsWith('/product/')) page = <ProductPage ctx={ctx} id={decodeURIComponent(path.slice(9))} />
  else if (path === '/cart') page = <Cart ctx={ctx} />
  else if (path === '/delivery') page = <DeliveryPage ctx={ctx} />
  else if (path.startsWith('/done/')) page = <OrderDone code={decodeURIComponent(path.slice(6))} />
  else if (path === '/admin') page = <Admin ctx={ctx} />
  else
    page = (
      <div className="wrap sec">
        <div className="empty mono">СТРАНИЦА НЕ НАЙДЕНА</div>
      </div>
    )

  return (
    <>
      <Header settings={settings} count={cart.count} />
      <main>{page}</main>
      <Footer settings={settings} />
      <Toast text={toastText} />
    </>
  )
}
