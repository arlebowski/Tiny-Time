import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Check, Clock, X, Minus, Plus, Trash2, Play, Square, ChevronDown } from "lucide-react";

// --- Sub-components for a more "Rational" architecture ---

const NativeTimeInput = ({ label, value, onChange }) => (
  <div className="bg-zinc-800/50 p-4 rounded-[24px] border border-white/5 relative group active:scale-95 transition-transform">
    <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-1 block">{label}</label>
    <div className="relative">
      <input 
        type="time" 
        className="bg-transparent text-white font-mono text-xl outline-none w-full cursor-pointer appearance-none"
        value={value}
        onChange={onChange}
      />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  </div>
);

const FeedEditor = ({ entry, onUpdate, onSave, onCancel, onDelete }) => (
  <div className="px-8 pt-2 pb-8">
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{entry.isNew ? 'New Feeding' : 'Edit Feeding'}</h2>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Details & Volume</p>
      </div>
      <div className="flex gap-3">
        {!entry.isNew && (
          <button onClick={onDelete} className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        <button onClick={onCancel} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>

    <div className="space-y-8">
      <NativeTimeInput 
        label="Start Time"
        value={`${entry.hour.toString().padStart(2, '0')}:${entry.minute.toString().padStart(2, '0')}`}
        onChange={(e) => {
          const [h, m] = e.target.value.split(':').map(Number);
          onUpdate({ hour: h, minute: m });
        }}
      />

      <div className="bg-zinc-800/30 p-8 rounded-[32px] border border-white/5 shadow-inner">
        <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-6 block text-center">Volume</label>
        <div className="flex items-center justify-between">
          <button 
            onClick={() => onUpdate({ amount: Math.max(0, (entry.amount || 0) - 0.5) })}
            className="w-16 h-16 bg-zinc-800 rounded-3xl flex items-center justify-center text-white active:scale-90 border border-white/10 transition-all shadow-lg"
          >
            <Minus className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <motion.div 
              key={entry.amount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-black text-white tracking-tighter"
            >
              {entry.amount}<span className="text-xl text-zinc-500 ml-1 font-bold">oz</span>
            </motion.div>
          </div>

          <button 
            onClick={() => onUpdate({ amount: (entry.amount || 0) + 0.5 })}
            className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white active:scale-90 shadow-xl shadow-blue-600/30 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>

    <button 
      onClick={onSave}
      className="w-full mt-10 bg-white text-black py-5 rounded-[28px] font-black text-xl shadow-2xl active:scale-[0.98] transition-all hover:bg-zinc-200"
    >
      {entry.isNew ? 'Save Feeding' : 'Update Log'}
    </button>
  </div>
);

const SleepEditor = ({ entry, onUpdate, onSave, onCancel, onDelete }) => (
  <div className="px-8 pt-2 pb-8">
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{entry.isNew ? 'New Sleep' : 'Edit Sleep'}</h2>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Timeline & Duration</p>
      </div>
      <div className="flex gap-3">
        {!entry.isNew && (
          <button onClick={onDelete} className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
        <button onClick={onCancel} className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>

    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <NativeTimeInput 
          label="Sleep"
          value={`${entry.hour.toString().padStart(2, '0')}:${entry.minute.toString().padStart(2, '0')}`}
          onChange={(e) => {
            const [h, m] = e.target.value.split(':').map(Number);
            onUpdate({ hour: h, minute: m });
          }}
        />
        <NativeTimeInput 
          label="Wake"
          value={`${(entry.stopHour || 0).toString().padStart(2, '0')}:${(entry.stopMinute || 0).toString().padStart(2, '0')}`}
          onChange={(e) => {
            const [h, m] = e.target.value.split(':').map(Number);
            onUpdate({ stopHour: h, stopMinute: m });
          }}
        />
      </div>

      <div className="bg-indigo-600/10 p-8 rounded-[32px] border border-indigo-500/20 text-center shadow-inner">
        <div className="text-xs text-indigo-400 font-black uppercase tracking-widest mb-2">Total Rest</div>
        <div className="text-4xl font-black text-white">{entry.duration || 'Calculating...'}</div>
      </div>
    </div>

    <button 
      onClick={onSave}
      className="w-full mt-10 bg-indigo-600 text-white py-5 rounded-[28px] font-black text-xl shadow-2xl active:scale-[0.98] transition-all hover:bg-indigo-500"
    >
      {entry.isNew ? 'Save Entry' : 'Update Log'}
    </button>
  </div>
);

// --- Main Component ---

const Timeline = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [filter, setFilter] = useState('all');
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerDuration, setTimerDuration] = useState(0);
  
  const [cards, setCards] = useState([
    { id: 1, time: '4:23 AM', hour: 4, minute: 23, completed: true, type: 'feed', amount: 4.5, unit: 'oz' },
    { id: 2, time: '6:45 AM', hour: 6, minute: 45, stopTime: '8:30 AM', stopHour: 8, stopMinute: 30, completed: true, type: 'sleep', duration: '1h 45m' },
    { id: 3, time: '8:12 AM', hour: 8, minute: 12, completed: true, type: 'feed', amount: 5.0, unit: 'oz' },
    { id: 4, time: '10:30 AM', hour: 10, minute: 30, stopTime: '12:00 PM', stopHour: 12, stopMinute: 0, completed: true, type: 'sleep', duration: '1h 30m' },
    { id: 5, time: '1:15 PM', hour: 13, minute: 15, completed: true, type: 'feed', amount: 4.0, unit: 'oz' },
    { id: 6, time: '3:47 PM', hour: 15, minute: 47, completed: false, type: 'sleep' },
    { id: 7, time: '5:20 PM', hour: 17, minute: 20, completed: false, type: 'feed' },
    { id: 8, time: '7:55 PM', hour: 19, minute: 55, completed: false, type: 'sleep' },
    { id: 9, time: '9:08 PM', hour: 21, minute: 8, completed: false, type: 'feed' },
    { id: 10, time: '11:33 PM', hour: 23, minute: 33, completed: false, type: 'sleep' }
  ]);
  
  const [draggingCard, setDraggingCard] = useState(null);
  const [holdingCard, setHoldingCard] = useState(null);
  const dragTimer = useRef(null);
  const timelineRef = useRef(null);
  const [dragY, setDragY] = useState(null);
  const touchOffset = useRef(0);
  const initialClientY = useRef(null);

  useEffect(() => {
    let interval;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerDuration(prev => prev + 1);
      }, 1000);
    } else {
      setTimerDuration(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatTimerDisplay = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
  };

  const formatTimeFromHM = (h, m) => {
    const p = h >= 12 ? 'PM' : 'AM';
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${dh}:${m.toString().padStart(2, '0')} ${p}`;
  };

  const calculateSleepDuration = (startH, startM, stopH, stopM) => {
    let startMinutes = startH * 60 + startM;
    let stopMinutes = stopH * 60 + stopM;
    if (stopMinutes < startMinutes) stopMinutes += 24 * 60;
    const diff = stopMinutes - startMinutes;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m`;
  };

  const handleUpdateEditingCard = (updates) => {
    setEditingCard(prev => {
      const updated = { ...prev, ...updates };
      if (updated.type === 'sleep' && ('hour' in updates || 'minute' in updates || 'stopHour' in updates || 'stopMinute' in updates)) {
        updated.duration = calculateSleepDuration(updated.hour, updated.minute, updated.stopHour, updated.stopMinute);
        updated.time = formatTimeFromHM(updated.hour, updated.minute);
        updated.stopTime = formatTimeFromHM(updated.stopHour, updated.stopMinute);
      } else if ('hour' in updates || 'minute' in updates) {
        updated.time = formatTimeFromHM(updated.hour, updated.minute);
      }
      return updated;
    });
  };

  const handleSaveEntry = () => {
    if (!editingCard) return;
    if (editingCard.isNew) {
      const newCard = { ...editingCard, id: Date.now(), isNew: false, completed: true };
      setCards(prev => [...prev, newCard]);
    } else {
      setCards(prev => prev.map(c => c.id === editingCard.id ? { ...editingCard, completed: true } : c));
    }
    setEditingCard(null);
  };

  const createNewEntry = (type) => {
    if (type === 'sleep') {
      const now = new Date();
      setActiveTimer({ startTime: now, hour: now.getHours(), minute: now.getMinutes() });
      return;
    }
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    setEditingCard({
      id: null, isNew: true, type, hour: h, minute: m, 
      time: formatTimeFromHM(h, m), completed: false, amount: 4.0, unit: 'oz'
    });
  };

  const getCardPosition = (card) => (card.hour * 60 + card.minute) / (24 * 60) * 100;

  const handleDragStart = (e, card) => {
    if (!isExpanded) return;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    initialClientY.current = clientY;
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const currentY = clientY - timelineRect.top;
    const cardTop = (getCardPosition(card) / 100) * 1400;
    touchOffset.current = currentY - cardTop;
    dragTimer.current = setTimeout(() => {
      setDraggingCard(card.id);
      setDragY(cardTop); 
      setHoldingCard(null);
    }, 500);
    setHoldingCard(card.id);
  };

  const handleDragMove = (e) => {
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    if (holdingCard && !draggingCard) {
      if (Math.abs(clientY - initialClientY.current) > 5) {
        clearTimeout(dragTimer.current);
        setHoldingCard(null);
        return;
      }
    }
    if (!draggingCard || !isExpanded || !timelineRef.current) return;
    if (e.cancelable) e.preventDefault();
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const newCardTop = clientY - timelineRect.top - touchOffset.current;
    setDragY(newCardTop);
    const percentage = Math.max(0, Math.min(100, (newCardTop / timelineRect.height) * 100));
    const totalMinutes = Math.round((percentage / 100) * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    window.requestAnimationFrame(() => {
      setCards(prev => prev.map(c => c.id === draggingCard ? { ...c, hour: h, minute: m, time: formatTimeFromHM(h, m) } : c));
    });
  };

  const handleDragEnd = () => {
    clearTimeout(dragTimer.current);
    if (draggingCard) {
      setCards(prev => prev.map(c => {
        if (c.id === draggingCard) {
          const totalMinutes = c.hour * 60 + c.minute;
          const snapped = Math.round(totalMinutes / 15) * 15;
          const h = Math.floor(snapped / 60) % 24;
          const m = snapped % 60;
          return { ...c, hour: h, minute: m, time: formatTimeFromHM(h, m) };
        }
        return c;
      }));
    }
    setDraggingCard(null);
    setDragY(null);
    setHoldingCard(null);
  };

  useEffect(() => {
    if (draggingCard || holdingCard) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [draggingCard, holdingCard]);

  const filteredCards = cards
    .filter(card => filter === 'all' || card.type === filter)
    .sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));

  return (
    <div className="bg-black p-4 relative min-h-screen pb-32 font-sans text-zinc-200">
      <div className="max-w-md mx-auto select-none">
        <header className="sticky top-0 z-[60] bg-black/80 backdrop-blur-md pt-2 pb-6 -mx-4 px-4 mb-2 flex justify-between items-center border-b border-white/5">
          <div className="flex bg-zinc-900/90 rounded-2xl p-1 gap-1 border border-white/5">
            {['all', 'feed', 'sleep'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("px-4 py-1.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all", filter === f ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500')}>{f}</button>
            ))}
          </div>
          <button onClick={() => setIsExpanded(!isExpanded)} className="bg-blue-600 text-white px-5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all">{isExpanded ? 'Done' : 'Edit'}</button>
        </header>
        
        <AnimatePresence>
          {activeTimer && (
            <motion.div initial={{ height: 0, opacity: 0, scale: 0.9 }} animate={{ height: 'auto', opacity: 1, scale: 1 }} exit={{ height: 0, opacity: 0, scale: 0.9 }} className="mb-6 overflow-hidden">
              <div className="bg-indigo-600 rounded-[32px] p-8 flex items-center justify-between shadow-2xl shadow-indigo-900/40 border border-white/10">
                <div>
                  <div className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Active Sleep Session</div>
                  <div className="text-4xl font-black text-white font-mono tracking-tighter">{formatTimerDisplay(timerDuration)}</div>
                </div>
                <button onClick={() => {
                  const stopDate = new Date();
                  const h = stopDate.getHours();
                  const m = stopDate.getMinutes();
                  const newCard = {
                    id: Date.now(), type: 'sleep', hour: activeTimer.hour, minute: activeTimer.minute,
                    time: formatTimeFromHM(activeTimer.hour, activeTimer.minute),
                    stopTime: formatTimeFromHM(h, m), stopHour: h, stopMinute: m,
                    duration: calculateSleepDuration(activeTimer.hour, activeTimer.minute, h, m),
                    completed: true
                  };
                  setCards(prev => [...prev, newCard]);
                  setActiveTimer(null);
                }} className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-indigo-600 active:scale-90 transition-all shadow-xl">
                  <Square className="w-6 h-6 fill-current" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main ref={timelineRef} className="relative transition-all duration-700" style={{ height: isExpanded ? '1400px' : `${filteredCards.length * 96 + 20}px` }}>
          {isExpanded && Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="absolute w-full" style={{ top: `${(i / 24) * 100}%` }}>
              <div className="absolute left-0 text-zinc-700 text-[9px] font-black uppercase tracking-widest -translateY-1/2">{formatTimeFromHM(i % 24, 0)}</div>
              <div className="absolute left-20 w-full border-t border-zinc-900/50" />
            </div>
          ))}

          <div className={cn("relative transition-all duration-700", isExpanded ? 'ml-20 h-full' : 'w-full')}>
            <AnimatePresence initial={false}>
              {filteredCards.map((card, index) => {
                const isDragging = draggingCard === card.id;
                const pos = isDragging ? dragY : (isExpanded ? (getCardPosition(card) / 100) * 1400 : index * 96);

                return (
                  <motion.div
                    key={card.id}
                    layout={!isDragging}
                    animate={{ y: pos, scale: isDragging ? 1.05 : 1, zIndex: isDragging ? 50 : 1 }}
                    className={cn(
                      "absolute w-full h-[84px] bg-zinc-900/60 backdrop-blur-xl rounded-[24px] p-4 flex items-center gap-4 border border-white/5 cursor-pointer hover:bg-zinc-800/80 transition-colors shadow-lg",
                      isDragging && "shadow-2xl ring-2 ring-blue-500/50",
                      !card.completed && "bg-zinc-950/20 border-dashed border-zinc-800"
                    )}
                    onMouseDown={(e) => handleDragStart(e, card)}
                    onTouchStart={(e) => handleDragStart(e, card)}
                    onClick={() => setEditingCard({ ...card })}
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl relative shadow-inner", card.type === 'feed' ? 'bg-orange-500/10 text-orange-500' : 'bg-indigo-500/10 text-indigo-500', !card.completed && "grayscale opacity-30")}>
                      {card.type === 'feed' ? '🍼' : '💤'}
                      <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-white/5">
                        {card.completed ? <Check className="w-2.5 h-2.5 text-green-500" /> : <Clock className="w-2.5 h-2.5 text-zinc-600" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={cn("font-black text-sm uppercase tracking-wider", card.completed ? "text-white" : "text-zinc-600")}>{card.type}</h3>
                          <div className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">
                            {card.type === 'feed' ? (card.amount ? `${card.amount} ${card.unit}` : 'Logged') : (card.duration ? `${card.duration}` : 'Tracking...')}
                          </div>
                        </div>
                        <span className="text-[10px] font-black font-mono text-zinc-600 uppercase tracking-tighter">{card.time}</span>
                      </div>
                      <div className="mt-3 w-full h-1 bg-black/50 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: card.completed ? '100%' : '0%' }} className={cn("h-full rounded-full", card.type === 'feed' ? 'bg-orange-500' : 'bg-indigo-500', !card.completed && "opacity-10")} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </main>

        <footer className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-[50]">
          <button onClick={() => createNewEntry('feed')} className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-[24px] shadow-2xl shadow-white/5 active:scale-95 transition-all font-black text-xs uppercase tracking-widest">
            <Plus className="w-4 h-4" /> Feed
          </button>
          <button onClick={() => createNewEntry('sleep')} className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-[24px] shadow-2xl shadow-indigo-900/40 active:scale-95 transition-all font-black text-xs uppercase tracking-widest">
            <Play className="w-4 h-4 fill-current" /> Sleep
          </button>
        </footer>

        <AnimatePresence>
          {editingCard && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-md bg-zinc-900 border-t border-white/10 rounded-t-[32px] shadow-2xl pb-10">
                <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mt-4 mb-2 opacity-50" />
                {editingCard.type === 'feed' ? (
                  <FeedEditor 
                    entry={editingCard}
                    onUpdate={handleUpdateEditingCard}
                    onSave={handleSaveEntry}
                    onCancel={() => setEditingCard(null)}
                    onDelete={() => { setCards(prev => prev.filter(c => c.id !== editingCard.id)); setEditingCard(null); }}
                  />
                ) : (
                  <SleepEditor 
                    entry={editingCard}
                    onUpdate={handleUpdateEditingCard}
                    onSave={handleSaveEntry}
                    onCancel={() => setEditingCard(null)}
                    onDelete={() => { setCards(prev => prev.filter(c => c.id !== editingCard.id)); setEditingCard(null); }}
                  />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Timeline;
