import React from "react";
import SanMinimumRoleTab from "../components/san-minimum/SanMinimumRoleTab";

/**
 * SAN_MINIMUM roli uchun sahifa — ro‘yxat va filtrlash; yangi yozuv faqat kassadan qo‘shiladi.
 */
export default function SanMinimumPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">San minimumlar</h1>
        <p className="text-sm text-muted-foreground">
          O‘quvchilar ro‘yxati, filtrlash va tahrirlash
        </p>
      </div>
      <SanMinimumRoleTab />
    </div>
  );
}
