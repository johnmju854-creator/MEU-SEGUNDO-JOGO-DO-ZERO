(() => {
	const canvas = document.getElementById("court");
	const ctx = canvas.getContext("2d");
	const ui = {
		score: document.getElementById("score"),
		made: document.getElementById("made-count"),
		target: document.getElementById("target-count"),
		phase: document.getElementById("phase-name"),
		timer: document.getElementById("timer"),
		timerBlock: document.getElementById("timer-block"),
		distance: document.getElementById("distance-label"),
		marker: document.getElementById("aim-marker"),
		shoot: document.getElementById("shoot-button"),
		overlay: document.getElementById("overlay"),
		overlayContent: document.getElementById("overlay-content"),
		toast: document.getElementById("toast"),
		aimHint: document.getElementById("aim-hint"),
		steps: [...document.querySelectorAll(".phase-step")]
	};

	const phases = [
		{ name: "Fase 1", target: 2, seconds: 15, distance: "PERTO", hoopX: 0.75 },
		{ name: "Fase 2", target: 3, seconds: 25, distance: "LONGE", hoopX: 0.84 },
		{ name: "Fase 3 - Final", target: 3, seconds: 35, distance: "ARO MÓVEL", hoopX: 0.84 }
	];
	const state = {
		phase: 0,
		made: 0,
		points: 0,
		remaining: phases[0].seconds,
		active: false,
		shot: null,
		phaseStartedAt: 0,
		lastShotAt: 0,
		toastUntil: 0,
		hoopX: phases[0].hoopX,
		lastTime: 0
	};
	let timerId = null;
	let animationId = null;
	let width = 960;
	let height = 520;
	let pixelRatio = 1;

	function fitCanvas() {
		const rect = canvas.getBoundingClientRect();
		if (!rect.width || !rect.height) return;
		pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		width = 960;
		height = 520;
		canvas.width = width * pixelRatio;
		canvas.height = height * pixelRatio;
		ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	}

	function currentPhase() { return phases[Math.min(state.phase, phases.length - 1)]; }
	function hoopPosition(now) {
		const phase = currentPhase();
		if (state.phase !== 2) return phase.hoopX * width;
		return (0.84 + Math.sin(now / 680) * 0.055) * width;
	}

	function roundedRect(x, y, w, h, radius, fill, stroke) {
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, radius);
		if (fill) { ctx.fillStyle = fill; ctx.fill(); }
		if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
	}

	function drawCrowd() {
		const rows = [42, 80, 118];
		const colors = ["#f3e7d4", "#d94337", "#19191a", "#b83c31", "#f5eee1", "#211f20"];
		rows.forEach((rowY, rowIndex) => {
			for (let i = 0; i < 22; i += 1) {
				const x = 22 + i * 44 + (rowIndex % 2) * 15;
				const bounce = Math.sin(state.lastTime / 220 + i * 1.6 + rowIndex) * 2;
				const shirt = colors[(i + rowIndex * 2) % colors.length];
				ctx.fillStyle = "#302a27";
				ctx.beginPath(); ctx.ellipse(x, rowY + 17, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
				ctx.strokeStyle = shirt; ctx.lineWidth = 5; ctx.lineCap = "round";
				ctx.beginPath(); ctx.moveTo(x - 3, rowY + 14); ctx.lineTo(x - 8, rowY + 25 + bounce); ctx.moveTo(x + 3, rowY + 14); ctx.lineTo(x + 9, rowY + 24 - bounce); ctx.stroke();
				ctx.strokeStyle = "#292522"; ctx.lineWidth = 4;
				ctx.beginPath(); ctx.moveTo(x - 4, rowY + 17); ctx.lineTo(x - 5, rowY + 28); ctx.moveTo(x + 4, rowY + 17); ctx.lineTo(x + 5, rowY + 28); ctx.stroke();
				ctx.fillStyle = "#eee5d8";
				ctx.beginPath(); ctx.ellipse(x - 7, rowY + 29, 5, 2.5, 0, 0, Math.PI * 2); ctx.ellipse(x + 7, rowY + 29, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
				ctx.fillStyle = shirt; roundedRect(x - 9, rowY + 2, 18, 17, 5, shirt);
				ctx.fillStyle = "#c98763"; ctx.beginPath(); ctx.arc(x, rowY - 5, 7, 0, Math.PI * 2); ctx.fill();
				ctx.fillStyle = i % 3 === 0 ? "#32231c" : "#362d28";
				ctx.beginPath(); ctx.arc(x, rowY - 8, 6, Math.PI, Math.PI * 2); ctx.fill();
				ctx.strokeStyle = shirt; ctx.lineWidth = 3;
				ctx.beginPath(); ctx.moveTo(x - 8, rowY + 7); ctx.lineTo(x - 14, rowY - 1 + bounce); ctx.moveTo(x + 8, rowY + 7); ctx.lineTo(x + 14, rowY - 3 - bounce); ctx.stroke();
				ctx.fillStyle = "#c98763"; ctx.beginPath(); ctx.arc(x - 14, rowY - 1 + bounce, 2.5, 0, Math.PI * 2); ctx.arc(x + 14, rowY - 3 - bounce, 2.5, 0, Math.PI * 2); ctx.fill();
			}
		});
	}

	function drawCourt() {
		const wall = ctx.createLinearGradient(0, 0, 0, height);
		wall.addColorStop(0, "#302c2a"); wall.addColorStop(.35, "#5a3329"); wall.addColorStop(.36, "#a35130"); wall.addColorStop(1, "#d28a4a");
		ctx.fillStyle = wall; ctx.fillRect(0, 0, width, height);
		ctx.fillStyle = "rgba(255,255,255,.04)"; ctx.fillRect(0, 0, width, 35);
		drawCrowd();
		ctx.fillStyle = "#231f1d"; ctx.fillRect(0, 151, width, 8);
		ctx.fillStyle = "#dc8c4a"; ctx.fillRect(0, 159, width, height - 159);
		const floor = ctx.createLinearGradient(0, 160, 0, height);
		floor.addColorStop(0, "#d88645"); floor.addColorStop(1, "#bd6c38");
		ctx.fillStyle = floor; ctx.fillRect(0, 159, width, height - 159);
		for (let i = 0; i < 11; i += 1) {
			ctx.strokeStyle = i % 2 ? "rgba(94,45,23,.08)" : "rgba(255,218,166,.07)";
			ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 180 + i * 38); ctx.lineTo(width, 180 + i * 38); ctx.stroke();
		}
		ctx.strokeStyle = "rgba(255,240,213,.8)"; ctx.lineWidth = 4;
		ctx.beginPath(); ctx.moveTo(0, 197); ctx.lineTo(width, 197); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(0, 505); ctx.lineTo(width, 505); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(480, 197); ctx.lineTo(480, 505); ctx.stroke();
		ctx.beginPath(); ctx.arc(480, 355, 61, 0, Math.PI * 2); ctx.stroke();
		ctx.strokeStyle = "rgba(255,240,213,.9)"; ctx.lineWidth = 3;
		ctx.beginPath(); ctx.moveTo(width * .66, 197); ctx.lineTo(width * .66, 505); ctx.stroke();
		ctx.beginPath(); ctx.arc(width * .66, 351, 78, -Math.PI / 2, Math.PI / 2); ctx.stroke();
		ctx.strokeStyle = "rgba(255,240,213,.58)"; ctx.lineWidth = 2;
		ctx.beginPath(); ctx.arc(width * .66, 351, 177, -Math.PI / 2, Math.PI / 2); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(25, 197); ctx.lineTo(25, 505); ctx.stroke();
		ctx.beginPath(); ctx.moveTo(width - 25, 197); ctx.lineTo(width - 25, 505); ctx.stroke();
	}

	function drawHoop(x) {
		const baseY = 245;
		ctx.fillStyle = "rgba(37,25,20,.2)"; ctx.beginPath(); ctx.ellipse(x - 8, 496, 62, 13, 0, 0, Math.PI * 2); ctx.fill();
		ctx.strokeStyle = "#37322e"; ctx.lineWidth = 10; ctx.lineCap = "round";
		ctx.beginPath(); ctx.moveTo(x + 30, baseY + 14); ctx.lineTo(x + 59, 479); ctx.stroke();
		ctx.strokeStyle = "#eee7d8"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 56, 478); ctx.lineTo(x + 72, 478); ctx.stroke();
		ctx.fillStyle = "#e8e3d9"; roundedRect(x - 30, baseY - 56, 66, 47, 2, "#f1eadc", "#674331");
		ctx.fillStyle = "rgba(218,77,52,.72)"; ctx.fillRect(x - 24, baseY - 50, 54, 35);
		ctx.strokeStyle = "#f4eee2"; ctx.lineWidth = 2; ctx.strokeRect(x - 24, baseY - 50, 54, 35);
		ctx.strokeStyle = "#292522"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 3, baseY + 1); ctx.lineTo(x + 43, baseY + 1); ctx.stroke();
		ctx.strokeStyle = "rgba(247,239,222,.72)"; ctx.lineWidth = 1.5;
		ctx.beginPath(); ctx.moveTo(x, baseY + 3); ctx.lineTo(x + 5, baseY + 31); ctx.lineTo(x + 36, baseY + 31); ctx.lineTo(x + 41, baseY + 3); ctx.moveTo(x + 5, baseY + 17); ctx.lineTo(x + 36, baseY + 17); ctx.moveTo(x + 11, baseY + 4); ctx.lineTo(x + 15, baseY + 30); ctx.moveTo(x + 30, baseY + 4); ctx.lineTo(x + 26, baseY + 30); ctx.stroke();
	}

	function drawPerson(x, y, scale, jumping) {
		const lift = jumping ? Math.abs(Math.sin(state.lastTime / 175)) * 24 : Math.sin(state.lastTime / 360) * 1.5;
		const top = y - lift;
		ctx.save(); ctx.translate(x, top); ctx.scale(scale, scale);
		ctx.fillStyle = "rgba(37,25,20,.24)"; ctx.beginPath(); ctx.ellipse(0, 6, 47, 10, 0, 0, Math.PI * 2); ctx.fill();
		ctx.strokeStyle = "#1d1918"; ctx.lineWidth = 12; ctx.lineCap = "round";
		ctx.beginPath(); ctx.moveTo(-15, -61); ctx.lineTo(-23, -25); ctx.lineTo(-26, -2); ctx.moveTo(15, -61); ctx.lineTo(24, -27); ctx.lineTo(26, -2); ctx.stroke();
		ctx.strokeStyle = "#201a18"; ctx.lineWidth = 10;
		ctx.beginPath(); ctx.moveTo(-27, -1); ctx.lineTo(-39, 0); ctx.moveTo(27, -1); ctx.lineTo(40, 0); ctx.stroke();
		ctx.fillStyle = "#f2e8d7"; ctx.beginPath(); ctx.ellipse(-42, 1, 10, 5, -.15, 0, Math.PI * 2); ctx.ellipse(43, 1, 10, 5, .15, 0, Math.PI * 2); ctx.fill();
		ctx.fillStyle = "#e23e34"; ctx.beginPath(); ctx.moveTo(-21, -142); ctx.quadraticCurveTo(0, -151, 21, -142); ctx.lineTo(28, -78); ctx.quadraticCurveTo(0, -67, -28, -78); ctx.closePath(); ctx.fill();
		ctx.fillStyle = "#171719"; ctx.fillRect(-27, -83, 54, 13);
		ctx.fillStyle = "#f0eee7"; ctx.font = "bold 25px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText("7", 0, -102);
		ctx.strokeStyle = "#b97858"; ctx.lineWidth = 11; ctx.lineCap = "round";
		if (jumping) {
			ctx.beginPath(); ctx.moveTo(-20, -135); ctx.lineTo(-31, -168); ctx.lineTo(-17, -192); ctx.moveTo(20, -135); ctx.lineTo(31, -168); ctx.lineTo(17, -192); ctx.stroke();
			ctx.fillStyle = "#b97858"; ctx.beginPath(); ctx.arc(-17, -194, 6, 0, Math.PI * 2); ctx.arc(17, -194, 6, 0, Math.PI * 2); ctx.fill();
		} else {
			ctx.beginPath(); ctx.moveTo(-20, -135); ctx.lineTo(-43, -119); ctx.lineTo(-61, -145); ctx.moveTo(20, -135); ctx.lineTo(39, -152); ctx.lineTo(55, -175); ctx.stroke();
			ctx.fillStyle = "#b97858"; ctx.beginPath(); ctx.arc(-62, -147, 6, 0, Math.PI * 2); ctx.arc(57, -178, 6, 0, Math.PI * 2); ctx.fill();
		}
		ctx.fillStyle = "#b97858"; ctx.fillRect(-7, -159, 14, 15);
		ctx.fillStyle = "#c98763"; ctx.beginPath(); ctx.arc(0, -176, 21, 0, Math.PI * 2); ctx.fill();
		ctx.fillStyle = "#29201c"; ctx.beginPath(); ctx.arc(0, -183, 21, Math.PI, Math.PI * 2); ctx.lineTo(20, -175); ctx.quadraticCurveTo(0, -182, -20, -175); ctx.fill();
		ctx.fillStyle = "#29201c"; ctx.beginPath(); ctx.arc(-7, -176, 1.8, 0, Math.PI * 2); ctx.arc(7, -176, 1.8, 0, Math.PI * 2); ctx.fill();
		ctx.strokeStyle = "#793f32"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -169, 5, .2, Math.PI - .2); ctx.stroke();
		if (jumping) drawTrophy(0, -216, .64);
		ctx.restore();
	}

	function drawTrophy(x, y, scale) {
		ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
		ctx.fillStyle = "#ffd45b"; ctx.strokeStyle = "#a96b23"; ctx.lineWidth = 2;
		ctx.beginPath(); ctx.moveTo(-17, -20); ctx.lineTo(17, -20); ctx.lineTo(14, 0); ctx.quadraticCurveTo(0, 16, -14, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
		ctx.beginPath(); ctx.arc(-18, -12, 9, -Math.PI / 2, Math.PI / 2); ctx.arc(18, -12, 9, Math.PI / 2, -Math.PI / 2); ctx.stroke();
		ctx.fillStyle = "#ffd45b"; ctx.fillRect(-3, 0, 6, 10); ctx.fillRect(-11, 10, 22, 5); ctx.restore();
	}

	function drawBall(x, y, radius) {
		ctx.fillStyle = "#ed7d23"; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
		ctx.save(); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.clip();
		ctx.strokeStyle = "#211a16"; ctx.lineWidth = Math.max(1.5, radius * .09);
		ctx.beginPath(); ctx.moveTo(x - radius, y); ctx.lineTo(x + radius, y); ctx.moveTo(x, y - radius); ctx.lineTo(x, y + radius); ctx.moveTo(x - radius * .76, y - radius * .65); ctx.quadraticCurveTo(x, y, x - radius * .76, y + radius * .65); ctx.moveTo(x + radius * .76, y - radius * .65); ctx.quadraticCurveTo(x, y, x + radius * .76, y + radius * .65); ctx.stroke();
		ctx.restore(); ctx.strokeStyle = "rgba(255,221,159,.55)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, radius - 1, 3.7, 5.5); ctx.stroke();
	}

	function drawShot(now) {
		if (!state.shot) return;
		const progress = Math.min((now - state.shot.start) / state.shot.duration, 1);
		const x = state.shot.startX + (state.shot.targetX - state.shot.startX) * progress;
		const y = state.shot.startY + (state.shot.targetY - state.shot.startY) * progress - Math.sin(progress * Math.PI) * state.shot.arc;
		drawBall(x, y, 17 - progress * 3);
		if (progress >= 1) finishShot(now);
	}

	function draw(now) {
		state.lastTime = now;
		ctx.clearRect(0, 0, width, height);
		drawCourt();
		state.hoopX = hoopPosition(now);
		drawHoop(state.hoopX);
		drawPerson(width * .31, height * .91, 1.04, state.phase === 3);
		if (state.phase !== 3 && !state.shot) drawBall(width * .31 + 58, height * .91 - 178, 16);
		drawShot(now);
		if (state.active) {
			const marker = (Math.sin(now / 480) + 1) * 50;
			ui.marker.style.left = `${marker}%`;
		}
		if (now < state.toastUntil) ui.toast.classList.add("is-visible");
		else ui.toast.classList.remove("is-visible");
		animationId = requestAnimationFrame(draw);
	}

	function setOverlay(content) {
		ui.overlayContent.innerHTML = content;
		ui.overlay.hidden = false;
	}

	function updateUi() {
		const phase = currentPhase();
		ui.score.textContent = String(state.points).padStart(2, "0");
		ui.made.textContent = state.made;
		ui.target.textContent = phase.target;
		ui.phase.textContent = phase.name;
		ui.timer.textContent = state.remaining;
		ui.distance.textContent = phase.distance;
		ui.timerBlock.classList.toggle("is-urgent", state.active && state.remaining <= 5);
		ui.shoot.disabled = !state.active || Boolean(state.shot);
		ui.aimHint.textContent = state.shot ? "BOLA NO AR" : "CLIQUE NA FAIXA VERDE";
		ui.steps.forEach((step, index) => {
			step.classList.toggle("is-current", index === state.phase && state.phase < 3);
			step.classList.toggle("is-complete", index < state.phase || state.phase === 3);
		});
	}

	function beginPhase() {
		const phase = currentPhase();
		state.remaining = phase.seconds;
		state.made = 0;
		state.active = true;
		state.shot = null;
		state.phaseStartedAt = performance.now();
		state.toastUntil = 0;
		ui.overlay.hidden = true;
		updateUi();
		clearInterval(timerId);
		timerId = window.setInterval(() => {
			if (!state.active) return;
			state.remaining -= 1;
			updateUi();
			if (state.remaining <= 0) failPhase();
		}, 1000);
	}

	function startGame() {
		state.phase = 0;
		state.points = 0;
		beginPhase();
	}

	function showIntro() {
		setOverlay('<div class="overlay-kicker">DESAFIO DE QUADRA</div><h2>Hora do arremesso.</h2><p>Sincronize o clique com a faixa verde. Acerte a cesta, avance de fase e leve o troféu.</p><button class="overlay-button" data-action="start">COMEÇAR O JOGO <span aria-hidden="true">↗</span></button>');
	}

	function failPhase() {
		if (!state.active) return;
		state.active = false;
		state.shot = null;
		clearInterval(timerId);
		updateUi();
		setOverlay(`<div class="overlay-kicker">FASE ${state.phase + 1}</div><h2>Você não conseguiu, tente novamente.</h2><p>As cestas desta fase começam de novo. Seu placar continua valendo.</p><button class="overlay-button" data-action="retry">TENTAR A FASE NOVAMENTE ↗</button>`);
	}

	function winGame() {
		state.active = false;
		state.phase = 3;
		state.shot = null;
		clearInterval(timerId);
		updateUi();
		setOverlay('<div class="trophy-scene" aria-hidden="true">🏆</div><div class="overlay-kicker">CAMPEÃO DA QUADRA</div><h2>Jogo concluído, parabéns!</h2><p>Você dominou as três fases e conquistou o troféu.</p><button class="overlay-button" data-action="restart">JOGAR NOVAMENTE ↗</button>');
	}

	function finishShot(now) {
		const shot = state.shot;
		if (!shot) return;
		const hoopDistance = Math.abs(shot.targetX - state.hoopX);
		const made = shot.accuracy >= .42 && shot.accuracy <= .58 && hoopDistance < 46;
		state.shot = null;
		state.lastShotAt = now;
		if (made) {
			state.made += 1;
			state.points += 3;
			state.toastUntil = now + 950;
			ui.toast.textContent = "CESTA! +3 PONTOS";
			if (state.made >= currentPhase().target) {
				updateUi();
				if (state.phase === 2) {
					window.setTimeout(winGame, 650);
				} else {
					state.active = false;
					clearInterval(timerId);
					ui.toast.textContent = "FASE CONCLUÍDA!";
					state.toastUntil = performance.now() + 1100;
					window.setTimeout(() => {
						state.phase += 1;
						beginPhase();
					}, 1050);
				}
			}
		} else {
			state.toastUntil = now + 850;
			ui.toast.textContent = "QUASE! TENTE DE NOVO";
		}
		updateUi();
	}

	function shoot() {
		if (!state.active || state.shot) return;
		const marker = Math.min(Math.abs(Number.parseFloat(ui.marker.style.left) || 0), 100) / 100;
		state.shot = {
			start: performance.now(),
			duration: 790,
			startX: width * .31 + 58,
			startY: height * .91 - 178,
			targetX: state.hoopX + 20,
			targetY: 245,
			arc: 156,
			accuracy: marker
		};
		updateUi();
	}

	ui.overlay.addEventListener("click", event => {
		const action = event.target.closest("[data-action]")?.dataset.action;
		if (action === "start" || action === "restart") startGame();
		if (action === "retry") beginPhase();
	});
	ui.shoot.addEventListener("click", shoot);
	window.addEventListener("keydown", event => {
		if (event.code === "Space" && !event.repeat && !ui.overlay.hidden) {
			const action = ui.overlayContent.querySelector("[data-action]")?.dataset.action;
			if (action === "start" || action === "restart") startGame();
			else if (action === "retry") beginPhase();
		} else if (event.code === "Space" && !event.repeat) {
			event.preventDefault(); shoot();
		}
	});
	window.addEventListener("resize", fitCanvas);

	fitCanvas();
	updateUi();
	showIntro();
	animationId = requestAnimationFrame(draw);
	window.addEventListener("pagehide", () => {
		clearInterval(timerId);
		cancelAnimationFrame(animationId);
	});
})();

