import { useState } from 'react'
import { ProductCard, Qty } from '../components.jsx'
import * as api from '../api'
import { fmt, rub, calcDelivery } from '../data.js'

export function Home({ ctx }) {
  const { settings, products, categories, zoneOf, cart } = ctx
  const popular = products.slice(0, 8)
  return (
    <>
      <section className="hero">
        <div className="wrap hero-in">
          <div className="hero-text">
            <div className="mono acc small-cap">// ЗОНА А · ГЛАВНАЯ</div>
            <h1>
              Всё для стройки<span className="acc">.</span>
              <br />
              Со склада до объекта
            </h1>
            <div className="dim" aria-hidden="true">
              <i />
              <span className="mono">ЦЕНА ДОСТАВКИ = КМ × ВЕС</span>
              <i />
            </div>
            <p className="lead">
              Соберите заказ, увидите стоимость доставки до адреса и оплатите онлайн или по счёту.
            </p>
            <div className="row gap">
              <a href="#/catalog" className="btn btn-pri big">
                В КАТАЛОГ →
              </a>
              <a href="#/delivery" className="btn btn-line big">
                РАССЧИТАТЬ ДОСТАВКУ
              </a>
            </div>
          </div>
          <div className="hero-photo">
            <div className="ph mono">[ФОТО 01 · СКЛАД]</div>
            <b className="c tl" />
            <b className="c tr" />
            <b className="c bl" />
            <b className="c br" />
          </div>
        </div>
      </section>

      <section className="wrap sec">
        <div className="sec-head">
          <h2>Зоны склада</h2>
          <span className="mono muted">ВЫБЕРИТЕ СЕКЦИЮ</span>
        </div>
        <div className="zones">
          {categories.map((c) => (
            <a key={c} href={'#/catalog?cat=' + encodeURIComponent(c)} className="zone">
              <span className="zone-letter">{zoneOf(c)}</span>
              <span>{c}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="wrap sec">
        <div className="sec-head">
          <h2>Популярные товары</h2>
          <a href="#/catalog" className="mono">
            ВЕСЬ КАТАЛОГ →
          </a>
        </div>
        <div className="grid">
          {popular.map((p) => (
            <ProductCard key={p.id} p={p} zone={zoneOf(p.category)} onAdd={cart.add} />
          ))}
        </div>
      </section>

      <section className="info">
        <div className="wrap info-in">
          <div>
            <div className="mono acc">01 · ДОСТАВКА</div>
            <b>До адреса клиента</b>
            <p>Стоимость считается по расстоянию и весу груза</p>
          </div>
          <div>
            <div className="mono acc">02 · САМОВЫВОЗ</div>
            <b>Со склада</b>
            <p>Бесплатно, соберём заказ к вашему приезду. {settings.address}</p>
          </div>
          <div>
            <div className="mono acc">03 · ОПЛАТА</div>
            <b>Онлайн или по счёту</b>
            <p>Картой, при получении или безналом для организаций</p>
          </div>
        </div>
      </section>
    </>
  )
}

export function Catalog({ ctx, query }) {
  const { products, categories, zoneOf, cart } = ctx
  const cat = query.get('cat') || ''
  const q = (query.get('q') || '').trim().toLowerCase()
  const list = products.filter(
    (p) =>
      (!cat || p.category === cat) &&
      (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
  )
  return (
    <section className="wrap sec">
      <div className="sec-head">
        <h2>Каталог</h2>
        <span className="mono muted">
          НАЙДЕНО: {list.length}
          {q ? ' · ПОИСК: «' + query.get('q') + '»' : ''}
        </span>
      </div>
      <div className="chips">
        <a href="#/catalog" className={'chip' + (!cat ? ' on' : '')}>
          ВСЕ
        </a>
        {categories.map((c) => (
          <a
            key={c}
            href={'#/catalog?cat=' + encodeURIComponent(c)}
            className={'chip' + (cat === c ? ' on' : '')}
          >
            {zoneOf(c)} · {c}
          </a>
        ))}
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} zone={zoneOf(p.category)} onAdd={cart.add} />
          ))}
        </div>
      ) : (
        <div className="empty mono">НИЧЕГО НЕ НАЙДЕНО</div>
      )}
    </section>
  )
}

