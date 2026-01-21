import { useState, useMemo } from "react";
import { format, isSameDay, subDays, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarProps {
  initialDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export function HorizontalCalendar({
  initialDate = new Date(),
  onDateSelect,
}: CalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [weeksOffset, setWeeksOffset] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(6); // Default to today (last item in days array)

  const days = useMemo(() => {
    const endDate = subDays(today, weeksOffset * 7);
    return Array.from({ length: 7 }, (_, i) => subDays(endDate, 6 - i));
  }, [today, weeksOffset]);

  const selectedDate = useMemo(() => days[selectedIndex], [days, selectedIndex]);

  const getIndicators = (date: Date) => {
    const day = date.getDate();
    if (day % 2 === 0) return { pink: true, blue: true };
    return { pink: true, blue: false };
  };

  const paginate = (newDirection: number) => {
    if (newDirection === -1 && weeksOffset === 0) return;
    setDirection(newDirection);
    setWeeksOffset((prev) => prev + newDirection);
  };

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 30;
    if (info.offset.x > threshold) {
      paginate(1);
    } else if (info.offset.x < -threshold) {
      paginate(-1);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
    exit: (dir: number) => ({
      opacity: 0,
      rotateX: -15,
      transition: { duration: 0.2 },
    }),
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20, rotateX: -45 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    },
  };

  const progressVariants = {
    hidden: { scaleX: 0, opacity: 0 },
    show: {
      scaleX: 1,
      opacity: 1,
      transition: {
        delay: 0.6,
        duration: 0.7,
        ease: [0.34, 1.56, 0.64, 1],
      },
    },
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-black dark:bg-black light:bg-white text-white dark:text-white light:text-zinc-900 font-sans select-none overflow-hidden perspective-1000 transition-colors duration-500">
      <header className="mb-8 flex items-center justify-between px-2">
        <motion.h1
          key={weeksOffset}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-black tracking-tight"
        >
          {format(days[6], "MMMM yyyy")}
        </motion.h1>

        <div className="flex gap-1">
          <button
            onClick={() => paginate(1)}
            className="p-2 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-black/5 rounded-full transition-colors group"
          >
            <ChevronLeft className="w-6 h-6 text-white/40 dark:text-white/40 light:text-zinc-300 group-hover:text-white dark:group-hover:text-white light:group-hover:text-zinc-900 transition-colors" />
          </button>
          <button
            onClick={() => paginate(-1)}
            disabled={weeksOffset === 0}
            className={cn(
              "p-2 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-black/5 rounded-full transition-colors group",
              weeksOffset === 0 && "opacity-0 pointer-events-none",
            )}
          >
            <ChevronRight className="w-6 h-6 text-white/40 dark:text-white/40 light:text-zinc-300 group-hover:text-white dark:group-hover:text-white light:group-hover:text-zinc-900 transition-colors" />
          </button>
        </div>
      </header>

      <div className="relative touch-none">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={weeksOffset}
            custom={direction}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={handleDragEnd}
            className="flex justify-between items-center gap-2 cursor-grab active:cursor-grabbing will-change-transform"
          >
            {days.map((date, index) => {
              const isSelected = isSameDay(date, selectedDate);
              const indicators = getIndicators(date);

              return (
                <motion.button
                  key={date.toISOString()}
                  variants={itemVariants}
                  layout
                  animate={{ 
                    flex: isSelected ? 2 : 1,
                    scale: isSelected ? 1.05 : 1,
                    zIndex: isSelected ? 10 : 1
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 25,
                    layout: { duration: 0.4 }
                  }}
                  onClick={() => {
                    setSelectedIndex(index);
                    onDateSelect?.(date);
                  }}
                  className={cn(
                    "relative flex flex-col items-center justify-center h-[110px] rounded-2xl transition-colors duration-500 group focus:outline-none shrink-0",
                    !isSelected && "hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-black/5",
                  )}
                >
                  {/* Shared Layout Pill Animation */}
                  {isSelected && (
                    <motion.div
                      layoutId="calendar-pill"
                      className="absolute inset-0 bg-[#333333] dark:bg-[#333333] light:bg-zinc-100 rounded-2xl shadow-lg shadow-black/5 dark:shadow-white/5"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
                    />
                  )}

                  <span
                    className={cn(
                      "relative z-10 text-[9px] font-bold mb-1 uppercase tracking-widest transition-colors",
                      isSelected 
                        ? "text-white dark:text-white light:text-zinc-900" 
                        : "text-white/40 dark:text-white/40 light:text-zinc-400",
                    )}
                  >
                    {format(date, "EEE")}
                  </span>

                  <span className={cn(
                    "relative z-10 text-lg font-black mb-4 leading-none transition-all",
                    isSelected ? "text-white dark:text-white light:text-zinc-900" : "text-white/60 dark:text-white/60 light:text-zinc-400"
                  )}>
                    {format(date, "d")}
                  </span>

                  <div className="relative z-10 absolute bottom-3 flex flex-col gap-1 w-full px-2">
                    {indicators.pink && (
                      <motion.div
                        variants={progressVariants}
                        className="h-1.5 w-full bg-[#D6406C] rounded-full origin-left will-change-transform"
                      />
                    )}
                    {indicators.blue && (
                      <motion.div
                        variants={progressVariants}
                        transition={{ delay: 0.7 }}
                        className="h-1.5 w-full bg-[#4185C6] rounded-full origin-left will-change-transform"
                      />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex justify-center gap-1.5">
        {[2, 1, 0].map((i) => (
          <motion.div
            key={i}
            layout
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              weeksOffset === i 
                ? "w-4 bg-white dark:bg-white light:bg-zinc-900" 
                : "w-1 bg-white/20 dark:bg-white/20 light:bg-zinc-200",
            )}
          />
        ))}
      </div>
    </div>
  );
}
