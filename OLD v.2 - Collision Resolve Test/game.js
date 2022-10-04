$(document).ready(function() {
	var imageSources = {
		testimg:"assets/img.png",
		metal:"assets/metal.jpg",
		dirt:"assets/dirt.jpg"
	};
	
	var audioSources = {
		
	};
	
	///////
	
	g = new GAME("canvas", -1, -1, 60, imageSources, audioSources, MAIN);
	
	//(name, shape, x, y, layer, physics, solid, tangible, visible, mass, bounce, friction, airResistance, health)
	function MAIN() {
		var bigCircle = new ShapeCircle(150, g.image.metal);
		var smallCircle = new ShapeCircle(40, "rgb(0,0,255)");
		var tinyCircle = new ShapeCircle(5, "rgba(255,0,0,1)");
		var bigRect = new ShapeRect(200, 300, g.image.dirt);//"rgba(0,255,255,1)"
		var smallRect = new ShapeRect(40, 50, "rgba(0,255,0,1)");
		var tinyRect = new ShapeRect(12, 8, "rgba(0,255,0,1)");
		
		g.initObj("box", new Entity(smallCircle, 100, 250, true, true, true, 4, 0.4, 0.5, 0.5, 100, 0));
		g.initObj("floor1", new Geometry(bigRect, 300, 250, true, true, 0));
		g.initObj("floor", new Entity(bigCircle, 450, 180, false, true, true, 1, 0, 0.5, 0.5, 100, -1));
		g.initObj("floor3", new Entity(smallRect, 100, 400, false, true, true, 1, 0, 0.5, 0.5, 100, -1));
		g.initObj("floor4", new Entity(smallRect, 240, 430, false, true, true, 1, 0, 0.5, 0.5, 100, -1));
		g.initObj("floor5", new Entity(tinyCircle, 300, 450, false, true, true, 1, 0, 0.5, 0.5, 100, -1));
		
		g.initObj("box2", new Entity(smallRect, 1200, 250, true, true, true, 1, 0, 0.5, 0.5, 100, 0));
		
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
		console.log(G.intersectRectCircle(g.entity.box.x, g.entity.box.y, g.entity.box.width, g.entity.box.height, g.geometry.circle.x, g.geometry.circle.y, g.geometry.circle.r));
		*/
		if(G.key.left) g.entity.box.force.x = -800;
		else if(G.key.right) g.entity.box.force.x = 800;
		if(G.key.up) g.entity.box.force.y = -2000;
		else if(G.key.down) g.entity.box.force.y = 1000;
		
		if(g.entity.floor.y>550) g.entity.floor.motion.y*=-1;
		if(g.entity.box2.y>550) g.entity.box2.motion.y=-1000;
		if(g.entity.box2.x>g.width || g.entity.box2.x<0) g.entity.box2.motion.x*=-1;
	}
	
});