// Hardcoded with path of default profile for Google Chrome
// https://support.google.com/chrome/answer/142059
// chrome://version
// Is there any way to do this programmatically?
var xhr = new XMLHttpRequest();
xhr.open('GET', 'manifest.json');
xhr.onload = function(){
	var manifest = JSON.parse(xhr.responseText);
	// this is relative to the extention path
	var scriptDir = chrome.i18n.getMessage('@@extension_id') + '/' + manifest.version + '_0/scripts/';
	$('#path-win').val(('%LOCALAPPDATA%/Google/Chrome/User Data/Default/Extensions/' + scriptDir).replace('/', '\\'));
	$('#path-linux').val('~/.config/google-chrome/Default/Extensions/' + scriptDir);
	$('#path-osx').val('~/Library/Application Support/Google/Chrome/Default/Extensions/' + scriptDir);
};
xhr.send(null);
