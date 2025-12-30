import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function TrackerCard({
  mode = 'feeding',          // 'feeding' | 'sleep'
  feedingPercent = 66,
  sleepPercent = 40,
}) {
  const [expanded, setExpanded] = useState(false);
  const cardVisible = true; // keep true so the bar animates in like production

  const percent = mode === 'feeding' ? feedingPercent : sleepPercent;
  const barColor = mode === 'feeding' ? '#EB4899' : '#4F47E6';

  return (
    <div className="rounded-2xl bg-white p-5 shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-6 w-6 rounded bg-black/10" />
        <div className="text-base font-semibold">Header</div>
      </div>

      {/* Big stat */}
      <div className="flex items-baseline gap-2 mb-4">
        <div className="text-5xl font-bold">30</div>
        <div className="text-lg text-gray-500">of 25.5 oz</div>
      </div>

      {/* PRODUCTION Progress Bar (reused) */}
      <div className="relative w-full h-5 bg-gray-100 rounded-2xl overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full rounded-2xl"
          style={{
            width: cardVisible ? `${Math.min(100, percent)}%` : '0%',
            background: barColor,
            transition: 'width 0.6s ease-out',
            transitionDelay: mode === 'sleep' ? '0.05s' : '0s',
          }}
        />
      </div>

      {/* Dots + meta */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="h-3 w-3 rounded-full bg-gray-500" />
          ))}
        </div>
        <div className="text-sm text-gray-500">
          Last slept at 4:02pm (90.9 hrs)
        </div>
      </div>

      <div className="border-t border-gray-100 my-4" />

      {/* Timeline toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-gray-500"
      >
        <span>Timeline</span>
        {expanded ? <ChevronUp /> : <ChevronDown />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 space-y-4">
          <TimelineItem />
          <TimelineItem withNote />
        </div>
      )}
    </div>
  );
}

function TimelineItem({ withNote }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-black/10" />
          <div>
            <div className="font-semibold">4oz</div>
            <div className="text-sm text-gray-500">8:27pm</div>
          </div>
        </div>
        <ChevronDown className="rotate-[-90deg]" />
      </div>

      {withNote && (
        <>
          <div className="italic text-sm text-gray-600 mb-3">
            Note: kid didn't burp dammit!
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="aspect-square rounded-lg bg-gray-300" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
