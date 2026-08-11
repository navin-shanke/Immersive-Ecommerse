<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index('paid_at');
            $table->index(['status', 'paid_at']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->index(['product_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['orders_status_paid_at_index']);
            $table->dropIndex(['orders_paid_at_index']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['order_items_product_id_created_at_index']);
        });
    }
};
