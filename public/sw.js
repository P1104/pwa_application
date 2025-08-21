const CACHE_NAME = 'my-pwa-cache-v3';
const STATIC_CACHE = 'static-cache-v2';
const DYNAMIC_CACHE = 'dynamic-cache-v2';
const OFFLINE_CACHE = 'offline-cache-v1';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon.svg'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Opened static cache');
        return cache.addAll(urlsToCache);
      }),
      caches.open(OFFLINE_CACHE).then(cache => {
        console.log('Opened offline cache');
        return cache.addAll(['/offline.html']);
      })
    ]).then(() => {
      console.log('All caches populated successfully');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== OFFLINE_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated and took control');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', request.url);
          return response;
        }

        // Clone the request for potential caching
        const fetchRequest = request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache successful responses
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
                console.log('Cached new resource:', request.url);
              });

            return response;
          })
          .catch(() => {
            // Handle offline scenarios
            if (request.mode === 'navigate') {
              // Return offline page for navigation requests
              return caches.match('/offline.html');
            }
            
            // Return a simple offline response for other requests
            if (request.destination === 'image') {
              return new Response(
                '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ccc"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#666">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            
            return new Response('Offline content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

// Handle offline form submissions
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'OFFLINE_SUBMISSION') {
    console.log('Received offline submission:', event.data.submission);
    storeOfflineSubmission(event.data.submission);
  }
  
  if (event.data && event.data.type === 'SYNC_OFFLINE_DATA') {
    console.log('Syncing offline data...');
    event.waitUntil(syncOfflineData());
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Store offline submission in IndexedDB
async function storeOfflineSubmission(submission) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offlineSubmissions'], 'readwrite');
    const store = transaction.objectStore('offlineSubmissions');
    
    await store.add({
      id: Date.now().toString(),
      data: submission,
      timestamp: Date.now(),
      status: 'pending'
    });
    
    console.log('Offline submission stored successfully');
    
    // Notify all clients about the new offline submission
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SUBMISSION_STORED',
        submission: submission
      });
    });
  } catch (error) {
    console.error('Error storing offline submission:', error);
  }
}

// Sync offline data when back online
async function syncOfflineData() {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offlineSubmissions'], 'readonly');
    const store = transaction.objectStore('offlineSubmissions');
    const pendingSubmissions = await store.getAll();
    
    console.log('Found pending submissions:', pendingSubmissions.length);
    
    for (const submission of pendingSubmissions) {
      try {
        // Update status to syncing
        await updateSubmissionStatus(submission.id, 'syncing');
        
        // Simulate API call (in real app, this would be your actual API)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update status to synced
        await updateSubmissionStatus(submission.id, 'synced');
        
        console.log('Submission synced successfully:', submission.id);
        
        // Notify clients about successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SUBMISSION_SYNCED',
            submissionId: submission.id
          });
        });
        
        // Remove synced submission after delay
        setTimeout(async () => {
          await removeSubmission(submission.id);
        }, 3000);
        
      } catch (error) {
        console.error('Error syncing submission:', submission.id, error);
        await updateSubmissionStatus(submission.id, 'failed');
      }
    }
  } catch (error) {
    console.error('Error in syncOfflineData:', error);
  }
}

// Open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PWADatabase', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for offline submissions
      if (!db.objectStoreNames.contains('offlineSubmissions')) {
        const store = db.createObjectStore('offlineSubmissions', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Update submission status
async function updateSubmissionStatus(id, status) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offlineSubmissions'], 'readwrite');
    const store = transaction.objectStore('offlineSubmissions');
    
    const submission = await store.get(id);
    if (submission) {
      submission.status = status;
      await store.put(submission);
    }
  } catch (error) {
    console.error('Error updating submission status:', error);
  }
}

// Remove submission
async function removeSubmission(id) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offlineSubmissions'], 'readwrite');
    const store = transaction.objectStore('offlineSubmissions');
    
    await store.delete(id);
    console.log('Submission removed:', id);
  } catch (error) {
    console.error('Error removing submission:', error);
  }
}

async function doBackgroundSync() {
  try {
    console.log('Starting background sync...');
    await syncOfflineData();
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
