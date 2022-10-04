//Number of decimal places for coordinate values (higher precision might mess up collisions)
var PRECISION = 5;

//---GAME CONSTRUCTOR---//
function GAME(canvasID, width, height, fps, imageSources, audioSources, callback) {
	var self = this;
	if(typeof canvasID!=="string") throw "Invalid Canvas ID!";
	this.canvas = document.getElementById(canvasID);
	if(this.canvas == null || this.canvas.nodeName.toLowerCase()!=="canvas") throw "Invalid Canvas ID!";
	this.ctx = this.canvas.getContext("2d");
	
	this.width = 0;//Do not change this in your script!
	this.height = 0;//Do not change this in your script!
	this.midX = 0;//Do not change this in your script!
	this.midY = 0;//Do not change this in your script!
	this.canvasX = 0;//Do not change this in your script!
	this.canvasY = 0;//Do not change this in your script!
	this.setWidth = typeof width==="number"?width:-1;//Use updateCanvasSize(w, h) to change
	this.setHeight = typeof height==="number"?height:-1;//Use updateCanvasSize(w, h) to change
	this.zoom = 1;//Do not change this in your script!
	this.staticBackground = true;
	this.backgroundWidth = 0;//Do not change this in your script!
	this.backgroundHeight = 0;//Do not change this in your script!
	this.backgroundDistance = 1;
	
	this.loopID;//used for the tick loop setTimeout function. Do not change, not useful for anything else.
	this.speed = 1;
	if(fps<=0) fps = 60;
	this.tickSpeed = 1000/fps;//in milliseconds
	this.lastTick;
	this.tickTime;
	this.paused = true;
	this.tickCount = 0;
	this.collisionCount = 0;
	this.drawCollisions = false;
	
	this.cursorX = 0; //relative to canvas
	this.cursorY = 0;
	this.mouseX = 0; //relative to game space
	this.mouseY = 0;
	this.cursorLastX = 0;
	this.cursorLastY = 0;
	this.mouseLastX = 0;
	this.mouseLastY = 0;
	
	//attachable events
	this.events = {
		beforeTick:function(){},
		tick:function(){},
		render:function(){},
		collision:function(){},
		mousedown:function(){},
		mouseup:function(){},
		mousemove:function(){},
		keydown:function(){},
		keyup:function(){},
		windowResize:function(){}
	};
	
	this.geometry = {};
	this.entity = {};
	this.numGeometry = 0;
	this.numEntities = 0;
	this.geomLayers = [[],[],[]];
	this.entLayers = [[],[],[],[],[]];
	
	this.texture = {};
	this.audio = {};
	if(typeof imageSources!=="object") imageSources = {};
	if(typeof audioSources!=="object") audioSources = {};
	if(typeof callback!=="function") callback = function(){};
	this.preloadImages(imageSources, audioSources, callback);
	
	this.missingTexture = "rgba(255,0,220,1)";
	var img = new Image();
	img.onload = function() {
		self.missingTexture = self.ctx.createPattern(this, "repeat");
	}
	//missing texture image in base64
	img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTM0A1t6AAAAmElEQVRIS7XNoRHAMADDwOw/Y3dpiZCIHFCf6J/Pe56rzu3kM9g++Qy2Tz6D7ZPPYPvkM9g++Qy2Tz6D7ZPPYPvkM9g++Qy2Tz6D7ZPPYPvkM9g++Qy2Tz6D/Tf9ZbB98hlsn3wG2yefwfbJZ7B98hlsn3wG2yefwfbJZ7B98hlsn3wG2yefwfbJZ7B98hlsn3wG2ycfnecDA6+2Ll+pG1sAAAAASUVORK5CYII=";
	
	this.updateCanvasSize(undefined, undefined, true);
	$(window).on("resize", function() {
		if(self.setWidth<0 || self.setHeight<0) self.updateCanvasSize(undefined, undefined, true);
		self.events.windowResize($(window).width(), $(window).height());
	});
	
	//UPDATE MOUSE Coordinates - mousemove
	$("#"+canvasID).on((G.isMobile?"touchmove":"mousemove")+"."+canvasID, function(e) {
		var rect = self.canvas.getBoundingClientRect();
		self.cursorLastX = self.cursorX;
		self.cursorLastY = self.cursorY;
		self.mouseLastX = self.mouseX;
		self.mouseLastY = self.mouseY;
		self.cursorX = (G.isMobile?Math.round(e.originalEvent.touches[0].clientX):e.clientX) - rect.left;
		self.cursorY = (G.isMobile?Math.round(e.originalEvent.touches[0].clientY):e.clientY) - rect.top;
		self.mouseX = (self.cursorX/self.zoom)-self.canvasX;
		self.mouseY = (self.cursorY/self.zoom)-self.canvasY;
		self.events.mousemove(self.cursorX-self.cursorLastX, self.cursorX-self.cursorLastX, e);
	});
	
	//MOUSEDOWN
	$("#"+canvasID).on((G.isMobile?"touchstart":"mousedown")+"."+canvasID, function(e) {
		if(e.type==="touchdown") self.events.mousedown("left", e);
		else if(e.which===1) self.events.mousedown("left", e);
		else if(e.which===2) self.events.mousedown("middle", e);
		else if(e.which===3) self.events.mousedown("right", e);
		else self.events.mousedown(e.which, e);
	});
	
	//MOUSEUP
	$("#"+canvasID).on((G.isMobile?"touchend":"mouseup")+"."+canvasID, function(e) {
		if(e.type==="touchend") self.events.mouseup("left", e);
		else if(e.which===1) self.events.mouseup("left", e);
		else if(e.which===2) self.events.mouseup("middle", e);
		else if(e.which===3) self.events.mouseup("right", e);
		else self.events.mouseup(e.which, e);
	});
	
	G.instances.push(self);
}

//LOAD ASSETS 1 - preload images
GAME.prototype.preloadImages = function(imgSources, audioSources, callback) {
	var self = this;
	var loadedImages = 0;
	var numImages = 0;
	for(var src in imgSources) {
		numImages++;
	}
	if(numImages===0) {
		this.preloadAudio(audioSources, callback);
		return;
	}
	for(var src in imgSources) {
		this.texture[src] = new Image();
		this.texture[src].ref = src;
		this.texture[src].onload = function() {
			self.texture[this.ref] = self.createTexture(this);
			if(++loadedImages>=numImages) self.preloadAudio(audioSources, callback);
		};
		this.texture[src].onerror = this.texture[src].onabort = function() {
			//console.log("Image failed to load: \""+this.src+"\"");
			self.texture[this.ref] = self.missingTexture;
			if(++loadedImages>=numImages) self.preloadAudio(audioSources, callback);
		};
		this.texture[src].src = imgSources[src];
	}
};

//LOAD ASSETS 2 - preload audio
GAME.prototype.preloadAudio = function(audioSources, callback) {
	var loadedAudio = 0;
	var audioCount = 0;
	for(var src in audioSources) {
		audioCount++;
	}
	if(audioCount===0) {
		setTimeout(callback, 0);
		return;
	}
	for(var src in audioSources) {
		this.audio[src] = new Audio();
		this.audio[src].oncanplaythrough = function() {
			if(++loadedAudio>=audioCount) setTimeout(callback, 0);
		};
		this.audio[src].onerror = this.audio[src].onabort = function() {
			//console.log("Audio failed to load: \""+this.src+"\"");
			if(++loadedAudio>=audioCount) setTimeout(callback, 0);
		};
		this.audio[src].src = audioSources[src];
	}
};

//ADD EVENT
GAME.prototype.attachEvent = function(type, callback) {
	if(typeof callback!=="function") throw "Specified callback is not a function";
	else if(this.events[type]===undefined) throw "Event type doesn't exist"
	else this.events[type] = callback;
};

//RESIZE CANVAS
GAME.prototype.updateCanvasSize = function(width, height, redraw) {
	if(typeof width==="number") this.setWidth = width;
	if(typeof height==="number") this.setHeight = height;
	if(this.setWidth<0) this.width = $(window).width();
	else this.width = this.setWidth;
	this.midX = this.width/2;
	if(this.setHeight<0) this.height = $(window).height();
	else this.height = this.setHeight;
	this.midY = this.height/2;
	this.canvas.width = this.width;
	this.canvas.height = this.height;
	this.ctx.scale(this.zoom, this.zoom);
	this.ctx.translate(this.canvasX, this.canvasY);
	if(redraw) this.render();
};

//Move Canvas by amount in direction
GAME.prototype.moveCanvas = function(dir, amount, usePixels, redraw) {
	if(usePixels===true) amount = amount/this.zoom;
	switch(dir) {
		case "up":
			this.canvasY+=amount;
			this.ctx.translate(0, amount);
			break;
		case "left":
			this.canvasX+=amount;
			this.ctx.translate(amount, 0);
			break;
		case "down":
			this.canvasY-=amount;
			this.ctx.translate(0, -amount);
			break;
		case "right":
			this.canvasX-=amount;
			this.ctx.translate(-amount, 0);
			break;
	}
	if(redraw===true) this.render();
};

