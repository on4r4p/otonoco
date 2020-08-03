
var TC = {state: 'notInitialized'};

if (window === window.top) {
	chrome.runtime.onMessage.addListener(function(message, sender, callback) {
		if (message.type === "browserAction") {
			switch(TC.state) {
				case 'notInitialized':
					initializeTabCinema();
				case 'normal':
					TC.findVideos([]);
					break;
				case 'maximized':
					TC.minimizeVideo();
					break;
				case 'overlay':
					TC.removeOverlays();
					break;
			}
		}
	});
}

var TCrequests = [
	'requestVideos',
	'reportVideos',
	'reportDone',
	'maximizeVideo',
	'minimizeVideo',
	'addOverlay',
	'removeOverlays',
	'removeOverlay',
	'requestEndFullscreen'
];

window.addEventListener("message", function(event) {
	if (TCrequests.indexOf(event.data.message)===-1) {
		
		return;
	}
	
	
	if (TC.state==="notInitialized") {
		initializeTabCinema();
	}
	
	
	switch (event.data.message) {
		case 'requestVideos':
			TC.findVideos(event.data.path);
		break;
		case 'reportDone':
			TC.processReport();
		break;
		case 'reportVideos':
			TC.addVideos(event.source,event.data.videos);
		break;
		case 'maximizeVideo':
			TC.maximizeVideo(event.data.path);
		break;
		case 'minimizeVideo':
			TC.minimizeVideo();
		break;
		case 'addOverlay':
			TC.addOverlay(event.data.uid);
		break;
		case 'removeOverlays':
			TC.removeOverlays();
		break;
		case 'removeOverlay':
			TC.removeOverlay(event.data.uid);
		break;
		case 'requestEndFullscreen':
			TC.minimizeVideo();
		break;
	}
}, false);



function nococheck() {

        if(window.location.href.indexOf("http://noco.tv/") > -1) {

                var metas = document.getElementsByTagName('meta');
                var metaplayer = ('og:video:type');
                Testmeta = metas[11].getAttribute('property')
                

                if (Testmeta == metaplayer) {
                                var playernoco = 1;
                 }
                else {
                                var playernoco = 0;
                 }




        if (playernoco == 1 && (TC.state === 'maximized' || TC.state === 'overlay' || TC.state === 'notInitialized')) {
                switch(TC.state) {
                        default:
                        case 'notInitialized':
                                initializeTabCinema();
                        case 'normal':
                                window.top.postMessage({
                                        message : 'requestVideos',
                                        path    : []
                                },'*');
                                break;
                        case 'maximized':
                                window.top.postMessage({
                                        message : 'requestEndFullscreen'
                                },'*');
                                break;
                        case 'overlay':
                                window.top.postMessage({
                                        message : 'removeOverlays'
                                },'*');
                        break;
                }
                e.stopPropagation();
                e.preventDefault();

                             }
        else if (playernoco == 0) {
                //document.write('<div>no player found</div>');
                                 }
        }

        else {
                //document.write('<div>nonoco</div>')
             }

}
nococheck()

document.body.addEventListener('keydown',function(e) {
	if ((e.keyCode === 32 && e.ctrlKey) || (e.keyCode === 27 && (TC.state === 'maximized' || TC.state === 'overlay'))) {
		switch(TC.state) {
			default:
			case 'notInitialized':
			case 'normal':
				window.top.postMessage({
					message	: 'requestVideos',
					path	: []
				},'*');
				break;
			case 'maximized':
				window.top.postMessage({
					message	: 'requestEndFullscreen'
				},'*');
				break;
			case 'overlay':
				window.top.postMessage({
					message	: 'removeOverlays'
				},'*');
			break;
		}
		e.stopPropagation();
		e.preventDefault();
	}
});

