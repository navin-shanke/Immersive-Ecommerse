<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'address' => $this->address,
            'email' => $this->email,
            'avatar' => $this->avatar_path ? $request->getSchemeAndHttpHost().'/storage/'.$this->avatar_path : null,
            'role' => $this->role,
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
