import React from "react";
import { Users, TestTube2, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import CashierPatientsTab from "../components/cashier/CashierPatientsTab";
import CashierSamplesTab from "../components/cashier/CashierSamplesTab";
import CashierSanMinimumsTab from "../components/cashier/CashierSanMinimumsTab";

export default function CashierWorkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asosiy ishlar</h1>
        <p className="text-sm text-muted-foreground">Bemorlar, buyurtmalar va namunalar — kassa oynasi</p>
      </div>

      <Tabs defaultValue="patients" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="patients" className="gap-2">
            <Users className="h-4 w-4 shrink-0" />
            Bemorlar
          </TabsTrigger>
          <TabsTrigger value="samples" className="gap-2">
            <TestTube2 className="h-4 w-4 shrink-0" />
            Namunalarni boshqarish
          </TabsTrigger>
          <TabsTrigger value="san-minimum" className="gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            San minimumlarini boshqarish
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-4">
          <CashierPatientsTab />
        </TabsContent>

        <TabsContent value="samples" className="space-y-4">
          <CashierSamplesTab />
        </TabsContent>

        <TabsContent value="san-minimum" className="space-y-4">
          <CashierSanMinimumsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
