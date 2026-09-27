// Check the cached app directly; routine offline status is not part of play UI.
export async function waitForOffline(page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => reject(new Error('Offline cache check timed out')), 15000);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        channel.port1.close();
        if (event.data?.ready) resolve();
        else reject(new Error('Offline assets are incomplete'));
      };
      registration.active.postMessage({type: 'CHECK_READY'}, [channel.port2]);
    });
  });
}
