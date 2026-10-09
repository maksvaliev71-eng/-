import { useState } from 'react'
import { fmt } from './data.js'

export function Stripe() {
  return <div className="stripe" />
}

export function Header({ settings, count }) {
  const [q, setQ] = useState('')
  const submit = (e) => {
    e.preventDefault()
    location.hash = '#/catalog?q=' + encodeURIComponent(q.trim())
  }
  const name = settings.shopName || 'Магазин'
  return (
    <>
      <Stripe />
      <header className="hdr">
        <div className="wrap hdr-in">
          <a href="#/" className="logo">
            <span className="logo-mark">{name.slice(0, 1).toUpperCase()}</span>
            <span>
              <span className="logo-name">{name.toUpperCase()}</span>
              <span className="logo-sub">{(settings.tagline || '').toUpperCase()}</span>
            </span>
          </a>
          <form className="search" onSubmit={submit}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="АРТИКУЛ ИЛИ НАЗВАНИЕ"
              aria-label="Поиск по каталогу"
            />
            <button type="submit" aria-label="Найти">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="8.5" cy="8.5" r="6" stroke="#17181a" strokeWidth="2.2" />
                <path d="M13 13l5 5" stroke="#17181a" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </form>
          <nav className="nav">
            <a href="#/catalog">КАТАЛОГ</a>
            <a href="#/delivery">ДОСТАВКА</a>
            <a href="#/cart" className="cartbtn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M2 3h2.5l2 9h9l1.5-6.5H5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="16" r="1.4" fill="currentColor" />
                <circle cx="14.5" cy="16" r="1.4" fill="currentColor" />
              </svg>
              КОРЗИНА [{count}]
            </a>
          </nav>
        </div>
      </header>
    </>
  )
}

export function Footer({ settings }) {
  return (
    <>
      <Stripe />
      <footer className="ftr">
        <div className="wrap ftr-in mono">
          <span>© {(settings.shopName || '').toUpperCase()} · [ИНН, ЮРЛИЦО]</span>
          <span>
            {settings.address} · {settings.phone}
            {settings.email ? ' · ' + settings.email : ''}
          </span>
          <a href="#/admin">АДМИНИСТРАТОР</a>
        </div>
      </footer>
    </>
  )
}

export function Qty({ value, onChange }) {
  return (
    <div className="qty">
      <button type="button" aria-label="Меньше" onClick={() => onChange(Math.max(1, value - 1))}>
        −
      </button>
      <input
        type="number"
        min="1"
        value={value}
        aria-label="Количество"
        onChange={(e) => onChange(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
      />
      <button type="button" aria-label="Больше" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

export function ProductCard({ p, zone, onAdd }) {
  const [q, setQ] = useState(1)
  return (
    <article className="tag">
      <div className="tag-hole">
        <i />
      </div>
      <div className="tag-top mono">
        <span>АРТ. {p.sku || '—'}</span>
        <span className="acc">ЗОНА {zone}</span>
      </div>
      <a href={'#/product/' + p.id} className="tag-img">
        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span className="mono">[ФОТО ТОВАРА]</span>}
      </a>
      <h3 className="tag-name">
        <a href={'#/product/' + p.id}>{p.name}</a>
      </h3>
      <div className="tag-cut">
        <i className="l" />
        <i className="r" />
      </div>
      <div className="tag-stub">
        <div className="tag-price">
          <span>
            <b>{fmt(p.price)}</b> <span className="mono">₽ / {p.unit}</span>
          </span>
          {p.stock != null && <span className="mono muted small">ОСТАТОК: {fmt(p.stock)}</span>}
        </div>
        <div className="buy">
          <Qty value={q} onChange={setQ} />
          <button
            type="button"
            className="btn btn-pri grow"
            onClick={() => {
              onAdd(p.id, q)
              setQ(1)
            }}
          >
            В КОРЗИНУ
          </button>
        </div>
      </div>
    </article>
  )
}

export function Toast({ text }) {
  return <div className={'toast' + (text ? ' on' : '')}>{text}</div>
}
