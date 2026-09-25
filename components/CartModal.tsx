'use client'

import React, { useState } from 'react'
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Building2,
  Phone,
  User,
  MapPin,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  Package,
  ArrowRight,
  AlertCircle,
  Mail,
} from 'lucide-react'
import { CartItem, CartPackaging, Order, OrderItem, formatMNT } from '@/lib/types'
import { saveOrderToSupabase } from '@/lib/supabase'

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  cart: CartItem[]
  onUpdateQuantity: (productId: number, packaging: CartPackaging, quantity: number) => void
  onRemoveItem: (productId: number, packaging: CartPackaging) => void
  onClearCart: () => void
}

export function CartModal({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartModalProps) {
  const [formData, setFormData] = useState({
    organizationName: '',
    contactPhone: '',
    contactPerson: '',
    email: '',
    address: '',
    notes: '',
    registerNumber: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = cart.reduce((sum, item) => sum + item.itemTotal, 0)

  const handleCopyOrderInfo = (order: Order) => {
    const text = `НЕМА ФҮҮДС - БАЙГУУЛЛАГЫН ЗАХИАЛГА
Захиалгын дугаар: ${order.id}
Огноо: ${new Date(order.createdAt).toLocaleString('mn-MN')}
Байгууллага: ${order.organizationName}
Холбогдох утас: ${order.contactPhone}
${order.contactPerson ? `Хариуцах хүн: ${order.contactPerson}\n` : ''}${order.address ? `Хүргэлтийн хаяг: ${order.address}\n` : ''}${order.notes ? `Тэмдэглэл: ${order.notes}\n` : ''}
--- БАРААНЫ ЖАГСААЛТ ---
${order.items
  .map(
    (it, idx) =>
      `${idx + 1}. ${it.name} (${it.packaging === 'box' ? `Хайрцгаар, ${it.boxSize || ''}ш-тэй` : 'Ширхэгээр'}) x ${it.quantity} = ${formatMNT(it.itemTotal)}`
  )
  .join('\n')}
-------------------------
НИЙТ ТӨЛӨХ ДҮН: ${formatMNT(order.totalAmount)}`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!formData.organizationName.trim()) {
      setErrorMessage('Байгууллага / Дэлгүүрийн нэрээ оруулна уу!')
      return
    }

    if (!formData.contactPhone.trim()) {
      setErrorMessage('Холбогдох утасны дугаараа оруулна уу!')
      return
    }

    if (cart.length === 0) {
      setErrorMessage('Сагс хоосон байна!')
      return
    }

    setIsSubmitting(true)

    try {
      const now = new Date()
      const datePart = now.toISOString().slice(2, 10).replace(/-/g, '')
      const randPart = Math.floor(100 + Math.random() * 900)
      const orderId = `NF-${datePart}-${randPart}`

      const orderItems: OrderItem[] = cart.map((c) => ({
        productId: c.productId,
        sku: c.sku,
        name: c.name,
        image: c.image,
        packaging: c.packaging,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        itemTotal: c.itemTotal,
        boxSize: c.boxSize,
        unit: c.unit,
      }))

      const newOrder: Order = {
        id: orderId,
        createdAt: now.toISOString(),
        organizationName: formData.organizationName.trim(),
        contactPhone: formData.contactPhone.trim(),
        contactPerson: formData.contactPerson.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        registerNumber: formData.registerNumber.trim() || undefined,
        items: orderItems,
        totalItems: totalItemsCount,
        totalAmount,
        status: 'pending',
      }

      const success = await saveOrderToSupabase(newOrder)

      if (success) {
        setCompletedOrder(newOrder)
        onClearCart()
      } else {
        setErrorMessage('Захиалга илгээхэд алдаа гарлаа. Та дахин оролдоно уу.')
      }
    } catch (err: any) {
      console.error('Order submission error:', err)
      setErrorMessage('Холболтын алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-[8px] sm:rounded-[8px] border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Mobile Swipe handle */}
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-[8px] bg-red-50 text-[#DE3B28] border border-red-200/60">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {completedOrder ? 'Захиалга Баталгаажлаа' : 'Таны Сагс & Захиалга'}
              </h2>
              <p className="text-xs text-slate-500">
                {completedOrder
                  ? `Захиалгын дугаар: ${completedOrder.id}`
                  : `Нийт ${cart.length} төрлийн бүтээгдэхүүн сонгогдсон`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Хаах"
            className="cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {completedOrder ? (
            /* --- ORDER SUCCESS SCREEN --- */
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
                <CheckCircle2 className="size-8" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  Захиалга амжилттай илгээгдлээ!
                </h3>
                <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
                  Таны захиалгыг хүлээн авлаа. Манай борлуулалтын менежер тантай{' '}
                  <b className="text-slate-900">{completedOrder.contactPhone}</b> утсаар удахгүй
                  холбогдож захиалгыг баталгаажуулна.
                </p>
              </div>

              {/* Order Info Card */}
              <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4 text-left space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Захиалгын дугаар
                    </span>
                    <div className="font-mono text-base font-extrabold text-[#DE3B28]">
                      {completedOrder.id}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Огноо</span>
                    <div className="text-xs font-semibold text-slate-700">
                      {new Date(completedOrder.createdAt).toLocaleDateString('mn-MN')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Байгууллагын нэр:</span>{' '}
                    <b className="text-slate-900">{completedOrder.organizationName}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Холбогдох утас:</span>{' '}
                    <b className="text-slate-900">{completedOrder.contactPhone}</b>
                  </div>
                  {completedOrder.address && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 font-medium">Хүргэлтийн хаяг:</span>{' '}
                      <span className="text-slate-800">{completedOrder.address}</span>
                    </div>
                  )}
                </div>

                {/* Items Summary */}
                <div className="border-t border-slate-200/80 pt-2.5">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Захиалсан бараанууд:
                  </span>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {completedOrder.items.map((it) => (
                      <div
                        key={`${it.productId}-${it.packaging}`}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded-[6px] border border-slate-200"
                      >
                        <div className="flex-1 truncate mr-2">
                          <span className="font-semibold text-slate-900">{it.name}</span>
                          <span className="text-[10px] text-slate-500 block">
                            {it.packaging === 'box'
                              ? `📦 Хайрцгаар (${it.boxSize || ''}ш-тэй)`
                              : `Ширхэгээр (${it.unit})`}{' '}
                            x {it.quantity}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0">
                          {formatMNT(it.itemTotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
                    <span>Нийт дүн:</span>
                    <span className="text-lg text-[#DE3B28]">
                      {formatMNT(completedOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopyOrderInfo(completedOrder)}
                  className="cursor-pointer min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check className="size-4 text-emerald-600" />
                      <span className="text-emerald-700">Хууллаа!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4 text-slate-500" />
                      <span>Мэдээллийг хуулах</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-[#DE3B28] transition-colors shadow-xs"
                >
                  <span>Каталог руу буцах</span>
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            /* --- EMPTY CART SCREEN --- */
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ShoppingBag className="size-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Таны сагс хоосон байна</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Каталогоос хүссэн бараагаа сонгон ширхэгээр эсвэл хайрцгаар сагсандаа нэмнэ үү.
              </p>
              <button
                onClick={onClose}
                className="cursor-pointer min-h-[44px] mt-2 inline-flex items-center gap-1.5 rounded-[8px] bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-[#DE3B28] transition-colors"
              >
                <span>Бараа үзэх</span>
              </button>
            </div>
          ) : (
            /* --- CART ITEMS & B2B CHECKOUT FORM --- */
            <div className="space-y-5">
              {/* Cart Items List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2">
                  <span>Сонгосон бараанууд ({cart.length})</span>
                  <button
                    onClick={onClearCart}
                    className="cursor-pointer text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    Сагс цэвэрлэх
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={`${item.productId}-${item.packaging}`}
                      className="flex items-center justify-between gap-3 rounded-[8px] border border-slate-200 bg-white p-3 shadow-xs hover:border-slate-300 transition-all"
                    >
                      {/* Product Thumbnail */}
                      <div className="size-12 shrink-0 rounded-[6px] bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="size-full object-contain p-0.5"
                          />
                        ) : (
                          <Package className="size-5 text-slate-400" />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-[4px] ${
                              item.packaging === 'box'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.packaging === 'box' ? (
                              <>
                                <Package className="size-2.5" />
                                <span>Хайрцгаар ({item.boxSize || ''}ш)</span>
                              </>
                            ) : (
                              <span>Ширхэгээр</span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {formatMNT(item.unitPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 rounded-[6px] border border-slate-200 bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.productId, item.packaging, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="cursor-pointer size-6 flex items-center justify-center rounded-[4px] bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.productId, item.packaging, item.quantity + 1)
                          }
                          className="cursor-pointer size-6 flex items-center justify-center rounded-[4px] bg-white text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      {/* Item Subtotal & Delete */}
                      <div className="text-right min-w-[70px]">
                        <div className="text-xs font-black text-slate-900">
                          {formatMNT(item.itemTotal)}
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId, item.packaging)}
                          title="Сагснаас хасах"
                          className="cursor-pointer text-[10px] text-rose-500 hover:text-rose-700 font-medium inline-flex items-center gap-0.5 mt-0.5"
                        >
                          <Trash2 className="size-3" />
                          <span>Хасах</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal Banner */}
                <div className="flex items-center justify-between rounded-[8px] bg-amber-50/70 border border-amber-200/80 p-3 text-xs font-bold">
                  <span className="text-amber-950">Нийт захиалгын дүн:</span>
                  <span className="text-base text-[#DE3B28]">{formatMNT(totalAmount)}</span>
                </div>
              </div>

              {/* B2B Checkout Form */}
              <form onSubmit={handleSubmitOrder} className="space-y-3.5 border-t border-slate-100 pt-4">
                <div className="rounded-[8px] bg-blue-50/70 border border-blue-200/70 p-3 text-xs text-blue-900 flex items-start gap-2">
                  <AlertCircle className="size-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Төлбөр онлайн төлөх шаардлагагүй:</span>
                    <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
                      Та байгууллагын нэр, утасны дугаараа үлдээн захиалахад хангалттай. Манай
                      борлуулалтын менежер утсаар холбогдон нэхэмжлэх, гэрээ болон хүргэлтийг шуурхай
                      зохион байгуулна.
                    </p>
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-[8px] bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
                    {errorMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Organization Name */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                      <Building2 className="size-3.5 text-[#DE3B28]" />
                      <span>Байгууллага / Дэлгүүрийн нэр *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.organizationName}
                      onChange={(e) =>
                        setFormData({ ...formData, organizationName: e.target.value })
                      }
                      placeholder="Жишээ: Номин Их Дэлгүүр ХХК"
                      className="h-10 w-full rounded-[8px] border border-slate-300 px-3 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                      <Phone className="size-3.5 text-[#DE3B28]" />
                      <span>Холбогдох утасны дугаар *</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="Жишээ: 99112233"
                      className="h-10 w-full rounded-[8px] border border-slate-300 px-3 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Contact Person */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                      <User className="size-3.5 text-slate-500" />
                      <span>Хариуцах ажилтны нэр</span>
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="Жишээ: Бат-Эрдэнэ"
                      className="h-10 w-full rounded-[8px] border border-slate-300 px-3 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Register Number or Email */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                      <FileText className="size-3.5 text-slate-500" />
                      <span>Байгууллагын РД / И-мэйл</span>
                    </label>
                    <input
                      type="text"
                      value={formData.registerNumber}
                      onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value })}
                      placeholder="НӨАТ авах бол РД бичнэ үү"
                      className="h-10 w-full rounded-[8px] border border-slate-300 px-3 text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                    <MapPin className="size-3.5 text-slate-500" />
                    <span>Хүргэлтийн хаяг / Байршил</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Жишээ: УБ хот, Баянзүрх дүүрэг, 13-р хороолол..."
                    className="h-10 w-full rounded-[8px] border border-slate-300 px-3 text-xs focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                {/* Additional notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    Нэмэлт тэмдэглэл / хүсэлт
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Хүргэлтийн цаг, сав баглаа боодолтой холбоотой хүсэлт..."
                    className="w-full rounded-[8px] border border-slate-300 p-2.5 text-xs focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer min-h-[44px] rounded-[8px] border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Буцах
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#DE3B28] px-6 py-2.5 text-xs font-black text-white hover:bg-[#b82a1a] shadow-md transition-all active:scale-[0.98]"
                  >
                    <span>
                      {isSubmitting ? 'Илгээж байна...' : `Захиалга Илгээх (${formatMNT(totalAmount)})`}
                    </span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
