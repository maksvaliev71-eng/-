import { useState } from 'react'
import { Qty } from '../components.jsx'
import * as api from '../api.js'
import { fmt, rub, calcDelivery, routeLink, PAY_METHODS } from '../data.js'

export function Cart({ ctx }) {
  const { settings, cart, zoneOf } = ctx
  const { lines, subtotal, weight } = cart

  const [mode, setMode] = useState('pickup')
  const [address, setAddress] = useState('')
  const [km, setKm] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [pay, setPay] = useState('card')
  const [paying, setPaying] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!lines.length) {
    return (
      <section className="wrap sec">
        <div className="sec-head">
          <h2>Корзина</h2>
        </div>
        <div className="empty mono">КОРЗИНА ПУСТА</div>
        <p style={{ textAlign: 'center' }}>
          <a href="#/catalog" className="btn btn-pri">
            В КАТАЛОГ →
          </a>
        </p>
      </section>
    )
  }

  const pickup = mode === 'pickup'
  let d = { ok: true, cost: 0, text: 'Самовывоз — бесплатно' }
  if (!pickup) {
    if (!address.trim()) d = { ok: false, cost: 0, text: 'Укажите адрес доставки' }
    else d = calcDelivery(settings, { km, subtotal, weight })
  }
  const total = subtotal + (d.ok ? d.cost : 0)

  const makeOrder = (paid) => ({
    code: 'S' + Date.now().toString(36).toUpperCase().slice(-6),
    name: name.trim(),
    phone: phone.trim(),
    comment: comment.trim(),
    delivery: pickup ? 'pickup' : 'courier',
    address: pickup ? '' : address.trim(),
    km: pickup ? '' : km,
    pay,
    paid,
    items: lines.map((l) => ({
      id: l.p.id,
      sku: l.p.sku,
      name: l.p.name,
      unit: l.p.unit,
      price: l.p.price,
      qty: l.qty,
    })),
    subtotal,
    deliveryCost: d.cost,
    total,
  })

  const send = async (order) => {
    setBusy(true)
    setError('')
    try {
      await api.createOrder(order)
      cart.clear()
      setPaying(null)
      location.hash = '#/done/' + order.code
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  const submit = () => {
    setError('')
    if (!d.ok) return setError(d.text)
    if (!name.trim() || !phone.trim()) return setError('Укажите имя и телефон')
    const order = makeOrder(false)
    if (pay === 'card') setPaying(order)
    else send(order)
  }

  return (
    <section className="wrap sec">
      <div className="sec-head">
        <h2>Корзина и оформление</h2>
        <span className="mono muted">ПОЗИЦИЙ: {lines.length}</span>
      </div>
      <div className="cart-grid">
        <div className="stack">
          <div className="panel">
            <h3 className="panel-h mono">ТОВАРЫ</h3>
            {lines.map((l) => (
              <div className="line" key={l.p.id}>
                <div className="line-img">
                  {l.p.imageUrl ? <img src={l.p.imageUrl} alt="" /> : <span className="mono">{zoneOf(l.p.category)}</span>}
                </div>
                <div className="line-main">
                  <a href={'#/product/' + l.p.id}>{l.p.name}</a>
                  <div className="mono muted small">
                    {fmt(l.p.price)} ₽ / {l.p.unit}
                    {l.p.sku ? ' · АРТ. ' + l.p.sku : ''}
                  </div>
                </div>
                <Qty value={l.qty} onChange={(v) => cart.setQty(l.p.id, v)} />
                <b className="line-sum">{rub(l.p.price * l.qty)}</b>
                <button
                  type="button"
                  className="btn btn-line sm"
                  aria-label="Удалить"
                  onClick={() => cart.remove(l.p.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3 className="panel-h mono">ПОЛУЧЕНИЕ</h3>
            <label className={'opt' + (pickup ? ' on' : '')}>
              <input type="radio" name="mode" checked={pickup} onChange={() => setMode('pickup')} />
              <span>
                <b>Самовывоз</b>
                <span className="muted small">{settings.address}</span>
              </span>
            </label>
            <label className={'opt' + (!pickup ? ' on' : '')}>
              <input type="radio" name="mode" checked={!pickup} onChange={() => setMode('courier')} />
              <span>
                <b>Доставка до адреса</b>
                <span className="muted small">Вес груза: {fmt(weight)} кг</span>
              </span>
            </label>
            {!pickup && (
              <div className="form">
                <label>
                  Адрес доставки
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Город, улица, дом"
                  />
                </label>
                <label>
                  Расстояние от склада, км
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    placeholder="Например, 12"
                  />
                </label>
                <a
                  className="mono small"
                  href={routeLink(settings.address, address)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  → УЗНАТЬ РАССТОЯНИЕ НА ЯНДЕКС.КАРТАХ
                </a>
                <div className={'note ' + (d.ok ? 'okc' : 'bad')}>{d.text}</div>
              </div>
            )}
          </div>

          <div className="panel">
            <h3 className="panel-h mono">КОНТАКТЫ</h3>
            <div className="form two">
              <label>
                Имя
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>
              <label>
                Телефон
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7"
                  autoComplete="tel"
                />
              </label>
            </div>
            <div className="form">
              <label>
                Комментарий к заказу
                <input value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>
            </div>
          </div>

          <div className="panel">
            <h3 className="panel-h mono">ОПЛАТА</h3>
            {[
              ['card', 'Картой онлайн', 'Переход на защищённую страницу оплаты'],
              ['receipt', 'При получении', 'Наличными или картой на складе или курьеру'],
              ['invoice', 'По счёту', 'Для организаций: выставим счёт на оплату'],
            ].map(([k, t, s]) => (
              <label key={k} className={'opt' + (pay === k ? ' on' : '')}>
                <input type="radio" name="pay" checked={pay === k} onChange={() => setPay(k)} />
                <span>
                  <b>{t}</b>
                  <span className="muted small">{s}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <aside className="summary">
          <h3 className="panel-h mono">ИТОГО</h3>
          <div className="tot">
            <span>Товары</span>
            <span>{rub(subtotal)}</span>
          </div>
          <div className="tot">
            <span>Доставка</span>
            <span>{pickup ? '—' : d.ok ? (d.cost ? rub(d.cost) : 'бесплатно') : 'не рассчитана'}</span>
          </div>
          <div className="tot big">
            <span>К оплате</span>
            <span>{rub(total)}</span>
          </div>
          {error && <div className="note bad">{error}</div>}
          <button type="button" className="btn btn-pri big wide" disabled={busy || !d.ok} onClick={submit}>
            {pay === 'card' ? 'ПЕРЕЙТИ К ОПЛАТЕ' : 'ОФОРМИТЬ ЗАКАЗ'}
          </button>
        </aside>
      </div>

      {paying && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-box">
            <h3 className="panel-h mono">ОПЛАТА ЗАКАЗА {paying.code}</h3>
            <p>
              Сумма к оплате: <b>{rub(paying.total)}</b>
            </p>
            <p className="muted small">
              Это демонстрационная оплата. Для приёма настоящих платежей подключается платёжный сервис
              (ЮKassa и т. п.): здесь будет переход на его страницу.
            </p>
            <div className="row gap">
              <button
                type="button"
                className="btn btn-pri grow"
                disabled={busy}
                onClick={() => send({ ...paying, paid: true })}
              >
                ОПЛАТИТЬ (ДЕМО)
              </button>
              <button type="button" className="btn btn-line" onClick={() => setPaying(null)}>
                НАЗАД
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export function OrderDone({ code }) {
  return (
    <section className="wrap sec">
      <div className="panel done">
        <div className="mono acc small-cap">// ЗАКАЗ ПРИНЯТ</div>
        <h1>Заказ № {code}</h1>
        <p className="lead">Мы свяжемся с вами по указанному телефону для подтверждения.</p>
        <a href="#/catalog" className="btn btn-pri">
          ПРОДОЛЖИТЬ ПОКУПКИ →
        </a>
      </div>
    </section>
  )
}
