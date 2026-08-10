'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CheckoutProgress from '@/components/checkout/CheckoutProgress';
import ShippingForm from '@/components/checkout/ShippingForm';
import PaymentForm from '@/components/checkout/PaymentForm';
import CartSummary from '@/components/cart/CartSummary';
import { useCartStore } from '@/stores/useCartStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { ShippingAddress } from '@/types/order';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';

const steps = ['Shipping', 'Payment', 'Review'];

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<{
    orderId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
  } | null>(null);
  const cart = useCartStore((s) => s.cart);
  const clearCart = useCartStore((s) => s.clearCart);
  const promoCode = useCartStore((s) => s.promoCode);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  const handleShippingSubmit = async (address: ShippingAddress) => {
    setShippingAddress(address);
    setIsProcessing(true);
    try {
      const { data } = await api.post('/checkout/create-order', {
        shippingAddress: {
          firstName: address.firstName,
          lastName: address.lastName,
          street1: address.address1,
          street2: address.address2 || '',
          city: address.city,
          state: address.state,
          postalCode: address.zip,
          country: address.country || 'IN',
          phone: address.phone || '',
        },
        shippingMethod: 'standard',
        promoCode: promoCode || undefined,
      });
      setRazorpayOrder({
        orderId: data.data.orderId,
        razorpayOrderId: data.data.razorpayOrderId,
        amount: data.data.amount,
        currency: data.data.currency,
      });
      setCurrentStep(1);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast({ type: 'error', message: error.response?.data?.message || 'Failed to create order' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }) => {
    if (!razorpayOrder) return;
    setIsProcessing(true);
    try {
      await api.post('/checkout/verify', {
        razorpayOrderId: paymentData.razorpayOrderId,
        razorpayPaymentId: paymentData.razorpayPaymentId,
        razorpaySignature: paymentData.razorpaySignature,
        orderId: razorpayOrder.orderId,
      });
      clearCart();
      setIsComplete(true);
      addToast({ type: 'success', message: 'Order placed successfully!' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast({ type: 'error', message: error.response?.data?.message || 'Payment verification failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    addToast({ type: 'error', message: error });
  };

  if (!isAuthenticated) {
    return (
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Sign in to Checkout</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Create an account or sign in to complete your order.</p>
          <div className="flex flex-col gap-3">
            <Link
              href="/auth/login?redirect=/checkout"
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-center"
            >
              Login
            </Link>
            <Link
              href="/auth/signup?redirect=/checkout"
              className="w-full py-3 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-center"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-lg mx-auto text-center py-16">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6"
          >
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Order Confirmed!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Thank you for your order. You&apos;ll receive a confirmation email shortly.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-8 text-gray-900 dark:text-white"
        >
          Checkout
        </motion.h1>

        <CheckoutProgress currentStep={currentStep} steps={steps} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm"
            >
              {currentStep === 0 && (
                <ShippingForm onSubmit={handleShippingSubmit} isLoading={isProcessing} />
              )}
              {currentStep === 1 && razorpayOrder && (
                <PaymentForm
                  orderId={razorpayOrder.orderId}
                  razorpayOrderId={razorpayOrder.razorpayOrderId}
                  amount={razorpayOrder.amount}
                  currency={razorpayOrder.currency}
                  userName={user?.name || ''}
                  userEmail={user?.email || ''}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                  isLoading={isProcessing}
                />
              )}
              {currentStep === 2 && shippingAddress && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Shipping Address</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shippingAddress.firstName} {shippingAddress.lastName}<br />
                      {shippingAddress.address1}<br />
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Items</h3>
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-1 text-gray-700 dark:text-gray-300">
                        <span>{item.product.name} x{item.quantity}</span>
                        <span>{formatPrice((item.variant.salePrice || item.variant.price) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 bg-gray-50 dark:bg-zinc-900 rounded-2xl">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Order Summary</h2>
              <CartSummary />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
