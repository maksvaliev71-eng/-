import { useEffect, useState } from 'react'
import * as api from '../api.js'
import { fmt, rub, PAY_METHODS, STATUSES } from '../data.js'

const ALIAS = {
  sku: ['артикул', 'sku', 'код'],
  name: ['название', 'наименование', 'name'],
  category: ['категория', 'группа', 'category'],
  price: ['цена', 'price'],
  unit: ['ед', 'единица', 'unit'],
  weight: ['вес', 'weight'],
  stock: ['остаток', 'stock'],
}

function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase())
  const col = {}
  Object.keys(ALIAS).forEach((k) => {
    col[k] = head.findIndex((h) => ALIAS[k].some((a) => h.startsWith(a)))
  })
  const num = (v) => {
    const n = parseFloat(String(v || '').replace(/\s/g, '').replace(',', '.'))
    return isNaN(n) ? 0 : n
  }
  return lines
    .slice(1)
    .map((l) => {
      const c = l.split(sep).map((x) => x.trim())
      const get = (k) => (col[k] >= 0 ? c[col[k]] : '')
      return {
        sku: get('sku') || '',
        name: get('name') || '',
        category: get('category') || 'Без категории',
        price: num(get('price')),
        unit: get('unit') || 'шт',
        weight: num(get('weight')),
        stock: col.stock >= 0 && get('stock') !== '' ? num(get('stock')) : null,
        active: true,
      }
    })
    .filter((r) => r.name)
}

function Login({ onDone }) {
  const [login, setLogin] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await api.signIn(login, pass)
      onDone()
    } catch (x) {
      setErr(x.message)
    }
    setBusy(false)
  }
  return (
    <section className="wrap sec">
      <form className="panel login" onSubmit={submit}>
        <h3 className="panel-h mono">ВХОД ДЛЯ АДМИНИСТРАТОРА</h3>
        <div className="form">
          {!api.isDemo && (
            <label>
              Почта
              <input type="email" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
            </label>
          )}
          <label>
            {api.isDemo ? 'PIN' : 'Пароль'}
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
          </label>
        </div>
        {api.isDemo && (
          <p className="muted small">Демо-режим: данные хранятся только в этом браузере. PIN: 1234</p>
        )}
        {err && <div className="note bad">{err}</div>}
        <button className="btn btn-pri wide" disabled={busy}>
          ВОЙТИ
        </button>
      </form>
    </section>
  )
}

