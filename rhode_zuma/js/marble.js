const MARBLE_TYPES = [
    { id: 0, color: '#ff4d4d', name: '红', imageSrc: 'js/assests/red.png' },     // Vibrant Red
    { id: 1, color: '#33ccff', name: '蓝', imageSrc: 'js/assests/blue.png' },    // Bright Cyan/Blue
    { id: 2, color: '#ffdd33', name: '黄', imageSrc: 'js/assests/yellow.png' },  // Bright Yellow
    { id: 3, color: '#6a4c93', name: '黑', imageSrc: 'js/assests/black.png' },   // Changed 'Black' to Deep Purple for contrast
    { id: 4, color: '#ff8c42', name: '棕', imageSrc: 'js/assests/brown.png' },   // Changed 'Brown' to bright Orange
    { id: 5, color: '#39ff14', name: '绿', imageSrc: 'js/assests/green.png' }    // Neon Green
];

class Marble {
    constructor(row, col, typeInfo, x, y) {
        this.row = row;
        this.col = col;
        this.type = typeInfo.id;
        this.color = typeInfo.color;
        this.name = typeInfo.name;
        this.imageSrc = typeInfo.imageSrc;
        this.imageObj = null;

        if (this.imageSrc) {
            this.imageObj = new Image();
            this.imageObj.src = this.imageSrc;
        }

        this.x = x;
        this.y = y;
        this.radius = GRID_CONFIG.radius;
        this.isSpecial = false;

        this.popping = false;
        this.popScale = 1;
        this.dropping = false;
        this.vx = 0;
        this.vy = 0;
        this.dead = false;

        // Q-bounce properties
        this.bounceScale = 0; // Starts from 0 to scale up to 1
        this.bounceVel = 0.15; // Initial outward velocity
        this.bounceForce = 0.3; // Spring stiffness
        this.bounceDamping = 0.75; // Friction to stop bouncing
    }

    triggerBounce() {
        this.bounceScale = 0.5; // Shrink
        this.bounceVel = 0.2; // Explode outwards
    }

    update() {
        if (this.popping) {
            this.popScale += 0.1;
            if (this.popScale > 1.5) {
                this.dead = true;
            }
        } else if (this.dropping) {
            this.vy += 0.5; // gravity
            this.x += this.vx;
            this.y += this.vy;
            if (this.y > 800) {
                this.dead = true;
            }
        } else {
            // Apply spring physics for Q-bounce effect
            let diff = 1 - this.bounceScale;
            this.bounceVel += diff * this.bounceForce;
            this.bounceVel *= this.bounceDamping;
            this.bounceScale += this.bounceVel;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.popping) {
            ctx.scale(this.popScale, this.popScale);
            ctx.globalAlpha = Math.max(0, 1 - (this.popScale - 1) * 2);
        } else {
            // Apply bounce scaling if not popping
            ctx.scale(this.bounceScale, this.bounceScale);
        }



        ctx.beginPath();
        ctx.arc(2, 2, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 1, 0, Math.PI * 2);

        if (this.imageObj && this.imageObj.complete) {
            // Fill the whole bubble with the character's designated color gradient
            // Fill the whole bubble with the character's designated color gradient
            let grad = ctx.createRadialGradient(-this.radius * 0.25, -this.radius * 0.25, 2, 0, 0, this.radius);
            grad.addColorStop(0, 'rgba(255,255,255,0.8)');
            grad.addColorStop(0.4, this.color);
            grad.addColorStop(1, 'rgba(0,0,0,0.2)');
            ctx.fillStyle = grad;
            ctx.fill();

            // Draw the character image as large as possible without overflowing the outer border
            const imgRadius = this.radius - 2; // 2px margin for the coloured edge
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, imgRadius, 0, Math.PI * 2);
            ctx.clip();
            // Scale up the image by 1.35x so it zooms into the character if there is transparent padding
            const drawRadius = imgRadius * 1.35;
            ctx.drawImage(this.imageObj, -drawRadius, -drawRadius, drawRadius * 2, drawRadius * 2);
            ctx.restore();

            // Draw outer glass edge for the overall bubble
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius - 1, 0, Math.PI * 2);
            ctx.stroke();

            // Draw a slightly tinted outer ring corresponding to the color to reinforce the outline
            ctx.lineWidth = 2;
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius - 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else {
            ctx.fillStyle = this.color;

            // Cuteness gradient
            let grad = ctx.createRadialGradient(-this.radius * 0.25, -this.radius * 0.25, 2, 0, 0, this.radius);
            grad.addColorStop(0, 'rgba(255,255,255,0.6)');
            grad.addColorStop(0.3, this.color);
            grad.addColorStop(1, 'rgba(0,0,0,0.1)');
            ctx.fillStyle = grad;

            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.stroke();

        }

        if (this.isSpecial && !this.popping) {
            ctx.save();
            ctx.beginPath();
            let glowRad = this.radius + 4 + Math.sin(Date.now() / 150) * 2; // Pulsing effect
            ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();
            
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw skill icon badge in top right corner
            ctx.translate(14, -14);
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'white';
            ctx.stroke();

            const SKILL_ICONS = ['💣', '↔️', '✨', '↕️', '⬆️', '🎯'];
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 0; // Disable shadow for crisp emoji
            ctx.fillText(SKILL_ICONS[this.type] || '✨', 0, 1);
            
            ctx.restore();
        }

        ctx.restore();
    }
}