//Move Canvas to position (top-left corner position)
GAME.prototype.moveCanvasTo = function(x, y, redraw) {
	this.ctx.translate(x-this.canvasX, y-this.canvasY);
	this.canvasX = x;
	this.canvasY = y;
	if(redraw===true) this.render();
};

//Center Canvas on point (with optional zoom level) (no new zoom -> newZoom=false)
GAME.prototype.centerCanvasTo = function(x, y, newZoom, redraw) {
	if(typeof newZoom==="number") this.zoom = newZoom;
	this.ctx.setTransform(1, 0, 0, 1, 0, 0);
	this.ctx.scale(this.zoom, this.zoom);
	var adjustX = this.midX/this.zoom;
	var adjustY = this.midY/this.zoom;
	this.canvasX = (adjustX-x).toFixed(4);
	this.canvasY = (adjustY-y).toFixed(4);
	this.ctx.translate(this.canvasX, this.canvasY);
	if(redraw===true) this.render();
};

//ZOOM Canvas - set zoom level
GAME.prototype.zoomCanvas = function(newZoom, redraw) {
	this.centerCanvasTo(this.midX/this.zoom-this.canvasX, this.midY/this.zoom-this.canvasY, newZoom, redraw);
};

//Reset canvas zoom and position to default
GAME.prototype.resetCanvas = function(redraw) {
	this.canvasX = 0;
	this.canvasY = 0;
	this.zoom = 1;
	this.ctx.setTransform(1, 0, 0, 1, 0, 0);
	if(redraw) this.render();
};

//Change background - use rgb color or image URL - (isStatic = true - background won't adjust to moving/zooming canvas)
//                                                 (distance = how far is the background, 1 = same plane as level)
GAME.prototype.setBackground = function(background, isImage, isStatic, distance) {
	if(isImage===true) {
		var self = this;
		var img = new Image();
		img.onerror = img.onabort = function() {
			console.log("Invalid image! \""+background+"\"");
		};
		img.onload = function() {
			self.backgroundWidth = this.width;
			self.backgroundHeight = this.height;
			if(typeof distance!=="number" || distance===0) self.backgroundDistance = 1;
			else self.backgroundDistance = distance;
			self.canvas.style.background = "url("+background+")";
			if(isStatic===true) {
				self.staticBackground = true;
				this.canvas.style.backgroundSize = "initial";
				this.canvas.style.backgroundPosition = "initial";
			}
			else self.staticBackground = false;
			self.reposBackground();
		};
		img.src = background;
	}
	else {
		this.canvas.style.background = background;
		this.staticBackground = true;
		this.canvas.style.backgroundSize = "initial";
		this.canvas.style.backgroundPosition = "initial";
	}
};

//Adjust background to moving/zooming canvas
GAME.prototype.reposBackground = function(x, y) {
	if(typeof x!=="number") x = this.canvasX;
	if(typeof y!=="number") y = this.canvasY;
	this.canvas.style.backgroundSize = (this.backgroundWidth*this.zoom)+"px "+(this.backgroundHeight*this.zoom)+"px";
	this.canvas.style.backgroundPosition = (x*this.zoom/this.backgroundDistance)+"px "+(y*this.zoom/this.backgroundDistance)+"px";
};

//CLEAR CANVAS
GAME.prototype.clearCanvas = function() {
	this.ctx.clearRect(-this.canvasX, -this.canvasY, this.width/this.zoom, this.height/this.zoom);
};
	
//draw rectangle
GAME.prototype.drawRect = function(x, y, width, height, texture, outlineWidth, outlineTexture) {
	if(texture==undefined) texture=this.missingTexture;
	var outline = (outlineWidth && outlineTexture && outlineWidth>0);
	if(outline) {
		width-=outlineWidth/2;
		height-=outlineWidth/2;
		this.ctx.strokeStyle = outlineTexture;
		this.ctx.lineWidth = outlineWidth;
	}
	if(outline && (width<0 || height<0)) throw "Graphics - Outline is bigger than shape";
	this.ctx.fillStyle = texture;
	this.ctx.beginPath();
	this.ctx.rect(x-width, y-height, width*2, height*2);
	this.ctx.fill();
	if(outline) this.ctx.stroke();
};
	
//draw circle
GAME.prototype.drawCircle = function(x, y, r, texture, outlineWidth, outlineTexture) {
	if(texture==undefined) texture=this.missingTexture;
	var outline = (outlineWidth && outlineTexture && outlineWidth>0);
	if(outline) {
		r-=outlineWidth/2;
		this.ctx.strokeStyle = outlineTexture;
		this.ctx.lineWidth = outlineWidth;
	}
	if(outline && r<0) throw "Graphics - Outline is bigger than shape";
	this.ctx.fillStyle = texture;
	this.ctx.beginPath();
	this.ctx.arc(x, y, r, 0, 2*Math.PI, false);
	this.ctx.fill();
	if(outline) this.ctx.stroke();
};

//draw line
GAME.prototype.drawLine = function(x1, y1, x2, y2, width, texture) {
	if(texture==undefined) texture=this.missingTexture;
	this.ctx.lineWidth = width;
	this.ctx.strokeStyle = texture;
	this.ctx.beginPath();
	this.ctx.moveTo(x1, y1);
	this.ctx.lineTo(x2, y2);
	this.ctx.stroke();
};

//draw text
GAME.prototype.drawText = function(txt, x, y, centered, fontStyle, texture, outlineWidth, outlineTexture) {
	if(texture==undefined) texture=this.missingTexture;
	this.ctx.fillStyle = texture;
	this.ctx.font = fontStyle;
	if(centered) {
		this.ctx.textAlign="center";
		this.ctx.textBaseline="middle";
	}
	else {
		this.ctx.textAlign="left";
		this.ctx.textBaseline="bottom";
	}
	this.ctx.beginPath();
	if(outlineWidth && outlineTexture && outlineWidth>0) {
		this.ctx.strokeStyle = outlineTexture;
		this.ctx.lineWidth = outlineWidth*2;
		this.ctx.strokeText(txt, x, y);
	}
	this.ctx.fillText(txt, x, y);
};

//measure text width (before drawing on canvas)
GAME.prototype.measureText = function(txt, fontStyle, outlineWidth) {
	this.ctx.font = fontStyle;
	if(typeof outlineWidth!==number || outlineWidth < 0) outlineWidth = 0;
	return this.ctx.measureText(txt).width+(outlineWidth*2);
};

//Create texture from image
GAME.prototype.createTexture = function(img) {
	try {
		var pat = this.ctx.createPattern(img, "repeat");
		return pat;
	}
	catch(e) {
		console.log("Invalid image! \""+img.src+"\"");
		return this.missingTexture;
		//return "rgba(0, 0, 0, 1)";
	}
};

//Create font style (for drawing text on canvas)
GAME.prototype.createFontStyle = function(size, bold, italic, font) {
	var style = "";
	if(italic===1) style=style+"italic ";
	else if(italic===2) style=style+"oblique ";
	if(bold===1) style=style+"bold ";
	else if(bold===2) style=style+"900 ";
	style=style+size+"px ";
	if(font) style=style+font;
	else style=style+"Arial";
	return style;
};

//Choose drawing function for shape
GAME.prototype.drawObj = function(obj) {
	this.ctx.save();
	if(obj.shape==="rect") {
		if(!obj.visible || obj.x+obj.width<-this.canvasX || obj.y+obj.height<-this.canvasY || obj.x-obj.width>-this.canvasX+this.width/this.zoom || obj.y-obj.height>-this.canvasY+this.height/this.zoom) return;
		var adjustX = obj.x-obj.width;
		var adjustY = obj.y-obj.height;
		this.ctx.translate(adjustX, adjustY);
		this.drawRect(obj.x-adjustX, obj.y-adjustY, obj.width, obj.height, obj.style.texture, obj.style.outlineWidth, obj.style.outlineTexture);
	}
	else if(obj.shape==="circle") {
		if(!obj.visible || obj.x+obj.r<-this.canvasX || obj.y+obj.r<-this.canvasY || obj.x-obj.r>-this.canvasX+this.width/this.zoom || obj.y-obj.r>-this.canvasY+this.height/this.zoom) return;
		var adjustX = obj.x-obj.r;
		var adjustY = obj.y-obj.r;
		this.ctx.translate(adjustX, adjustY);
		this.drawCircle(obj.x-adjustX, obj.y-adjustY, obj.r, obj.style.texture, obj.style.outlineWidth, obj.style.outlineTexture);
	}
	else {
		this.ctx.restore();
		throw "Graphics - Cannot draw unknown shape";
	}
	this.ctx.restore();
};


//---SHAPES & OBJECTS---//

//Shape constructor
function ShapeRect(width, height, texture, outlineWidth, outlineTexture) {
	this.shape = "rect";
	this.width = width/2;
	this.height = height/2;
	this.style = {};
	this.style.texture = texture;
	this.style.outlineWidth = outlineWidth;
	this.style.outlineTexture = outlineTexture;
}
function ShapeCircle(r, texture, outlineWidth, outlineTexture) {
	this.shape = "circle";
	this.r = r;
	this.style = {};
	this.style.texture = texture;
	this.style.outlineWidth = outlineWidth;
	this.style.outlineTexture = outlineTexture;
}

