var s;
$(document).ready(function() {
	var imageSources = {
		
	};
	
	var audioSources = {
		
	};
	
	///////
	
	var g = new GAME("canvas", -1, -1, 60, imageSources, audioSources, MAIN);
	s = g;
	var b;
	
	//(name, shape, x, y, layer, physics, solid, tangible, visible, mass, bounce, friction, airResistance, health)
	function MAIN() {
		var bigCircle = new ShapeCircle(150, "rgba(0,0,255,1)");
		var smallCircle = new ShapeCircle(40, "rgba(255,0,0,1)");
		var tinyCircle = new ShapeCircle(5, "rgba(255,0,0,1)");
		var bigRect = new ShapeRect(200, 300, "rgba(0,255,255,1)");
		var smallRect = new ShapeRect(40, 50, "rgba(0,255,0,1)");
		var tinyRect = new ShapeRect(12, 8, "rgba(0,255,0,1)");
		
		var box = g.createObject("box", smallCircle, 100, 250, 0, true, true, true, true, 0.5, 1, 0.5, 0.5, 100);
		var floor = g.createObject("floor", bigRect, 300, 250, -1, true, true, true, true, 0, 1, 0.5, 0.5, 100);
		g.createObject("floor2", bigCircle, 450, 180, -1, true, true, true, true, 0, 1, 0.5, 0.5, 100);
		g.createObject("floor3", smallRect, 100, 400, -1, true, true, true, true, 0, 1, 0.5, 0.5, 100);
		g.createObject("floor4", smallRect, 240, 430, -1, true, true, true, true, 0, 1, 0.5, 0.5, 100);
		g.createObject("floor5", tinyCircle, 300, 450, -1, true, true, true, true, 0, 1, 0.5, 0.5, 100);
		
		g.start();
		g.attachEvent("mousedown", pause);
		g.attachEvent("tick", customTick);
	}
	
	function pause() {
		if(g.paused) g.start();
		else g.stop();
	}
	
	function customTick() {
		/*g.geometry.circle.x = g.mouseX;
		g.geometry.circle.y = g.mouseY;
		console.log(G.intersectRectCircle(g.object.box.x, g.object.box.y, g.object.box.width, g.object.box.height, g.geometry.circle.x, g.geometry.circle.y, g.geometry.circle.r));
		*/
		if(G.key.left) g.object.box.motion.x-=400*g.tickTime;
		else if(G.key.right) g.object.box.motion.x+=400*g.tickTime;
		if(G.key.up) g.object.box.motion.y-=1000*g.tickTime;
		else if(G.key.down) g.object.box.motion.y+=500*g.tickTime;
		
		if(g.object.floor.y>550) g.object.floor.motion.y=-500;
	}
	
});