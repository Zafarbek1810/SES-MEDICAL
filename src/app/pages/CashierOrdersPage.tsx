import React from "react";
import CashierOrdersTab from "../components/cashier/CashierOrdersTab";

export default function CashierOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Buyurtmalar</h1>
        <p className="text-sm text-muted-foreground">Ro‘yxat, filter va yangi buyurtma</p>
      </div>
      <CashierOrdersTab />
    </div>
  );
}
