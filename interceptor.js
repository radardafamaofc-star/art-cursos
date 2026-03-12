(function() {
  var OLD = 'lovable.tentalus.qzz.io';
  var NEW = 'art-cursos-production.up.railway.app';

  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && input.indexOf(OLD) !== -1) {
      input = input.split(OLD).join(NEW);
    } else if (input && typeof input === 'object' && input.url && input.url.indexOf(OLD) !== -1) {
      input = new Request(input.url.split(OLD).join(NEW), input);
    }
    return origFetch.call(this, input, init);
  };

  var OrigWS = window.WebSocket;
  function PatchedWS(url, protocols) {
    if (typeof url === 'string' && url.indexOf(OLD) !== -1) {
      url = url.split(OLD).join(NEW);
    }
    if (protocols !== undefined) {
      return new OrigWS(url, protocols);
    }
    return new OrigWS(url);
  }
  PatchedWS.prototype = OrigWS.prototype;
  PatchedWS.CONNECTING = OrigWS.CONNECTING;
  PatchedWS.OPEN = OrigWS.OPEN;
  PatchedWS.CLOSING = OrigWS.CLOSING;
  PatchedWS.CLOSED = OrigWS.CLOSED;
  window.WebSocket = PatchedWS;
})();
