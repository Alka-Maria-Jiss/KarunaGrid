import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts = [], onDismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const { id, message, type = 'info' } = toast;

          const config = {
            success: {
              bg: 'bg-emerald-50 border-emerald-300 text-emerald-950',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
              badge: 'bg-emerald-600 text-white',
            },
            error: {
              bg: 'bg-rose-50 border-rose-300 text-rose-950',
              icon: <XCircle className="w-5 h-5 text-rose-600 shrink-0" />,
              badge: 'bg-rose-600 text-white',
            },
            warning: {
              bg: 'bg-amber-50 border-amber-300 text-amber-950',
              icon: <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />,
              badge: 'bg-amber-600 text-white',
            },
            info: {
              bg: 'bg-serene-container border-serene-outline-subtle text-serene-text',
              icon: <Info className="w-5 h-5 text-serene-primary shrink-0" />,
              badge: 'bg-serene-primary text-white',
            },
          }[type] || {
            bg: 'bg-serene-container border-serene-outline-subtle text-serene-text',
            icon: <Info className="w-5 h-5 text-serene-primary shrink-0" />,
            badge: 'bg-serene-primary text-white',
          };

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`pointer-events-auto p-4 rounded-xl border shadow-lg backdrop-blur-md flex items-start gap-3 justify-between ${config.bg}`}
            >
              <div className="flex items-start gap-3">
                {config.icon}
                <div className="text-xs sm:text-sm font-medium leading-snug">
                  {message}
                </div>
              </div>
              <button
                onClick={() => onDismiss(id)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity shrink-0 -mr-1 -mt-1"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
