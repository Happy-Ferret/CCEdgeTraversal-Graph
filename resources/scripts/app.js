// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
// Cm.QueryInterface(Ci.nsIComponentRegistrar);
// Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// Globals
var core = {
	addon: {
		id: 'CCEdgeTraversal-Graph@jetpack',
		path: {
			locale: 'chrome://ccedgetraversal-graph/locale/'
		},
		cache_key: 'v2.0' // set to version on release
	}
}
var gAngScope;
// var gAngInjector;

var myServices = {};
// XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'app.properties?' + core.addon.cache_key); /* Randomize URI to work around bug 719376 */ });

function onPageReady() {}

var	ANG_APP = angular.module('ccedgetraversal-graph', [])
    .config(['$compileProvider', function( $compileProvider ) {
			$compileProvider.imgSrcSanitizationWhitelist(/^\s*(filesystem:file|file):/);
		}
    ])
	.controller('BodyController', ['$scope', function($scope) {
		
		var MODULE = this;
		
		var gAngBody = angular.element(document.body);
		gAngScope = gAngBody.scope();
		// gAngInjector = gAngBody.injector();
		
		MODULE.start_str = '[gc.marked] JS Object (ArrayBuffer)';
		MODULE.log_path = 'C:\\Users\\Vayeate\\AppData\\Local\\Temp\\cc-edges.5828.1442035908.log';
		
		MODULE.BrowseSelectFile = function(aArgName) {
			var fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
			fp.init(Services.wm.getMostRecentWindow('navigator:browser'), 'Log file to search in', Ci.nsIFilePicker.modeOpen);
			fp.appendFilter('CC Edge Log File (*.log)', '*.log');

			var rv = fp.show();
			if (rv == Ci.nsIFilePicker.returnOK) {
				
				MODULE[aArgName] = fp.file.path;

			}// else { // cancelled	}
		};
	}]);

document.addEventListener('DOMContentLoaded', onPageReady, false);