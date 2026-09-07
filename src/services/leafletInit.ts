import L from 'leaflet';

// Safeguard Leaflet DOM utilities against unmounted panes and detached animation frames
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const originalGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: HTMLElement) {
    if (!el) return new L.Point(0, 0);
    try {
      const pos = (el as any)._leaflet_pos;
      if (pos) return pos;
      if (originalGetPosition) {
        return originalGetPosition.call(L.DomUtil, el) || new L.Point(0, 0);
      }
      return new L.Point(0, 0);
    } catch {
      return new L.Point(0, 0);
    }
  };

  const originalSetPosition = L.DomUtil.setPosition;
  L.DomUtil.setPosition = function (el: HTMLElement, point: L.Point) {
    if (!el) return;
    try {
      if (originalSetPosition) {
        originalSetPosition.call(L.DomUtil, el, point);
      } else {
        (el as any)._leaflet_pos = point;
      }
    } catch {
      // Suppress detached DOM errors during transitions
    }
  };

  // Configure default marker icons
  try {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  } catch {
    // Ignore if already patched
  }
}

export default L;
