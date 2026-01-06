'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function BuyMeCoffeeWidget() {
  const pathname = usePathname();

  // Hide BMC on blog pages
  const shouldShowBMC = !pathname?.startsWith('/blog');

  useEffect(() => {
    if (!shouldShowBMC) {
      // Hide existing BMC widget if it exists
      const bmcWidget = document.querySelector('[data-name="BMC-Widget"]');
      if (bmcWidget) {
        (bmcWidget as HTMLElement).style.display = 'none';
      }

      // Also hide any BMC iframes or containers
      const bmcContainers = document.querySelectorAll('[class*="bmc-"], [id*="bmc"]');
      bmcContainers.forEach((container) => {
        (container as HTMLElement).style.display = 'none';
      });
    } else {
      // Show BMC widget if it was previously hidden
      const bmcWidget = document.querySelector('[data-name="BMC-Widget"]');
      if (bmcWidget) {
        (bmcWidget as HTMLElement).style.display = 'block';
      }

      const bmcContainers = document.querySelectorAll('[class*="bmc-"], [id*="bmc"]');
      bmcContainers.forEach((container) => {
        (container as HTMLElement).style.display = 'block';
      });
    }
  }, [shouldShowBMC]);

  if (!shouldShowBMC) {
    return null;
  }

  return (
    <script
      data-name="BMC-Widget"
      data-cfasync="false"
      src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
      data-id="conor.mcloughlin"
      data-description="Support me on Buy me a coffee!"
      data-message=""
      data-color="#40DCA5"
      data-position="BottomLeft"
      data-x_margin="18"
      data-y_margin="80"
    />
  );
}