//Geometry object (wall/floor...) (layer = -1 to 1)
function Geometry(shape, solid, visible) {
	for(var key in shape) {
		this[key] = shape[key];
	}
	this.solid = solid;
	this.visible = visible;
}

//Entity object (player, box...) (layer = -2 to 2)
function Entity(shape, solid, visible, physics, mass, bounce, airResistance, friction, gravity) {
	for(var key in shape) {
		this[key] = shape[key];
	}
	if(typeof gravity==="number") this.gravity = gravity;
	else this.gravity = 9.8;//default
	this.physics = physics;
	this.solid = solid;
	this.visible = visible;
	this.mass = mass;
	this.bounce = bounce;
	this.airResistance = airResistance;
	this.friction = friction;
}

//Initialize object - spawn object into the game
GAME.prototype.createObj = function(obj, name, x, y, layer) {
	if(obj instanceof Geometry) {
		if(layer<-1 || layer>1) throw "Invalid layer!";
		if(this.geometry[name]) throw "Geometry name already exists!";
		if(obj.shape==="rect") var shape = new ShapeRect(obj.width*2, obj.height*2, obj.style.texture, obj.style.outlineWidth, obj.style.outlineTexture)
		else var shape = new ShapeCircle(obj.r, obj.style.texture, obj.style.outlineWidth, obj.style.outlineTexture)
		var newObj = new Geometry(shape, obj.solid, obj.visible);
		newObj.name = name;
		newObj.x = x;
		newObj.y = y;
		newObj.layer = layer;
		this.geometry[name] = newObj;
		this.geomLayers[layer+1].push(this.geometry[name]);
		this.numGeometry++;
		return this.geometry[name];
	}
	else if(obj instanceof Entity) {
		if(layer<-2 || layer>2) throw "Invalid layer!";
		if(this.entity[name]) throw "Entity name already exists!";
		if(obj.shape==="rect") var shape = new ShapeRect(obj.width*2, obj.height*2, obj.style.texture, obj.style.outlineWidth, obj.style.outlineTexture)
		else var shape = new ShapeCircle(obj.r, obj.style.texture, obj.style.outlineWidth, obj.style.outlineTexture)
		var newObj = new Entity(shape, obj.solid, obj.visible, obj.physics, obj.mass, obj.bounce, obj.airResistance, obj.friction, obj.gravity);
		newObj.name = name;
		newObj.x = x;
		newObj.y = y;
		newObj.layer = layer;
		newObj.lastPos = {x:x, y:y};
		newObj.motion = new Vector();
		newObj.move = new Vector();
		newObj.force = new Vector();
		newObj.surface = false;
		this.entity[name] = newObj;
		this.entLayers[layer+2].push(this.entity[name]);
		this.numEntities++;
		return this.entity[name];
	}
	else throw "Invalid object type";
};

//delete object
GAME.prototype.deleteObj = function(obj) {
	if(obj instanceof Geometry) {
		var layer = obj.layer+1;
		this.geomLayers[layer].splice(this.geomLayers[layer].indexOf(obj), 1);
		if(delete this.geometry[obj.name]) this.numGeometry--;
	}
	else if(obj instanceof Entity) {
		var layer = obj.layer+2;
		this.entLayers[layer].splice(this.entLayers[layer].indexOf(obj), 1);
		if(delete this.entity[obj.name]) this.numEntities--;
	}
	else throw "Invalid object type";
};

//Get one/all objects located at given position
GAME.prototype.getObjectAtPos = function(x, y, onlyOne, searchGeometry, searchEntity) {
	var list = [];
	if(onlyOne==undefined) onlyOne = true;
	if(searchGeometry==undefined) searchGeometry = false;
	if(searchEntity==undefined) searchEntity = true;
	if(searchGeometry) {
		for(var layer=this.geomLayers.length-1; layer>=0; layer--) {
			for(var i=this.geomLayers[layer].length-1; i>=0; i--) {
				var obj = this.geomLayers[layer][i];
				if(obj.shape==="rect"?G.pointInRect(x, y, obj.x, obj.y, obj.width, obj.height):G.pointInCircle(x, y, obj.x, obj.y, obj.r)) {
					if(onlyOne) return obj;
					else list.push(obj);
				}
			}
		}
	}
	if(searchEntity && !(onlyOne && list.length>0)) {
		for(var layer=this.entLayers.length-1; layer>=0; layer--) {
			for(var i=this.entLayers[layer].length-1; i>=0; i--) {
				var obj = this.entLayers[layer][i];
				if(obj.shape==="rect"?G.pointInRect(x, y, obj.x, obj.y, obj.width, obj.height):G.pointInCircle(x, y, obj.x, obj.y, obj.r)) {
					if(onlyOne) return obj;
					else list.push(obj);
				}
			}
		}
	}
	if(onlyOne && list.length===0) return false;
	return list;
};

//START GAME TICK
GAME.prototype.start = function() {
	if(this.paused) {
		this.paused = false;
		this.render();
		this.lastTick = new Timestamp();
		this.loopID = setTimeout(this.tick.bind(this), this.tickSpeed);
	}
};

//PAUSE GAME TICK
GAME.prototype.stop = function() {
	if(!this.paused) {
		clearTimeout(this.loopID);
		this.paused = true;
	}
};

//CHECK COLLISION
GAME.prototype.collisionCheck = function(objA, objB, useNew) {
	if(typeof objA!=="object" || typeof objB!=="object") return false;
	var moveableA = ((objA instanceof Entity) && objA.physics);
	var moveableB = ((objB instanceof Entity) && objB.physics);
	if(useNew!==false) useNew = true;
	
	if(useNew || !moveableA) {
		var Ax = objA.x;
		var Ay = objA.y;
	}
	else {
		var Ax = objA.lastPos.x;
		var Ay = objA.lastPos.y;
	}
	if(useNew || !moveableB) {
		var Bx = objB.x;
		var By = objB.y;
	}
	else {
		var Bx = objB.lastPos.x;
		var By = objB.lastPos.y;
	}
	
	if(objA.shape==="circle" && objB.shape==="circle") return G.intersectCircleCircle(Ax, Ay, objA.r, Bx, By, objB.r);
	else if(objA.shape==="rect" && objB.shape==="rect") return G.intersectRectRect(Ax, Ay, objA.width, objA.height, Bx, By, objB.width, objB.height);
	else {
		if(objA.shape==="rect") return G.intersectRectCircle(Ax, Ay, objA.width, objA.height, Bx, By, objB.r);
		else return G.intersectRectCircle(Bx, By, objB.width, objB.height, Ax, Ay, objA.r);
	}
};

