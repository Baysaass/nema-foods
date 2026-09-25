'use client'

import React, { useState } from 'react'
import { X, Package, Check, ShoppingCart, Plus, Minus } from 'lucide-react'
import { Product, CartPackaging, formatMNT } from '@/lib/types'

interface AddToCartDialogProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (
    product: Product,
    packaging: CartPackaging,
    quantity: number,
    unitPrice: number
  ) => void
}

export function AddToCartDialog({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: AddToCartDialogProps) {
  if (!isOpen || !product) return null

  const isBoxed = Boolean(product.isBoxed && product.boxSize && product.boxSize > 0)
  const defaultBoxPrice =
    product.boxPrice ||
    (product.hasBulkPrice && product.bulkPrice
      ? product.bulkPrice * (product.boxSize || 12)
      : product.price * (product.boxSize || 12))

  const [packaging, setPackaging] = useState<CartPackaging>(isBoxed ? 'box' : 'piece')
  const [quantity, setQuantity] = useState<number>(1)

  const currentUnitPrice = packaging === 'box' ? defaultBoxPrice : product.price
  const subtotal = currentUnitPrice * (quantity || 1)

  const handleConfirm = () => {
    const finalQty = Math.max(1, quantity || 1)
    onAddToCart(product, packaging, finalQty, currentUnitPrice)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full sm:max-w-md rounded-t-[8px] sm:rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="size-12 shrink-0 rounded-[8px] bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
              {product.image ? (
                <img src={product.image} alt={product.name} className="size-full object-contain p-0.5" />
              ) : (
                <Package className="size-6 text-slate-400" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400">SKU {product.sku}</span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">{product.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[8px] p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Packaging Selection (If boxed) */}
          {isBoxed ? (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Савалгааны сонголт:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Box Option */}
                <button
                  type="button"
                  onClick={() => setPackaging('box')}
                  className={`cursor-pointer text-left p-3 rounded-[8px] border transition-all ${
                    packaging === 'box'
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                      <Package className="size-3.5 text-blue-600" />
                      <span>Хайрцгаар</span>
                    </span>
                    {packaging === 'box' && <Check className="size-3.5 text-blue-600" />}
                  </div>
                  <div className="mt-1.5 text-sm font-extrabold text-blue-800">
                    {formatMNT(defaultBoxPrice)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    1 хайрцагт {product.boxSize} {product.unit}
                  </div>
                </button>

                {/* Piece Option */}
                <button
                  type="button"
                  onClick={() => setPackaging('piece')}
                  className={`cursor-pointer text-left p-3 rounded-[8px] border transition-all ${
                    packaging === 'piece'
                      ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Ширхэгээр</span>
                    {packaging === 'piece' && <Check className="size-3.5 text-amber-600" />}
                  </div>
                  <div className="mt-1.5 text-sm font-extrabold text-slate-900">
                    {formatMNT(product.price)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    1 {product.unit} нэгжээр
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[8px] bg-slate-50 p-3 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500">Нэгжийн үнэ:</span>
                <div className="text-sm font-bold text-slate-900">
                  {formatMNT(product.price)} / 1 {product.unit}
                </div>
              </div>
              <span className="rounded-[6px] bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                Ширхэгээр
              </span>
            </div>
          )}

          {/* Quantity Selector with Direct Typing */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Тоо хэмжээ ({packaging === 'box' ? 'хайрцаг' : product.unit}):
            </label>
            <div className="flex items-center justify-between rounded-[8px] border border-slate-300 p-1.5 bg-white">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, (quantity || 1) - 1))}
                className="cursor-pointer size-10 rounded-[6px] bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold transition-colors"
                title="1-ээр хасах"
              >
                <Minus className="size-4" />
              </button>
              <div className="flex items-center justify-center gap-1.5 flex-1 px-2">
                <input
                  type="number"
                  min="1"
                  max="99999"
                  value={quantity === 0 ? '' : quantity}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '') {
                      setQuantity(0)
                    } else {
                      const num = parseInt(val, 10)
                      if (!isNaN(num) && num >= 0) {
                        setQuantity(num)
                      }
                    }
                  }}
                  onBlur={() => {
                    if (!quantity || quantity < 1) {
                      setQuantity(1)
                    }
                  }}
                  className="w-24 text-center font-black text-lg text-slate-900 border border-slate-200 rounded-[6px] py-1 focus:border-[#DE3B28] focus:outline-hidden focus:ring-1 focus:ring-[#DE3B28]"
                />
                <span className="text-xs font-semibold text-slate-500">
                  {packaging === 'box' ? 'хайрцаг' : product.unit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuantity((quantity || 0) + 1)}
                className="cursor-pointer size-10 rounded-[6px] bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold transition-colors"
                title="1-ээр нэмэх"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {/* Subtotal Preview */}
          <div className="flex items-center justify-between rounded-[8px] bg-slate-900 p-3.5 text-white">
            <span className="text-xs font-semibold text-slate-300">Нийт дүн:</span>
            <span className="text-base font-black text-[#FFCE00]">{formatMNT(subtotal)}</span>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="cursor-pointer min-h-[44px] w-full flex items-center justify-center gap-2 rounded-[8px] bg-[#DE3B28] px-4 py-2.5 text-xs font-black text-white hover:bg-[#b82a1a] shadow-md transition-all active:scale-[0.98]"
          >
            <ShoppingCart className="size-4" />
            <span>Сагсанд нэмэх</span>
          </button>
        </div>
      </div>
    </div>
  )
}
