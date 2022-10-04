//Number of decimal places for any coordinate value (higher precision might mess up collisions)
PRECISION = 5;

//---GAME CONSTRUCTOR---//
function GAME(canvasID, width, height, fps, imageSources, audioSources, callback) {
	var self = this;
	this.canvas = document.getElementById(canvasID);
	this.ctx = this.canvas.getContext("2d");
	this.width = 0;
	this.height = 0;
	this.canvasX = 0;
	this.canvasY = 0;
	this.setWidth = width;
	this.setHeight = height;
	this.zoom = 1;
	
	this.loopID;
	this.tickSpeed = 1000/fps;
	this.lastTick;
	this.paused = true;
	this.tickCounter = 0;
	
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
		tick:function(){},
		mousedown:function(){},
		mouseup:function(){},
		mousemove:function(){},
		keydown:function(){},
		keyup:function(){},
		windowResize:function(){}
	};
	
	this.shape = {};
	this.geometry = {};
	this.entity = {};
	this.gui = {};
	this.area = {};
	this.numGeometry = 0;
	this.numEntities = 0;
	this.numGui = 0;
	this.numAreas = 0;
	this.geomLayers = [[],[],[]];
	this.entLayers = [[],[],[],[],[]];
	
	this.image = {};
	this.audio = {};
	if(imageSources==undefined) imageSources = {};
	if(audioSources==undefined) audioSources = {};
	this.preloadImages(imageSources, audioSources, callback);
	
	this.missingTexture = "rgba(255,0,220,1)";
	var img = new Image();
	img.onload = function() {
		self.missingTexture = self.ctx.createPattern(this, "repeat");
	}
	//missing texture image in base64
	img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTM0A1t6AAAAmElEQVRIS7XNoRHAMADDwOw/Y3dpiZCIHFCf6J/Pe56rzu3kM9g++Qy2Tz6D7ZPPYPvkM9g++Qy2Tz6D7ZPPYPvkM9g++Qy2Tz6D7ZPPYPvkM9g++Qy2Tz6D/Tf9ZbB98hlsn3wG2yefwfbJZ7B98hlsn3wG2yefwfbJZ7B98hlsn3wG2yefwfbJZ7B98hlsn3wG2ycfnecDA6+2Ll+pG1sAAAAASUVORK5CYII=";
	
	this.updateCanvasSize();
	$(window).on("resize", function() {
		if(self.setWidth<0 || self.setHeight<0) self.updateCanvasSize();
		self.events.windowResize();
	});
	
	//UPDATE MOUSE Coordinates - mousemove
	$("#"+canvasID).on((isMobile?"touchmove":"mousemove")+"."+canvasID, function(e) {
		var rect = self.canvas.getBoundingClientRect();
		self.cursorLastX = self.cursorX;
		self.cursorLastY = self.cursorY;
		self.mouseLastX = self.mouseX;
		self.mouseLastY = self.mouseY;
		self.cursorX = (isMobile?Math.round(e.originalEvent.touches[0].clientX):e.clientX) - rect.left;
		self.cursorY = (isMobile?Math.round(e.originalEvent.touches[0].clientY):e.clientY) - rect.top;
		self.mouseX = (self.cursorX/self.zoom)-self.canvasX;
		self.mouseY = (self.cursorY/self.zoom)-self.canvasY;
		self.events.mousemove(self.mouseX-self.mouseLastX, self.mouseX-self.mouseLastX);
	});
	
	//MOUSEDOWN
	$("#"+canvasID).on((isMobile?"touchstart":"mousedown")+"."+canvasID, function(e) {
		if(e.type==="touchdown") self.events.mousedown("left");
		else if(e.which===1) self.events.mousedown("left");
		else if(e.which===2) self.events.mousedown("middle");
		else if(e.which===3) self.events.mousedown("right");
	});
	
	//MOUSEUP
	$("#"+canvasID).on((isMobile?"touchend":"mouseup")+"."+canvasID, function(e) {
		if(e.type==="touchend") self.events.mouseup("left");
		else if(e.which===1) self.events.mouseup("left");
		else if(e.which===2) self.events.mouseup("middle");
		else if(e.which===3) self.events.mouseup("right");
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
		this.image[src] = new Image();
		this.image[src].ref = src;
		this.image[src].onload = function() {
			self.image[this.ref] = self.createTexture(this);
			if(++loadedImages>=numImages) self.preloadAudio(audioSources, callback);
		};
		this.image[src].onerror = this.image[src].onabort = function() {
			//console.log("Image failed to load: \""+this.src+"\"");
			self.image[this.ref] = self.missingTexture;
			if(++loadedImages>=numImages) self.preloadAudio(audioSources, callback);
		};
		this.image[src].src = imgSources[src];
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

//CLEAR CANVAS
GAME.prototype.clearCanvas = function() {
	this.ctx.clearRect(-this.canvasX, -this.canvasY, this.width/this.zoom, this.height/this.zoom);
};
	
//draw rectangle
GAME.prototype.drawRect = function(x, y, width, height, texture, outlineWidth, outlineTexture) {
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
	this.ctx.lineWidth = width;
	this.ctx.strokeStyle = texture;
	this.ctx.beginPath();
	this.ctx.moveTo(x1, y1);
	this.ctx.lineTo(x2, y2);
	this.ctx.stroke();
};

//draw text
GAME.prototype.drawText = function(txt, x, y, fontStyle, centered, texture, outlineWidth, outlineTexture) {
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
	return this.ctx.measureText(txt).width+outlineWidth;
};

//Choose drawing function for shape
GAME.prototype.drawShape = function(obj) {
	this.ctx.save();
	this.ctx.setTransform(1, 0, 0, 1, 0, 0);
	this.ctx.scale(this.zoom, this.zoom);
	
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

//save shape as template to use for other objects
GAME.prototype.saveShape = function(name, shape) {
	if(this.shape.name) throw "Shape name already exists!";
	this.shape[name] = shape;
};


//---OBJECT CONSTRUCTORS---//

//Geometry object (wall/floor...) (layer = -1 to 1)
function Geometry(shape, x, y, solid, visible, layer) {
	if(layer<-1 || layer>1) throw "Invalid layer!";
	for(var key in shape) {
		this[key] = shape[key];
	}
	this.layer = layer;
	this.x = x;
	this.y = y;
	this.solid = solid;
	this.visible = visible;
}

//Entity object (player, box...) (layer = -2 to 2)
function Entity(shape, x, y, physics, solid, visible, mass, bounce, friction, airResistance, health, layer) {
	if(layer<-2 || layer>2) throw "Invalid layer!";
	for(var key in shape) {
		this[key] = shape[key];
	}
	this.layer = layer;
	this.x = x;
	this.y = y;
	this.motion = new Vector(0, 0);//default
	this.move = new Vector(0, 0);//default
	this.force = new Vector(0, 0);//default
	this.gravity = 9.8;//default
	this.lastPos = {x:x, y:y};//default
	this.physics = physics;
	this.solid = solid;
	this.visible = visible;
	this.mass = mass;
	this.bounce = bounce;
	this.friction = friction;
	this.airResistance = airResistance;
	this.health = health;
	this.onGround = false;//default
}

//Area object (for scripting)
function Area(shape, x, y) {
	for(var key in shape) {
		this[key] = shape[key];
	}
	this.x = x;
	this.y = y;
}

//GUI object (overlay, menu...)
function GUIObject(shape, x, y) {
	for(var key in shape) {
		this[key] = shape[key];
	}
	this.x = x;
	this.y = y;
}

//Initialize object - spawn object into the game
GAME.prototype.initObj = function(name, obj) {
	if(obj instanceof Geometry) {
		if(this.geometry[name]) throw "Geometry name already exists!";
		obj.name = name;
		this.geometry[name] = obj;
		this.geomLayers[obj.layer+1].push(name);
		this.numGeometry++;
		return this.geometry[name];
	}
	else if(obj instanceof Entity) {
		if(this.entity[name]) throw "Entity name already exists!";
		obj.name = name;
		this.entity[name] = obj;
		this.entLayers[obj.layer+2].push(name);
		this.numEntities++;
		return this.entity[name];
	}
	else if(obj instanceof Area) {
		if(this.area[name]) throw "Area name already exists!";
		obj.name = name;
		this.area[name] = obj;
		this.numAreas++;
		return this.area[name];
	}
	else if(obj instanceof GUIObject) {
		if(this.gui[name]) throw "GUI-Object name already exists!";
		obj.name = name;
		this.gui[name] = obj;
		this.numGui++;
		return this.gui[name];
	}
	else throw "Invalid object type";
};

//delete object
GAME.prototype.deleteObject = function(obj) {
	if(obj instanceof Geometry) {
		var layer = obj.layer+1;
		this.geomLayers[layer].splice(this.geomLayers[layer].indexOf(obj.name), 1);
		if(delete this.geometry[obj.name]) this.numGeometry--;
	}
	else if(obj instanceof Entity) {
		var layer = obj.layer+2;
		this.entLayers[layer].splice(this.entLayers[layer].indexOf(obj.name), 1);
		if(delete this.entity[obj.name]) this.numEntities--;
	}
	else if(obj instanceof Area) {
		if(delete this.area[obj.name]) this.numAreas--;
	}
	else if(obj instanceof GUIObject) {
		if(delete this.gui[obj.name]) this.numGui--;
	}
	else throw "Invalid object type";
};

//RESIZE CANVAS
GAME.prototype.updateCanvasSize = function() {
	if(this.setWidth<0) this.width = $(window).width();
	else this.width = this.setWidth;
	if(this.setHeight<0) this.height = $(window).height();
	else this.height = this.setHeight;
	this.canvas.width = this.width;
	this.canvas.height = this.height;
	this.ctx.scale(this.zoom, this.zoom);
	this.ctx.translate(this.canvasX, this.canvasY);
	if(this.tickCounter!==0) this.render();
};

//ADD EVENT
GAME.prototype.attachEvent = function(type, callback) {
	if(typeof callback!=="function") throw "Specified callback is not a function";
	else if(this.events[type]===undefined) throw "Event type doesn't exist"
	else this.events[type] = callback;
};

//START GAME TICK
GAME.prototype.start = function() {
	this.paused = false;
	this.render();
	this.lastTick = new Timestamp();
	this.loopID = setTimeout(this.tick.bind(this), this.tickSpeed);
};

//PAUSE GAME TICK
GAME.prototype.stop = function() {
	clearTimeout(this.loopID);
	this.paused = true;
};

//CHECK COLLISION
GAME.prototype.collisionCheck = function(objA, objB, useNew) {
	var moveableA = ((objA instanceof Entity) && objA.physics);
	var moveableB = ((objB instanceof Entity) && objB.physics);
	
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
		return result;
	}
};

//Resolve collision pair
GAME.prototype.resolveCollision = function(result) {
	if(!this.collisionCheck(result.objA, result.objB, true)) return;
	
	var objA = result.objA;
	var objB = result.objB;
	
	var moveableA = ((objA instanceof Entity) && objA.physics);
	var moveableB = ((objB instanceof Entity) && objB.physics);
	
	var massA = moveableA?objA.mass:0;
	var massB = moveableB?objB.mass:0;
	var motionA = moveableA?objA.motion:new Vector(0, 0);
	var motionB = moveableB?objB.motion:new Vector(0, 0);
	
	result = this.collisionPoint(objA, motionA.x*this.tickTime, motionA.y*this.tickTime, objB, motionB.x*this.tickTime, motionB.y*this.tickTime)
	if(result===false) return;
	
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
		var tangent = normal.tangent();
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
};

//Separate intersecting objects
GAME.prototype.decouple = function(objA, objB) {
	var moveableA = ((objA instanceof Entity) && objA.physics);
	var moveableB = ((objB instanceof Entity) && objB.physics);
	
	var Ax = moveableA?objA.lastPos.x:objA.x;
	var Ay = moveableA?objA.lastPos.y:objA.y;
	var Bx = moveableB?objB.lastPos.x:objB.x;
	var By = moveableB?objB.lastPos.y:objB.y;
	if(Ax===Bx && Ay===By) return false;
	
	var massA = moveableA?objA.mass:0;
	var massB = moveableB?objB.mass:0;
	var totalMass = massA+massB;
	if(totalMass===0) return false;
	
	//calculate separation
	if(objA.shape==="circle" && objB.shape==="circle") {
		var dir = new Vector(Ax, Ay, Bx, By);
		var length = dir.length();
		var d = objA.r+objB.r-length;
		var unit = dir.normalize(length);
		if(massA===0) {
			var partB = (d/totalMass)*massB;
			var partA = d-partB;
		}
		else {
			var partA = (d/totalMass)*massA;
			var partB = d-partA;
		}
		var moveA = unit.multiply(partA).reverse();
		var moveB = unit.multiply(partB);
	}
	else if(objA.shape==="rect" && objB.shape==="rect") {
		var dir = new Vector(Ax, Ay, Bx, By);
		var overlapX = objA.width+objB.width-Math.abs(dir.x);
		var overlapY = objA.height+objB.height-Math.abs(dir.y);
		if(overlapX<overlapY) {
			if(massA===0) {
				var partB = overlapX/totalMass*massB;
				var partA = overlapX-partB;
			}
			else {
				var partA = overlapX/totalMass*massA;
				var partB = overlapX-partA;
			}
			if(Ax < Bx) {
				var moveA = {x:-partA, y:0};
				var moveB = {x:partB, y:0};
			}
			else {
				var moveA = {x:partA, y:0};
				var moveB = {x:-partB, y:0};
			}
		}
		else {
			if(massA===0) {
				var partB = overlapY/totalMass*massB;
				var partA = overlapY-partB;
			}
			else {
				var partA = overlapY/totalMass*massA;
				var partB = overlapY-partA;
			}
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
	else if(objA.shape==="rect") {
		var top = Ay-objA.height;
		var bottom = Ay+objA.height;
		var left = Ax-objA.width;
		var right = Ax+objA.width;
		
		if((Bx<left || Bx>right) && (By<top || By>bottom)) {
			var cornerX = (Bx<Ax?left:right);
			var cornerY = (By<Ay?top:bottom);
			var dir = new Vector(Bx, By, cornerX, cornerY);
			var length = dir.length();
			var d = objB.r-length;
			var unit = dir.normalize(length);
			if(massA===0) {
				var partB = (d/totalMass)*massB;
				var partA = d-partB;
			}
			else {
				var partA = (d/totalMass)*massA;
				var partB = d-partA;
			}
			var moveA = unit.multiply(partA);
			var moveB = unit.multiply(partB).reverse();
		}
		else {
			var dir = new Vector(Ax, Ay, Bx, By);
			var overlapX = objA.width+objB.r-Math.abs(dir.x);
			var overlapY = objA.height+objB.r-Math.abs(dir.y);
			if(overlapX<overlapY) {
				if(massA===0) {
					var partB = overlapX/totalMass*massB;
					var partA = overlapX-partB;
				}
				else {
					var partA = overlapX/totalMass*massA;
					var partB = overlapX-partA;
				}
				if(Ax < Bx) {
					var moveA = {x:-partA, y:0};
					var moveB = {x:partB, y:0};
				}
				else {
					var moveA = {x:partA, y:0};
					var moveB = {x:-partB, y:0};
				}
			}
			else {
				if(massA===0) {
					var partB = overlapY/totalMass*massB;
					var partA = overlapY-partB;
				}
				else {
					var partA = overlapY/totalMass*massA;
					var partB = overlapY-partA;
				}
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
	else {
		var top = By-objB.height;
		var bottom = By+objB.height;
		var left = Bx-objB.width;
		var right = Bx+objB.width;
		
		if((Ax<left || Ax>right) && (Ay<top || Ay>bottom)) {
			var cornerX = (Ax<Bx?left:right);
			var cornerY = (Ay<By?top:bottom);
			var dir = new Vector(Ax, Ay, cornerX, cornerY);
			var length = dir.length();
			var d = objA.r-length;
			var unit = dir.normalize(length);
			if(massB===0) {
				var partA = (d/totalMass)*massA;
				var partB = d-partA;
			}
			else {
				var partB = (d/totalMass)*massB;
				var partA = d-partB;
			}
			var moveB = unit.multiply(partB);
			var moveA = unit.multiply(partA).reverse();
		}
		else {
			var dir = new Vector(Bx, By, Ax, Ay);
			var overlapX = objB.width+objA.r-Math.abs(dir.x);
			var overlapY = objB.height+objA.r-Math.abs(dir.y);
			if(overlapX<overlapY) {
				if(massB===0) {
					var partA = overlapX/totalMass*massA;
					var partB = overlapX-partA;
				}
				else {
					var partB = overlapX/totalMass*massB;
					var partA = overlapX-partB;
				}
				if(Bx < Ax) {
					var moveB = {x:-partB, y:0};
					var moveA = {x:partA, y:0};
				}
				else {
					var moveB = {x:partB, y:0};
					var moveA = {x:-partA, y:0};
				}
			}
			else {
				if(massB===0) {
					var partA = overlapY/totalMass*massA;
					var partB = overlapY-partA;
				}
				else {
					var partB = overlapY/totalMass*massB;
					var partA = overlapY-partB;
				}
				if(By < Ay) {
					var moveB = {x:0, y:-partB};
					var moveA = {x:0, y:partA};
				}
				else {
					var moveB = {x:0, y:partB};
					var moveA = {x:0, y:-partA};
				}
			}
		}
	}
	if([moveA.x, moveA.y, moveB.x, moveB.y].includes(NaN)) debugger;
	//separate objects
	if(moveableA) {
		objA.lastPos.x+=moveA.x;
		objA.lastPos.y+=moveA.y;
		objA.x+=moveA.x;
		objA.y+=moveA.y;
	}
	if(moveableB) {
		objB.lastPos.x+=moveB.x;
		objB.lastPos.y+=moveB.y;
		objB.x+=moveB.x;
		objB.y+=moveB.y;
	}
};

//GAME TICK LOOP
GAME.prototype.tick = function() {
	this.tickTime = this.lastTick.timePassed();
	this.lastTick = new Timestamp();
	
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
		else if(obj.onGround) obj.motion.x-=obj.motion.x*obj.friction*this.tickTime;
		else obj.motion.x-=obj.motion.x*obj.airResistance*this.tickTime;
		
		obj.motion.y+=100*obj.gravity*this.tickTime;
		obj.motion.y+=obj.force.y*this.tickTime;
		obj.force.y = 0;
		obj.motion.y-=obj.motion.y*obj.airResistance*this.tickTime;
		
		obj.lastPos.x = obj.x;
		obj.lastPos.y = obj.y;
		obj.move.x = obj.motion.x*this.tickTime;
		obj.move.y = obj.motion.y*this.tickTime;
		obj.x+=obj.move.x;
		obj.y+=obj.move.y;
	}
	
	//find all collisions between all objects
	var objIndex = 0;
	var collisionList = [];
	for(var name in this.entity) {
		objIndex++;
		var obj = this.entity[name];
		if(obj.layer < -1 || obj.layer > 1) continue;
		for(var geom in this.geometry) {
			var obj2 = this.geometry[geom];
			if(obj2.layer!==0 || !obj.solid) continue;
			if(this.collisionCheck(obj, obj2, false)) this.decouple(obj, obj2);
			if(this.collisionCheck(obj, obj2, true)) {
				var result = this.collisionPoint(obj, obj.move.x, obj.move.y, obj2, 0, 0);
				if(result!==false) {
					result.objA = obj;
					result.objB = obj2;
					collisionList.push(result);
				}
			}
		}
		if(objIndex>=this.numEntities) break;
		var index = 0;
		for(var dyn in this.entity) {
			index++;
			if(index<=objIndex) continue;
			var obj2 = this.entity[dyn];
			if(obj2.layer < -1 || obj2.layer > 1 || !obj.solid) continue;
			if(this.collisionCheck(obj, obj2, false)) this.decouple(obj, obj2);
			if(this.collisionCheck(obj, obj2, true)) {
				var result = this.collisionPoint(obj, obj.move.x, obj.move.y, obj2, obj2.move.x, obj2.move.y);
				if(result!==false) {
					result.objA = obj;
					result.objB = obj2;
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
		this.resolveCollision(collisionList[i]);
	}
	
	this.events.tick();
	this.tickCounter++;
	this.render();
	
	//draw collision points
	for(var i=0; i<collisionList.length; i++) {
		this.drawCircle(collisionList[i].x, collisionList[i].y, 2, "rgba(0,0,0,1)");
	}
	
	clearTimeout(this.loopID);
	this.loopID = setTimeout(this.tick.bind(this), this.tickSpeed);
};

//RENDERING
GAME.prototype.render = function() {
	this.clearCanvas();
	for(var i=0; i<this.geomLayers[0].length; i++) {
		this.drawShape.bind(this)(this.geometry[this.geomLayers[0][i]]);
	}
	for(var i=0; i<this.entLayers[0].length; i++) {
		this.drawShape.bind(this)(this.entity[this.entLayers[0][i]]);
	}
	for(var i=0; i<this.geomLayers[1].length; i++) {
		this.drawShape.bind(this)(this.geometry[this.geomLayers[1][i]]);
	}
	for(var i=0; i<this.entLayers[1].length; i++) {
		this.drawShape.bind(this)(this.entity[this.entLayers[1][i]]);
	}
	for(var i=0; i<this.entLayers[2].length; i++) {
		this.drawShape.bind(this)(this.entity[this.entLayers[2][i]]);
	}
	for(var i=0; i<this.entLayers[3].length; i++) {
		this.drawShape.bind(this)(this.entity[this.entLayers[3][i]]);
	}
	for(var i=0; i<this.geomLayers[2].length; i++) {
		this.drawShape.bind(this)(this.geometry[this.geomLayers[2][i]]);
	}
	for(var i=0; i<this.entLayers[4].length; i++) {
		this.drawShape.bind(this)(this.entity[this.entLayers[4][i]]);
	}
	/*
	for(var i=0; i<this.geomLayers[3].length; i++) {
		this.drawShape.bind(this)(this.geometry[this.geomLayers[3][i]]);
	}*///GUI
};


//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////


//---TIME EVENT CONSTRUCTOR---//
function Timestamp() {
	this.time = Date.now();
}

//Get time passed (secs)
Timestamp.prototype.timePassed = function() {
	return (Date.now()-this.time)/1000;
};

//---VECTOR CONSTRUCTOR---//
function Vector(a, b, c, d) {
	if(typeof a==="number") {
		if(b===undefined) {
			var angle = a.toRad();
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
	else throw "Invalid vector parameters!";
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

//Tangent / perpendicular vector (rotate 90 degrees) (dir = true/false - clockwise/anti-cw)
Vector.prototype.tangent = function(dir) {
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
		var a = Math.acos(this.x/this.length()).toDeg();
		var b = Math.acos(v.x/G.getDistance(0, 0, v.x, v.y)).toDeg();
		var angle = Math.abs(b-a);
		if(angle>180) return 360-angle;
		else return angle;
	}
	else {
		return Math.acos(this.x/this.length()).toDeg();
	}
};

//Rotate vector (add angle to vector)
Vector.prototype.rotate = function(a) {
	var r = this.length();
	var angle = Math.acos(this.x/r) + a.toRad();
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
Number.prototype.toRad = function() {
	return (this.valueOf()%360)*(Math.PI/180);
};

//Convert Radians to Degrees
Number.prototype.toDeg = function() {
	return ((this.valueOf()/(Math.PI/180))%360).fixedTo(15);
};

//check device
var isMobile=function() {
	try {
		document.createEvent("TouchEvent");
		return true;
	}
	catch(e) {
		return false;
	}
}();


//-------------------------------------------------------------------------------------------------------------------//

//---GAME FUNCTIONS LIBRARY---//

var G = {
	//GAME INSTANCES REFERENCE
	instances:[],
	
	//keystates
	key:{
		ctrl:false,
		shift:false,
		alt:false,
		space:false,
		up:false,
		down:false,
		left:false,
		right:false,
		mouseLeft:false,
		mouseRight:false,
		mouseMiddle:false
	},
	
	//create font style
	createFontStyle:function(size, bold, italic, font) {
		var style = "";
		if(italic===1) style=style+"italic ";
		else if(italic===2) style=style+"oblique ";
		if(bold===1) style=style+"bold ";
		else if(bold===2) style=style+"900 ";
		style=style+size+"px ";
		if(font) style=style+font;
		else style=style+"Arial";
		return style;
	},
	
	//Get RGB color format - (255, 255, 255)
	rgb:function(r, g, b) {
		return "rgb("+r+", "+g+", "+b+")";
	},
	
	//Get RGBA color format (transparency) - (255, 255, 255, 1)
	rgba:function(r, g, b, a) {
		return "rgba("+r+", "+g+", "+b+", "+a+")";
	},
	
	//-------------------------------------------------------------------------------------------------------------------//
	
	//RANDOM INTEGER Number - Range: (min <= x < max) ------ (0,2) returns 0 or 1
	randomRange:function(min, max) {
		return Math.floor(Math.random()*(max-min)+min);
	},
	
	//RANDOM FLOAT Number - Range: (min <= x <= max) ------ (0,2) returns 0 to 2
	randomRangeFloat:function(min, max) {
		return Math.random()*(max-min)+min;
	},
	
	//RANDOM BOOLEAN - True/False
	randomBool:function() {
		return Math.random()>=0.5;
	},
	
	//Calculate average number from any amount of numbers
	average:function() {
		var sum = 0;
		for(var i=0; i<arguments.length; i++) {
			sum+=arguments[i];
		}
		return sum/i;
	},
	
	//Format STRING - check if empty or spaces, convert number to string - returns given string, else returns empty string (by default)
	formatText:function(txt, def) {
		if(def==undefined) def="";
		if(typeof txt==="number") txt = txt.toString();
		if(typeof txt!=="string") return def;
		if(txt==="" || txt.split(" ").join("")==="") return def;
		else {
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
		}
		return txt;
	},
	
	//Format number (convert from string), invalid number returns false (by default)
	formatNum:function(num, def) {
		if(def==undefined) def=false;
		if(typeof num!=="number" && typeof num!=="string") return def;
		if(typeof num==="string" && (num==="" || num.split(" ").join("")==="")) return def;
		else if(typeof num==="string") {
			if(!isNaN(parseFloat(num))) num = parseFloat(num);
			else return def;
		}
		if(!isFinite(num) || isNaN(num)) return def;
		return num;
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
		return Math.acos((pointX-centerX)/r).toDeg();
	},
	
	//GET POINT FROM ANGLE AND DISTANCE (degrees)
	getPointFromAngle:function(centerX, centerY, angle, dist) {
		angle = angle.toRad();
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
		if(G.getDistance(x1, y1, x2, y2) > r1+r2) return false;
		else return true;
	},
	
	//RECTANGLE - RECTANGLE collision
	intersectRectRect:function(x1, y1, w1, h1, x2, y2, w2, h2) {
		if(x1>x2-w2-w1 && x1<x2+w2+w1 && y1>y2-h2-h1 && y1<y2+h2+h1) return true;
		else return false;
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
	}
};

$(document).ready(function() {
	//Prevent Default Mouse events, track mouse state
	$(document).on((isMobile?"touchstart":"mousedown")+".global", function(e) {
		if($(e.target).is("canvas")) e.preventDefault();
		if(e.type==="touchstart") G.key.mouseLeft = true;
		else if(e.which===1) G.key.mouseLeft = true;
		else if(e.which===2) G.key.mouseMiddle = true;
		else if(e.which===3) G.key.mouseRight = true;
	});
	$(document).on((isMobile?"touchend":"mouseup")+".global", function(e) {
		if(e.type==="touchend") G.key.mouseLeft = false;
		else if(e.which===1) G.key.mouseLeft = false;
		else if(e.which===2) G.key.mouseMiddle = false;
		else if(e.which===3) G.key.mouseRight = false;
	});
	
	//Track key states
	$(document).on("keydown", function(key) {
		var keyID = parseInt(key.which,10);
		if(keyID===16) G.key.shift = true;
		else if(keyID===17) G.key.ctrl = true;
		else if(keyID===18) G.key.alt = true;
		else if(keyID===32) G.key.space = true;
		else if(keyID===38) G.key.up = true;
		else if(keyID===37) G.key.left = true;
		else if(keyID===40) G.key.down = true;
		else if(keyID===39) G.key.right = true;
		for(var i=0; i<G.instances.length; i++) {
			G.instances[i].events.keydown(keyID);
		}
	});
	$(document).on("keyup", function(key) {
		var keyID = parseInt(key.which, 10);
		if(keyID===16) G.key.shift = false;
		else if(keyID===17) G.key.ctrl = false;
		else if(keyID===18) G.key.alt = false;
		else if(keyID===32) G.key.space = false;
		else if(keyID===38) G.key.up = false;
		else if(keyID===37) G.key.left = false;
		else if(keyID===40) G.key.down = false;
		else if(keyID===39) G.key.right = false;
		for(var i=0; i<G.instances.length; i++) {
			G.instances[i].events.keyup(keyID);
		}
	});
});