$(document).ready(function() {
	var imageSources = {
		rocket:"textures/rocket.png",
		asteroid:"textures/asteroid.png"
	};
	
	var audioSources = {
		shot:"sounds/shot.mp3",
		explosion:"sounds/explosion.mp3"
	};
	
	g = new GAME("canvas", -1, -1, 100, imageSources, audioSources, MAIN);
	
	g.setBackground("textures/background.jpg", true, false, 12);
	
	var smallAsteroid;
	var bigAsteroid;
	var projectile;
	var asteroidCount = 0;
	var maxAsteroids = 15;
	var lastProj = new Timestamp();
	
	var levelY;
	var speed = 200;
	var shootingSpeed = 0.4;
	
	function MAIN() {
		var rocketShape = new ShapeRect(83, 150, g.texture.rocket);
		var sAsteroid = new ShapeCircle(40, g.texture.asteroid);
		var bAsteroid = new ShapeCircle(100, g.texture.asteroid);
		var projShape = new ShapeCircle(3, rgb(255, 200, 0));
		
		//player
		g.createObj(new Entity(rocketShape, true, true, true, 10, 1, 2, 0, 0), "rocket", g.midX, g.height-200, 0);
		
		//asteroids
		smallAsteroid = new Geometry(sAsteroid, true, true);
		bigAsteroid = new Geometry(bAsteroid, true, true);
		projectile = new Entity(projShape, true, true, true, 1, 0, 0, 0, 0);
		
		levelY = g.midY;
		
		g.attachEvent("mousedown", pause);
		g.attachEvent("beforeTick", customTick);
		g.attachEvent("collision", collision);
		g.start();
	}
	
	function pause() {
		if(g.paused) g.start();
		else g.stop();
	}
	
	function customTick() {
		var adjust = speed*g.tickTime;
		levelY-=adjust;
		g.entity.rocket.y-=adjust;
		g.entity.rocket.lastPos.y-=adjust;
		g.centerCanvasTo(g.midX, levelY, false, false);
		speed+=g.tickTime*10;
		
		if(g.entity.rocket.x<40 || g.entity.rocket.x>g.width-40 || g.entity.rocket.y<levelY-g.midY+70 || g.entity.rocket.y>levelY+g.midY-40) {
			setTimeout(die, 0);
			return;
		}
		
		if(G.keyActive(G.key.left)) g.entity.rocket.force.x = -1000;
		else if(G.keyActive(G.key.right)) g.entity.rocket.force.x = 1000;
		if(G.keyActive(G.key.up)) g.entity.rocket.force.y = -1300;
		else if(G.keyActive(G.key.down)) g.entity.rocket.force.y = 1200;
		
		if(G.keyActive(G.key.space) && lastProj.since() > shootingSpeed) {
			lastProj = new Timestamp();
			g.audio.shot.currentTime = 0;
			g.audio.shot.play();
			g.createObj(projectile, "projectile"+g.tickCount, g.entity.rocket.x, g.entity.rocket.y-g.entity.rocket.height-5, -1).motion.y = -speed-500;
		}
		
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
		}
		
		for(name in g.entity) {
			if(name!=="rocket") {
				var proj = g.entity[name];
				if(proj.y<levelY-g.midY-10) g.deleteObj(proj);
			}
		}
	}
	
	function collision(result) {
		if(result.objA instanceof Entity && result.objB instanceof Entity) return;
		if(result.objA.name==="rocket" || result.objB.name==="rocket") {
			setTimeout(die, 0);
			return;
		}
		breakAsteroid(result.objA, result.objB);
	}
	
	function die() {
		speed = 200;
		levelY = g.midY;
		g.entity.rocket.x=g.midX;
		g.entity.rocket.y=g.height-200;
		g.entity.rocket.motion.x=0;
		g.entity.rocket.motion.y=0;
		for(name in g.geometry) {
			var asteroid = g.geometry[name];
			g.deleteObj(asteroid);
			asteroidCount--;
		}
		for(name in g.entity) {
			if(name!=="rocket") {
				var proj = g.entity[name];
				g.deleteObj(proj);
			}
		}
	}
	
	function breakAsteroid(A, B) {
		if(A instanceof Entity) {
			var proj = A;
			var asteroid = B;
		}
		else {
			var proj = B;
			var asteroid = A;
		}
		//proj.solid = false;
		//proj.visible = false;
		g.deleteObj(proj);
		if(asteroid.r===bigAsteroid.r) asteroid.r = smallAsteroid.r;
		else {
			//asteroid.solid = false;
			//asteroid.visible = false;
			g.deleteObj(asteroid);
			asteroidCount--;
		}
		g.audio.explosion.currentTime = 0;
		g.audio.explosion.play();
	}
});