function ProductEditor({ initial, categories, onClose, onSaved, toast }) {
  const [p, setP] = useState(initial)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }))

  const pick = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setBusy(true)
    try {
      set('imageUrl', await api.uploadImage(f))
    } catch (x) {
      toast(x.message)
    }
    setBusy(false)
  }

  const save = async () => {
    if (!p.name.trim()) return toast('Введите название')
    setBusy(true)
    try {
      await api.saveProduct({ ...p, name: p.name.trim() })
      await onSaved()
      onClose()
      toast('Сохранено')
    } catch (x) {
      toast(x.message)
    }
    setBusy(false)
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-box wide-box">
        <h3 className="panel-h mono">{initial.id ? 'РЕДАКТИРОВАТЬ ТОВАР' : 'НОВЫЙ ТОВАР'}</h3>
        <div className="editor">
          <div>
            <div className="ed-img">
              {p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span className="mono">[НЕТ ФОТО]</span>}
            </div>
            <div className="row gap" style={{ marginTop: 10 }}>
              <label className="btn btn-line sm file">
                ЗАГРУЗИТЬ ФОТО
                <input type="file" accept="image/*" onChange={pick} hidden />
              </label>
              {p.imageUrl && (
                <button type="button" className="btn btn-line sm" onClick={() => set('imageUrl', '')}>
                  УБРАТЬ
                </button>
              )}
            </div>
          </div>
          <div className="form">
            <label>
              Название
              <input value={p.name} onChange={(e) => set('name', e.target.value)} />
            </label>
            <div className="form two">
              <label>
                Артикул (код из 1С)
                <input value={p.sku} onChange={(e) => set('sku', e.target.value)} />
              </label>
              <label>
                Категория
                <input list="cats" value={p.category} onChange={(e) => set('category', e.target.value)} />
                <datalist id="cats">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
            </div>
            <div className="form two">
              <label>
                Цена, ₽
                <input type="number" min="0" value={p.price} onChange={(e) => set('price', e.target.value)} />
              </label>
              <label>
                Единица
                <input value={p.unit} onChange={(e) => set('unit', e.target.value)} />
              </label>
              <label>
                Вес единицы, кг
                <input type="number" min="0" step="0.1" value={p.weight} onChange={(e) => set('weight', e.target.value)} />
              </label>
              <label>
                Остаток
                <input type="number" min="0" value={p.stock ?? ''} onChange={(e) => set('stock', e.target.value)} />
              </label>
            </div>
            <label>
              Описание
              <textarea rows="3" value={p.description} onChange={(e) => set('description', e.target.value)} />
            </label>
            <label className="check">
              <input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} />
              Показывать на сайте
            </label>
          </div>
        </div>
        <div className="row gap" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-pri grow" disabled={busy} onClick={save}>
            СОХРАНИТЬ
          </button>
          <button type="button" className="btn btn-line" onClick={onClose}>
            ОТМЕНА
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductsTab({ ctx }) {
  const { allProducts, categories, reload, toast } = ctx
  const [edit, setEdit] = useState(null)
  const [filter, setFilter] = useState('')
  const blank = { id: '', sku: '', name: '', category: '', price: 0, unit: 'шт', weight: 0, stock: null, imageUrl: '', description: '', active: true }
  const list = allProducts.filter(
    (p) =>
      !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(filter.toLowerCase())
  )

  const remove = async (p) => {
    if (!confirm('Удалить «' + p.name + '»?')) return
    try {
      await api.deleteProduct(p.id)
      await reload()
      toast('Удалено')
    } catch (x) {
      toast(x.message)
    }
  }

  const importFile = async (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    try {
      const rows = parseCSV(await f.text())
      if (!rows.length) return toast('В файле нет товаров. Проверьте заголовки столбцов.')
      if (!confirm('Загрузить товаров: ' + rows.length + '? Товары с совпадающим артикулом обновятся.')) return
      await api.importProducts(rows)
      await reload()
      toast('Загружено товаров: ' + rows.length)
    } catch (x) {
      toast(x.message)
    }
  }

  return (
    <>
      <div className="row gap wrapx" style={{ marginBottom: 14 }}>
        <button className="btn btn-pri" onClick={() => setEdit(blank)}>
          + ДОБАВИТЬ ТОВАР
        </button>
        <label className="btn btn-line file">
          ИМПОРТ ИЗ CSV
          <input type="file" accept=".csv,text/csv,text/plain" onChange={importFile} hidden />
        </label>
        <input
          className="admin-search"
          placeholder="ПОИСК ПО ТОВАРАМ"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <p className="muted small">
        CSV: первая строка с заголовками — артикул; название; категория; цена; ед; вес; остаток (разделитель «;» или «,»).
      </p>
      <div className="panel scrollx">
        <table className="tbl">
          <thead>
            <tr>
              <th></th>
              <th>Название</th>
              <th>Артикул</th>
              <th>Цена</th>
              <th>Остаток</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'off'}>
                <td>
                  <div className="th">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : null}</div>
                </td>
                <td>
                  {p.name}
                  <div className="muted small">
                    {p.category}
                    {p.active ? '' : ' · скрыт'}
                  </div>
                </td>
                <td className="mono">{p.sku || '—'}</td>
                <td>
                  {fmt(p.price)} ₽ / {p.unit}
                </td>
                <td>{p.stock != null ? fmt(p.stock) : '—'}</td>
                <td className="nowrap">
                  <button className="btn btn-line sm" onClick={() => setEdit({ ...blank, ...p })}>
                    ИЗМЕНИТЬ
                  </button>{' '}
                  <button className="btn btn-line sm danger" aria-label="Удалить" onClick={() => remove(p)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <div className="empty mono">ТОВАРОВ НЕТ</div>}
      </div>
      {edit && (
        <ProductEditor
          initial={edit}
          categories={categories}
          onClose={() => setEdit(null)}
          onSaved={reload}
          toast={toast}
        />
      )}
    </>
  )
}

