$(document).ready(function() {
	var imageSources = {
		grass:"textures/grass.png",
		wood:"textures/wood.png",
		box:"textures/box.png",
		ball:"textures/ball.png",
		player_left:"textures/player-left.png",
		player_right:"textures/player-right.png",
		player_left_walk:"textures/player-left-walk.png",
		player_right_walk:"textures/player-right-walk.png",
		player_left_walk2:"textures/player-left-walk2.png",
		player_right_walk2:"textures/player-right-walk2.png",
	};
	
	var audioSources = {
		
	};
	
	g = new GAME("canvas", -1, 768, 100, imageSources, audioSources, MAIN);
	
	g.setBackground("textures/background.png", true, false, 8);
	
	var box;
	var ball;
	var player;
	var playerDir = "right";
	var playerStep = 0;
	var stepDistance = 0;
	var stepCycle = 0;
	var grabbedObj = false;
	var lastMouseX = 0;
	var lastMouseY = 0;
	
	function MAIN() {
		g.updateCanvasSize(g.width, 768, false);
		var playerShape = new ShapeRect(98, 170, g.texture.player_right);
		var boxShape = new ShapeRect(96, 96, g.texture.box);
		var ballShape = new ShapeCircle(50, g.texture.ball);
		var grassShape = new ShapeRect(268, 64, g.texture.grass);
		var platformShape = new ShapeRect(250, 50, g.texture.wood);
		var invisWallShape = new ShapeRect(100, 20000, rgba(0,0,0,0));
		
		//player
		player = g.createObj(new Entity(playerShape, true, true, true, 80, 0, 0.2, 10, 16), "player", 150, g.height-200, 0);
		
		//geometry
		var grass = new Geometry(grassShape, true, true);
		var platform = new Geometry(platformShape, true, true);
		var invisWall = new Geometry(invisWallShape, true, false);
		g.createObj(invisWall, "invisWall", -50, g.height, 0);
		g.createObj(invisWall, "invisWall2", g.width+50, g.height, 0);
		
		for(var i=0; i<8; i++) {
			g.createObj(grass, "grass"+i, 134+268*i, g.height-32, 0);
		}
		
		g.createObj(platform, "platform1", 400, 450, 0);
		g.createObj(platform, "platform2", -60, 600, 0);
		g.createObj(platform, "platform3", 950, 450, 0);
		g.createObj(platform, "platform4", 1100, 220, 0);
		
		//entities
		var ball = new Entity(ballShape, true, true, true, 20, 0.8, 0.2, 0.5);
		var box = new Entity(boxShape, true, true, true, 40, 0.1, 0.3, 5);
		g.createObj(ball, "ball1", 400, g.height-200, 1);
		g.createObj(ball, "ball2", 1100, 120, 1);
		g.createObj(box, "box1", 600, g.height-200, 1);
		g.createObj(box, "box2", 1000, 350, 1);
		
		
		g.attachEvent("mousedown", grab);
		g.attachEvent("mouseup", drop);
		g.attachEvent("tick", customTick);
		g.start();
	}
	
	function pause() {
		if(g.paused) g.start();
		else g.stop();
	}
	
	function grab(button) {
		if(button!=="left") return;
		var obj = g.getObjectAtPos(g.mouseX, g.mouseY, true, false, true);
		if(obj!==false && obj.name!=="player") {
			obj.physics = false;
			grabbedObj = obj;
		}
	}
	
	function drop(button) {
		if(button!=="left" || grabbedObj===false) return;
		grabbedObj.physics = true;
		grabbedObj = false;
	}
	
	function customTick() {
		if(G.keyActive(G.key.right)) player.force.x = 6000;
		else if(G.keyActive(G.key.left)) player.force.x = -6000;
		if(G.keyActive(G.key.up) && (g.getObjectAtPos(player.x-player.width, player.y+player.height+1, true, true, true)!==false || g.getObjectAtPos(player.x+player.width, player.y+player.height+1, true, true, true)!==false)) player.motion.y = -800;
		
		player.motion.x=Math.min(player.motion.x, 400);
		player.motion.x=Math.max(player.motion.x, -400);
		
		stepDistance+=Math.abs(player.x-player.lastPos.x);
		
		if(player.motion.x<-5) playerDir = "left";
		else if(player.motion.x>5) playerDir = "right";
		else {
			playerStep = 0;
			stepDistance = 0;
			stepCycle = 0;
		}
		
		if(stepDistance>50) {
			stepDistance=0;
			stepCycle++;
			if(stepCycle>3) stepCycle = 0;
			if(stepCycle===1) playerStep = 1;
			else if(stepCycle===3) playerStep = 2;
			else playerStep = 0;
		}
		
		player.style.texture = g.texture["player_"+(playerDir==="right"?"right":"left")+(playerStep>0?("_walk"+(playerStep===2?"2":"")):"")];
		
		if(grabbedObj!==false) {
			grabbedObj.x = g.mouseX;
			grabbedObj.y = g.mouseY;
			grabbedObj.motion.x=(g.mouseX-lastMouseX)/g.tickTime;
			grabbedObj.motion.y=(g.mouseY-lastMouseY)/g.tickTime;
		}
		lastMouseX = g.mouseX;
		lastMouseY = g.mouseY;
	}
});