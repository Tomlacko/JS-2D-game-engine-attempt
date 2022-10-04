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
	this.gravity = 980;//(pixels/second^2)
	
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
	
	this.shapes = {};
	this.geometry = {};
	this.object = {};
	this.gui = {};
	this.area = {};
	this.numGeometry = 0;
	this.numObjects = 0;
	this.numGui = 0;
	this.numAreas = 0;
	this.geomLayers = [[],[],[]];
	this.objLayers = [[],[],[],[],[]];
	
	this.images = {};
	this.audio = {};
	if(imageSources==undefined) imageSources = {};
	if(audioSources==undefined) audioSources = {};
	G.loadAssets(imageSources, audioSources, callback, this.images, this.audio);
	
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
	if(outline && (width<0 || height<0)) throw "Graphics - Outline is bigger than object";
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
	if(outline && r<0) throw "Graphics - Outline is bigger than object";
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
	if(obj.shape==="rect") {
		if(!obj.visible || obj.x+obj.width<-this.canvasX || obj.y+obj.height<-this.canvasY || obj.x-obj.width>-this.canvasX+this.width/this.zoom || obj.y-obj.height>-this.canvasY+this.height/this.zoom) return;
		this.drawRect(obj.x, obj.y, obj.width, obj.height, obj.style.texture, obj.style.outlineWidth, obj.style.outlineTexture);
	}
	else if(obj.shape==="circle") {
		if(!obj.visible || obj.x+obj.r<-this.canvasX || obj.y+obj.r<-this.canvasY || obj.x-obj.r>-this.canvasX+this.width/this.zoom || obj.y-obj.r>-this.canvasY+this.height/this.zoom) return;
		this.drawCircle(obj.x, obj.y, obj.r, obj.style.texture, obj.style.outlineWidth, obj.style.outlineTexture);
	}
	else throw "Graphics - Cannot draw unknown shape";
};

//save shape as template to use for other objects
GAME.prototype.saveShape = function(name, shape) {
	if(this.shapes.name) throw "Shape name already exists!";
	this.shapes[name] = JSON.parse(JSON.stringify(shape));
};

//create new static geometry object (wall/floor...) (layer = -1 to 1)
GAME.prototype.createGeometry = function(name, shape, x, y, visible, layer) {
	if(this.geometry.name) throw "Geometry name already exists!";
	if(layer<-1 || layer>1) throw "Invalid layer!";
	var newShape = JSON.parse(JSON.stringify(shape));
	newShape.layer = layer;
	newShape.type = "geometry";
	newShape.name = name;
	newShape.x = x;
	newShape.y = y;
	newShape.visible = visible;
	this.geometry[name] = newShape;
	this.numGeometry++;
	this.geomLayers[layer+1].push(name);
	return this.geometry[name];
};

//create new dynamic object (player, entity, box...) (layer = -2 to 2)
GAME.prototype.createObject = function(name, shape, x, y, layer, physics, solid, tangible, visible, mass, bounce, friction, airResistance, health) {
	if(this.object.name) throw "Object name already exists!";
	if(layer<-2 || layer>2) throw "Invalid layer!";
	var newShape = JSON.parse(JSON.stringify(shape));
	newShape.layer = layer;
	newShape.type = "object";
	newShape.name = name;
	newShape.x = x;
	newShape.y = y;
	newShape.motion = new Vector(0, 0);
	newShape.move = new Vector(0, 0);
	newShape.lastPos = {x:x, y:y};
	newShape.physics = physics;
	newShape.solid = solid;
	newShape.tangible = tangible;
	newShape.visible = visible;
	newShape.mass = mass;
	newShape.bounce = bounce;
	newShape.friction = friction;
	newShape.airResistance = airResistance;
	newShape.health = health;
	newShape.onGround = false;
	this.object[name] = newShape;
	this.numObjects++;
	this.objLayers[layer+2].push(name);
	return this.object[name];
};

//create new GUI object
GAME.prototype.createGuiObject = function(name, shape, x, y) {
	if(this.gui.name) throw "Gui object name already exists!";
	var newShape = JSON.parse(JSON.stringify(shape));
	newShape.type = "gui";
	newShape.name = name;
	newShape.x = x;
	newShape.y = y;
	this.gui[name] = newShape;
	this.numGui++;
	return this.gui[name];
};

