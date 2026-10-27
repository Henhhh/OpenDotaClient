import { STEAM_ENDPOINT } from '../src/modules/auth/steam.ts';

// Anonymous connectivity check: no callback, SteamID, login token or credentials.
const started=Date.now();
try {
  const response=await fetch(STEAM_ENDPOINT,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    body:new URLSearchParams({'openid.ns':'http://specs.openid.net/auth/2.0','openid.mode':'check_authentication'}),
  });
  await response.body?.cancel();
  console.log(`Steam reachable: HTTP ${response.status}, ${Date.now()-started}ms.`);
  console.log('Connectivity only; this does not authenticate a Steam account.');
  if(!response.ok)process.exitCode=1;
} catch(error) {
  const kind=error instanceof Error?error.name:'Error';
  console.error(`Cannot reach Steam (${kind}, ${Date.now()-started}ms).`);
  console.error('Check the network/VPN available to the backend process. Browser-only extensions do not configure Node.js.');
  process.exitCode=1;
}
