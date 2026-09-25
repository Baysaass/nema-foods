'use client'

import React, { useState, useMemo } from 'react'
import {
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Clock,
  User,
  FileText,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Order, OrderStatus, formatMNT } from '@/lib/types'
import { updateOrderStatusInSupabase, deleteOrderFromSupabase } from '@/lib/supabase'

interface AdminOrdersViewProps {
  orders: Order[]
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
  onRefresh: () => void
  isLoading?: boolean
  onShowNotice?: (msg: string) => void
}

export function AdminOrdersView({
  orders,
  setOrders,
  onRefresh,
  isLoading = false,
  onShowNotice,
}: AdminOrdersViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [search, setSearch] = useState('')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Status badge config
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Шинэ захиалга',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
        }
      case 'confirmed':
        return {
          label: 'Баталгаажсан',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          dot: 'bg-blue-500',
        }
      case 'delivered':
        return {
          label: 'Хүргэгдсэн',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-500',
        }
      case 'cancelled':
        return {
          label: 'Цуцлагдсан',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          dot: 'bg-rose-500',
        }
    }
  }

  // Handle status update
  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    // Optimistic local update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    )

    onShowNotice?.(`Захиалгын төлөвийг шинэчиллээ...`)
    const ok = await updateOrderStatusInSupabase(orderId, nextStatus)
    if (ok) {
      onShowNotice?.(`✓ Захиалгын төлөв өгөгдлийн санд амжилттай шинэчлэгдлээ!`)
    }
  }

  // Handle delete order
  const handleDeleteOrder = async (orderId: string, orgName: string) => {
    if (!confirm(`"${orgName}" байгууллагын "${orderId}" захиалгыг устгахдаа итгэлтэй байна уу?`)) {
      return
    }

    setOrders((prev) => prev.filter((o) => o.id !== orderId))
    onShowNotice?.(`Захиалгыг устгаж байна...`)
    const ok = await deleteOrderFromSupabase(orderId)
    if (ok) {
      onShowNotice?.(`✓ Захиалга амжилттай устгагдлаа.`)
    }
  }

  // Copy order summary text
  const handleCopyOrder = (order: Order) => {
    const text = `НЕМА ФҮҮДС - ЗАХИАЛГА #${order.id}
Огноо: ${new Date(order.createdAt).toLocaleString('mn-MN')}
Байгууллага: ${order.organizationName}
Холбогдох утас: ${order.contactPhone}
${order.contactPerson ? `Хариуцах хүн: ${order.contactPerson}\n` : ''}${order.address ? `Хаяг: ${order.address}\n` : ''}${order.notes ? `Тэмдэглэл: ${order.notes}\n` : ''}
--- БАРААНУУД ---
${order.items
  .map(
    (it, idx) =>
      `${idx + 1}. ${it.name} (${it.packaging === 'box' ? `Хайрцаг, ${it.boxSize || ''}ш` : 'Ширхэг'}) x ${it.quantity} = ${formatMNT(it.itemTotal)}`
  )
  .join('\n')}
НИЙТ ДҮН: ${formatMNT(order.totalAmount)}
ТӨЛӨВ: ${getStatusBadge(order.status).label}`

    navigator.clipboard.writeText(text)
    setCopiedId(order.id)
    setTimeout(() => setCopiedId(null), 2500)
    onShowNotice?.(`✓ Захиалгын мэдээлэл хуулагдлаа!`)
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.organizationName.toLowerCase().includes(q) ||
        o.contactPhone.includes(q) ||
        (o.contactPerson && o.contactPerson.toLowerCase().includes(q)) ||
        (o.address && o.address.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [orders, statusFilter, search])

  // KPIs
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0)
  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const confirmedCount = orders.filter((o) => o.status === 'confirmed').length
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length

  return (
    <div className="space-y-6">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-[8px] border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-400">Нийт захиалга</div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900">{orders.length}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">Бүх хүлээн авсан</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          className={`cursor-pointer rounded-[8px] border p-3.5 sm:p-4 shadow-xs transition-all ${
            statusFilter === 'pending'
              ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
              : 'border-slate-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="text-[11px] sm:text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Шинэ захиалга</span>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-amber-900">{pendingCount}</div>
          <div className="mt-0.5 text-[10px] text-amber-700">Баталгаажуулах шаардлагатай</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}
          className={`cursor-pointer rounded-[8px] border p-3.5 sm:p-4 shadow-xs transition-all ${
            statusFilter === 'confirmed'
              ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className="text-[11px] sm:text-xs font-semibold text-blue-800 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-500" />
            <span>Баталгаажсан</span>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-blue-900">{confirmedCount}</div>
          <div className="mt-0.5 text-[10px] text-blue-700">Хүргэлтэд бэлтгэж буй</div>
        </div>

        <div className="rounded-[8px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] sm:text-xs font-semibold text-emerald-700">
            Нийт захиалгын дүн
          </div>
          <div className="mt-1 text-lg sm:text-xl font-black text-emerald-800 truncate">
            {formatMNT(totalRevenue)}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-600 font-medium">
            Хүргэгдсэн: {deliveredCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Байгууллагын нэр, утас, захиалгын дугаараар хайх..."
              className="h-10 w-full rounded-[8px] border border-slate-300 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="cursor-pointer min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin text-[#DE3B28]' : ''}`} />
            <span>Шинэчлэх</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {[
            { id: 'all', label: `Бүх захиалга (${orders.length})` },
            { id: 'pending', label: `Шинэ (${pendingCount})` },
            { id: 'confirmed', label: `Баталгаажсан (${confirmedCount})` },
            { id: 'delivered', label: `Хүргэгдсэн (${deliveredCount})` },
            {
              id: 'cancelled',
              label: `Цуцлагдсан (${orders.filter((o) => o.status === 'cancelled').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`cursor-pointer px-3 py-1.5 rounded-[6px] text-xs font-bold transition-all shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Package className="size-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800">Захиалга олдсонгүй</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? 'Таны хайсан илэрцэд тохирох захиалга байхгүй байна.'
              : 'Одоогоор энэхүү ангилалд захиалга бүртгэгдээгүй байна.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status)
            const isExpanded = expandedOrderId === order.id

            return (
              <div
                key={order.id}
                className="rounded-[8px] border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Order Top Bar */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#DE3B28] bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-[6px]">
                        {order.id}
                      </span>

                      {/* Status Dropdown */}
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className={`cursor-pointer rounded-[6px] px-2.5 py-0.5 text-xs font-bold border transition-colors ${badge.bg}`}
                      >
                        <option value="pending">🟡 Шинэ захиалга</option>
                        <option value="confirmed">🔵 Баталгаажсан</option>
                        <option value="delivered">🟢 Хүргэгдсэн</option>
                        <option value="cancelled">🔴 Цуцлагдсан</option>
                      </select>

                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(order.createdAt).toLocaleString('mn-MN')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="text-base font-bold text-slate-900">
                        {order.organizationName}
                      </h3>
                      {order.contactPerson && (
                        <span className="text-xs text-slate-500 font-medium">
                          (Хариуцах: {order.contactPerson})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <a
                        href={`tel:${order.contactPhone.replace(/[^0-9+]/g, '')}`}
                        className="inline-flex items-center gap-1 font-bold text-[#DE3B28] hover:underline"
                      >
                        <Phone className="size-3" />
                        <span>{order.contactPhone}</span>
                      </a>
                      {order.email && (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Mail className="size-3 text-slate-400" />
                          <span>{order.email}</span>
                        </span>
                      )}
                      {order.address && (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <MapPin className="size-3 text-slate-400" />
                          <span>{order.address}</span>
                        </span>
                      )}
                    </div>

                    {order.notes && (
                      <div className="rounded-[6px] bg-amber-50/80 border border-amber-200/80 p-2 text-xs text-amber-900">
                        <b className="font-semibold">Тэмдэглэл:</b> {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Price & Action Buttons */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Нийт төлөх дүн
                      </span>
                      <div className="text-xl font-black text-slate-900">
                        {formatMNT(order.totalAmount)}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {order.items.length} нэр төрөл, {order.totalItems} ширхэг/хайрцаг
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyOrder(order)}
                        title="Захиалгын текстийг хуулах"
                        className="cursor-pointer min-h-[36px] inline-flex items-center gap-1 rounded-[6px] border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                      >
                        {copiedId === order.id ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5 text-slate-500" />
                        )}
                        <span>{copiedId === order.id ? 'Хууллаа' : 'Хуулах'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedOrderId(isExpanded ? null : order.id)
                        }
                        className="cursor-pointer min-h-[36px] inline-flex items-center gap-1 rounded-[6px] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 transition-colors"
                      >
                        <span>Бараанууд ({order.items.length})</span>
                        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order.id, order.organizationName)}
                        title="Захиалга устгах"
                        className="cursor-pointer min-h-[36px] size-9 flex items-center justify-center rounded-[6px] border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Items Table */}
                {isExpanded && (
                  <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                    <div className="text-xs font-bold text-slate-800">
                      Захиалсан барааны дэлгэрэнгүй жагсаалт:
                    </div>
                    <div className="overflow-x-auto rounded-[6px] border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 text-[11px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Барааны нэр</th>
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3">Савалгаа</th>
                            <th className="py-2 px-3 text-center">Тоо ширхэг</th>
                            <th className="py-2 px-3 text-right">Нэгж үнэ</th>
                            <th className="py-2 px-3 text-right">Нийт үнэ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {order.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900">{it.name}</td>
                              <td className="py-2 px-3 font-mono text-slate-500">{it.sku}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    it.packaging === 'box'
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {it.packaging === 'box'
                                    ? `📦 Хайрцаг (${it.boxSize || ''}ш)`
                                    : `Ширхэг (${it.unit})`}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-900">
                                {it.quantity} {it.packaging === 'box' ? 'хайрцаг' : it.unit}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">
                                {formatMNT(it.unitPrice)}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                {formatMNT(it.itemTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                          <tr>
                            <td colSpan={6} className="py-2.5 px-3 text-right text-slate-700">
                              Нийт дүн:
                            </td>
                            <td className="py-2.5 px-3 text-right text-sm font-black text-[#DE3B28]">
                              {formatMNT(order.totalAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
