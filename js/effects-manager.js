/**
 * 特效管理器 - 连击系统 + Canvas 粒子 + 庆祝彩带
 * 无依赖，游戏逻辑通过 window.effectsManager 的 onCorrectKey/onError/celebrate 驱动
 */
class EffectsManager {
    constructor() {
        this.combo = 0;
        this.maxCombo = 0;
        this.particles = [];
        this.canvas = null;
        this.ctx = null;
        this.rafId = null;
        this.comboEl = null;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.colors = ['#ff6b9d', '#ffd93d', '#6bcbff', '#95e86b', '#c78bff', '#ff9d5c'];

        this.initCanvas();
        this.initComboBubble();
    }

    initCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fx-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    initComboBubble() {
        this.comboEl = document.createElement('div');
        this.comboEl.className = 'fx-combo-bubble';
        this.comboEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.comboEl);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // 当前打字焦点的屏幕位置：打字光标 → 防御目标词 → 视口中心偏上
    caretPosition() {
        const el = document.querySelector('.char-current')
            || document.querySelector('.target-word-container .typed-part');
        if (el) {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
        return { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
    }

    // 连击等级：0-4，驱动音调和特效强度
    getComboLevel() {
        return Math.min(4, Math.floor(this.combo / 10));
    }

    onCorrectKey() {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.updateComboBubble();

        if (this.reducedMotion) return;

        const pos = this.caretPosition();
        this.spawnSparks(pos, 2 + this.getComboLevel());

        // 每 10 连击一个里程碑：爆一圈星星 + 音效
        if (this.combo > 0 && this.combo % 10 === 0) {
            this.spawnBurst(pos, 14, 'star');
            if (window.audioManager) window.audioManager.playSound('combo');
        }
    }

    onError() {
        if (this.combo >= 5) {
            this.comboEl.classList.add('fx-combo-break');
            setTimeout(() => this.comboEl.classList.remove('fx-combo-break'), 400);
        }
        this.combo = 0;
        this.updateComboBubble();
    }

    resetCombo() {
        this.combo = 0;
        this.maxCombo = 0;
        this.updateComboBubble();
    }

    updateComboBubble() {
        if (this.combo >= 5) {
            const fire = this.combo >= 30 ? '🔥🔥' : this.combo >= 15 ? '🔥' : '✨';
            this.comboEl.textContent = `${fire} 连击 x${this.combo}`;
            this.comboEl.classList.add('fx-combo-show');
            this.comboEl.classList.remove('fx-combo-pop');
            void this.comboEl.offsetWidth; // 重启动画
            this.comboEl.classList.add('fx-combo-pop');
        } else {
            this.comboEl.classList.remove('fx-combo-show');
        }
    }

    // 胜利庆祝：全屏彩带雨
    celebrate(big = false) {
        if (this.reducedMotion) return;
        const count = big ? 160 : 80;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                kind: 'confetti',
                x: Math.random() * this.canvas.width,
                y: -20 - Math.random() * this.canvas.height * 0.5,
                vx: (Math.random() - 0.5) * 2,
                vy: 2 + Math.random() * 3,
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.3,
                size: 6 + Math.random() * 8,
                color: this.colors[i % this.colors.length],
                life: 1,
                decay: 0.003 + Math.random() * 0.004
            });
        }
        this.startLoop();
    }

    spawnSparks(pos, n) {
        for (let i = 0; i < n; i++) {
            this.particles.push({
                kind: 'spark',
                x: pos.x, y: pos.y,
                vx: (Math.random() - 0.5) * 4,
                vy: -1 - Math.random() * 3,
                size: 2 + Math.random() * 3,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                life: 1,
                decay: 0.03 + Math.random() * 0.03
            });
        }
        this.startLoop();
    }

    spawnBurst(pos, n, kind = 'star') {
        for (let i = 0; i < n; i++) {
            const angle = (i / n) * Math.PI * 2;
            const speed = 3 + Math.random() * 2;
            this.particles.push({
                kind,
                x: pos.x, y: pos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.4,
                size: 5 + Math.random() * 4,
                color: this.colors[i % this.colors.length],
                life: 1,
                decay: 0.015 + Math.random() * 0.01
            });
        }
        this.startLoop();
    }

    startLoop() {
        if (this.rafId) return;
        const tick = () => {
            this.update();
            this.draw();
            if (this.particles.length > 0) {
                this.rafId = requestAnimationFrame(tick);
            } else {
                this.rafId = null;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        };
        this.rafId = requestAnimationFrame(tick);
    }

    update() {
        const g = 0.12;
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.kind === 'confetti' ? 0.02 : g;
            if (p.vrot !== undefined) p.rot += p.vrot;
            if (p.kind === 'confetti') p.vx += Math.sin(p.y * 0.02) * 0.05; // 飘动
            p.life -= p.decay;
            return p.life > 0 && p.y < this.canvas.height + 30;
        });
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            if (p.kind === 'confetti') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                ctx.restore();
            } else if (p.kind === 'star') {
                this.drawStar(ctx, p.x, p.y, p.size, p.rot);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    drawStar(ctx, x, y, r, rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i * 4 * Math.PI) / 5;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

window.effectsManager = new EffectsManager();