function initializeTabCinema() { TC = {
	
	
	options : {
		scanTags	: [
			"video",
			"embed",
			"object",
			"img",
			"canvas"
		],
		scanTimeout	: 250,
		minSize		: 150
	},
	
	
	state: "normal",
	path: [],
	allVideos: [],
	myVideos: {},
	iframes: {},
	target: {},
	scrollBeforeMaximize: {top: 0, left: 0},
	handleVideoRemoveTimeout: 0,
	wrapUpTimeout: 0,
	pendingReports: 0,
	inlineStyleSubtle: "\
		clear		: none		!important;\
		top			: 0			!important;\
		left		: 0 		!important;\
		min-width	: 0			!important;\
		min-height	: 0			!important;\
		width		: 100%		!important;\
		height		: 100%		!important;\
		max-width	: 100%		!important;\
		max-height	: 100%		!important;\
		margin		: 0			!important;\
		padding		: 0			!important;\
		visibility	: visible	!important;\
		border-width: 0			!important;\
		background	: black		!important;",
	inlineStyleForce: "\
		position	: fixed 	!important;\
		top			: 0			!important;\
		left		: 0 		!important;\
		min-width	: 0			!important;\
		min-height	: 0			!important;\
		width		: 100%		!important;\
		height		: 100%		!important;\
		max-width	: 100%		!important;\
		max-height	: 100%		!important;\
		margin		: 0			!important;\
		padding		: 0			!important;\
		visibility	: visible	!important;\
		border-width: 0			!important;\
		background	: black		!important;",
	
	
	findVideos: function(path) {
		
		
		this.path = path;
		
		
		this.allVideos = [];
		this.myVideos = {};
		this.iframes = {};
		
		
		var videos = [];
		var elmts = document.querySelectorAll(this.options.scanTags.join(','));
		for (var i=0; i<elmts.length; i++) {
			
			var el = elmts[i];
			
			
			if (Math.min(el.offsetWidth,el.offsetHeight) < this.options.minSize) {
				continue;
			}
			
			
			if (this.fractionInViewport(el) === 0) {
				continue;
			}
			
			
			var tag = el.nodeName.toLowerCase();
			if (tag === 'embed') {
				if (el.parentNode.nodeName.toLowerCase() === 'object') {
					if (Math.min(el.parentNode.offsetWidth,el.parentNode.offsetHeight) > this.options.minSize) {
						
						continue;
					}
				}
			}
			else if (tag === 'object') {
				var embeds = el.getElementsByTagName('embed');
				if (embeds.length !== 0) {
					
					el = embeds[0];
				}
			}
			
			
			var uid = ''+Math.round(Math.random()*1e9);
			
			
			videos.push({
				uid		: uid,
				path	: this.path.concat([uid]),
				tag		: tag
			});
			
			
			this.myVideos[uid] = el;
			
		}
		
		
		if (videos.length > 0) {
			if (window === window.top) {
				this.addVideos(window,videos);
			}
			else {
				
				window.top.postMessage({
					message	: 'reportVideos',
					videos	: videos
				},'*');
			}
		}
		
		
		var iframes = document.querySelectorAll("iframe");
		this.pendingReports = 0;
		for (var i=0; i<iframes.length; i++) {
			var frame = iframes[i];
			
			if (this.fractionInViewport(frame) > 0) {
				var uid = ''+Math.round(Math.random()*1e9);
				this.iframes[uid] = frame;
				this.pendingReports++;
				frame.contentWindow.postMessage({
					message	: 'requestVideos',
					path	: this.path.concat([uid])
				},'*');
			}
		}
		
		
		if (this.pendingReports === 0) {
			this.wrapUpReports();
		}
		else {
			this.wrapUpTimeout = window.setTimeout(function() {
				console.warn('TC iframe timeout');
				TC.wrapUpReports();
			},this.options.scanTimeout);
		}
	},
	
	
	addVideos: function(parentWindow,videos) {
		for (var i in videos) {
			videos[i].window = parentWindow;
		}
		this.allVideos = this.allVideos.concat(videos);
	},
	
	
	processReport: function() {
		if (--this.pendingReports === 0) {
			window.clearTimeout(this.wrapUpTimeout);
			this.wrapUpReports();
		}
	},
	
	
	wrapUpReports: function() {
		
		if (window !== window.top) {
			
			window.parent.postMessage({
				message: 'reportDone'
			},'*');
		}
		else {
			
			
			if (this.allVideos.length === 1) {
			
				
				this.maximizeVideo(this.allVideos[0].path);
				
			}
			else if (this.allVideos.length > 1) {
			
				
				var videoCount = 0, videoIndex = 0;
				for (var i=0; i<this.allVideos.length; i++) {
					if (this.allVideos[i].tag !== 'img') {
						videoCount++;
						videoIndex = i;
					}
				}
				
				if (videoCount === 1) {
				
					
					this.maximizeVideo(this.allVideos[videoIndex].path);
					
				}
				else {
				
					
					this.addOverlays();
					
				}
			}
			else {
				
				
				if (this.stage === "maximized") {
					window.top.postMessage({
						message	: 'requestEndFullscreen'
					},'*');
				}
				
			}
			
		}
		
	},
	
	
	maximizeVideo: function(path) {
		
		
		if (this.state === "maximized") {
			
			
			if (this.target.tag === "video" && !this.target.isYTHTML5) {
				this.target.customControls.destroy();
			}
			
		}
		else {
			
			
			this.scrollBeforeMaximize = {
				top: document.body.scrollTop,
				left: document.body.scrollLeft
			};
			
			
			if (this.state === "overlay") {
				this.removeOverlays();
			}
		}
		
		
		if (path.length > 1) {
		
			
			this.target = {
				DOMnode		: this.iframes[path[0]],
				tag			: 'iframe',
				subtle		: false
			};
			this.maximizeTarget();
			
			
			this.iframes[path[0]].contentWindow.postMessage({
				message	: 'maximizeVideo',
				path	: path.slice(1)
			},'*');
			
		}
		else {
			
			
			var el = this.myVideos[path[0]];
			
			
			this.target = {
				DOMnode		: el,
				tag			: el.nodeName.toLowerCase(),
				player		: this.getPlayer(el),
				quality		: this.getQuality(el),
				subtle		: true
			};
			
			
			if (this.target.tag === 'object') {
				var params = this.target.DOMnode.getElementsByTagName('param');
				for (var i=0; i<params.length; i++) {
					if (params[i].name === 'scale') {
						if (params[i].value === 'noscale') {
							this.target.subtle = false;
							this.target.scaleParam = params[i].value;
							params[i].value = 'default';
						}
					}
					else if (params[i].name === 'flashvars') {
						var fv = params[i].value;
						if (fv) {
							var newfv = fv.replace(/stretching=[^&]*/i,'stretching=uniform');
							if (newfv!==fv) {
								this.target.subtle = false;
								this.target.fv = fv;
								params[i].value = newfv;
							}
						}
					}
				}
			}
			else if (this.target.tag === 'embed') {
				var fv = this.target.DOMnode.getAttribute('flashvars');
				if (fv) {
					this.target.fv = fv;
					var newfv = fv.replace(/stretching=[^&]*/i,'stretching=uniform');
					this.target.DOMnode.setAttribute('flashvars',newfv);
				}
			}
			
			
			this.setQuality(this.target.DOMnode,'highest');
			
			
			if (this.target.tag === 'video') {
				
				
				if (window.location.host === "www.youtube.com") {
					var controls = document.querySelector('.html5-video-controls');
					if (controls) {
						this.target.isYTHTML5 = true;
						this.target.YTHTML5controls = controls;
						this.target.controlsVisible = false;
						if (typeof controls['originalStyle'] === "undefined") {
							controls['originalStyle'] = controls.getAttribute('style') || '';
							controls.setAttribute('style',controls['originalStyle']+'position: absolute !important; visibility: hidden !important;');
							TC.addClassDeep(controls,'tc-show');
						}
						var hideControlsTimeout = 0;
						var onControls = false;
						document.body.addEventListener('mousemove',this.handleYTHTML5MouseMove);
					}
				}
				
				
				if (!this.target.isYTHTML5) {
					this.target.subtle = false;
					this.target.controls = this.target.DOMnode.controls;
					this.target.DOMnode.controls = false;
					this.target.customControls = this.createHTML5Controls(this.target.DOMnode);
					this.target.DOMnode.parentNode.appendChild(this.target.customControls.container);
				}
			}
			
			
			this.maximizeTarget();
			
			
			try {
				this.target.DOMnode.focus();
			} catch(err) {}
			
		}
		
		
		document.body.scrollTop = document.body.scrollLeft = 0;
		
		
		if (this.state !== "maximized") {
			
			
			this.removedObserver = new MutationObserver(this.handleMutations);
			this.removedObserver.observe(document.body, {childList: true, subtree: true});
			
			
			this.state = "maximized";
			
		}
		
	},
	
	
	maximizeTarget: function() {
		
		var el = this.target.DOMnode;
		
		
		if (this.target.tag === 'img') {
			var src = el.src || '';
			el = document.body;
			while (el !== document) {
		
				
				el.classList.add('tc-show');
				
				
				if (typeof el['originalStyle'] === "undefined") {
					el['originalStyle'] = el.getAttribute('style') || '';
				}
				
				
				if (el === document.body) {
					el.setAttribute('style',el['originalStyle'] + this.inlineStyleSubtle + 'background: black url("'+src+'") no-repeat center center fixed !important;  background-size: contain !important;');
				}
				else {
					el.setAttribute("style",el['originalStyle'] + this.inlineStyleSubtle);
				}
								
				
				el = el.parentNode;
			}
			return;
		}
		
		
		if (!this.target.subtle) {
			if (typeof el['originalStyle'] === "undefined") {
				el['originalStyle'] = el.getAttribute('style') || '';
			}
			el.setAttribute("style",this.inlineStyleForce);
		}
		
		while (el !== document) {
			
			
			el.classList.add('tc-show');
			
			
			if (this.target.subtle) {
				el.classList.add('tc-subtle');
				if (typeof el['originalStyle'] === "undefined") {
					el['originalStyle'] = el.getAttribute('style') || '';
				}
				
				el.setAttribute("style",el['originalStyle'] + this.inlineStyleSubtle);
			}
			
			
			el = el.parentNode;
			
		} 
	},
	
	
	minimizeVideo: function() {
		
		
		this.state = "normal";
		
		
		this.removedObserver.disconnect();
		
		
		if (typeof this.target.scale !== "undefined") {
			this.target.DOMnode.scale = this.target.scale;
		}
		
		
		if (this.target.tag === "iframe") {
			this.target.DOMnode.contentWindow.postMessage({message: 'minimizeVideo'},'*');
		}
		else if (this.target.tag === "video") {
			if (this.target.isYTHTML5) {
				window.clearTimeout(TC.hideControlsTimeout);
				document.body.removeEventListener('mousemove',this.handleYTHTML5MouseMove);
				var controls = this.target.YTHTML5controls;
				controls.setAttribute('style',controls['originalStyle']);
				TC.removeClassDeep(controls,'tc-show');
			}
			else {
				this.target.customControls.destroy();
				this.target.DOMnode.controls = this.target.controls;
			}
		}
		else if (this.target.tag === 'embed') {
			if (this.target.fv) {
				this.target.DOMnode.setAttribute('flashvars',this.target.fv);
			}
		}
		else if (this.target.tag === 'object') {
			if (this.target.scaleParam || this.target.fv ) {
				var params = this.target.DOMnode.getElementsByTagName('param');
				for (var i=0; i<params.length; i++) {
					if (this.target.scaleParam && params[i].name === 'scale') {
						params[i].value = this.target.scaleParam;
					}
					else if (this.target.fv && params[i].name === 'flashvars') {
						params[i].value = this.target.fv;
					}
				}
			}
		}
		
		
		this.minimizeTarget();
		
		
		document.body.scrollTop = this.scrollBeforeMaximize.top
		document.body.scrollLeft = this.scrollBeforeMaximize.left;
		
		
		this.allVideos = [];
		this.myVideos = {};
		this.iframes = {};
	},
	
	
	minimizeTarget: function() {
		
		if (!this.target.DOMnode) {
			
			return;
		}
		
		
		if (this.target.tag === 'img') {
			el = document.body;
			while (el !== document) {
			
				
				el.classList.remove('tc-show');
				
				el.setAttribute('style',el['originalStyle']);
				el.removeAttribute('originalStyle');
				
				
				el = el.parentNode;
			}
			return;
		}
		
		
		var el = this.target.DOMnode;
		if (!this.target.subtle) {
			el.setAttribute('style',el['originalStyle']);
			el.removeAttribute('originalStyle');
		}
		
		while (el && el !== document) {
			
			
			el.classList.remove('tc-show');
			
			
			if (this.target.subtle) {
				el.classList.remove('tc-subtle');
				el.setAttribute('style',el['originalStyle']);
				el.removeAttribute('originalStyle');
			}
			
			
			el = el.parentNode;
		} 
	},
	
	
	addOverlays: function() {
		this.state = 'overlay';
		for (var i=0; i<this.allVideos.length; i++) {
			var video = this.allVideos[i];
			if (video.window === window) {
				this.addOverlay(video.uid);
			}
			else {
				video.window.postMessage({
					message: 'addOverlay',
					uid: video.uid
				},'*');
			}
		}
	},
	
	
	removeOverlays: function() {
		this.state = 'normal';
		for (var i=0; i<this.allVideos.length; i++) {
			var video = this.allVideos[i];
			if (video.window === window) {
				this.removeOverlay(video.uid);
			}
			else {
				video.window.postMessage({
					message: 'removeOverlay',
					uid: video.uid
				},'*');
			}
		}
	},
	
	
	addOverlay: function(uid) {
		var el = this.myVideos[uid];
		var div = document.createElement('div');
		div.classList.add('tc-overlay');
		div.style.width = el.offsetWidth + 'px';
		div.style.height = el.offsetHeight + 'px';
		div.style.lineHeight = el.offsetHeight +'px';
		div.innerHTML = 'Click to maximize';
		div.setAttribute('videoUid',uid);
		div.addEventListener('click',this.handleOverlayClick);
		if (el.nextSibling) {
			el.parentNode.insertBefore(div, el.nextSibling);
		}
		else {
			el.parentNode.appendChild(div);
		}
		var elRect = el.getBoundingClientRect();
		var divRect = div.getBoundingClientRect();
		var topError = elRect.top - divRect.top;
		var leftError = elRect.left - divRect.left;
		div.style.marginLeft = leftError + 'px';
		div.style.marginTop = topError + 'px';
	},
	
	
	removeOverlay: function(uid) {
		var overlays = document.querySelectorAll('.tc-overlay');
		for (var i=0; i<overlays.length; i++) {
			if (uid === overlays[i].getAttribute('videoUid')) {
				overlays[i].removeEventListener('click',this.handleOverlayClick);
				overlays[i].parentNode.removeChild(overlays[i]);
			}
		}
	},
	
	
	handleOverlayClick: function(e) {
		var uid = e.target.getAttribute('videoUid');
		window.top.postMessage({
			message	: 'maximizeVideo',
			path	: TC.path.concat([uid])
		},'*');
		e.preventDefault();
		e.stopPropagation();
	},
	
	
	handleMutations: function(mutations) {
		if (!TC.hasClass(document.body,"tc-show")) {
			window.clearTimeout(TC.handleVideoRemoveTimeout);
			TC.handleVideoRemoveTimeout = window.setTimeout(function() {TC.handleVideoRemoved()},100);
		}
		else {
			mutations.forEach(function(mutation) {
				for (var i in mutation.removedNodes) {
					if (TC.hasClass(mutation.removedNodes[i],'tc-show')) {
						window.clearTimeout(TC.handleVideoRemoveTimeout);
						TC.handleVideoRemoveTimeout = window.setTimeout(function() {TC.handleVideoRemoved()},100);
					}
				}
			});
		}
	},
	
	
	handleVideoRemoved: function() {
		
		
		this.findVideos([]);
	},
	
	
	handleYTHTML5MouseMove: function(e) {
		var onControls = e.clientY > window.innerHeight - 40;
		var controls = TC.target.YTHTML5controls;
		if (TC.target.controlsVisible) {
			window.clearTimeout(TC.hideControlsTimeout);
		}
		else {
			controls.setAttribute('style',controls['originalStyle']+'position: fixed !important; visibility: visible !important;');
			TC.target.controlsVisible = true;
		}
		TC.hideControlsTimeout = window.setTimeout(function() {
			if (!onControls) {
				controls.setAttribute('style',controls['originalStyle']+'position: absolute !important; visibility: hidden !important;');
				TC.target.controlsVisible = false;
			}
		},1000);
	},
	
	
	hasClass: function (node,selector) {
		var className = " " + selector + " ";
		if (node.nodeType === 1 && (" " + node.className + " ").replace(/[\t\r\n\f]/g, " ").indexOf(className) >= 0) {
			return true;
		}
		else {
			return false;
		}
	},
	
	
	addClassDeep: function(el,cls) {
		if (el.classList) {
			el.classList.add(cls);
		}
		var children = el.childNodes;
		for (var i in children) {
			TC.addClassDeep(children[i],cls);
		}
	},
	
	
	removeClassDeep: function(el,cls) {
		if (el.classList) {
			el.classList.remove(cls);
		}
		var children = el.childNodes;
		for (var i in children) {
			TC.removeClassDeep(children[i],cls);
		}
	},
	
	
	isVisible: function(el) {
		return (el.clientWidth > 0 || el.clientHeight > 0) && window.getComputedStyle(el).visibility !== 'hidden';
	},
	
	getOffset: function(el)	{
		var offset = {left: 0, top: 0};
		do {
			offset.left += (el.offsetLeft || 0);
			offset.top += (el.offsetTop || 0);
		} while(el = el.offsetParent);
		return offset;
	},
	
	fractionInViewport: function(el) {
		var rect = el.getBoundingClientRect();
		var visibleRect = {
			top		: Math.max(0,rect.top),
			right	: Math.min(window.innerWidth || document.documentElement.clientWidth,rect.right),
			bottom	: Math.min(window.innerHeight || document.documentElement.clientHeight,rect.bottom),
			left	: Math.max(0,rect.left)
		};
		visibleRect.width = Math.max(0,visibleRect.right - visibleRect.left);
		visibleRect.height = Math.max(0,visibleRect.bottom - visibleRect.top);
		
		return (visibleRect.width * visibleRect.height) / (rect.width * rect.height);
	},
	
	getPlayer: function(el) {
		if (el.nodeName.toLowerCase() === 'video') {
			return "html5";
		}
		else if (el.getPlayerState) {
			return "yt";
		}
		else if (el.getConfig) {
			return "jw4";
		}
		else {
			return "other";
		}
	},
	
	getQuality: function(el) {
		var player = this.getPlayer(el);
		if (player === "yt") {
			try {
				return el.getPlaybackQuality();
			}	catch(err) {}
		}
		else {
			return "";
		}
	},

	setQuality: function(el,q) {
		var player = this.getPlayer(el);
		if (player === "yt") {
			try {
				if (q === 'highest') {
					var qs = el.getAvailableQualityLevels();
					q = qs[0];
				}
				window.setTimeout(function() {
					try {
						el.setPlaybackQuality(q);
					} catch(err) {}
				},200);
			}	catch(e) {}
		}
	},
	
	createHTML5Controls: function(node) {
		var html5controls = {
			
			video		: node,
			container 	: null,
			
			construct : function() {
				
				
				this.container = document.createElement('div');
				this.container.classList.add('tc-show');
				this.container.setAttribute('id','tc-html5-controls-hover-container');
				this.container.setAttribute('style','display: block; text-align: center; width: 100%; height: 50px; position: fixed; bottom: 0; left: 0; z-index: 10000');
				
				
				this.inner = document.createElement('div');
				this.inner.classList.add('tc-show');
				this.inner.setAttribute('style','position: relative; width: 50%; padding: 0px 30px; margin: 5px auto; height: 30px; background-color: rgba(0,0,0,0.5); border-radius: 5px; box-shadow: 0px 0px 10px #888;  -webkit-box-sizing: content-box;-moz-box-sizing: content-box;box-sizing: content-box;');
				this.container.appendChild(this.inner);
				
				
				var stretch = document.createElement('div');
				stretch.classList.add('tc-show');
				stretch.setAttribute('style','position: relative; width: 100%;');
				this.inner.appendChild(stretch);
				
				
				this.btnPlay = document.createElement('div');
				this.btnPlay.setAttribute('style','position: absolute; left: 5px; top: 5px; width: 20px; height: 20px; background-color: rgba(100,100,100,0.5); color: #fff; font-size: 16px; line-height: 20px; border-radius: 3px; cursor: pointer');
				this.btnPlay.classList.add('tc-show');
				this.updateState();
				this.inner.appendChild(this.btnPlay);
				
				
				this.progressBar = document.createElement('div');
				this.progressBar.classList.add('tc-show');
				this.progressBar.setAttribute('style','float: left; position: relative; margin: 5px 0; height: 20px; width: 79%; border: 1px solid rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden;');
				this.loadedIndicator = document.createElement('div');
				this.loadedIndicator.classList.add('tc-show');
				this.loadedIndicator.setAttribute('style','position: absolute; left: 0; top: 0; width: 0%; height: 100%; background-color: rgba(255,255,255,0.2);');
				this.playedIndicator = document.createElement('div');
				this.playedIndicator.classList.add('tc-show');
				this.playedIndicator.setAttribute('style','position: absolute; left: 0; top: 0; width: 0%; height: 100%; background-color: rgba(255,255,255,0.5);');
				this.seekRange = document.createElement('input');
				this.seekRange.classList.add('tc-show');
				this.seekRange.setAttribute('type','range');
				this.seekRange.setAttribute('min',0);
				this.seekRange.setAttribute('max',100);
				this.seekRange.setAttribute('step',0.1);
				this.seekRange.setAttribute('style','position: relative; width: 100%; background: none; border: none;');
				this.progressBar.appendChild(this.loadedIndicator);
				this.progressBar.appendChild(this.playedIndicator);
				this.progressBar.appendChild(this.seekRange);
				stretch.appendChild(this.progressBar);
				
				
				var volumeContainer = document.createElement('div');
				volumeContainer.classList.add('tc-show');
				volumeContainer.setAttribute('style','float: left; position: relative; margin: 5px 0; height: 20px; width: 20%;');
				stretch.appendChild(volumeContainer);
				
				
				this.btnMute = document.createElement('div');
				this.btnMute.classList.add('tc-show');
				this.btnMute.setAttribute('style','position: absolute; width: 20px; height: 20px; left: 5px; top: 0; background-color: rgba(100,100,100,0.5); color: #fff; font-size: 12px; line-height: 20px; border-radius: 3px; text-align: center; cursor: pointer');
				this.btnMute.appendChild(document.createTextNode('\u25C1)'));
				volumeContainer.appendChild(this.btnMute);
				
				
				this.volumeBar = document.createElement('div');
				this.volumeBar.classList.add('tc-show');
				this.volumeBar.setAttribute('style','position: absolute; left:30px; top: 0; right: 0; bottom: 0; border: 1px solid rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden;');
				this.volumeIndicator = document.createElement('div');
				this.volumeIndicator.classList.add('tc-show');
				this.volumeIndicator.setAttribute('style','position: absolute; left: 0; top: 0; width: 0%; height: 100%; background-color: rgba(255,255,255,0.2);');
				this.volumeRange = document.createElement('input');
				this.volumeRange.classList.add('tc-show');
				this.volumeRange.setAttribute('type','range');
				this.volumeRange.setAttribute('min',0);
				this.volumeRange.setAttribute('max',100);
				this.volumeRange.setAttribute('step',1);
				this.volumeRange.setAttribute('style','position: relative; width: 100%; background: none; border: none;');
				this.updateVolume();
				this.volumeBar.appendChild(this.volumeIndicator);
				this.volumeBar.appendChild(this.volumeRange);
				volumeContainer.appendChild(this.volumeBar);
				
				
				this.btnTC = document.createElement('div');
				this.btnTC.classList.add('tc-show');
				this.btnTC.setAttribute('style','position: absolute; right: 5px; top: 5px; width: 20px; height: 20px; background-color: rgba(100,100,100,0.5); color: #fff; font-size: 18px; line-height: 20px; border-radius: 3px; cursor: pointer');
				this.btnTC.appendChild(document.createTextNode('\u25A3'));
				this.inner.appendChild(this.btnTC);
				
				
				this.updatePlayedInterval = window.setInterval(this.updatePlayed,40);
				
				
				this.btnPlay.addEventListener('mousedown',this.togglePlayPause);
				this.btnTC.addEventListener('mousedown',this.exitFullScreen);
				this.seekRange.addEventListener('mousedown',this.seekRangeMouseDown);
				this.seekRange.addEventListener('change',this.setSeek);
				this.seekRange.addEventListener('mouseup',this.seekRangeMouseUp);
				this.volumeRange.addEventListener('mousedown',this.setVolume);
				this.volumeRange.addEventListener('change',this.setVolume);
				this.volumeRange.addEventListener('mouseup',this.setVolume);
				this.btnMute.addEventListener('mousedown',this.toggleMute);
				
				
				this.video.addEventListener('progress',this.updateLoaded);
				this.video.addEventListener('play',this.updateState);
				this.video.addEventListener('pause',this.updateState);
			},
			
			togglePlayPause : function(e) {
				var newState = !html5controls.video.paused;
				if (newState) {
					html5controls.video.pause();
				}
				else {
					html5controls.video.play();
				}
				e.stopPropagation();
			},
			
			seekRangeMouseDown : function(e) {
				html5controls.wasPaused = html5controls.video.paused;
				html5controls.video.pause();
				e.stopPropagation();
			},
			
			seekRangeMouseUp : function(e) {
				if (!html5controls.wasPaused) {
					html5controls.video.play();
				}
				e.stopPropagation();
			},
			
			setSeek : function(e) {
				html5controls.video.currentTime = this.value/100 * html5controls.video.duration;
				e.stopPropagation();
			},
			
			toggleMute : function(e) {
				html5controls.video.muted = !html5controls.video.muted;
				html5controls.updateVolume();
				e.stopPropagation();
			},
			
			setVolume : function(e) {
				if (html5controls.video.muted) {
					html5controls.toggleMute();
				}
				html5controls.video.volume = this.value/100;
				html5controls.updateVolume();
				e.stopPropagation();
			},
			
			exitFullScreen: function (e) {
				window.top.postMessage({
					message	: 'requestEndFullscreen'
				},'*');
				e.stopPropagation();
			},
			
			updateState : function () {
				var isPaused = html5controls.video.paused;
				while (html5controls.btnPlay.childNodes.length) {
					html5controls.btnPlay.removeChild(html5controls.btnPlay.firstChild);       
				} 
				var str = isPaused ? '\u25BA' : '\u25AE\u25AE';
				html5controls.btnPlay.appendChild(document.createTextNode(str));
			},
			
			updateVolume : function () {
				if (html5controls.video.muted) {
					html5controls.btnMute.style['backgroundColor'] = 'rgba(200,50,50,0.5)';
					html5controls.volumeRange.value = 0;
					html5controls.volumeIndicator.style.width = '0%';
				}
				else {
					html5controls.btnMute.style['backgroundColor'] = 'rgba(100,100,100,0.5)';
					html5controls.volumeRange.value = html5controls.video.volume*100;
					html5controls.volumeIndicator.style.width = html5controls.video.volume*100 + '%';
				}
			},
			
			updateLoaded : function () {
				var tr = html5controls.video.buffered;
				for (var i=0; i<tr.length; i++) {
					var ti = tr.start(i);
					var tf = tr.end(i);
				}
				html5controls.loadedIndicator.style.width = 100*tf/html5controls.video.duration + '%';
			},
			
			updatePlayed : function () {
				html5controls.playedIndicator.style.width = 100*html5controls.video.currentTime/html5controls.video.duration + '%';
				html5controls.seekRange.value = 100*html5controls.video.currentTime/html5controls.video.duration;
			},
			
			destroy : function() {
				
				
				window.clearInterval(this.updatePlayedInterval);
				
				
				this.btnPlay.removeEventListener('mousedown',this.togglePlayPause);
				this.btnTC.removeEventListener('mousedown',this.exitFullScreen);
				this.seekRange.removeEventListener('mousedown',this.seekRangeMouseDown);
				this.seekRange.removeEventListener('change',this.setSeek);
				this.seekRange.removeEventListener('mouseup',this.seekRangeMouseUp);
				this.volumeRange.removeEventListener('mousedown',this.setVolume);
				this.volumeRange.removeEventListener('change',this.setVolume);
				this.volumeRange.removeEventListener('mouseup',this.setVolume);
				this.btnMute.removeEventListener('mousedown',this.toggleMute);
				
				
				this.video.removeEventListener('progress',this.updateLoaded);
				this.video.removeEventListener('play',this.updateState);
				this.video.removeEventListener('pause',this.updateState);
				
				
				this.container.parentNode.removeChild(this.container);
				html5controls = null;
			}
		};
		
		html5controls.construct();
		
		return html5controls;
	}
};}
//salut cest SuZuKa !
