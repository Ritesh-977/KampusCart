import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const AdBanner = ({
  adClient,
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
}) => {
  const adRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    // Bail out if the container isn't in the DOM yet
    if (!adRef.current) return;

    // Remove any previously rendered ad inside this container so AdSense
    // can re-render a fresh unit on route change
    adRef.current.innerHTML = '';

    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.cssText = 'display:block;';
    ins.setAttribute('data-ad-client', adClient);
    ins.setAttribute('data-ad-slot', adSlot);
    ins.setAttribute('data-ad-format', adFormat);
    ins.setAttribute(
      'data-full-width-responsive',
      String(fullWidthResponsive)
    );

    adRef.current.appendChild(ins);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // AdSense script not yet loaded or blocked by an ad-blocker — safe to ignore
    }
  }, [location.pathname, adClient, adSlot, adFormat, fullWidthResponsive]);

  return (
    <div
      ref={adRef}
      className="w-full overflow-hidden"
      aria-label="Advertisement"
    />
  );
};

export default AdBanner;
