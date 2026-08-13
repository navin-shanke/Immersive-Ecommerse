'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, CreditCard, User, AlertTriangle, Clock } from 'lucide-react';
import type { OrderStatus } from '@/types/admin';
import { ORDER_STATUSES } from '@/types/admin';
import { fetchAdminOrder, updateOrderStatus } from '@/lib/admin-api';
import { Button, Card, Select, StatusBadge, Spinner } from '../../_components/ui';
import { formatPrice } from '@/lib/utils';

const STATUS_FLOW: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function formatDate(iso: string, withTime = true): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'order', params.id],
    queryFn: () => fetchAdminOrder(params.id),
  });

  const updateMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(params.id, status),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', params.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      if (res.data?.order) setSelectedStatus(res.data.order.status);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <Card className="p-10 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">Order not found</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mb-4">This order may have been deleted.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/orders')}>Back to orders</Button>
      </Card>
    );
  }

  const order = data.data.order;
  const items = order.items ?? [];
  const history = order.statusHistory ?? [];
  const address = order.shippingAddress;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/orders')}
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Back to orders"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">{order.orderNumber}</h2>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">Placed {formatDate(order.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedStatus || order.status}
            onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
            className="w-44"
          >
            {ORDER_STATUSES.map((o) => (
              <option key={o.value} value={o.value}>Set: {o.label}</option>
            ))}
          </Select>
          <Button
            variant="primary"
            size="md"
            loading={updateMutation.isPending}
            disabled={!selectedStatus || selectedStatus === order.status}
            onClick={() => selectedStatus && updateMutation.mutate(selectedStatus)}
          >
            Update status
          </Button>
        </div>
      </div>

      {updateMutation.isError && (
        <Card className="p-4 border-red-300 dark:border-red-900/60">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to update status. {updateMutation.error?.message}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-4">Items</h3>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item._id} className="flex items-start gap-4">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} width={56} height={56} unoptimized className="w-14 h-14 rounded-xl object-cover bg-gray-100 dark:bg-zinc-800 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <span className="text-lg text-gray-400 dark:text-zinc-600">🛍</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-zinc-200">{item.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">
                      {item.sku ?? 'No SKU'}
                      {item.size ? ` · ${item.size}` : ''}
                      {item.color ? ` · ${item.color}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-zinc-200">{formatPrice(item.lineTotal)}</p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500">{item.quantity} × {formatPrice(item.unitPrice)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-zinc-800 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-zinc-500">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-zinc-500">
                <span>Shipping ({order.shippingMethod ?? 'standard'})</span>
                <span>{order.shipping > 0 ? formatPrice(order.shipping) : 'Free'}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-zinc-500">
                <span>Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount</span>
                  <span>−{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 dark:text-zinc-100 pt-2">
                <span>Total ({order.currency})</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </Card>

          {history.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Status history
              </h3>
              <div className="space-y-4">
                {history.map((h) => (
                  <div key={h._id} className="flex items-start gap-3">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-zinc-200">
                        <span className="font-medium capitalize">{h.fromStatus ?? 'Created'}</span>
                        <span className="text-gray-400 dark:text-zinc-600"> → </span>
                        <span className="font-medium capitalize">{h.toStatus}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
                        {h.changedBy ?? 'System'} · {formatDate(h.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Customer
            </h3>
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-200">{order.customer.name ?? '—'}</p>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5 break-all">{order.customer.email ?? '—'}</p>
            {order.customer._id && (
              <Link
                href={`/admin/customers/${order.customer._id}`}
                className="inline-block mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors"
              >
                View customer profile →
              </Link>
            )}
            {!order.customer._id && (
              <p className="text-[11px] text-gray-400 dark:text-zinc-600 mt-3">Guest order — no account on file.</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Shipping address
            </h3>
            <div className="text-sm text-gray-600 dark:text-zinc-400 space-y-0.5">
              {(address.firstName || address.name) && (
                <p className="font-medium text-gray-900 dark:text-zinc-200">
                  {[address.firstName, address.lastName].filter(Boolean).join(' ') || address.name}
                </p>
              )}
              {(address.street1 ?? address.address1) && <p>{address.street1 ?? address.address1}</p>}
              {(address.street2 ?? address.address2) && <p>{address.street2 ?? address.address2}</p>}
              <p>{(address.city || '') + (address.city && address.state ? ', ' : '') + (address.state || '')}</p>
              {(address.postalCode ?? address.zip) && <p>PIN: {address.postalCode ?? address.zip}</p>}
              {address.phone && <p>Phone: {address.phone}</p>}
              {address.country && <p>{address.country}</p>}
              {!address.street1 && !address.address1 && !address.city && <p className="text-gray-400 dark:text-zinc-600">No shipping address recorded.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Payment
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-500">Method</span>
                <span className="text-gray-900 dark:text-zinc-200 capitalize">Razorpay</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-500">Payment ID</span>
                <span className="text-gray-900 dark:text-zinc-200 font-mono text-xs break-all max-w-[140px] text-right">
                  {order.payment.razorpayPaymentId ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-500">Paid at</span>
                <span className="text-gray-900 dark:text-zinc-200">{order.payment.paidAt ? formatDate(order.payment.paidAt) : '—'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-4">Status flow</h3>
            <div className="flex items-center flex-wrap gap-1.5">
              {STATUS_FLOW.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${
                      order.status === s
                        ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/40 dark:text-indigo-400'
                        : 'text-gray-500 border-gray-200 dark:text-zinc-500 dark:border-zinc-700'
                    }`}
                  >
                    {s}
                  </span>
                  {i < STATUS_FLOW.length - 2 && <span className="text-gray-300 dark:text-zinc-700">→</span>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}