//CALCULATE COLLISION POINT
GAME.prototype.collisionPoint = function(objA, moveAx, moveAy, objB, moveBx, moveBy) {
	if(moveAx===0 && moveAy===0) {
		var Ax = objA.x;
		var Ay = objA.y;
	}
	else {
		var Ax = objA.lastPos.x;
		var Ay = objA.lastPos.y;
	}
	if(moveBx===0 && moveBy===0) {
		var Bx = objB.x;
		var By = objB.y;
	}
	else {
		var Bx = objB.lastPos.x;
		var By = objB.lastPos.y;
	}
	
	//Calc final positions function
	function resultPositions(res, ax, ay, axd, ayd, bx, by, bxd, byd) {
		res.Ax = (ax+axd*res.t).fixedTo(PRECISION);
		res.Ay = (ay+ayd*res.t).fixedTo(PRECISION);
		res.Bx = (bx+bxd*res.t).fixedTo(PRECISION);
		res.By = (by+byd*res.t).fixedTo(PRECISION);
		return res;
	}	
	
	//relatively transfer all motion from B to A
	var relMove = new Vector(moveAx-moveBx, moveAy-moveBy);
	if(relMove.x===0 && relMove.y===0) return false; //if objects are not moving relative to each other, collision cannot occur
	
	if(objA.shape==="circle" && objB.shape==="circle") {
		//relatively transfer radius from B to A
		var relR = objA.r+objB.r;
		
		//find relative intersection point
		var result = G.intersectLineCircle(Ax, Ay, Ax+relMove.x, Ay+relMove.y, Bx, By, relR);
		if(result===false) return false; //if no intersection is found
		
		//create vector from A to relative result
		var relResultVector = new Vector(Ax, Ay, result.x, result.y);
		
		//find at which point in time objects collide
		if(relMove.x===0) result.t = relResultVector.y/relMove.y;
		else result.t = relResultVector.x/relMove.x;
		if(result.t<-0.1 || result.t>1) return false;
		
		//calculate object positions on contact
		result = resultPositions(result, Ax, Ay, moveAx, moveAy, Bx, By, moveBx, moveBy);
		
		//calculate real contact point
		var circleVector = new Vector(result.Bx, result.By, result.Ax, result.Ay).normalize().multiply(objB.r);
		result.x=result.Bx+circleVector.x;
		result.y=result.By+circleVector.y;
		
		return result;
	}
	else if(objA.shape==="rect" && objB.shape==="rect") {
		//relatively transfer all width and height from B to A
		var relW = objA.width+objB.width;
		var relH = objA.height+objB.height;
		
		//find relative intersection point
		var result = G.intersectLineRect(Ax, Ay, Ax+relMove.x, Ay+relMove.y, Bx, By, relW, relH);
		if(result===false) return false; //if no intersection is found
		
		//create vector from A to relative result
		var relResultVector = new Vector(Ax, Ay, result.x, result.y);
		
		//find at which point in time objects collide (0-1)
		if(relMove.x===0) result.t = relResultVector.y/relMove.y;
		else result.t = relResultVector.x/relMove.x;
		if(result.t<-0.1 || result.t>1) return false;
		
		//calculate object positions on contact
		result = resultPositions(result, Ax, Ay, moveAx, moveAy, Bx, By, moveBx, moveBy);
		
		//calculate real contact point
		if(result.side==="top") {
			result.y=result.By-objB.height;
			var l = Math.max(result.Ax-objA.width, result.Bx-objB.width);
			result.x = l+(Math.min(result.Ax+objA.width, result.Bx+objB.width)-l)/2;
		}
		else if(result.side==="bottom") {
			result.y=result.By+objB.height;
			var l = Math.max(result.Ax-objA.width, result.Bx-objB.width);
			result.x = l+(Math.min(result.Ax+objA.width, result.Bx+objB.width)-l)/2;
		}
		else if(result.side==="left") {
			result.x=result.Bx-objB.width;
			var l = Math.max(result.Ay-objA.height, result.By-objB.height);
			result.y = l+(Math.min(result.Ay+objA.height, result.By+objB.height)-l)/2;
		}
		else if(result.side==="right") {
			result.x=result.Bx+objB.width;
			var l = Math.max(result.Ay-objA.height, result.By-objB.height);
			result.y = l+(Math.min(result.Ay+objA.height, result.By+objB.height)-l)/2;
		}
		return result;
	}
	else if(objA.shape==="rect"){//rect + circle collision
		//find relative intersection point
		var result = G.intersectLineRoundrect(Ax, Ay, Ax+relMove.x, Ay+relMove.y, Bx, By, objA.width, objA.height, objB.r);
		if(result===false) return false; //if no intersection is found
		
		//create vector from A to relative result
		var relResultVector = new Vector(Ax, Ay, result.x, result.y);
		
		//find at which point in time objects collide (0-1)
		if(relMove.x===0) result.t = relResultVector.y/relMove.y;
		else result.t = relResultVector.x/relMove.x;
		if(result.t<-0.1 || result.t>1) return false;
		
		//calculate object positions on contact
		result = resultPositions(result, Ax, Ay, moveAx, moveAy, Bx, By, moveBx, moveBy);
		
		//calculate real contact point
		var left = result.Ax-objA.width;
		var right = result.Ax+objA.width;
		var top = result.Ay-objA.height;
		var bottom = result.Ay+objA.height;
		if(result.Bx<=left) result.x = left;
		else if(result.Bx>=right) result.x = right;
		else result.x = result.Bx;
		if(result.By<=top) result.y = top;
		else if(result.By>=bottom) result.y = bottom;
		else result.y = result.By;
		//fix division by zero problem, that would occur later
		if(result.x===result.Bx && result.y===result.By) return false;
		return result;
	}
	else {//circle + rect collision
		//switch perspective
		var relMove = new Vector(moveBx-moveAx, moveBy-moveAy);
		if(relMove.x===0 && relMove.y===0) return false; //if objects are not moving relative to each other, collision cannot occur
		
		//find relative intersection point
		var result = G.intersectLineRoundrect(Bx, By, Bx+relMove.x, By+relMove.y, Ax, Ay, objB.width, objB.height, objA.r);
		if(result===false) return false; //if no intersection is found
		
		//create vector from B to relative result
		var relResultVector = new Vector(Bx, By, result.x, result.y);
		
		//find at which point in time objects collide (0-1)
		if(relMove.x===0) result.t = relResultVector.y/relMove.y;
		else result.t = relResultVector.x/relMove.x;
		if(result.t<-0.1 || result.t>1) return false;
		
		//calculate object positions on contact
		result = resultPositions(result, Ax, Ay, moveAx, moveAy, Bx, By, moveBx, moveBy);
		
		//calculate real contact point
		var left = result.Bx-objB.width;
		var right = result.Bx+objB.width;
		var top = result.By-objB.height;
		var bottom = result.By+objB.height;
		if(result.Ax<=left) result.x = left;
		else if(result.Ax>=right) result.x = right;
		else result.x = result.Ax;
		if(result.Ay<=top) result.y = top;
		else if(result.Ay>=bottom) result.y = bottom;
		else result.y = result.Ay;
		//fix division by zero problem, that would occur later
		if(result.x===result.Ax && result.y===result.Ay) return false;
		return result;
	}
};

//Resolve collision pair
GAME.prototype.resolveCollision = function(result) {
	if(!this.collisionCheck(result.objA, result.objB, true)) return false;
	
	var objA = result.objA;
	var objB = result.objB;
	
	var moveableA = ((objA instanceof Entity) && objA.physics);
	var moveableB = ((objB instanceof Entity) && objB.physics);
	
	var massA = moveableA?objA.mass:0;
	var massB = moveableB?objB.mass:0;
	var motionA = moveableA?objA.motion:new Vector();
	var motionB = moveableB?objB.motion:new Vector();
	
	var newResult = this.collisionPoint(objA, motionA.x*this.tickTime, motionA.y*this.tickTime, objB, motionB.x*this.tickTime, motionB.y*this.tickTime);
	if(newResult===false) return false;
	this.collisionCount++;
	result.x = newResult.x;
	result.y = newResult.y;
	newResult.objA = objA;
	newResult.objB = objB;
	newResult.status = true;
	result = newResult;
	
	//get coefficient of restitution
	var elasticity = Math.max(objA instanceof Entity?objA.bounce:0, objB instanceof Entity?objB.bounce:0);
	
	//Calculate new velocity
	if(result.side==="top" || result.side==="bottom") {
		var v = G.collisionVelocity(elasticity, massA, massB, motionA.y, motionB.y);
		var newMotionA = motionA;
		newMotionA.y = v.A;
		var newMotionB = motionB;
		newMotionB.y = v.B;
	}
	else if(result.side==="left" || result.side==="right") {
		var v = G.collisionVelocity(elasticity, massA, massB, motionA.x, motionB.x);
		var newMotionA = motionA;
		newMotionA.x = v.A;
		var newMotionB = motionB;
		newMotionB.x = v.B;
	}
	else {
		if(objA.shape==="circle") var normal = new Vector(result.Ax, result.Ay, result.x, result.y).normalize();
		else var normal = new Vector(result.Bx, result.By, result.x, result.y).normalize();
		var tangent = normal.perpendicular();
		var v1n = motionA.scalarProject(normal);
		var v1t = motionA.scalarProject(tangent);
		var v2n = motionB.scalarProject(normal);
		var v2t = motionB.scalarProject(tangent);
		var v = G.collisionVelocity(elasticity, massA, massB, v1n, v2n);
		var normalV1 = normal.multiply(v.A);
		var normalV2 = normal.multiply(v.B);
		var tangentV1 = tangent.multiply(v1t);
		var tangentV2 = tangent.multiply(v2t);
		var newMotionA = normalV1.add(tangentV1);
		var newMotionB = normalV2.add(tangentV2);
	}
	
	//Calculate new position
	if(!moveableA) {
		objB.motion = newMotionB.subtract(newMotionA);
		objB.move.x = objB.motion.x*this.tickTime*(1-result.t);
		objB.move.y = objB.motion.y*this.tickTime*(1-result.t);
		objB.x = result.Bx+=objB.move.x;
		objB.y = result.By+=objB.move.y;
	}
	else if(!moveableB) {
		objA.motion = newMotionA.subtract(newMotionB);
		objA.move.x = objA.motion.x*this.tickTime*(1-result.t);
		objA.move.y = objA.motion.y*this.tickTime*(1-result.t);
		objA.x = result.Ax+=objA.move.x;
		objA.y = result.Ay+=objA.move.y;
	}
	else {
		objA.motion = newMotionA;
		objB.motion = newMotionB;
		objA.move.x = objA.motion.x*this.tickTime*(1-result.t);
		objA.move.y = objA.motion.y*this.tickTime*(1-result.t);
		objB.move.x = objB.motion.x*this.tickTime*(1-result.t);
		objB.move.y = objB.motion.y*this.tickTime*(1-result.t);
		objA.x = result.Ax+=objA.move.x;
		objA.y = result.Ay+=objA.move.y;
		objB.x = result.Bx+=objB.move.x;
		objB.y = result.By+=objB.move.y;
	}
	if(moveableA) objA.surface = true;
	if(moveableB) objB.surface = true;
	
	//call custom event
	result.type = "normal";
	this.events.collision(result);
};

