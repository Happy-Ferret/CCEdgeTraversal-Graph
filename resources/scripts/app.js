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
		MODULE.graphviz_code = 'asd';
		
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

var lastReadLogPath = '';
var lastReadLogContents = '';
function readLogAndGetCode() {
	
	var step0 = function() {
		// check if should read, and set lastReadLogContents
		if (lastReadLogPath != gAngScope.BC.log_path) {
			lastReadLogPath = gAngScope.BC.log_path;
			var promise_read = OS.File.read(gAngScope.BC.log_path, {encoding:'utf-8'});
			promise_read.then(
				function(aVal) {
					console.log('Fullfilled - promise_read - ');
					// start - do stuff here - promise_read
					// alert('ok read it:' + aVal);
					lastReadLogContents = aVal;
					step1();
					// end - do stuff here - promise_read
				},
				function(aReason) {
					var rejObj = {name:'promise_read', aReason:aReason};
					console.warn('Rejected - promise_read - ', rejObj);
					alert('Failed to read file due to error, see browser console');
					// deferred_createProfile.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_read', aCaught:aCaught};
					console.error('Caught - promise_read - ', rejObj);
					alert('dev error on read of log file');
					// deferred_createProfile.reject(rejObj);
				}
			);
		} else {
			step1();
		}
	};
	
	var step1 = function() {
		// start parsing to get code
		// alert('starting parse');
		var graphviz_code = [];
		graphviz_code.push('digraph finite_state_machine {');
		graphviz_code.push('\trankdir=LR;');
		
		var strPatt = '^.*?([A-Z0-9]+) .*?' + escapeRegExp(gAngScope.BC.start_str) + '.*?$';
		alert(strPatt);
		var patt = new RegExp(strPatt, 'gm');
		
		var parentAddresses = [];
		var match;
		while (match = patt.exec(lastReadLogContents)) {
			graphviz_code.push('\t"' + match[1] + '" [label=" ' + match[0] + '"]');
			parentAddresses.push(match[1]);
		}
		
		
		graphviz_code.push('}');
		
		gAngScope.BC.graphviz_code = graphviz_code.join('\n');
		gAngScope.$digest();
	};
	
	step0();

}

// start - common helper functions
function escapeRegExp(text) {
	if (!arguments.callee.sRE) {
		var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'];
		arguments.callee.sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
	}
	return text.replace(arguments.callee.sRE, '\\$1');
}
// end - common helper functions

document.addEventListener('DOMContentLoaded', onPageReady, false);