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
		MODULE.max_depth = 1;
		
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
		
		// var parentsForNextD = []; // used by d loop
		var fullParentsHistory = {};
		var parentsForNextD_hash = {}; // used by d loop
		
		// find all the initial parent (any line that includes start_str) addresses:
		var strPatt = '^([A-Z0-9]+) .*?' + escapeRegExp(gAngScope.BC.start_str) + '.*?$';
		// alert(strPatt);
		var patt = new RegExp(strPatt, 'gm');
		var match;
		while (match = patt.exec(lastReadLogContents)) {
			// graphviz_code.push('\t"' + match[1] + '" [label=" ' + match[0] + '"]');
			if (/*!(parentsForNextD_hash[match[1]]) && */!(fullParentsHistory[match[1]])) { // match[1] is the address // match[0] is full line which ill call "name"
				// parentsForNextD.push(match[1]);
				parentsForNextD_hash[match[1]] = match[0];
				fullParentsHistory[match[1]] = 1;
			}
			console.log(match);
		}
		
		// label the initial parents in graphviz_code
		graphviz_code.push('\t// labels for the address found for the start string you supplied, these addresses are the child. we will now map upwards');
		for (var p in parentsForNextD_hash) { // key is address, and value is "name"/"full row"
			graphviz_code.push('\t"' + p + '" [label=" ' + parentsForNextD_hash[p] + '"]');
		}
		
		// parents are addresses, or "name"s/"full row"s that dont start with a ">"
		
		graphviz_code.push('\n');
		graphviz_code.push('\n');
		
		// ok start the itterative
		for (var d=0; d<gAngScope.BC.max_depth; d++) {
			var parentsForThisD_hash = JSON.parse(JSON.stringify(parentsForNextD_hash));
			parentsForNextD_hash = {}; // i will put into here only NEW parents that i never iterated over before, if i itereated over a parent before it will show up in fullParentsHistory. reason i added fullParentsHistory is because things can have cyclic references to self
			
			// ok now find grandparents of this parent, and the edge between the grandparent and parent
			graphviz_code.push('\t// level ' + (d + 1) + ' parents of the initially found child addresses');
			// var totalI = Object.keys(parentsForThisD_hash).length;
			// var i = -1;
			for (var p in parentsForThisD_hash) {
				// i++;
				var strPatt = '^> ' + p + '.*?$';
				// alert(i + ' of ' + totalI + '\n\n' + strPatt);
				graphviz_code.push('\t// using patt: ' + strPatt);
				var patt = new RegExp(strPatt, 'gm');
				
				var match;
				while (match = patt.exec(lastReadLogContents)) {
					// graphviz_code.push('edge: ' + match[0]); // match[0] is the edge between current parrent address and grandparent
					// get parent of this edge
					var guessCharsEnoughToIncludeEdgeParent = 1000;
					var guessTry = 1;
					while (guessTry < 10) {
						var hopefullyEnoughContentPriorToThisFind_includesTheParent = lastReadLogContents.substring(match.index - (guessCharsEnoughToIncludeEdgeParent * guessTry), match.index); // parent is the first line above this that does not have start with `> `
						var parentOfEdge = /[\s\S]*^(([A-Z0-9]+).*?$)/m.exec(hopefullyEnoughContentPriorToThisFind_includesTheParent);
						if (!parentOfEdge) {
							guessTry++;
						} else {
							break;
						}
					}
					if (!parentOfEdge) {
						throw new Error('tried 10 times to go further back to get parent-of-edge, however could not, so am alerting you that i probably could find it if i kept increasing, so this isnt really bad, just have to do more guessTry then 10 - but i just throw here cuz i never found i needed more then 2k in my experiements, so if i get to 10k its just something i want to know about');
					}
					// graphviz_code.push('searched for parent of this edge in: "' + hopefullyEnoughContentPriorToThisFind_includesTheParent + '"');
					// graphviz_code.push('parent of this edge: "' + parentOfEdge[1] + '" and address: "' + parentOfEdge[2] + '"');
					if (/*!(parentOfEdge[2] in parentsForNextD_hash) && */!(parentOfEdge[2] in fullParentsHistory)) {
						parentsForNextD_hash[parentOfEdge[2]] = parentOfEdge[1]; // parentOfEdge[1] is the "name"/"full row" of the grandparent of the current parent address
						fullParentsHistory[parentOfEdge[2]] = 1;
					}
					// if (graphviz_code.indexOf('\t"' + parentOfEdge[2] + '" -> "' + p + '" [label="' + match[0] + '"]') == -1) {
						graphviz_code.push('\t"' + parentOfEdge[2] + '" -> "' + p + '" [label="' + match[0] + '"]');
					// }
				}
			}
			
			// label the grandparents in graphviz_code
			graphviz_code.push('\t// labels for the grandparents found in this level (so these are the labels for the level ' + (d + 2) + ' parents)');
			for (var p in parentsForNextD_hash) { // key is address, and value is "name"/"full row"
				graphviz_code.push('\t"' + p + '" [label=" ' + parentsForNextD_hash[p] + '"]');
			}
			
			graphviz_code.push('\n');
			graphviz_code.push('\n');
		}
		
		graphviz_code.push('}');
		
		gAngScope.BC.graphviz_code = graphviz_code.join('\n');
		gAngScope.$digest();
		
		alert('done');
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