//Separate intersecting objects
GAME.prototype.decouple = function(objA, objB) {
	if(typeof objA!=="object" || typeof objB!=="object") return false;
	var moveableA = ((objA instanceof Entity) && objA.physics);
	var moveableB = ((objB instanceof Entity) && objB.physics);
	if(!moveableA && !moveableB) return false;
	
	var Ax = moveableA?objA.lastPos.x:objA.x;
	var Ay = moveableA?objA.lastPos.y:objA.y;
	var Bx = moveableB?objB.lastPos.x:objB.x;
	var By = moveableB?objB.lastPos.y:objB.y;
	if(Ax===Bx && Ay===By) return false;
	
	var massA = moveableA?objA.mass:0;
	var massB = moveableB?objB.mass:0;
	var totalMass = massA+massB;
	
	//calculate separation
	if(objA.shape==="circle" && objB.shape==="circle") {//CIRCLE - CIRCLE
		var dir = new Vector(Ax, Ay, Bx, By);
		var length = dir.length();
		var d = objA.r+objB.r-length;
		var unit = dir.normalize(length);
		if(!moveableA) {
			var partA = 0;
			var partB = d;
		}
		else if(!moveableB) {
			var partA = d;
			var partB = 0;
		}
		else {
			var partA = (d/totalMass)*massB;
			var partB = d-partA;
		}
		var moveA = unit.multiply(partA).reverse();
		var moveB = unit.multiply(partB);
	}
	else if(objA.shape==="rect" && objB.shape==="rect") {//RECT - RECT
		var dir = new Vector(Ax, Ay, Bx, By);
		var overlapX = objA.width+objB.width-Math.abs(dir.x);
		var overlapY = objA.height+objB.height-Math.abs(dir.y);
		var overlap = Math.min(overlapX, overlapY);
		if(!moveableA) {
			var partA = 0;
			var partB = overlap;
		}
		else if(!moveableB) {
			var partA = overlap;
			var partB = 0;
		}
		else {
			var partA = (overlap/totalMass)*massB;
			var partB = overlap-partA;
		}
		if(overlapX<overlapY) {//X-penetration
			if(Ax < Bx) {
				var moveA = {x:-partA, y:0};
				var moveB = {x:partB, y:0}; 
			}
			else {
				var moveA = {x:partA, y:0};
				var moveB = {x:-partB, y:0};
			}
		}
		else {//Y-penetration
			if(Ay < By) {
				var moveA = {x:0, y:-partA};
				var moveB = {x:0, y:partB};
			}
			else {
				var moveA = {x:0, y:partA};
				var moveB = {x:0, y:-partB};
			}
		}
	}
	else if(objA.shape==="rect") {//RECT - CIRCLE
		var top = Ay-objA.height;
		var bottom = Ay+objA.height;
		var left = Ax-objA.width;
		var right = Ax+objA.width;
		
		if((Bx<left || Bx>right) && (By<top || By>bottom)) {//CORNER-penetration
			var cornerX = (Bx<Ax?left:right);
			var cornerY = (By<Ay?top:bottom);
			var dir = new Vector(Bx, By, cornerX, cornerY);
			var length = dir.length();
			var d = objB.r-length;
			var unit = dir.normalize(length);
			if(!moveableA) {
				var partA = 0;
				var partB = d;
			}
			else if(!moveableB) {
				var partA = d;
				var partB = 0;
			}
			else {
				var partA = (d/totalMass)*massB;
				var partB = d-partA;
			}
			var moveA = unit.multiply(partA);
			var moveB = unit.multiply(partB).reverse();
		}
		else {//SIDE-penetration
			var dir = new Vector(Ax, Ay, Bx, By);
			var overlapX = objA.width+objB.r-Math.abs(dir.x);
			var overlapY = objA.height+objB.r-Math.abs(dir.y);
			var overlap = Math.min(overlapX, overlapY);
			if(!moveableA) {
				var partA = 0;
				var partB = overlap;
			}
			else if(!moveableB) {
				var partA = overlap;
				var partB = 0;
			}
			else {
				var partA = (overlap/totalMass)*massB;
				var partB = overlap-partA;
			}
			if(overlapX<overlapY) {//X-penetration
				if(Ax < Bx) {
					var moveA = {x:-partA, y:0};
					var moveB = {x:partB, y:0};
				}
				else {
					var moveA = {x:partA, y:0};
					var moveB = {x:-partB, y:0};
				}
			}
			else {//Y-penetration
				if(Ay < By) {
					var moveA = {x:0, y:-partA};
					var moveB = {x:0, y:partB};
				}
				else {
					var moveA = {x:0, y:partA};
					var moveB = {x:0, y:-partB};
				}
			}
		}
	}
	else {//CIRCLE - RECT
		var top = By-objB.height;
		var bottom = By+objB.height;
		var left = Bx-objB.width;
		var right = Bx+objB.width;
		
		if((Ax<left || Ax>right) && (Ay<top || Ay>bottom)) {//CORNER-penetration
			var cornerX = (Ax<Bx?left:right);
			var cornerY = (Ay<By?top:bottom);
			var dir = new Vector(Ax, Ay, cornerX, cornerY);
			var length = dir.length();
			var d = objA.r-length;
			var unit = dir.normalize(length);
			if(!moveableA) {
				var partA = 0;
				var partB = d;
			}
			else if(!moveableB) {
				var partA = d;
				var partB = 0;
			}
			else {
				var partA = (d/totalMass)*massB;
				var partB = d-partA;
			}
			var moveA = unit.multiply(partA).reverse();
			var moveB = unit.multiply(partB);
		}
		else {//SIDE-penetration
			var dir = new Vector(Bx, By, Ax, Ay);
			var overlapX = objB.width+objA.r-Math.abs(dir.x);
			var overlapY = objB.height+objA.r-Math.abs(dir.y);
			var overlap = Math.min(overlapX, overlapY);
			if(!moveableA) {
				var partA = 0;
				var partB = overlap;
			}
			else if(!moveableB) {
				var partA = overlap;
				var partB = 0;
			}
			else {
				var partA = (overlap/totalMass)*massB;
				var partB = overlap-partA;
			}
			if(overlapX<overlapY) {//X-penetration
				if(Ax < Bx) {
					var moveA = {x:-partA, y:0};
					var moveB = {x:partB, y:0};
				}
				else {
					var moveA = {x:partA, y:0};
					var moveB = {x:-partB, y:0};
				}
			}
			else {//Y-penetration
				if(Ay < By) {
					var moveA = {x:0, y:-partA};
					var moveB = {x:0, y:partB};
				}
				else {
					var moveA = {x:0, y:partA};
					var moveB = {x:0, y:-partB};
				}
			}
		}
	}
	//separate objects
	if(moveableA) {
		objA.lastPos.x+=moveA.x;
		objA.lastPos.y+=moveA.y;
		objA.x+=moveA.x;
		objA.y+=moveA.y;
		objA.surface = true;
	}
	if(moveableB) {
		objB.lastPos.x+=moveB.x;
		objB.lastPos.y+=moveB.y;
		objB.x+=moveB.x;
		objB.y+=moveB.y;
		objB.surface = true;
	}
	
	//call custom event
	var result = {objA:objA, objB:objB, type:"decouple", moveA:moveA, moveB:moveB};
	this.events.collision(result);
};

//GAME TICK LOOP
GAME.prototype.tick = function() {
	clearTimeout(this.loopID);
	if(!this.paused) this.loopID = setTimeout(this.tick.bind(this), this.tickSpeed);
	this.collisionCount = 0;
	
	this.tickTime = this.lastTick.since();
	//prevent physics jump on stall
	if(this.tickTime>(this.tickSpeed/1000)+0.1) {
		this.tickTime = this.tickSpeed/1000;
	}
	this.tickTime*=this.speed;
	this.lastTick = new Timestamp();
	
	//run custom event
	this.events.beforeTick();
	
	//calculate motion and new position
	for(var name in this.entity) {
		var obj = this.entity[name];
		if(!obj.physics) {
			obj.motion.x = 0;
			obj.motion.y = 0;
			continue;
		}
		obj.motion.x+=obj.force.x*this.tickTime;
		obj.force.x = 0;
		if(obj.motion.x<1 && obj.motion.x>-1) obj.motion.x = 0;
		else if(obj.surface) obj.motion.x-=obj.motion.x*obj.friction*this.tickTime;
		else obj.motion.x-=obj.motion.x*obj.airResistance*this.tickTime;
		obj.surface = false;
		
		obj.motion.y+=100*obj.gravity*this.tickTime;
		obj.motion.y+=obj.force.y*this.tickTime;
		obj.force.y = 0;
		obj.motion.y-=obj.motion.y*obj.airResistance*this.tickTime;
		
		obj.lastPos.x = obj.x;
		obj.lastPos.y = obj.y;
		obj.move = obj.motion.multiply(this.tickTime);
		obj.x+=obj.move.x;
		obj.y+=obj.move.y;
	}
	
	//find all collisions between all objects
	var objIndex = 0;
	var collisionList = [];
	for(var name in this.entity) {
		objIndex++;
		var obj = this.entity[name];
		if(obj.layer < -1 || obj.layer > 1 || !obj.solid) continue;
		
		//check geometry
		for(var geom in this.geometry) {
			var obj2 = this.geometry[geom];
			if(obj2.layer!==0) continue;
			if(this.collisionCheck(obj, obj2, false)) this.decouple(obj, obj2);
			if(this.collisionCheck(obj, obj2, true)) {
				var result = this.collisionPoint(obj, obj.move.x, obj.move.y, obj2, 0, 0);
				if(result!==false) {
					result.objA = obj;
					result.objB = obj2;
					result.status = true;
					collisionList.push(result);
				}
			}
		}
		if(objIndex>=this.numEntities) break;
		
		//check entities
		var index = 0;
		for(var dyn in this.entity) {
			index++;
			if(index<=objIndex) continue;
			var obj2 = this.entity[dyn];
			if(obj2.layer < -1 || obj2.layer > 1 || !obj2.solid) continue;
			if(this.collisionCheck(obj, obj2, false)) this.decouple(obj, obj2);
			if(this.collisionCheck(obj, obj2, true)) {
				var result = this.collisionPoint(obj, obj.move.x, obj.move.y, obj2, obj2.move.x, obj2.move.y);
				if(result!==false) {
					result.objA = obj;
					result.objB = obj2;
					result.status = true;
					collisionList.push(result);
				}
			}
		}
	}
	
	//sort collisions by time in ascending order
	collisionList.sort(function(a, b) {
		return a.t - b.t;
	});
	//resolve collisions
	for(var i=0; i<collisionList.length; i++) {
		if(this.resolveCollision(collisionList[i])===false) collisionList[i].status = false;
	}
	
	this.events.tick();
	
	this.render();
	//draw collision points
	if(this.drawCollisions) {
		for(var i=0; i<collisionList.length; i++) {
			if(collisionList[i].status) this.drawCircle(collisionList[i].x, collisionList[i].y, 4, "rgba(255,0,0,1)");
		}
	}
	this.tickCount++;
};

