class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;

        // Random explosion velocity
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 8 + 4;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 2; // Slight upward bias

        this.radius = Math.random() * 6 + 3;
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.4; // gravity
        this.alpha -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;

        // Cuter, slightly glowing particles
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 4;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.alpha = 1;
        this.vy = -1.5;
        this.scale = 0.5;
        this.life = 60; // frames
    }

    update() {
        this.y += this.vy;
        if (this.scale < 1.2) {
            this.scale += 0.08;
        }
        this.life--;
        if (this.life < 20) {
            this.alpha -= 0.05;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = Math.max(0, this.alpha);

        ctx.font = '900 40px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8;
        ctx.strokeText(this.text, 0, 0);

        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);

        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.texts = [];
        this.shakeIntensity = 0;
    }

    spawnText(x, y, text, color) {
        this.texts.push(new FloatingText(x, y, text, color));
    }

    spawn(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    triggerShake(intensity = 10) {
        this.shakeIntensity = intensity;
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        for (let i = this.texts.length - 1; i >= 0; i--) {
            let t = this.texts[i];
            t.update();
            if (t.alpha <= 0) {
                this.texts.splice(i, 1);
            }
        }

        if (this.shakeIntensity > 0) {
            this.shakeIntensity *= 0.85; // Damping
            if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
        }
    }

    applyShake(ctx) {
        if (this.shakeIntensity > 0) {
            let dx = (Math.random() - 0.5) * this.shakeIntensity;
            let dy = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(dx, dy);
        }
    }

    draw(ctx) {
        for (let p of this.particles) {
            p.draw(ctx);
        }
        for (let t of this.texts) {
            t.draw(ctx);
        }
    }
}
