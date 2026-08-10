'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/stores/useCartStore';
import { validatePromoCode } from '@/lib/data/products';
import { formatPrice } from '@/lib/utils';

export default function CartSummary() {
  const { cart, promoCode, promoDiscount, applyPromo, removePromo } = useCartStore();
  const [codeInput, setCodeInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  const discountAmount = promoCode ? Math.round(cart.total * promoDiscount) / 100 : 0;
  const subtotalAfterDiscount = cart.total - discountAmount;
  const shipping = subtotalAfterDiscount > 100 ? 0 : 9.99;
  const tax = Math.round(subtotalAfterDiscount * 0.08 * 100) / 100;
  const total = subtotalAfterDiscount + shipping + tax;

  const handleApplyPromo = () => {
    setPromoError('');
    setPromoSuccess('');
    const result = validatePromoCode(codeInput, cart.total);
    if (result.valid && result.promo) {
      applyPromo(result.promo.code, result.promo.discountPercent);
      setPromoSuccess(`${result.promo.code} applied — ${result.promo.discountPercent}% off!`);
      setCodeInput('');
    } else {
      setPromoError(result.error || 'Invalid promo code');
    }
  };

  const items = [
    { label: 'Subtotal', value: cart.total },
    ...(promoCode ? [{ label: `Promo (${promoCode})`, value: -discountAmount, isDiscount: true }] : []),
    { label: 'Shipping', value: shipping, free: shipping === 0 },
    { label: 'Tax', value: tax },
  ];

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center justify-between text-sm"
        >
          <span className="text-gray-600 dark:text-gray-400">
            {item.label}
            {'isDiscount' in item && item.isDiscount && (
              <button onClick={removePromo} className="ml-2 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">&times; Remove</button>
            )}
          </span>
          <span className={`font-medium ${('isDiscount' in item && item.isDiscount) ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
            {('free' in item && item.free) ? (
              <span className="text-green-600 dark:text-green-400">Free</span>
            ) : (
              formatPrice(Math.abs(item.value))
            )}
          </span>
        </motion.div>
      ))}

      <div className="border-t border-gray-200 dark:border-zinc-700 pt-3 mt-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
          <motion.span
            key={total}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            {formatPrice(total)}
          </motion.span>
        </div>
      </div>

      {cart.total < 100 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Add {formatPrice(100 - cart.total)} more for free shipping!
        </p>
      )}

      {!promoCode && (
        <div className="pt-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setPromoError(''); setPromoSuccess(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
              placeholder="Promo code"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-transparent focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500"
            />
            <button
              onClick={handleApplyPromo}
              disabled={!codeInput.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
          <AnimatePresence>
            {promoError && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-500 mt-1">{promoError}</motion.p>
            )}
            {promoSuccess && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-green-600 dark:text-green-400 mt-1">{promoSuccess}</motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