//RENDERING
GAME.prototype.render = function() {
	this.clearCanvas();
	if(!this.staticBackground) this.reposBackground();
	//Draw each layer in order
	//G(-1)
	for(var i=0; i<this.geomLayers[0].length; i++) {
		this.drawObj(this.geomLayers[0][i]);
	}
	//E(-2)
	for(var i=0; i<this.entLayers[0].length; i++) {
		this.drawObj(this.entLayers[0][i]);
	}
	//G(0)
	for(var i=0; i<this.geomLayers[1].length; i++) {
		this.drawObj(this.geomLayers[1][i]);
	}
	//E(-1)
	for(var i=0; i<this.entLayers[1].length; i++) {
		this.drawObj(this.entLayers[1][i]);
	}
	//E(0)
	for(var i=0; i<this.entLayers[2].length; i++) {
		this.drawObj(this.entLayers[2][i]);
	}
	//E(1)
	for(var i=0; i<this.entLayers[3].length; i++) {
		this.drawObj(this.entLayers[3][i]);
	}
	//G(1)
	for(var i=0; i<this.geomLayers[2].length; i++) {
		this.drawObj(this.geomLayers[2][i]);
	}
	//E(2)
	for(var i=0; i<this.entLayers[4].length; i++) {
		this.drawObj(this.entLayers[4][i]);
	}
	this.events.render();
};


//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////


//---VECTOR CONSTRUCTOR---//
function Vector(a, b, c, d) {
	if(typeof a==="number") {
		if(b===undefined) {
			var angle = Math.toRad(a);
			this.x = Math.cos(angle).fixedTo(15);
			this.y = Math.sin(angle).fixedTo(15);
		}
		else if(c===undefined || d===undefined) {
			this.x = a;
			this.y = b;
		}
		else {
			this.x = c-a;
			this.y = d-b;
		}
	}
	else {
		this.x = 0;
		this.y = 0;
	}
}

//Create a copy of vector
Vector.prototype.copy = function() {
	return new Vector(this.x, this.y);
};

//Get vector length
Vector.prototype.length = function() {
	return Math.sqrt(this.x*this.x + this.y*this.y);
};

//Normalize vector (set length -> 1) (if known, length can be provided as a parameter, so it doesn't have to be calculated again)
Vector.prototype.normalize = function(length) {
	if(typeof length!=="number") length = this.length();
	return new Vector(this.x/length, this.y/length);
};

//Reverse vector (opposite direction)
Vector.prototype.reverse = function() {
	return new Vector(-this.x, -this.y);
};

//Perpendicular vector (rotate 90 degrees) (dir = true/false - clockwise/anti-cw)
Vector.prototype.perpendicular = function(dir) {
	if(dir===true) {
		var x = this.y;
		var y = -this.x;
	}
	else {
		var x = -this.y;
		var y = this.x;
	}
	return new Vector(x, y);
};

//Add any amount of vectors together
Vector.prototype.add = function() {
	var x = this.x;
	var y = this.y;
	for(var i=0; i<arguments.length; i++) {
		var v = arguments[i];
		if(typeof v!=="object" || typeof v.x!=="number" || typeof v.y!=="number") throw "Invalid vector (parameter "+(i+1)+")";
		else {
			x+=v.x;
			y+=v.y;
		}
	}
	return new Vector(x, y);
};

//Subtract any amount of vectors
Vector.prototype.subtract = function() {
	var x = this.x;
	var y = this.y;
	for(var i=0; i<arguments.length; i++) {
		var v = arguments[i];
		if(typeof v!=="object" || typeof v.x!=="number" || typeof v.y!=="number") throw "Invalid vector (parameter "+(i+1)+")";
		else {
			x-=v.x;
			y-=v.y;
		}
	}
	return new Vector(x, y);
};

//Multiply vector by value(s) or by another vector
Vector.prototype.multiply = function(a, b) {
	if(typeof a==="number") {
		if(typeof b==="number") return new Vector(this.x*a, this.y*b);
		else return new Vector(this.x*a, this.y*a);
	}
	else if(typeof a==="object") return new Vector(this.x*a.x, this.y*a.y);
	else throw "Invalid multiplication parameters!";
};

//Get average vector from any amount of vectors
Vector.prototype.average = function() {
	var x = this.x;
	var y = this.y;
	var n = 1;
	for(var i=0; i<arguments.length; i++) {
		var v = arguments[i];
		if(typeof v!=="object" || typeof v.x!=="number" || typeof v.y!=="number") throw "Invalid vector (parameter "+(i+1)+")";
		else {
			x+=v.x;
			y+=v.y;
			n++;
		}
	}
	return new Vector(x/n, y/n);
};

//Multiply two vectors - DOT Product (returns scalar not a vector)
Vector.prototype.dot = function(v) {
	if(typeof v!=="object" || typeof v.x!=="number" || typeof v.y!=="number") throw "Invalid vector";
	else return this.x*v.x+this.y*v.y;
};

//Get vector angle --OR-- get angle between two vectors
Vector.prototype.angle = function(v) {
	if(typeof v==="object" && typeof v.x==="number" && typeof v.y==="number") {
		var a = Math.toDeg(Math.acos(this.x/this.length()));
		var b = Math.toDeg(Math.acos(v.x/G.getDistance(0, 0, v.x, v.y)));
		var angle = Math.abs(b-a);
		if(angle>180) return 360-angle;
		else return angle;
	}
	else return Math.toDeg(Math.acos(this.x/this.length()));
};

//Rotate vector (add angle to vector)
Vector.prototype.rotate = function(a) {
	var r = this.length();
	var angle = Math.acos(this.x/r) + Math.toRad(a);
	this.x = r*Math.cos(angle).fixedTo(15);
	this.y = r*Math.sin(angle).fixedTo(15);
	return this;
};

//Get scalar projection of vector onto a given vector
Vector.prototype.scalarProject = function(v) {
	if(typeof v!=="object" || (v.x===0 && v.y===0)) throw "Invalid vector";
	return this.dot(v)/v.length();
};

//Get vector projection of one vector onto a given vector
Vector.prototype.vectorProject = function(v) {
	if(typeof v!=="object" || (v.x===0 && v.y===0)) throw "Invalid vector";
	var n = this.dot(v)/(v.x*v.x+v.y*v.y);
	return new Vector(v.x*n, v.y*n);
};

//Get vector rejection from projection of one vector onto a given vector
Vector.prototype.vectorReject = function(v) {
	if(typeof v!=="object" || (v.x===0 && v.y===0)) throw "Invalid vector";
	var n = this.vectorProject(v);
	return new Vector(n.x, n.y, this.x, this.y);
};


//-------------------------------------------------------------------------------------------------------------------//

//---CUSTOM JAVASCRIPT UTILITIES---//



//TIME EVENT CONSTRUCTOR (UNIX Timestamp - miliseconds)
function Timestamp() {
	this.time = Date.now();
}

//Get time passed (secs)
Timestamp.prototype.since = function() {
	return (Date.now()-this.time)/1000;
};

//Format STRING - check if empty or spaces, convert number to string - returns given string, else returns empty string (by default)
function formatString(txt, def) {
	if(def==undefined) def="";
	if(typeof txt==="number") txt = txt.toString();
	if(typeof txt!=="string") return def;
	if(txt==="" || txt.split(" ").join("")==="") return def;
	for(var i=0; i<txt.length; i++) {
		if(txt[i]!==" ") {
			txt = txt.substr(i);
			break;
		}
	}
	for(var i=txt.length-1; i>=0; i--) {
		if(txt[i]!==" ") {
			txt = txt.substr(0, i+1);
			break;
		}
	}
	if(txt==="") return def;
	return txt;
};

