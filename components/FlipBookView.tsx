'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import Image from 'next/image'
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react'
import { Product, formatMNT } from '@/app/page'
import { CatalogSettings } from '@/lib/types'

// Synthetic realistic Paper Turn Sound effect using Web Audio API
function playPaperSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const bufferSize = ctx.sampleRate * 0.12
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const output = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.035))
    }
    const whiteNoise = ctx.createBufferSource()
    whiteNoise.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1100, ctx.currentTime)
    filter.Q.setValueAtTime(1.8, ctx.currentTime)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    whiteNoise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    whiteNoise.start()
  } catch (e) {
    // AudioContext might be blocked until user gesture, safely ignore
  }
}

// Product Card for Flipbook matching exact user reference: Light neutral frame, SKU, title, 1-5 units & 6+ units in mint green
function FlipProductCard({ prod }: { prod: Product }) {
  const bulkFromCount = prod.bulkFrom || 6
  const retailMax = bulkFromCount > 1 ? bulkFromCount - 1 : 5

  return (
    <div className="group flex flex-col justify-between">
      <div>
        {/* Light neutral image frame (exact match to reference screenshot) */}
        <div className="relative h-28 sm:h-32 w-full rounded-[6px] bg-[#F4F4F2] p-2 flex items-center justify-center overflow-hidden shadow-2xs">
          {prod.image ? (
            <img
              src={prod.image}
              alt={prod.name}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className={`h-full w-full rounded-[4px] bg-gradient-to-br ${prod.color || 'from-amber-400 to-red-600'} flex items-center justify-center text-[10px] font-bold text-white shadow-2xs`}>
              {prod.sku.slice(0, 3)}
            </div>
          )}

          {prod.status && prod.status !== 'in_stock' && (
            <span className="absolute top-1.5 right-1.5 rounded-[4px] bg-slate-900/80 px-1.5 py-0.5 text-[8px] font-bold text-white uppercase">
              {prod.status === 'temporarily_out' ? 'Түр дууссан' : 'Дууссан'}
            </span>
          )}
        </div>

        {/* SKU line */}
        <div className="mt-2 text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-tight">
          SKU {prod.sku}
        </div>

        {/* Product Name */}
        <h4 className="mt-0.5 text-xs sm:text-[13px] font-bold text-[#0F1E36] line-clamp-1 group-hover:text-[#DE3B28] transition-colors leading-snug">
          {prod.name}
        </h4>
      </div>

      {/* Pricing: 2 Columns (1-5 units & 6+ units with mint green background) */}
      <div className="mt-2 grid grid-cols-2 gap-2 items-stretch">
        {/* Left: 1-5 units (retail) */}
        <div className="rounded-[4px] bg-transparent py-0.5 flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-medium leading-none">
            1–{retailMax} {prod.unit || 'units'}
          </span>
          <span className="mt-1 text-xs sm:text-sm font-extrabold text-[#0F1E36] leading-none">
            {formatMNT(prod.price)}
          </span>
        </div>

        {/* Right: 6+ units (wholesale / bulk) with mint green background */}
        {prod.hasBulkPrice && prod.bulkPrice ? (
          <div className="rounded-[6px] bg-[#EAF5EF] px-2 py-1.5 flex flex-col justify-center border border-emerald-100/80">
            <span className="text-[10px] text-emerald-800 font-semibold leading-none">
              {bulkFromCount}+ {prod.unit || 'units'}
            </span>
            <span className="mt-1 text-xs sm:text-sm font-black text-[#107C41] leading-none">
              {formatMNT(prod.bulkPrice)}
            </span>
          </div>
        ) : (
          <div className="rounded-[6px] bg-slate-50 px-2 py-1.5 flex flex-col justify-center border border-slate-100">
            <span className="text-[10px] text-slate-400 font-medium leading-none">
              Бөөний үнэ
            </span>
            <span className="mt-1 text-[11px] font-bold text-slate-400 leading-none">
              -
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FlipBookView({
  products,
  categories,
  showStockCount = true,
  settings,
  onBackToCatalog,
}: {
  products: Product[]
  categories: string[]
  showStockCount?: boolean
  settings?: CatalogSettings
  onBackToCatalog: () => void
}) {
  const bookRef = useRef<HTMLDivElement>(null)
  const pageFlipInstance = useRef<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const autoPlayTimer = useRef<any>(null)

  // Group products into category pairs for book pages
  const validCategories = useMemo(() => {
    return categories.filter((c) => c !== 'Бүх ангилал')
  }, [categories])

  // Split categories for 2-page spreads
  const categorySpreads = useMemo(() => {
    const spreads: { catLeft: string; prodsLeft: Product[]; catRight?: string; prodsRight?: Product[] }[] = []
    for (let i = 0; i < validCategories.length; i += 2) {
      const catLeft = validCategories[i]
      const prodsLeft = products.filter((p) => p.category === catLeft)
      const catRight = validCategories[i + 1]
      const prodsRight = catRight ? products.filter((p) => p.category === catRight) : undefined
      spreads.push({ catLeft, prodsLeft, catRight, prodsRight })
    }
    return spreads
  }, [validCategories, products])

  // Initialize StPageFlip on mounted HTML pages
  const initPageFlip = async () => {
    if (!bookRef.current) return

    // Clean up previous instance if exists
    if (pageFlipInstance.current) {
      try {
        pageFlipInstance.current.destroy()
      } catch (e) {}
      pageFlipInstance.current = null
    }

    try {
      const { PageFlip } = await import('page-flip')
      const pages = bookRef.current.querySelectorAll('.flip-page')
      if (pages.length === 0) return

      const flip = new PageFlip(bookRef.current, {
        width: 460, // base single-page width
        height: 640, // base single-page height
        size: 'stretch',
        minWidth: 320,
        maxWidth: 620,
        minHeight: 450,
        maxHeight: 860,
        maxShadowOpacity: 0.45,
        showCover: true,
        mobileScrollSupport: false,
        usePortrait: true,
        flippingTime: 700,
        useMouseEvents: true,
        clickEventForward: true,
      })

      flip.loadFromHTML(pages)

      flip.on('flip', (e: any) => {
        setCurrentPage(e.data)
        if (soundEnabled) {
          playPaperSound()
        }
      })

      flip.on('init', (e: any) => {
        setTotalPages(flip.getPageCount())
      })

      pageFlipInstance.current = flip
      setTotalPages(flip.getPageCount())
    } catch (err) {
      console.error('Failed to init StPageFlip:', err)
    }
  }

  // Initialize or re-initialize when categorySpreads change
  useEffect(() => {
    const timer = setTimeout(() => {
      initPageFlip()
    }, 250)

    return () => {
      clearTimeout(timer)
      if (pageFlipInstance.current) {
        try {
          pageFlipInstance.current.destroy()
        } catch (e) {}
        pageFlipInstance.current = null
      }
    }
  }, [categorySpreads])

  // Auto-play slideshow logic
  useEffect(() => {
    if (autoPlay) {
      autoPlayTimer.current = setInterval(() => {
        if (pageFlipInstance.current) {
          const current = pageFlipInstance.current.getCurrentPageIndex()
          const total = pageFlipInstance.current.getPageCount()
          if (current < total - 1) {
            pageFlipInstance.current.flipNext()
          } else {
            pageFlipInstance.current.turnToPage(0)
          }
        }
      }, 4500)
    } else {
      if (autoPlayTimer.current) {
        clearInterval(autoPlayTimer.current)
      }
    }
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current)
    }
  }, [autoPlay])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        pageFlipInstance.current?.flipNext()
      } else if (e.key === 'ArrowLeft') {
        pageFlipInstance.current?.flipPrev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Helper for status badge
  const renderStatusBadge = (prod: Product) => {
    if (prod.status === 'out_of_stock') {
      return (
        <span className="rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 text-[9px] font-bold">
          Дууссан
        </span>
      )
    }
    if (prod.status === 'temporarily_out') {
      return (
        <span className="rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 text-[9px] font-bold">
          Түр дууссан
        </span>
      )
    }
    return (
      <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold">
        {showStockCount ? `Бэлэн (${prod.stockCount} ${prod.unit})` : 'Бэлэн байгаа'}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 px-4 sm:px-6 py-3 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToCatalog}
              className="cursor-pointer min-h-[40px] inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all shadow-xs"
            >
              <ChevronLeft className="size-4" />
              <span>Каталог руу буцах</span>
            </button>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="relative size-8 overflow-hidden rounded-full border border-amber-400/50 shadow-xs bg-white shrink-0">
                <Image src="/nema-foods-logo.svg" alt="Нема Фүүдс" fill className="object-contain p-0.5" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white leading-tight">
                  НЕМА <span className="text-[#DE3B28]">ФҮҮДС</span>
                </h1>
                <p className="text-[10px] text-amber-200/80 font-medium">Дижитал Ном (Interactive Flip Book)</p>
              </div>
            </div>
          </div>

          {/* Top Control Actions */}
          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Хуудасны дуу хаах' : 'Хуудасны дуу нээх'}
              className={`cursor-pointer rounded-lg border p-2 text-xs transition-colors ${
                soundEnabled
                  ? 'border-teal-500/40 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>

            {/* Auto Play Slideshow */}
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              title={autoPlay ? 'Автомат эргүүлэлт зогсоох' : 'Автоматаар хуудас эргүүлэх'}
              className={`cursor-pointer hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                autoPlay
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {autoPlay ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              <span>{autoPlay ? 'Зогсоох' : 'Авто эргүүлэлт'}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Бүтэн дэлгэцээс гарах' : 'Бүтэн дэлгэц'}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main FlipBook Workspace */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-6 overflow-hidden relative">
        {/* Ambient Glow behind the book */}
        <div className="absolute size-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        {/* Book Container */}
        <div className="relative flex items-center justify-center w-full max-w-5xl my-auto">
          {/* Prev Page Button (Floating Left) */}
          <button
            onClick={() => pageFlipInstance.current?.flipPrev()}
            className="cursor-pointer absolute left-1 sm:-left-6 top-1/2 -translate-y-1/2 z-30 flex size-11 items-center justify-center rounded-lg bg-slate-800/90 text-white shadow-xl border border-slate-700 hover:bg-teal-600 hover:scale-105 active:scale-95 transition-all"
            title="Өмнөх хуудас (Left arrow)"
          >
            <ChevronLeft className="size-6" />
          </button>

          {/* StPageFlip Root Element */}
          <div
            key={`book-catalog-${products.length}`}
            ref={bookRef}
            className="shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
            style={{ margin: '0 auto' }}
          >
            {/* 1. FRONT COVER (Hard) - NEMA FOODS OFFICIAL COVER */}
            <div
              className="flip-page relative flex flex-col justify-between overflow-hidden select-none shadow-2xl border-r border-amber-900/30 bg-[#FFCE00]"
              data-density="hard"
            >
              <Image
                src="/cover.jpg"
                alt="НЕМА ФҮҮДС Каталог Хавтас"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute bottom-3 right-3 z-10 rounded-[6px] bg-slate-900/75 backdrop-blur-xs px-2.5 py-1 text-[9px] font-bold text-white shadow-md">
                Хуудас эргүүлж үзнэ үү →
              </div>
            </div>

            {/* 2. TABLE OF CONTENTS (Hard) */}
            <div
              className="flip-page relative flex flex-col justify-between bg-slate-900 p-8 text-white select-none border-l border-slate-800"
              data-density="hard"
            >
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Layers className="size-4 text-teal-400" />
                  <h2 className="text-sm font-black tracking-wider uppercase text-slate-200">
                    Агуулгын Гарчиг
                  </h2>
                </div>

                <div className="mt-4 space-y-2">
                  {validCategories.map((cat, idx) => (
                    <button
                      key={cat}
                      onClick={() => {
                        const targetPage = (idx + 1) * 2
                        pageFlipInstance.current?.turnToPage(targetPage)
                      }}
                      className="cursor-pointer group flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-colors hover:bg-slate-800"
                    >
                      <span className="font-semibold text-slate-300 group-hover:text-teal-400 transition-colors">
                        {idx + 1}. {cat}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-teal-400">
                        Хуудас {(idx + 1) * 2 + 1}
                        <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Catalog Note */}
              <div className="rounded-lg bg-teal-950/60 p-3 text-xs text-teal-200 border border-teal-800/80">
                <div className="flex items-center gap-1.5 font-bold text-teal-300">
                  <CheckCircle2 className="size-4 text-teal-400" />
                  Албан ёсны бүтээгдэхүүний сан
                </div>
                <p className="mt-1 text-[11px] text-teal-200/80 leading-tight">
                  Бүх бараа албан ёсны чанарын баталгаатай. Лавлах утас: {settings?.phone ? settings.phone.split(',')[0].trim() : '7711-2233'}
                </p>
              </div>
            </div>

            {/* 3..N CATEGORY SPREAD PAGES (Soft) */}
            {categorySpreads.map((spread, spreadIdx) => (
              <React.Fragment key={spread.catLeft}>
                {/* LEFT PAGE OF SPREAD */}
                <div className="flip-page flex flex-col justify-between bg-white p-6 sm:p-7 text-slate-800 select-none border-r border-slate-200">
                  <div>
                    {/* Page Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-teal-800">
                        {spread.catLeft}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Хуудас {(spreadIdx + 1) * 2 + 1}
                      </span>
                    </div>

                    {/* Product Cards for Left Page (2x2 Grid matching reference image) */}
                    <div className="mt-3.5 grid grid-cols-2 gap-3 sm:gap-3.5">
                      {spread.prodsLeft.slice(0, 4).map((prod) => (
                        <FlipProductCard key={prod.id} prod={prod} />
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 text-center text-[9px] text-slate-400 font-mono">
                    НЕМА ФҮҮДС • {spread.catLeft.toUpperCase()}
                  </div>
                </div>

                {/* RIGHT PAGE OF SPREAD */}
                <div className="flip-page flex flex-col justify-between bg-white p-6 sm:p-7 text-slate-800 select-none border-l border-slate-200">
                  <div>
                    {/* Page Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-[10px] font-mono text-slate-400">
                        Хуудас {(spreadIdx + 1) * 2 + 2}
                      </span>
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-900 border border-amber-200">
                        {spread.catRight || spread.catLeft}
                      </span>
                    </div>

                    {/* Product Cards for Right Page (2x2 Grid matching reference image) */}
                    <div className="mt-3.5 grid grid-cols-2 gap-3 sm:gap-3.5">
                      {(spread.prodsRight ? spread.prodsRight.slice(0, 4) : spread.prodsLeft.slice(4, 8)).map((prod) => (
                        <FlipProductCard key={prod.id} prod={prod} />
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 text-center text-[9px] text-slate-400 font-mono">
                    НЕМА ФҮҮДС • {(spread.catRight || spread.catLeft).toUpperCase()}
                  </div>
                </div>
              </React.Fragment>
            ))}

            {/* FINAL BACK COVER (Hard) */}
            <div
              className="flip-page relative flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-8 text-white select-none shadow-2xl border-l border-slate-800"
              data-density="hard"
            >
              <div className="border-b border-amber-500/30 pb-4 flex items-center gap-3">
                <div className="relative size-10 overflow-hidden rounded-full border border-amber-400/50 bg-white p-1 shrink-0">
                  <Image src="/nema-foods-logo.svg" alt="Нема Фүүдс" fill className="object-contain p-0.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    ХОЛБОО БАРИХ & ШОУРҮҮМ
                  </span>
                  <h3 className="text-lg font-black text-white leading-tight">
                    Нема Фүүдс ХХК
                  </h3>
                </div>
              </div>

              <div className="my-auto space-y-4 text-xs">
                <div className="rounded-lg bg-slate-800/80 p-4 border border-slate-700 space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <Phone className="size-4" />
                    <span>Утас: {settings?.phone || '+976 7711-2233, 9911-0000'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="size-4 text-amber-400" />
                    <span>И-мэйл: {settings?.email || 'sales@nemafoods.mn'}</span>
                  </div>
                  {settings?.address && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="size-4 text-amber-400" />
                      <span>Хаяг: {settings.address}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-slate-800/60 p-4 border border-slate-700 space-y-1 text-slate-300 text-[11px]">
                  <div className="font-bold text-amber-400">Албан ёсны гэрээ & Төлбөр:</div>
                  <p>{settings?.bankAccounts || 'Хаан Банк: 5000 1234 5678 (Нема Фүүдс ХХК)'}</p>
                  <p className="text-amber-200/70">Бүх үнэ НӨАТ багтсан болно.</p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 text-center text-[10px] text-slate-400">
                НЕМА ФҮҮДС ХХК © 2026 • БҮХ ЭРХ ХУУЛИАР ХАМГААЛАГДСАН
              </div>
            </div>
          </div>

          {/* Next Page Button (Floating Right) */}
          <button
            onClick={() => pageFlipInstance.current?.flipNext()}
            className="cursor-pointer absolute right-1 sm:-right-6 top-1/2 -translate-y-1/2 z-30 flex size-11 items-center justify-center rounded-lg bg-slate-800/90 text-white shadow-xl border border-slate-700 hover:bg-teal-600 hover:scale-105 active:scale-95 transition-all"
            title="Дараах хуудас (Right arrow)"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>
      </main>

      {/* Bottom Interactive Navigation & Page Slider Controls */}
      <footer className="border-t border-slate-800 bg-slate-950/90 px-4 sm:px-6 py-3 sticky bottom-0 z-40">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          {/* Quick Page Slider */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
            <span className="text-xs font-semibold text-slate-400">Хуудас:</span>
            <input
              type="range"
              min="0"
              max={totalPages > 0 ? totalPages - 1 : 1}
              value={currentPage}
              onChange={(e) => {
                const target = Number(e.target.value)
                setCurrentPage(target)
                pageFlipInstance.current?.flip(target)
              }}
              className="w-36 sm:w-48 accent-teal-500 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-teal-400 min-w-16">
              {currentPage + 1} / {totalPages || 1}
            </span>
          </div>

          {/* Turn Buttons */}
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <button
              onClick={() => pageFlipInstance.current?.flip(0)}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Эхний хуудас
            </button>
            <button
              onClick={() => pageFlipInstance.current?.flipPrev()}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-600 transition-colors"
            >
              ← Өмнөх
            </button>
            <button
              onClick={() => pageFlipInstance.current?.flipNext()}
              className="cursor-pointer rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-500 transition-colors shadow-xs"
            >
              Дараах →
            </button>
            <button
              onClick={() => pageFlipInstance.current?.flip(totalPages - 1)}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Төгсгөл
            </button>
          </div>

          {/* User Guide Tip */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Зөвлөмж: Хуудасны өнцгөөс чирж эсвэл сумаар эргүүлнэ үү.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
