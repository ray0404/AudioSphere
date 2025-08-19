// PWA Debug Helper - Check installation requirements
console.log('=== PWA Installation Debug ===');

// Check if PWA is installable
function checkPWARequirements() {
  const checks = {
    manifest: false,
    serviceWorker: false,
    https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    standalone: false
  };

  // Check manifest
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    checks.manifest = true;
    console.log('✓ Manifest found:', manifestLink.href);
  } else {
    console.log('✗ Manifest not found');
  }

  // Check service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length > 0) {
        checks.serviceWorker = true;
        console.log('✓ Service Worker registered:', registrations[0].scope);
      } else {
        console.log('✗ No Service Worker registered');
      }
    });
  } else {
    console.log('✗ Service Worker not supported');
  }

  // Check if already installed
  checks.standalone = window.matchMedia('(display-mode: standalone)').matches;
  if (checks.standalone) {
    console.log('✓ App is already installed (standalone mode)');
  } else {
    console.log('✗ App not in standalone mode');
  }

  // Check HTTPS
  if (checks.https) {
    console.log('✓ HTTPS or localhost detected');
  } else {
    console.log('✗ HTTPS required for PWA installation');
  }

  console.log('PWA Requirements:', checks);
  return checks;
}

// Listen for install events
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('✓ beforeinstallprompt event fired - PWA is installable!');
  e.preventDefault();
  deferredPrompt = e;
  
  // Create install button in the page
  const installBtn = document.createElement('button');
  installBtn.textContent = '📱 Install App';
  installBtn.style.cssText = `
    position: fixed; 
    top: 20px; 
    right: 20px; 
    z-index: 1000; 
    padding: 12px 20px; 
    background: #9C4F2C; 
    color: white; 
    border: none; 
    border-radius: 8px; 
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  
  installBtn.onclick = async () => {
    console.log('Install button clicked - showing prompt...');
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      console.log('Install choice:', choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        installBtn.remove();
      }
      deferredPrompt = null;
    } catch (err) {
      console.error('Install failed:', err);
    }
  };
  
  document.body.appendChild(installBtn);
  console.log('✓ Install button added to page');
});

window.addEventListener('appinstalled', () => {
  console.log('✓ App was installed successfully');
  deferredPrompt = null;
});

// Run checks after page load
window.addEventListener('load', () => {
  setTimeout(checkPWARequirements, 1000);
});