//Format NUMBER (convert from string), invalid number returns false (by default)
function formatNumber(num, def) {
	if(def==undefined) def=false;
	if(typeof num!=="number" && typeof num!=="string") return def;
	if(typeof num==="string" && (num==="" || num.split(" ").join("")==="")) return def;
	else if(typeof num==="string") {
		if(!isNaN(parseFloat(num))) num = parseFloat(num);
		else return def;
	}
	if(!isFinite(num) || isNaN(num)) return def;
	return num;
};

//ADD NUMERICAL SORT FOR ARRAYS 
Array.prototype.numSort = function() {
	return this.sort(function(a, b) {
		return a - b;
	});
};

//POLYFILL IF BROWSER DOESN'T SUPPORT .includes FOR ARRAYS
if(!Array.prototype.includes) Array.prototype.includes = function(searchElement) {
	if(this == null) throw new TypeError("Array.prototype.includes called on null or undefined");
	var O = Object(this);
	var len = parseInt(O.length, 10) || 0;
	if(len===0) return false;
	var n = parseInt(arguments[1], 10) || 0;
	var k;
	if(n>=0) k = n;
	else {
		k = len + n;
		if(k<0) k = 0;
	}
	var currentElement;
	while(k < len) {
		currentElement = O[k];
		if(searchElement===currentElement || (searchElement !== searchElement && currentElement !== currentElement)) return true;
		k++;
	}
	return false;
}

//POLYFILL IF BROWSER DOESN'T SUPPORT .bind FOR FUNCTIONS
if(!Function.prototype.bind) {
	Function.prototype.bind = function() { 
		var fn = this,
		args = Array.prototype.slice.call(arguments),
		object = args.shift();
		return function() { 
			return fn.apply(object, args.concat(Array.prototype.slice.call(arguments))); 
		}; 
	};
}

//ROUND-OFF NUMBER TO GIVEN DECIMAL PLACES
Number.prototype.fixedTo = function(pos) {
	return parseFloat(this.valueOf().toFixed(pos));
};

//Convert Degrees to Radians
Math.toRad = function(deg) {
	return (deg%360)*(Math.PI/180);
};

//Convert Radians to Degrees
Math.toDeg = function(rad) {
	return ((rad/(Math.PI/180))%360).fixedTo(15);
};

//RANDOM INTEGER Number - Range: (min <= x < max) ------ (0,2) returns 0 or 1
Math.randomRange = function(min, max) {
	return Math.floor(Math.random()*(max-min)+min);
};

//RANDOM FLOAT Number - Range: (min <= x <= max) ------ (0,2) returns 0 to 2
Math.randomRangeFloat = function(min, max) {
	return Math.random()*(max-min)+min;
};

//RANDOM BOOLEAN - True/False
Math.randomBool = function() {
	return Math.random()>=0.5;
};

//Calculate average number from any amount of numbers
Math.average = function() {
	var sum = 0;
	for(var i=0; i<arguments.length; i++) {
		sum+=arguments[i];
	}
	return sum/i;
};

//Calculate weighted average from any amount of numbers (use arrays in this format: [number1, weight1], [number2, weight2], ...)
Math.weightedAverage = function() {
	var weightSum = 0;
	var valueSum = 0;
	for(var i=0; i<arguments.length; i++) {
		valueSum+=arguments[i][0]*arguments[i][1];
		weightSum+=arguments[i][1];
	}
	return valueSum/weightSum;
};

//Get RGB color format - (255, 255, 255)
function rgb(r, g, b) {
	return "rgb("+r+", "+g+", "+b+")";
}

//Get RGBA color format (transparency) - (255, 255, 255, 1)
function rgba(r, g, b, a) {
	return "rgba("+r+", "+g+", "+b+", "+a+")";
};


//-------------------------------------------------------------------------------------------------------------------//

//---GAME FUNCTIONS LIBRARY---//