export function ProductPage({ ctx, id }) {
  const { products, zoneOf, cart } = ctx
  const p = products.find((x) => String(x.id) === String(id))
  const [q, setQ] = useState(1)
  if (!p) {
    return (
      <section className="wrap sec">
        <div className="empty mono">ТОВАР НЕ НАЙДЕН</div>
        <p style={{ textAlign: 'center' }}>
          <a href="#/catalog" className="mono">
            ← В КАТАЛОГ
          </a>
        </p>
      </section>
    )
  }
  return (
    <section className="wrap sec">
      <a href="#/catalog" className="mono muted">
        ← КАТАЛОГ / {p.category.toUpperCase()}
      </a>
      <div className="pp">
        <div className="pp-img">
          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span className="mono">[ФОТО ТОВАРА]</span>}
          <b className="c tl" />
          <b className="c tr" />
          <b className="c bl" />
          <b className="c br" />
        </div>
        <div className="pp-info">
          <div className="mono acc small-cap">
            ЗОНА {zoneOf(p.category)} · АРТ. {p.sku || '—'}
          </div>
          <h1 className="pp-title">{p.name}</h1>
          <div className="pp-price">
            <b>{fmt(p.price)}</b> <span className="mono">₽ / {p.unit}</span>
          </div>
          <table className="spec mono">
            <tbody>
              <tr>
                <td>КАТЕГОРИЯ</td>
                <td>{p.category}</td>
              </tr>
              <tr>
                <td>ЕД. ИЗМЕРЕНИЯ</td>
                <td>{p.unit}</td>
              </tr>
              <tr>
                <td>ВЕС ЕДИНИЦЫ</td>
                <td>{p.weight ? fmt(p.weight) + ' кг' : '—'}</td>
              </tr>
              <tr>
                <td>ОСТАТОК</td>
                <td>{p.stock != null ? fmt(p.stock) + ' ' + p.unit : '—'}</td>
              </tr>
            </tbody>
          </table>
          {p.description && <p className="desc">{p.description}</p>}
          <div className="buy pp-buy">
            <Qty value={q} onChange={setQ} />
            <button
              type="button"
              className="btn btn-pri grow big"
              onClick={() => {
                cart.add(p.id, q)
                setQ(1)
              }}
            >
              В КОРЗИНУ · {rub(p.price * q)}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export function DeliveryPage({ ctx }) {
  const { settings, cart } = ctx
  const [address, setAddress] = useState('')
  const [km, setKm] = useState('')
  const [weight, setWeight] = useState(cart.weight ? String(Math.round(cart.weight)) : '')
  const [sum, setSum] = useState(cart.subtotal ? String(Math.round(cart.subtotal)) : '')
  const [auto, setAuto] = useState({ status: 'idle', msg: '' })

  const calc = async () => {
    if (auto.status === 'loading') return
    if (address.trim().length < 5) {
      setAuto({ status: 'error', msg: 'Введите адрес полностью: город, улица, дом' })
      return
    }
    setAuto({ status: 'loading', msg: '' })
    try {
      const r = await api.calcDistance(settings.address, address.trim())
      setKm(String(r.km))
      setAuto({ status: 'ok', msg: 'Маршрут по дорогам: ' + r.km + ' км' })
    } catch (e) {
      setAuto({ status: 'error', msg: e.message })
    }
  }

  const d =
    String(km).trim() === ''
      ? { ok: false, cost: 0, text: 'Введите адрес и нажмите «Рассчитать расстояние»' }
      : calcDelivery(settings, { km, subtotal: Number(sum) || 0, weight: Number(weight) || 0 })

  return (
    <section className="wrap sec">
      <div className="sec-head">
        <h2>Доставка</h2>
        <span className="mono muted">РАСЧЁТ СТОИМОСТИ</span>
      </div>
      <div className="two-col">
        <div className="panel">
          <h3 className="panel-h mono">ТАРИФ</h3>
          <ul className="tariff">
            <li>
              Подача машины: <b>{rub(settings.base)}</b>
            </li>
            <li>
              За каждый километр: <b>{rub(settings.perKm)}</b>
            </li>
            <li>
              Тяжёлый груз: <b>+{rub(settings.heavyPerTon)}</b> за каждую тонну свыше первой
            </li>
            <li>
              Бесплатно при заказе от <b>{rub(settings.freeFrom)}</b> в радиусе{' '}
              <b>{settings.freeKm} км</b>
            </li>
            <li>
              Максимальное расстояние: <b>{settings.maxKm} км</b>
            </li>
            <li>
              Самовывоз: <b>бесплатно</b>, {settings.address}
            </li>
          </ul>
        </div>
        <div className="panel">
          <h3 className="panel-h mono">КАЛЬКУЛЯТОР</h3>
          <div className="form">
            <label>
              Адрес доставки
              <input
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setKm('')
                  setAuto({ status: 'idle', msg: '' })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') calc()
                }}
                placeholder="Город, улица, дом"
              />
            </label>
            <button
              type="button"
              className="btn btn-line"
              disabled={auto.status === 'loading'}
              onClick={calc}
            >
              {auto.status === 'loading' ? 'СЧИТАЕМ МАРШРУТ…' : 'РАССЧИТАТЬ РАССТОЯНИЕ'}
            </button>
            {auto.msg && <div className={'note ' + (auto.status === 'ok' ? 'okc' : 'bad')}>{auto.msg}</div>}
            <label>
              Расстояние от склада, км
              <input
                type="number"
                min="0"
                step="0.1"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="Заполнится автоматически"
              />
            </label>
            <label>
              Вес груза, кг
              <input type="number" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </label>
            <label>
              Сумма заказа, ₽
              <input type="number" min="0" value={sum} onChange={(e) => setSum(e.target.value)} />
            </label>
          </div>
          <div className={'calc-out' + (d.ok ? '' : ' bad')}>
            {d.ok ? <b>{d.cost ? rub(d.cost) : 'Бесплатно'}</b> : <b>—</b>}
            <span className="mono small">{d.text}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
