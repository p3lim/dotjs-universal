var hostname = location.hostname.replace(/^www\./, '');

var defaults = ''; // library code invoked first
function updatesDefaultJS(js) { defaults = js; }

load('scripts/default.js', updatesDefaultJS);
load('styles/' + hostname + '.css', userCSS);
load('scripts/' + hostname + '.js', userJS);

function userJS(js) { eval(defaults + js); }

function userCSS(css) {
  var stylesheet = document.createElement('style');
  stylesheet.type = 'text/css';
  stylesheet.innerHTML = css;
  document.head.appendChild(stylesheet);
}

function load(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function(e) { cb(this.responseText); };
  xhr.open('GET', chrome.extension.getURL(url), true);
  xhr.send();
}