var G = {
	//GAME INSTANCES REFERENCE
	instances:[],
	
	//key NAME to ID
	key:{backspace:8, back_space:8, tab:9, enter:13, shift:16, ctrl:17, alt:18, pause:19, pause_break:19, caps:20, capslock:20, caps_lock:20, esc:27, escape:27, space:32, spacebar:32, space_bar:32, pageup:33, page_up:33, pagedown:34, page_down:34, end:35, home:36, left:37, up:38, right:39, down:40, insert:45, del:46, delete:46, zero:48, é:48, one:49, plus:49, two:50, ě:50, three:51, š:51, four:52, č:52, five:53, ř:53, six:54, ž:54, seven:55, ý:55, eight:56, á:56, nine:57, í:57, a:65, b:66, c:67, d:68, e:69, f:70, g:71, h:72, i:73, j:74, k:75, l:76, m:77, n:78, o:79, p:80, q:81, r:82, s:83, t:84, u:85, v:86, w:87, x:88, y:89, z:90, window:91, windows:91, window_left:91, windows_left:91, window_right:92, windows_right:92, select:93, num0:96, num_0:96, num1:97, num_1:97, num2:98, num_2:98, num3:99, num_3:99, num4:100, num_4:100, num5:101, num_5:101, num6:102, num_6:102, num7:103, num_7:103, num8:104, num_8:104, num9:105, num_9:105, num_multiply:106, num_plus:106, num_add:106, num_minus:109, num_subtract:109, num_dot:110, num_decimal:110, num_period:110, num_del:110, num_delete:110, num_divide:111, f1:112, f2:113, f3:114, f4:115, f5:116, f6:117, f7:118, f8:119, f9:120, f10:121, f11:122, f12:123, num:144, numlock:144, num_lock:144, scroll:145, scrollock:145, scrolllock:145, scroll_lock:145, ů:186, quotes:186, double_quote:186, equal:187, equals:187, equal_sign:187, comma:188, question_mark:188, dash:189, dot:190, period:190, colon:190, ˇ:191, forward_slash:191, grave:192, semicolon:192, semi_colon:192, ú:219, bracket_left:219, open_bracket:219, open_brackets:219, slash:219, backslash:220, back_slash:220, backward_slash:220, backwards_slash:220, apostrophe:220, brackets:221, bracket_right:221, close_bracket:221, close_brackets:221, quote:222, single_quote:222, paragraph:222, exclamation_mark:222},
	
	//key state array
	keyStates:[false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
	
	//get key state from array
	keyActive:function(key) {
		return G.keyStates[key];
	},
	
	//mouse states
	mouseActive:{
		left:false,
		right:false,
		middle:false
	},
	
	//get device (check touchscreen)
	isMobile:function() {
		try {
			document.createEvent("TouchEvent");
			return true;
		}
		catch(e) {
			return false;
		}
	}(),
	
	//SAVE DATA To file (download file)
	saveToFile:function(filename, extension, data) {
		if(!window.navigator.msSaveBlob) {
			var element = document.createElement("a");
			element.setAttribute("href", "data:text/plain;charset=utf-8," + JSON.stringify(data));
			element.setAttribute("download", filename+"."+extension);
			element.style.display = "none";
			document.body.appendChild(element);
			element.click();
			document.body.removeChild(element);
		}
		else {
			var blobObject = new Blob([JSON.stringify(data)]); 
			window.navigator.msSaveBlob(blobObject, filename+"."+extension);
		}
	},
	
	//OPEN FILE Dialogue (callback gets (file, fileName, fileSize) )
	openFileDlg:function(callback) {
		var dlg = document.createElement("input");
		dlg.type = "file";
		$dlg = $(dlg);
		$dlg.change(function() {
			var file = dlg.files[0];;
			callback(file, file.name, file.size);
		});
		dlg.click();
	},
	
	//LOAD DATA from file
	readFile:function(file, parse, callback) {
		try {
			var reader = new FileReader();
			reader.onload = function(e) {
				var content = e.target.result;
				if(parse) callback(JSON.parse(content));
				else callback(content);
			};
			reader.readAsText(file);
		}
		catch(e) {
			callback(false, e);
		}
	},
	
	//-------------------------------------------------------------------------------------------------------------------//
	
	//GET DISTANCE BETWEEN TWO POINTS
	getDistance:function(x1, y1, x2, y2) {
		return Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
	},
	
	//GET DISTANCE SQUARED (NO Square root)
	getDistanceNoSqrt:function(x1, y1, x2, y2) {
		var x = x2-x1;
		var y = y2-y1;
		return x*x + y*y;
	},
	
	//GET ANGLE BETWEEN TWO POINTS / VECTORS (degrees)
	getAngle:function(centerX, centerY, pointX, pointY) {
		var r = G.getDistance(centerX, centerY, pointX, pointY);
		return Math.toDeg(Math.acos((pointX-centerX)/r));
	},
	
	//GET POINT FROM ANGLE AND DISTANCE (degrees)
	getPointFromAngle:function(centerX, centerY, angle, dist) {
		angle = Math.toRad(angle);
		var x = (dist*Math.cos(angle)+centerX).fixedTo(15);
		var y = (dist*Math.sin(angle)+centerY).fixedTo(15);
		return {x:x, y:y};
	},
	
	//CALCULATE COLLISION VELOCITY
	collisionVelocity:function(elasticity, mA, mB, vA, vB) {
		return {A:(elasticity*mB*(vB-vA)+mA*vA+mB*vB)/(mA+mB), B:(elasticity*mA*(vA-vB)+mA*vA+mB*vB)/(mA+mB)};
	},
	
	///////////////////////////////////////
	
	//LINE - LINE intersection point
	intersectLineLine:function(Ax1, Ay1, Ax2, Ay2, Bx1, By1, Bx2, By2, side) {
		var dn = ((By2-By1)*(Ax2-Ax1)) - ((Bx2-Bx1)*(Ay2-Ay1));
		if(dn===0) return false;
		var a = Ay1-By1;
		var b = Ax1-Bx1;
		var n1 = ((Bx2-Bx1)*a) - ((By2-By1)*b);
		var n2 = ((Ax2-Ax1)*a) - ((Ay2-Ay1)*b);
		a = n1/dn;
		b = n2/dn;
		if(a>=0 && a<=1 && b>=0 && b<=1) {
			var result = {x:Ax1+(a*(Ax2-Ax1)), y:Ay1+(a*(Ay2-Ay1))};
			if(side!=undefined) result.side = side;
			return result;
		}
		else return false;
	},
	
	//LINE - CIRCLE intersection point
	intersectLineCircle:function(x1, y1, x2, y2, cx, cy, r) {
		var lineLength = G.getDistance(x1, y1, x2, y2);
		var result = false;
		
		//if line starts inside circle, return false
		if(G.getDistanceNoSqrt(x1, y1, cx, cy)<r*r-1) return false;
		
		//direction vector from A to B
		var Dx = (x2-x1)/lineLength;
		var Dy = (y2-y1)/lineLength;
		
		
		//line equation is   x = Dx*t + Ax
		//0<= t <=1          y = Dy*t + Ay
		
		//calculate t for closest point to circle center
		var t = Dx*(cx-x1) + Dy*(cy-y1);
		//This is the projection of C on the line from A to B.
		
		//calculate closest point on line to circle center
		var Ex = t*Dx+x1;
		var Ey = t*Dy+y1;
		
		//distance of line to circle center
		var lineDistance = G.getDistance(Ex, Ey, cx, cy);
		
		//test if the line intersects circle
		if(lineDistance<r) {
			//distance from circle center to intersection points
			var dt = Math.sqrt(r*r - lineDistance*lineDistance);
			
			//first intersection point
			var Fx = (t-dt)*Dx+x1;
			var Fy = (t-dt)*Dy+y1;
			
			result = {x:Fx, y:Fy};
			
			//second intersection point
			//var Gx = (t+dt)*Dx+x1;
			//var Gy = (t+dt)*Dy+y1;
		}
		//if line is tangent to circle
		else if(lineDistance===r) result = {x:Ex, y:Ey};
		
		if(result!==false) result.side = "round";
		return result;
	},
	
	//LINE - RECTANGLE intersection point
	intersectLineRect:function(x1, y1, x2, y2, cx, cy, w, h) {
		var rx1 = cx-w;
		var ry1 = cy-h;
		var rx2 = cx+w;
		var ry2 = cy+h;
		var result = false;
		if(x1<=rx1) {//left
			if(y1<=ry1) {//top
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1, rx2, ry1, "top");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1, rx1, ry2, "left");
			}
			else if(y1>=ry2) {//bottom
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry2, rx2, ry2, "bottom");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1, rx1, ry2, "left");
			}//mid
			else result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1, rx1, ry2, "left");
		}
		else if(x1>=rx2) {//right
			if(y1<=ry1) {//top
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1, rx2, ry1, "top");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx2, ry1, rx2, ry2, "right");
			}
			else if(y1>=ry2) {//bottom
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry2, rx2, ry2, "bottom");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx2, ry1, rx2, ry2, "right");
			}//mid
			else result = G.intersectLineLine(x1, y1, x2, y2, rx2, ry1, rx2, ry2, "right");
		}
		else {//mid
			if(y1<=ry1) result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1, rx2, ry1, "top");
			else if(y1>=ry2) result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry2, rx2, ry2, "bottom");
			//else result = false;//inside
		}
		return result;
	},
	
	//LINE - ROUNDED RECTANGLE intersection point
	intersectLineRoundrect:function(x1, y1, x2, y2, cx, cy, w, h, r) {
		var rx1 = cx-w;//-r
		var ry1 = cy-h;//-r
		var rx2 = cx+w;//+r
		var ry2 = cy+h;//+r
		var result = false;
		
		if(x1<rx1) {//left
			if(y1<ry1) {//top
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1-r, rx2, ry1-r, "top");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx1-r, ry1, rx1-r, ry2, "left");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry1, r);//tl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry1, r);//tr
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry2, r);//bl
			}
			else if(y1>ry2) {//bottom
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry2+r, rx2, ry2+r, "bottom");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx1-r, ry1, rx1-r, ry2, "left");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry2, r);//bl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry1, r);//tl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry2, r);//br
			}//mid
			else {
				result = G.intersectLineLine(x1, y1, x2, y2, rx1-r, ry1, rx1-r, ry2, "left");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry1, r);//tl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry2, r);//bl
			}
		}
		else if(x1>rx2) {//right
			if(y1<ry1) {//top
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1-r, rx2, ry1-r, "top");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx2+r, ry1, rx2+r, ry2, "right");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry1, r);//tr
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry2, r);//br
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry1, r);//tl
			}
			else if(y1>ry2) {//bottom
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry2+r, rx2, ry2+r, "bottom");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx2+r, ry1, rx2+r, ry2, "right");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry2, r);//br
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry1, r);//tr
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry2, r);//bl
			}//mid
			else {
				result = G.intersectLineLine(x1, y1, x2, y2, rx2+r, ry1, rx2+r, ry2, "right");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry1, r);//tr
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry2, r);//br
			}
		}
		else {//mid
			if(y1<ry1) {//top
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1-r, rx2, ry1-r, "top");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry1, r);//tl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry1, r);//tr
			}//bottom
			else if(y1>ry2) {
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry2+r, rx2, ry2+r, "bottom");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry2, r);//bl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry2, r);//br
			}
			//else result = false;//inside middle
		}
		return result;
	},
	
	//CIRCLE - CIRCLE collision
	intersectCircleCircle:function(x1, y1, r1, x2, y2, r2) {
		return G.getDistance(x1, y1, x2, y2) < (r1+r2);
	},
	
	//RECTANGLE - RECTANGLE collision
	intersectRectRect:function(x1, y1, w1, h1, x2, y2, w2, h2) {
		return (x1>x2-w2-w1 && x1<x2+w2+w1 && y1>y2-h2-h1 && y1<y2+h2+h1);
	},
	
	//RECTANGLE - CIRCLE collision
	intersectRectCircle:function(x, y, w, h, cx, cy, r) {
		var top = y-h;
		var bottom = y+h;
		var left = x-w;
		var right = x+w;
		var closestX = (cx<left? left:(cx>right? right:cx));
		var closestY = (cy<top? top:(cy>bottom? bottom:cy));
		var dx = closestX-cx;
		var dy = closestY-cy;
		return (dx*dx + dy*dy) < r*r;
	},
	
	//Find if given point is within given circle's radius
	pointInCircle:function(x, y, cx, cy, r) {
		return G.getDistanceNoSqrt(x, y, cx, cy) < r*r;
	},
	
	//Find if given point is inside rectangle 
	pointInRect:function(x, y, cx, cy, w, h) {
		return (x>cx-w && x<cx+w && y>cy-h && y<cy+h);
	},
	
	//Find if given point is inside rectangular area (defined by top-left and bottom-right)
	pointInArea:function(x, y, x1, y1, x2, y2) {
		return (x>x1 && x<x2 && y>y1 && y<y2);
	}
};

$(document).ready(function() {
	//Track mouse state
	$(document).on((G.isMobile?"touchstart":"mousedown")+".global", function(e) {
		if(e.type==="touchstart") G.mouseActive.left = true;
		else if(e.which===1) G.mouseActive.left = true;
		else if(e.which===2) G.mouseActive.middle = true;
		else if(e.which===3) G.mouseActive.right = true;
	});
	$(document).on((G.isMobile?"touchend":"mouseup")+".global", function(e) {
		if(e.type==="touchend") G.mouseActive.left = false;
		else if(e.which===1) G.mouseActive.left = false;
		else if(e.which===2) G.mouseActive.middle = false;
		else if(e.which===3) G.mouseActive.right = false;
	});
	
	//Track key states
	$(document).on("keydown", function(event) {
		var keyID = parseInt(event.which, 10);
		G.keyStates[keyID] = true;
		for(var i=0; i<G.instances.length; i++) {
			G.instances[i].events.keydown(keyID, event);
		}
	});
	$(document).on("keyup", function(event) {
		var keyID = parseInt(event.which, 10);
		G.keyStates[keyID] = false;
		for(var i=0; i<G.instances.length; i++) {
			G.instances[i].events.keyup(keyID, event);
		}
	});
});