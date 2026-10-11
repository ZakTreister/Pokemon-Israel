import { useRef, useState, type PointerEvent } from 'react';
import { Trophy, User, Zap } from 'lucide-react';
import { settleCardOffset } from '../utils/cardDrag';

export default function HeroArtwork() {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{
    pointerId: number;
    x: number;
    y: number;
    origin: number;
    offset: number;
    horizontal: boolean;
  } | null>(null);
  function start(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    gesture.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: offset,
      offset,
      horizontal: false,
    };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null;
        return;
      }
      current.horizontal = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    current.offset = Math.max(-90, Math.min(90, current.origin + dx));
    setOffset(current.offset);
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    setOffset(
      event.type === 'pointercancel'
        ? current.origin
        : settleCardOffset(current.offset),
    );
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <div className="cs-hero-art" aria-hidden="true">
      <div className="cs-orbit" />
      <div className="cs-hero-lightning absolute start-[8%] top-[6%] h-32 w-14 rotate-12 bg-gold" />
      <div className="cs-hero-lightning absolute end-[7%] bottom-[8%] h-24 w-10 rotate-12 bg-gold" />
      <div
        className={`absolute inset-0 select-none cursor-grab ${dragging ? 'cursor-grabbing' : 'motion-safe:transition-transform motion-safe:duration-200'}`}
        style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      >
        <div className="cs-trading-card cs-trading-card-back">
          <div className="flex justify-between text-[10px] font-black">
            <span>STRATEGY</span>
            <Zap size={14} className="text-gold" />
          </div>
          <div className="cs-card-art">
            <div className="cs-pokeball" />
          </div>
          <div className="text-center text-sm font-black text-white">
            כל קלף קובע.
          </div>
          <div className="mx-auto mt-3 h-1 w-20 bg-gold" />
        </div>
        <div className="cs-trading-card cs-trading-card-front">
          <div className="flex justify-between text-[10px] font-black">
            <span>COMMUNITY</span>
            <User size={14} className="text-gold" />
          </div>
          <div className="cs-card-art">
            <Trophy className="relative h-20 w-20 text-gold" />
          </div>
          <div className="text-center text-sm font-black text-white">
            משחקים ביחד.
          </div>
          <div className="mx-auto mt-3 h-1 w-20 bg-gold" />
        </div>
        <div className="cs-trading-card cs-trading-card-main">
          <div className="flex items-center justify-between text-[10px] font-black">
            <span dir="ltr">CARDSCHOOL IL</span>
            <Zap size={14} className="text-gold" fill="currentColor" />
          </div>
          <div className="cs-card-art">
            <img
              src="/pokemon_kids_logo.png"
              alt=""
              draggable={false}
              className="relative h-full w-full object-contain p-2"
            />
          </div>
          <p className="text-center text-base font-black text-white">
            נפגשים בליגה.
          </p>
          <p
            dir="ltr"
            className="mt-2 text-center text-[9px] font-bold tracking-[.16em] text-blue-200"
          >
            POKÉMON TRADING CARD GAME
          </p>
        </div>
      </div>
    </div>
  );
}