function OrdersTab({ toast }) {
  const [orders, setOrders] = useState(null)
  const load = async () => {
    try {
      setOrders(await api.listOrders())
    } catch (x) {
      toast(x.message)
      setOrders([])
    }
  }
  useEffect(() => {
    load()
  }, [])

  const patch = async (id, p) => {
    try {
      await api.updateOrder(id, p)
      await load()
    } catch (x) {
      toast(x.message)
    }
  }

  if (!orders) return <div className="empty mono">ЗАГРУЗКА…</div>
  if (!orders.length) return <div className="empty mono">ЗАКАЗОВ ПОКА НЕТ</div>
  return (
    <div className="stack">
      {orders.map((o) => (
        <div className="panel" key={o.id}>
          <div className="row gap wrapx">
            <b className="mono">№ {o.code}</b>
            <span className="muted small grow">{new Date(o.date).toLocaleString('ru-RU')}</span>
            <select value={o.status} onChange={(e) => patch(o.id, { status: e.target.value })}>
              {Object.entries(STATUSES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <label className="check">
              <input type="checkbox" checked={o.paid} onChange={(e) => patch(o.id, { paid: e.target.checked })} />
              Оплачен
            </label>
          </div>
          <div style={{ margin: '8px 0' }}>
            {o.name}, <a href={'tel:' + o.phone}>{o.phone}</a>
            <div className="muted small">
              {o.delivery === 'pickup' ? 'Самовывоз' : 'Доставка: ' + o.address + (o.km ? ' (' + o.km + ' км)' : '')}
              {' · '}
              {PAY_METHODS[o.pay] || o.pay}
            </div>
            {o.comment && <div className="muted small">Комментарий: {o.comment}</div>}
          </div>
          <ul className="oi">
            {o.items.map((i, idx) => (
              <li key={idx}>
                {i.sku ? <span className="mono muted">{i.sku} · </span> : null}
                {i.name} × {i.qty} {i.unit} — {rub(i.price * i.qty)}
              </li>
            ))}
          </ul>
          <b>
            Итого: {rub(o.total)} <span className="muted small">(доставка {rub(o.deliveryCost)})</span>
          </b>
        </div>
      ))}
    </div>
  )
}

const FIELDS = [
  ['shopName', 'Название магазина'],
  ['tagline', 'Подзаголовок под логотипом'],
  ['phone', 'Телефон'],
  ['email', 'Почта'],
  ['address', 'Адрес склада (откуда доставка)'],
  ['hours', 'Часы работы'],
]
const TARIFF = [
  ['base', 'Подача, ₽'],
  ['perKm', 'За 1 км, ₽'],
  ['heavyPerTon', 'За каждую тонну свыше первой, ₽'],
  ['maxKm', 'Максимум, км'],
  ['freeFrom', 'Бесплатно от суммы, ₽'],
  ['freeKm', '…в радиусе, км'],
]

function SettingsTab({ ctx }) {
  const { settings, setSettings, toast } = ctx
  const [s, setS] = useState(settings)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    const clean = { ...s }
    TARIFF.forEach(([k]) => {
      clean[k] = Number(clean[k]) || 0
    })
    try {
      await api.saveSettings(clean)
      setSettings(clean)
      toast('Настройки сохранены')
    } catch (x) {
      toast(x.message)
    }
    setBusy(false)
  }
  return (
    <div className="stack">
      <div className="panel">
        <h3 className="panel-h mono">МАГАЗИН</h3>
        <div className="form two">
          {FIELDS.map(([k, l]) => (
            <label key={k}>
              {l}
              <input value={s[k] ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
            </label>
          ))}
        </div>
      </div>
      <div className="panel">
        <h3 className="panel-h mono">ТАРИФ ДОСТАВКИ</h3>
        <div className="form two">
          {TARIFF.map(([k, l]) => (
            <label key={k}>
              {l}
              <input type="number" min="0" value={s[k] ?? 0} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
            </label>
          ))}
        </div>
      </div>
      <div>
        <button className="btn btn-pri" disabled={busy} onClick={save}>
          СОХРАНИТЬ НАСТРОЙКИ
        </button>
      </div>
    </div>
  )
}

export function Admin({ ctx }) {
  const [auth, setAuth] = useState(null)
  const [tab, setTab] = useState('products')

  useEffect(() => {
    api.getSession().then(setAuth)
  }, [])

  useEffect(() => {
    if (auth) ctx.reload()
  }, [auth])

  if (auth === null) return <div className="empty mono">ЗАГРУЗКА…</div>
  if (!auth) return <Login onDone={() => setAuth(true)} />

  const out = async () => {
    await api.signOut()
    setAuth(false)
  }

  return (
    <section className="wrap sec">
      <div className="sec-head">
        <h2>Администратор</h2>
        <button className="btn btn-line sm" onClick={out}>
          ВЫЙТИ
        </button>
      </div>
      {api.isDemo && (
        <div className="note warn">
          ДЕМО-РЕЖИМ: база данных не подключена, всё хранится только в этом браузере.
        </div>
      )}
      <div className="chips">
        {[
          ['products', 'ТОВАРЫ'],
          ['orders', 'ЗАКАЗЫ'],
          ['settings', 'НАСТРОЙКИ'],
        ].map(([k, l]) => (
          <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'products' && <ProductsTab ctx={ctx} />}
      {tab === 'orders' && <OrdersTab toast={ctx.toast} />}
      {tab === 'settings' && <SettingsTab ctx={ctx} />}
    </section>
  )
}
