if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const ensurePwaTags = () => {
    try {
      if (!document.querySelector('link[rel="manifest"]')) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      }
      if (!document.querySelector('meta[name="theme-color"]')) {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = '#E6F4FE';
        document.head.appendChild(meta);
      }
      if (!document.querySelector('meta[name="viewport"]')) {
        const v = document.createElement('meta');
        v.name = 'viewport';
        v.content = 'width=device-width,initial-scale=1,viewport-fit=cover';
        document.head.appendChild(v);
      }
      if (!document.querySelector('meta[name="apple-mobile-web-app-title"]')) {
        const t = document.createElement('meta');
        t.name = 'apple-mobile-web-app-title';
        t.content = 'Sotanita';
        document.head.appendChild(t);
      }
      if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
        const m = document.createElement('meta');
        m.name = 'apple-mobile-web-app-capable';
        m.content = 'yes';
        document.head.appendChild(m);
      }
      if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
        const s = document.createElement('meta');
        s.name = 'apple-mobile-web-app-status-bar-style';
        s.content = 'black-translucent';
        document.head.appendChild(s);
      }
      if (!document.querySelector('meta[name="mobile-web-app-capable"]')) {
        const mm = document.createElement('meta');
        mm.name = 'mobile-web-app-capable';
        mm.content = 'yes';
        document.head.appendChild(mm);
      }
      if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        const a = document.createElement('link');
        a.rel = 'apple-touch-icon';
        a.href = '/assets/icons/icon-180.png';
        a.sizes = '180x180';
        document.head.appendChild(a);
      }
      const splashImages = [
        { href: '/assets/splash/splash-1125x2436.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
        { href: '/assets/splash/splash-1242x2688.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)' },
        { href: '/assets/splash/splash-828x1792.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
        { href: '/assets/splash/splash-750x1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
        { href: '/assets/splash/splash-640x1136.png', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
        { href: '/assets/splash/splash-1536x2048.png', media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)' },
        { href: '/assets/splash/splash-1668x2224.png', media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)' },
        { href: '/assets/splash/splash-1668x2388.png', media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)' },
        { href: '/assets/splash/splash-2048x2732.png', media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)' }
      ];

      splashImages.forEach((s) => {
        if (!document.querySelector(`link[rel="apple-touch-startup-image"][href="${s.href}"]`)) {
          const l = document.createElement('link');
          l.rel = 'apple-touch-startup-image';
          l.href = s.href;
          l.media = s.media;
          document.head.appendChild(l);
        }
      });
    } catch (e) {
      // ignore DOM errors
    }
  };

  const registerServiceWorker = () => {
    ensurePwaTags();

    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        if (registration && typeof registration.update === 'function') {
          registration.update().catch(() => {});
        }
        registration.addEventListener && registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                console.log('New service worker installed.');
              }
            });
          }
        });
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerServiceWorker();
  } else {
    window.addEventListener('DOMContentLoaded', registerServiceWorker, { once: true });
  }
}
