"use client";

import { Button } from "@/components/ui";

export default function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Print report
    </Button>
  );
}
