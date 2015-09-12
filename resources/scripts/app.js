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
		graphviz_code.push('\n');
		
		// find 0 level, all lines that contain start_str
		var strPatt = '^.*?([A-Z0-9]+) .*?' + escapeRegExp(gAngScope.BC.start_str) + '.*?$';
		alert(strPatt);
		var patt = new RegExp(strPatt, 'gm');
		
		var parentAddresses = [];
		var match;
		while (match = patt.exec(lastReadLogContents)) {
			graphviz_code.push('\t"' + match[1] + '" [label=" ' + match[0] + '"]');
			parentAddresses.push(match[1]);
			console.log(match);
		}
		
		graphviz_code.push('\n');
		
		// find edges and parent of 0 -> ? level - find for each of the `> addr` what is its parent
		var nextParentAddresses = [];
		var nextParentAddressesHash = {};
		for (var i=0; i<parentAddresses.length; i++) {
			var strPatt = '^> ' + parentAddresses[i] + '.*?$';
			alert(i + ' of ' + parentAddresses.length + '\n\n' + strPatt);
			var patt = new RegExp(strPatt, 'gm');
			var match;
			while (match = patt.exec(lastReadLogContents)) {
				// graphviz_code.push('edge: ' + match[0]);
				// get parent of this edge
				var guessCharsEnoughToIncludeEdgeParent = 1000;
				var hopefullyEnoughContentPriorToThisFind_includesTheParent = lastReadLogContents.substring(match.index - guessCharsEnoughToIncludeEdgeParent, match.index); // parent is the first line above this that does not have start with `> `
				
				var parentOfEdge = /[\s\S]*^(([A-Z0-9]+).*?$)/m.exec(hopefullyEnoughContentPriorToThisFind_includesTheParent);
				// graphviz_code.push('searched for parent of this edge in: "' + hopefullyEnoughContentPriorToThisFind_includesTheParent + '"');
				// graphviz_code.push('parent of this edge: "' + parentOfEdge[1] + '" and address: "' + parentOfEdge[2] + '"');
				if (!(parentOfEdge[2] in nextParentAddressesHash)) {
					nextParentAddresses.push(parentOfEdge[2]);
					nextParentAddressesHash[parentOfEdge[2]] = parentOfEdge[1];
				}
				graphviz_code.push('\t"' + parentOfEdge[2] + '" -> "' + parentAddresses[i] + '" [label="' + match[0] + '"]');
			}
		}
		
		// label the parents
		for (var p in nextParentAddressesHash) { // key is address, and value is label
			graphviz_code.push('\t"' + p + '" [label=" ' + nextParentAddressesHash[p] + '"]');
		}
		
		graphviz_code.push('\n');
		
		// find edges and parent of 0 -> ? level - find for each of the `> addr` what is its parent
		var nextNextParentAddresses = [];
		var nextNextParentAddressesHash = {};
		for (var i=0; i<nextParentAddresses.length; i++) {
			var strPatt = '^> ' + nextParentAddresses[i] + '.*?$';
			alert(i + ' of ' + nextParentAddresses.length + '\n\n' + strPatt);
			var patt = new RegExp(strPatt, 'gm');
			var match;
			while (match = patt.exec(lastReadLogContents)) {
				// graphviz_code.push('edge: ' + match[0]);
				// get parent of this edge
				var guessCharsEnoughToIncludeEdgeParent = 1000;
				var hopefullyEnoughContentPriorToThisFind_includesTheParent = lastReadLogContents.substring(match.index - guessCharsEnoughToIncludeEdgeParent, match.index); // parent is the first line above this that does not have start with `> `
				
				var parentOfEdge = /[\s\S]*^(([A-Z0-9]+).*?$)/m.exec(hopefullyEnoughContentPriorToThisFind_includesTheParent);
				// graphviz_code.push('searched for parent of this edge in: "' + hopefullyEnoughContentPriorToThisFind_includesTheParent + '"');
				// graphviz_code.push('parent of this edge: "' + parentOfEdge[1] + '" and address: "' + parentOfEdge[2] + '"');
				nextNextParentAddresses.push(parentOfEdge[2]);
				if (!(parentOfEdge[2] in nextNextParentAddressesHash)) {
					nextNextParentAddresses.push(parentOfEdge[2]);
					nextNextParentAddressesHash[parentOfEdge[2]] = parentOfEdge[1];
				}
				graphviz_code.push('\t"' + parentOfEdge[2] + '" -> "' + nextParentAddresses[i] + '" [label="' + match[0] + '"]');
			}
		}
		// label the parents
		for (var p in nextNextParentAddressesHash) { // key is address, and value is label
			graphviz_code.push('\t"' + p + '" [label=" ' + nextNextParentAddressesHash[p] + '"]');
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