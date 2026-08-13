<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $address = $this->shipping_address ?: [];

        return [
            '_id' => (string) $this->id,
            'orderNumber' => $this->order_number,
            'status' => $this->status,
            'subtotal' => (float) $this->subtotal,
            'shipping' => (float) $this->shipping,
            'tax' => (float) $this->tax,
            'discount' => (float) $this->discount,
            'total' => (float) $this->total,
            'currency' => $this->currency,
            'shippingMethod' => $this->shipping_method,
            'shippingAddress' => $address,
            'customer' => [
                '_id' => $this->user_id !== null ? (string) $this->user_id : null,
                'name' => $this->user?->name ?? ($this->user_id === null ? 'Guest' : null),
                'email' => $this->user?->email ?? null,
            ],
            'items' => $this->whenLoaded('items', fn () => OrderItemResource::collection($this->items)),
            'itemsSummary' => ! $this->relationLoaded('items') ? [
                'count' => (int) $this->items_count,
            ] : [
                'count' => $this->items->sum(fn ($i) => (int) $i->quantity),
            ],
            'payment' => [
                'razorpayOrderId' => $this->razorpay_order_id,
                'razorpayPaymentId' => $this->razorpay_payment_id,
                'paidAt' => $this->paid_at?->toISOString(),
            ],
            'statusHistory' => $this->when($this->relationLoaded('statusHistories'), function () {
                return $this->statusHistories->map(fn ($h) => [
                    '_id' => (string) $h->id,
                    'fromStatus' => $h->from_status,
                    'toStatus' => $h->to_status,
                    'changedBy' => $h->changedBy->name ?? null,
                    'createdAt' => $h->created_at?->toISOString(),
                ])->values();
            }),
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}