$(document).ready(function() {
	var imageSources = {
		
	};
	
	var audioSources = {
		
	};
	
	g = new GAME("canvas", -1, -1, 60, imageSources, audioSources, MAIN);
	
	g.setBackground(rgb(255, 220, 120));
	
	var floor;
	var floorCount;
	
	var speed = 200;
	
	function MAIN() {
		var playerShape = new ShapeRect(50, 50, rgb(0, 0, 220), 10, rgb(0, 150, 120));
		var floorShape = new ShapeRect(500, 50, rgb(120, 0, 120));
		
		//player
		g.createObj(new Entity(playerShape, true, true, true, 10, 0, 0, 0), "player", 100, 100, 0).gravity = 25;
		
		//floor
		floor = new Geometry(floorShape, true, true);
		g.createObj(floor, "floor"+g.tickCount+1, 250, g.height-25, 0);
		g.createObj(floor, "floor"+g.tickCount+2, 750, g.height-75, 0);
		
		g.start();
		g.attachEvent("mousedown", pause);
		g.attachEvent("tick", customTick);
		g.attachEvent("collision", collisionCheck);
	}
	
	function pause() {
		if(g.paused) g.start();
		else g.stop();
	}
	
	function customTick() {
		g.entity.player.motion.x=speed;
		g.centerCanvasTo(g.entity.player.x+g.midX-100, g.midY, false, false);
		speed+=g.tickTime*10;
		
		if(g.entity.player.y>g.height) {
			setTimeout(die, 0);
			return;
		}
		
		if(G.keyActive(G.key.up) && g.entity.player.surface) g.entity.player.motion.y = -600;
		/*
		for(name in g.geometry) {
			var asteroid = g.geometry[name];
			if(asteroid.y>levelY+g.midY+200) {
				g.deleteObj(asteroid);
				asteroidCount--;
			}
		}
		
		if(asteroidCount<maxAsteroids) {
			g.createObj(Math.randomBool()?smallAsteroid:bigAsteroid, "asteroid"+g.tickCount, Math.randomRange(0, g.width), levelY-g.midY-Math.randomRange(0, g.height*2)-200, 0);
			asteroidCount++;
		}*/

	}
	
	function die() {
		speed = 200;
		g.entity.player.x=100;
		g.entity.player.y=100;
		/*for(name in g.geometry) {
			var asteroid = g.geometry[name];
			g.deleteObj(asteroid);
			asteroidCount--;
		}*/
	}
	
	function collisionCheck(result) {
		console.log(result.side);
		if(result.side==="left") setTimeout(die, 0);
	}
});