//create new area object
GAME.prototype.createArea = function(name, shape, x, y) {
	if(this.area.name) throw "Area name already exists!";
	var newShape = JSON.parse(JSON.stringify(shape));
	newShape.type = "area";
	newShape.name = name;
	newShape.x = x;
	newShape.y = y;
	delete newShape.style;
	this.area[name] = newShape;
	this.numAreas++;
	return this.area[name];
};

//delete object (type = "geometry"/"object"/"gui"/"area")
GAME.prototype.deleteObject = function(type, name) {
	if(type==="geometry") {
		if(this.geometry[name]) {
			var layer = this.geometry[name].layer;
			this.geomLayers[layer].splice(this.geomLayers[layer].indexOf(name), 1);
			delete this.geometry[name];
			this.numGeometry--;
		}
		else throw "Given name doesn't belong to any geometry";
	}
	else if(type==="object") {
		if(this.object[name]) {
			var layer = this.object[name].layer;
			this.objLayers[layer].splice(this.objLayers[layer].indexOf(name), 1);
			delete this.object[name];
			this.numObjects--;
		}
		else throw "Given name doesn't belong to any object";
	}
	else if(type==="gui") {
		if(this.gui[name]) {
			delete this.gui[name];
			this.numGui--;
		}
		else throw "Given name doesn't belong to any GUI object";
	}
	else if(type==="area") {
		if(this.area[name]) {
			delete this.area[name];
			this.numAreas--;
		}
		else throw "Given name doesn't belong to any area";
	}
	else throw "Unknown object type";
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
	if(useNew) {
		var Ax = objA.x;
		var Ay = objA.y;
		var Bx = objB.x;
		var By = objB.y;
	}
	else {
		var Ax = objA.lastPos.x;
		var Ay = objA.lastPos.y;
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
	if(relMove.x===0 && relMove.y===0) return false; //if object are not moving relative to each other, collision cannot occur
	
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
		if(relMove.x===0 && relMove.y===0) return false; //if object are not moving relative to each other, collision cannot occur
		
		//find relative intersection point
		var result = G.intersectLineRoundrect(Bx, By, Bx+relMove.x, By+relMove.y, Ax, Ay, objB.width, objB.height, objA.r);
		if(result===false) return false; //if no intersection is found
		
		//create vector from B to relative result
		var relResultVector = new Vector(Bx, By, result.x, result.y);
		
		//find at which point in time objects collide (0-1)
		if(relMove.x===0) result.t = relResultVector.y/relMove.y;
		else result.t = relResultVector.x/relMove.x;
		
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
GAME.prototype.resolveCollision - function(result) {
	console.log(result.side);
};

//GAME TICK LOOP
GAME.prototype.tick = function() {
	this.tickTime = this.lastTick.timePassed();
	this.lastTick = new Timestamp();
	
	//calculate motion and new position
	for(var name in this.object) {
		var obj = this.object[name];
		if(!obj.physics) {
			obj.motion.x = 0;
			obj.motion.y = 0;
			continue;
		}
		if(obj.motion.x<1 && obj.motion.x>-1) obj.motion.x = 0;
		else if(obj.onGround) obj.motion.x-=obj.motion.x*obj.friction*this.tickTime;
		else obj.motion.x-=obj.motion.x*obj.airResistance*this.tickTime;
		obj.motion.y+=this.gravity*this.tickTime*obj.mass
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
	for(var name in this.object) {
		objIndex++;
		if(objIndex>=this.numObjects) break;
		var obj = this.object[name];
		if(obj.layer < -1 || obj.layer > 1) continue;
		for(var geom in this.geometry) {
			var obj2 = this.geometry[geom];
			if(obj2.layer!==0) continue;
			if(this.collisionCheck(obj, obj2, true)) {
				var result = this.collisionPoint(obj, obj.move.x, obj.move.y, obj2, 0, 0);
				if(result!==false) {
					result.obj = obj;
					result.obj2 = obj2;
					collisionList.push(result);
				}
			}
		}
		var index = 0;
		for(var dyn in this.object) {
			index++;
			if(index<=objIndex) continue;
			var obj2 = this.object[dyn];
			if(obj2.layer < -1 || obj2.layer > 1) continue;
			if(this.collisionCheck(obj, obj2, true)) {
				var result = this.collisionPoint(obj, obj.move.x, obj.move.y, obj2, obj2.move.x, obj2.move.y);
				if(result!==false) {
					result.obj = obj;
					result.obj2 = obj2;
					collisionList.push(result);
					obj.motion.x = 0;
					obj.motion.y = 0;
					obj.x = result.Ax;
					obj.y = result.Ay;
					obj2.motion.x = 0;
					obj2.motion.y = 0;
					obj2.x = result.Bx;
					obj2.y = result.By;
				}
			}
		}
	}
	
	//sort collisions by time in ascending order
	collisionList.sort(function(a, b) {
		return a.t - b.t;
	});
	
	//resolve
	for(var i=0; i<collisionList.lenght; i++) {
		//this.resolveCollision(collisionList[i]);
	}
	
	this.events.tick();
	this.tickCounter++;
	this.render();
	if(collisionList.length>0) this.drawCircle(collisionList[0].x, collisionList[0].y, 2, "rgba(0,0,0,1)");
	clearTimeout(this.loopID);
	this.loopID = setTimeout(this.tick.bind(this), this.tickSpeed);
};

//RENDERING
GAME.prototype.render = function() {
	this.clearCanvas();
	for(var i=0; i<this.geomLayers[0].length; i++) {
		this.drawShape.bind(this)(this.geometry[this.geomLayers[0][i]]);
	}
	for(var i=0; i<this.objLayers[0].length; i++) {
		this.drawShape.bind(this)(this.object[this.objLayers[0][i]]);
	}
	for(var i=0; i<this.geomLayers[1].length; i++) {
		this.drawShape.bind(this)(this.geometry[this.geomLayers[1][i]]);
	}
	for(var i=0; i<this.objLayers[1].length; i++) {
		this.drawShape.bind(this)(this.object[this.objLayers[1][i]]);
	}
	for(var i=0; i<this.objLayers[2].length; i++) {
		this.drawShape.bind(this)(this.object[this.objLayers[2][i]]);
	}
	for(var i=0; i<this.objLayers[3].length; i++) {
		this.drawShape.bind(this)(this.object[this.objLayers[3][i]]);
	}
	for(var i=0; i<this.geomLayers[2].length; i++) {
		this.drawShape.bind(this)(this.geometry[this.geomLayers[2][i]]);
	}
	for(var i=0; i<this.objLayers[4].length; i++) {
		this.drawShape.bind(this)(this.object[this.objLayers[4][i]]);
	}
	/*
	for(var i=0; i<this.geomLayers[3].length; i++) {
		this.drawShape.bind(this)(this.geometry[this.geomLayers[3][i]]);
	}*///GUI
};


//---OBJECT CONSTRUCTOR---//

//create new simple shape
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
			this.x = Math.cos(angle).fixedTo(10);
			this.y = Math.sin(angle).fixedTo(10);
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

//Normalize vector (set length -> 1)
Vector.prototype.normalize = function() {
	var length = this.length();
	if(length!==1) {
		this.x/=length;
		this.y/=length;
	}
	return this;
};

//Reverse vector (opposite direction)
Vector.prototype.reverse = function() {
	this.x=-this.x;
	this.y=-this.y;
	return this;
};

//Perpendicular vector (rotate 90 degrees) (dir = true/false - clockwise/anti-cw)
Vector.prototype.perpendicular = function(dir) {
	var a = this.x;
	if(dir===true) {
		this.x = -this.y;
		this.y = a;
	}
	else {
		this.x = this.y;
		this.y = -a;
	}
	return this;
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

//Multiply vector by value(s)
Vector.prototype.multiply = function(a, b) {
	if(typeof a==="number") {
		if(typeof b==="number") {
			this.x*=a;
			this.y*=b;
		}
		else {
			this.x*=a;
			this.y*=a;
		}
		return this;
	}
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

//Multiply two vectors - DOT Product (not a vector)
Vector.prototype.dot = function(v) {
	if(typeof v!=="object" || typeof v.x!=="number" || typeof v.y!=="number") throw "Invalid vector";
	else return this.x*v.x+this.y*v.y;
};

//Get vector angle --OR-- get angle between two vectors
Vector.prototype.angle = function(v) {
	if(typeof v==="object" && typeof v.x==="number" && typeof v.y==="number") {
		var a = Math.acos(this.x/this.length()).toDeg();
		var b = Math.acos(v.x/G.getDistance(0, 0, v.x, v.y)).toDeg();
		var angle = b-a;
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
	this.x = r*Math.cos(angle).fixedTo(10);
	this.y = r*Math.sin(angle).fixedTo(10);
	return this;
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
	return ((this.valueOf()/(Math.PI/180))%360).fixedTo(10);
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
	
	//LOAD ASSETS 1 - preload images
	loadAssets:function(imgSources, audioSources, callback, imgRef, audioRef) {
		var loadedImages = 0;
		var numImages = 0;
		for(var src in imgSources) {
			numImages++;
		}
		if(numImages===0) {
			G.preloadAudio(audioSources, callback, audioRef);
			return;
		}
		for(var src in imgSources) {
			imgRef[src] = new Image();
			imgRef[src].onload = function() {
				if(++loadedImages>=numImages) G.preloadAudio(audioSources, callback, audioRef);
			};
			imgRef[src].onerror = imgRef[src].onabort = function() {
				//console.log("Image failed to load: \""+this.src+"\"");
				if(++loadedImages>=numImages) G.preloadAudio(audioSources, callback, audioRef);
			};
			imgRef[src].src = imgSources[src];
		}
	},
	
	//LOAD ASSETS 2 - preload audio
	preloadAudio:function(audioSources, callback, audioRef) {
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
			audioRef[src] = new Audio();
			audioRef[src].oncanplaythrough = function() {
				if(++loadedAudio>=audioCount) setTimeout(callback, 0);
			};
			gaudioRef[src].onerror = audioRef[src].onabort = function() {
				//console.log("Audio failed to load: \""+this.src+"\"");
				if(++loadedAudio>=audioCount) setTimeout(callback, 0);
			};
			audioRef[src].src = audioSources[src];
		}
	},
	
	//missing texture image object in base64
	missingTexture:function() {
		var img = new Image();
		img.src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTM0A1t6AAAAmElEQVRIS7XNoRHAMADDwOw/Y3dpiZCIHFCf6J/Pe56rzu3kM9g++Qy2Tz6D7ZPPYPvkM9g++Qy2Tz6D7ZPPYPvkM9g++Qy2Tz6D7ZPPYPvkM9g++Qy2Tz6D/Tf9ZbB98hlsn3wG2yefwfbJZ7B98hlsn3wG2yefwfbJZ7B98hlsn3wG2yefwfbJZ7B98hlsn3wG2ycfnecDA6+2Ll+pG1sAAAAASUVORK5CYII=";
		return img;
	}(),
	
	//////////////////////////////////////////////
	
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
		mouseL:false,
		mouseR:false,
		mouseM:false
	},
	
	//get font style
	getFontStyle:function(size, bold, italic, font) {
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
	
	//CREATE TEXTURE FROM IMAGE
	createTexture:function(img) {
		try {
			var pattern = this.ctx.createPattern(img, "repeat");
			return pattern;
		}
		catch(e) {
			console.log("Invalid image! \""+img.src+"\"");
			return this.ctx.createPattern(G.missingTexture, "repeat");
			//return "rgba(0, 0, 0, 1)";
		}
	},
	
	//Get RGB color format - (255, 255, 255)
	rgb:function(r, g, b) {
		return "rgba("+r+", "+g+", "+b+", 1)";
	},
	
	//Get RGBA color format (transparency) - (255, 255, 255, 255)
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
	random:function() {
		return Math.random()>=0.5;
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
		return x*x+y*y;
	},
	
	//GET ANGLE BETWEEN TWO POINTS / VECTOR (degrees)
	getAngle:function(centerX, centerY, pointX, pointY) {
		var r = G.getDistance(centerX, centerY, pointX, pointY);
		return Math.acos((pointX-centerX)/r).toDeg();
	},
	
	//GET POINT FROM ANGLE AND DISTANCE (degrees)
	getPointFromAngle:function(centerX, centerY, angle, dist) {
		angle = angle.toRad();
		var x = (dist*Math.cos(angle)+centerX).fixedTo(10);
		var y = (dist*Math.sin(angle)+centerY).fixedTo(10);
		return {x:x, y:y};
	},
	
	//MOVE POINT AROUND CENTER BY ANGLE (degrees)
	rotatePointAddAngle:function(centerX, centerY, pointX, pointY, angle) {
		var r = G.getDistance(centerX, centerY, pointX, pointY);
		var oldAngle = Math.acos((pointX-centerX)/r);
		angle = oldAngle+angle.toRad();
		var x = (r*Math.cos(angle)+centerX).fixedTo(10);
		var y = (r*Math.sin(angle)+centerY).fixedTo(10);
		return {x:x, y:y};
	},
	
	//GET VECTOR FROM TWO POINTS
	getVector:function(x1, y1, x2, y2) {
		return {x:x2-x1, y:y2-y1};
	},
	
	//GET UNIT VECTOR FROM TWO POINTS (LENGTH = 1)
	getUnitVector:function(x1, y1, x2, y2) {
		var length = G.getDistance(x1, y1, x2, y2);
		return {x:(x2-x1)/length, y:(y2-y1)/length};
	},
	
	//GET VECTOR FROM ANGLE (degrees)
	getVectorFromAngle:function(angle) {
		angle = angle.toRad();
		var x = Math.cos(angle).fixedTo(10);
		var y = Math.sin(angle).fixedTo(10);
		return {x:x, y:y};
	},
	
	///////////////////////////////////////
	
	//LINE-LINE intersection point
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
	
	//LINE-CIRCLE intersection point
	intersectLineCircle:function(x1, y1, x2, y2, cx, cy, r, side) {
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
		
		//distance of closest point to circle center
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
		
		if(result!==false && side!=undefined) result.side = side;
		return result;
	},
	
	//LINE-RECTANGLE intersection point
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
	
	//LINE-ROUNDRECT intersection point
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
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry1, r, "corner");//tl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry1, r, "corner");//tr
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry2, r, "corner");//bl
			}
			else if(y1>ry2) {//bottom
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry2+r, rx2, ry2+r, "bottom");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx1-r, ry1, rx1-r, ry2, "left");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry2, r, "corner");//bl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry1, r, "corner");//tl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry2, r, "corner");//br
			}//mid
			else {
				result = G.intersectLineLine(x1, y1, x2, y2, rx1-r, ry1, rx1-r, ry2, "left");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry1, r, "corner");//tl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry2, r, "corner");//bl
			}
		}
		else if(x1>rx2) {//right
			if(y1<ry1) {//top
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1-r, rx2, ry1-r, "top");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx2+r, ry1, rx2+r, ry2, "right");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry1, r, "corner");//tr
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry2, r, "corner");//br
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry1, r, "corner");//tl
			}
			else if(y1>ry2) {//bottom
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry2+r, rx2, ry2+r, "bottom");
				if(result===false) result = G.intersectLineLine(x1, y1, x2, y2, rx2+r, ry1, rx2+r, ry2, "right");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry2, r, "corner");//br
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry1, r, "corner");//tr
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry2, r, "corner");//bl
			}//mid
			else {
				result = G.intersectLineLine(x1, y1, x2, y2, rx2+r, ry1, rx2+r, ry2, "right");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry1, r, "corner");//tr
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry2, r, "corner");//br
			}
		}
		else {//mid
			if(y1<ry1) {//top
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry1-r, rx2, ry1-r, "top");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry1, r, "corner");//tl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry1, r, "corner");//tr
			}//bottom
			else if(y1>ry2) {
				result = G.intersectLineLine(x1, y1, x2, y2, rx1, ry2+r, rx2, ry2+r, "bottom");
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx1, ry2, r, "corner");//bl
				if(result===false) result = G.intersectLineCircle(x1, y1, x2, y2, rx2, ry2, r, "corner");//br
			}
			//else result = false;//inside middle
		}
		return result;
	},
	
	//CIRCLE-CIRCLE collision
	intersectCircleCircle:function(x1, y1, r1, x2, y2, r2) {
		if(G.getDistance(x1, y1, x2, y2) > r1+r2) return false;
		else return true;
	},
	
	//RECT-RECT collision
	intersectRectRect:function(x1, y1, w1, h1, x2, y2, w2, h2) {
		if(x1>x2-w2-w1 && x1<x2+w2+w1 && y1>y2-h2-h1 && y1<y2+h2+h1) return true;
		else return false;
	},
	
	//RECT-CIRCLE collision
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
		if(e.type==="touchstart") G.key.mouseL = true;
		else if(e.which===1) G.key.mouseL = true;
		else if(e.which===2) G.key.mouseM = true;
		else if(e.which===3) G.key.mouseR = true;
	});
	$(document).on((isMobile?"touchend":"mouseup")+".global", function(e) {
		if(e.type==="touchend") G.key.mouseL = false;
		else if(e.which===1) G.key.mouseL = false;
		else if(e.which===2) G.key.mouseM = false;
		else if(e.which===3) G.key.mouseR = false;
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