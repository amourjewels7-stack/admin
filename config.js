/* ============================================================
   AMOUR JEWELS — Admin console settings
   apiBase = the address of the backend (Spring Boot on Render).
   Locally it talks to localhost:10000; on the live site set the
   second address to your real backend URL, e.g.
   https://amour-backend.onrender.com   (no trailing slash)
   ============================================================ */
window.AMOUR_ADMIN = {
  apiBase: (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:')
    ? 'http://localhost:10000'
    : 'https://api.amourjewels.in',
  storeName: 'Amour Jewels'
};
