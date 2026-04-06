import React from "react";
import SanMinimumsTab from "./SanMinimumsTab";

/** SAN_MINIMUM roli: kassadagi “Qo‘shish” va boshqa kassa-maxsus yo‘llar yo‘q. */
export default function SanMinimumRoleTab() {
  return <SanMinimumsTab allowCreate={false} showCourseDatesOnEdit />;
}
