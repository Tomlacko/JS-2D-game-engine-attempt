$(document).ready(function() {
	var imageSources = {
		metal:"textures/metal.jpg",
		dirt:"textures/dirt.jpg",
		concrete:"textures/concrete2.jpg"
	};
	
	var audioSources = {
		
	};
	
	g = new GAME("canvas", -1, -1, 60, imageSources, audioSources, MAIN);
	
	g.setBackground(imageSources.concrete, true, false, 2);
	var spawnedBox;
	
	function MAIN() {
		var bigCircle = new ShapeCircle(150, g.texture.metal);
		var smallCircle = new ShapeCircle(40, "rgb(0,0,255)");
		var tinyCircle = new ShapeCircle(5, "rgba(255,255,255,1)", 0.5, "rgba(0, 0, 0, 1)");
		//var tinyCircle = new ShapeCircle(5, "rgba(0,220,255,1)");
		var bigRect = new ShapeRect(200, 300, g.texture.dirt);
		var smallRect = new ShapeRect(40, 50, "rgba(255,190,0,1)");
		var tinyRect = new ShapeRect(12, 8, "rgba(0,255,0,1)");
		
		//player
		g.createObj(new Entity(smallCircle, true, true, true, 6, 0.3, 0.5, 2), "box", 100, 300, 0);
		
		var miniball = new Entity(tinyCircle, true, true, true, 0.1, 0.4, 0.5, 0.5);
		for(var x = 0; x<65; x++) for(var y = 0; y<3; y++) g.createObj(miniball, "miniball"+(x+y*65), 10+x*20+y*10, 5+y*20, 0);
		g.createObj(new Geometry(bigRect, true, true), "floor1", 300, 300, 0);
		g.createObj(new Geometry(smallCircle, true, true), "floor6", 200, 150, 0);
		g.createObj(new Entity(bigCircle, true, true, false, 1, 0, 0.5, 0.5), "floor", 450, 230, -1);
		g.createObj(new Entity(smallRect, true, true, false, 1, 0, 0.5, 0.5), "floor3", 100, 450, -1);
		g.createObj(new Entity(smallRect, true, true, false, 1, 0, 0.5, 0.5), "floor4", 240, 480, -1);
		g.createObj(new Entity(tinyCircle, true, true, false, 1, 0, 0.5, 0.5), "floor5", 300, 500, -1);
		
		g.createObj(new Entity(bigCircle, true, true, true, 50, 0.1, 1, 4), "box2", 1200, 250, 0);
		
		spawnedBox = new Entity(new ShapeRect(40, 50, "rgba(0,255,0,1)"), true, true, true, 2, 0.65, 1, 1);
		
		g.start();
		g.attachEvent("mousedown", pause);
		g.attachEvent("tick", customTick);
		g.attachEvent("keydown", keyDown);
		g.attachEvent("collision", collideTest);
	}
	
	function pause() {
		if(g.paused) g.start();
		else g.stop();
	}
	var focus = false;
	
	function customTick() {
		if(focus) g.centerCanvasTo(g.entity.box.x, g.entity.box.y, false, false);
		
		for(var i=0; i<195; i++) {
			if(g.entity["miniball"+i].y>1000) {
				g.entity["miniball"+i].motion.y=100;
				g.entity["miniball"+i].y=-100;
			}
			if(g.entity["miniball"+i].x>g.width || g.entity["miniball"+i].x<0) g.entity["miniball"+i].motion.x*=-1;
		}
		
		if(g.entity.box.y>g.height) g.entity.box.motion.y=-1000;
		//if(g.entity.box.x>g.width || g.entity.box.x<0) g.entity.box.motion.x*=-1;
		
		if(g.entity.box2.y>g.height) g.entity.box2.motion.y=-1000;
		if(g.entity.box2.x>g.width || g.entity.box2.x<0) g.entity.box2.motion.x*=-1;
		
		if(G.keyActive(G.key.left)) g.entity.box.force.x = -800;
		else if(G.keyActive(G.key.right)) g.entity.box.force.x = 800;
		if(G.keyActive(G.key.up)) g.entity.box.force.y = -2000;
		else if(G.keyActive(G.key.down)) g.entity.box.force.y = 1000;
		
		if(G.keyActive(G.key.a)) g.entity.box2.force.x = -800;
		else if(G.keyActive(G.key.d)) g.entity.box2.force.x = 800;
		if(G.keyActive(G.key.w)) g.entity.box2.force.y = -2000;
		else if(G.keyActive(G.key.s)) g.entity.box2.force.y = 1000;
		
		if(G.keyActive(G.key.shift)) g.speed = 0.15;
		else g.speed = 1;
	}
	
	function keyDown(keyID) {
		if(keyID===G.key.ctrl) {
			g.createObj(spawnedBox, "new"+g.tickCount+"_"+Math.randomRange(0,10000), g.mouseX, g.mouseY, 0);
		}
		if(keyID===G.key.space) {
			focus=!focus;
			if(!focus) g.resetCanvas();
		}
	}
	
	function collideTest(collision) {
		//if(collision.objA.name==="box" && collision.objB.name==="box2") alert();
	}
});