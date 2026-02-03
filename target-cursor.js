// Custom Target Cursor (Vanilla JS)
class TargetCursor {
    constructor(options = {}) {
        this.options = {
            targetSelector: options.targetSelector || '.cursor-target',
            spinDuration: options.spinDuration || 2,
            hideDefaultCursor: options.hideDefaultCursor !== undefined ? options.hideDefaultCursor : true,
            hoverDuration: options.hoverDuration || 0.2,
            parallaxOn: options.parallaxOn !== undefined ? options.parallaxOn : true
        };

        // Check if mobile
        if (this.isMobile()) {
            return;
        }

        // Constants
        this.borderWidth = 3;
        this.cornerSize = 12;

        // State
        this.cursorX = window.innerWidth / 2;
        this.cursorY = window.innerHeight / 2;
        this.activeTarget = null;
        this.targetCornerPositions = null;
        this.activeStrength = 0;
        this.isActive = false;
        this.animationId = null;
        this.spinAnimationId = null;
        this.currentRotation = 0;
        this.targetRotation = 0;
        this.cornerPositions = [];
        this.targetCornerPos = [];

        this.init();
    }

    isMobile() {
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        return hasTouchScreen && isSmallScreen;
    }

    init() {
        this.createCursor();
        this.setupEventListeners();
        this.startSpin();
        this.animate();

        if (this.options.hideDefaultCursor) {
            document.body.style.cursor = 'none';
        }
    }

    createCursor() {
        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'target-cursor-wrapper';
        this.wrapper.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px)`;

        // Create dot
        this.dot = document.createElement('div');
        this.dot.className = 'target-cursor-dot';
        this.wrapper.appendChild(this.dot);

        // Create corners
        const cornerClasses = ['corner-tl', 'corner-tr', 'corner-br', 'corner-bl'];
        this.corners = cornerClasses.map((className, index) => {
            const corner = document.createElement('div');
            corner.className = `target-cursor-corner ${className}`;
            this.wrapper.appendChild(corner);

            // Initial positions
            const positions = [
                { x: -this.cornerSize * 1.5, y: -this.cornerSize * 1.5 },
                { x: this.cornerSize * 0.5, y: -this.cornerSize * 1.5 },
                { x: this.cornerSize * 0.5, y: this.cornerSize * 0.5 },
                { x: -this.cornerSize * 1.5, y: this.cornerSize * 0.5 }
            ];

            this.cornerPositions[index] = { x: positions[index].x, y: positions[index].y };
            this.targetCornerPos[index] = { x: positions[index].x, y: positions[index].y };

            return corner;
        });

        document.body.appendChild(this.wrapper);
    }

    setupEventListeners() {
        // Mouse move
        this.mouseMoveHandler = (e) => {
            this.cursorX = e.clientX;
            this.cursorY = e.clientY;
        };
        window.addEventListener('mousemove', this.mouseMoveHandler);

        // Mouse over for targets
        this.mouseOverHandler = (e) => {
            const target = e.target.closest(this.options.targetSelector);
            if (target && target !== this.activeTarget) {
                this.activateTarget(target);
            }
        };
        window.addEventListener('mouseover', this.mouseOverHandler);

        // Scroll handler
        this.scrollHandler = () => {
            if (this.activeTarget) {
                const rect = this.activeTarget.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                if (!isVisible) {
                    this.deactivateTarget();
                }
            }
        };
        window.addEventListener('scroll', this.scrollHandler, { passive: true });

        // Mouse down/up
        this.mouseDownHandler = () => {
            this.wrapper.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px) scale(0.9) rotate(${this.currentRotation}deg)`;
            this.dot.style.transform = 'translate(-50%, -50%) scale(0.7)';
        };

        this.mouseUpHandler = () => {
            this.wrapper.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px) scale(1) rotate(${this.currentRotation}deg)`;
            this.dot.style.transform = 'translate(-50%, -50%) scale(1)';
        };

        window.addEventListener('mousedown', this.mouseDownHandler);
        window.addEventListener('mouseup', this.mouseUpHandler);
    }

    activateTarget(target) {
        this.activeTarget = target;
        this.isActive = true;
        this.targetRotation = this.currentRotation;
        this.stopSpin();

        // Calculate target corner positions
        const rect = target.getBoundingClientRect();
        this.targetCornerPositions = [
            { x: rect.left - this.borderWidth, y: rect.top - this.borderWidth },
            { x: rect.right + this.borderWidth - this.cornerSize, y: rect.top - this.borderWidth },
            { x: rect.right + this.borderWidth - this.cornerSize, y: rect.bottom + this.borderWidth - this.cornerSize },
            { x: rect.left - this.borderWidth, y: rect.bottom + this.borderWidth - this.cornerSize }
        ];

        // Animate strength to 1
        this.animateStrength(1);

        // Add mouseleave listener
        this.leaveHandler = () => this.deactivateTarget();
        target.addEventListener('mouseleave', this.leaveHandler);
    }

    deactivateTarget() {
        if (!this.activeTarget) return;

        if (this.leaveHandler) {
            this.activeTarget.removeEventListener('mouseleave', this.leaveHandler);
        }

        this.activeTarget = null;
        this.isActive = false;
        this.targetCornerPositions = null;

        // Reset corner positions
        const defaultPositions = [
            { x: -this.cornerSize * 1.5, y: -this.cornerSize * 1.5 },
            { x: this.cornerSize * 0.5, y: -this.cornerSize * 1.5 },
            { x: this.cornerSize * 0.5, y: this.cornerSize * 0.5 },
            { x: -this.cornerSize * 1.5, y: this.cornerSize * 0.5 }
        ];

        this.targetCornerPos = defaultPositions.map(pos => ({ ...pos }));
        this.animateStrength(0);

        setTimeout(() => {
            if (!this.activeTarget) {
                this.startSpin();
            }
        }, 50);
    }

    animateStrength(target) {
        const start = this.activeStrength;
        const startTime = performance.now();
        const duration = this.options.hoverDuration * 1000;

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (power2.out)
            const eased = 1 - Math.pow(1 - progress, 2);
            this.activeStrength = start + (target - start) * eased;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        requestAnimationFrame(update);
    }

    startSpin() {
        const spin = () => {
            this.currentRotation += (360 / (this.options.spinDuration * 60));
            if (this.currentRotation >= 360) {
                this.currentRotation -= 360;
            }
            this.spinAnimationId = requestAnimationFrame(spin);
        };
        this.spinAnimationId = requestAnimationFrame(spin);
    }

    stopSpin() {
        if (this.spinAnimationId) {
            cancelAnimationFrame(this.spinAnimationId);
            this.spinAnimationId = null;
        }
        this.currentRotation = 0;
    }

    animate() {
        // Update cursor position
        this.wrapper.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px) rotate(${this.currentRotation}deg)`;

        // Update corners
        if (this.targetCornerPositions && this.activeStrength > 0) {
            this.corners.forEach((corner, i) => {
                const targetX = this.targetCornerPositions[i].x - this.cursorX;
                const targetY = this.targetCornerPositions[i].y - this.cursorY;

                // Lerp
                const lerpSpeed = this.activeStrength >= 0.99 ? 0.2 : 0.3;
                this.targetCornerPos[i].x += (targetX - this.targetCornerPos[i].x) * lerpSpeed;
                this.targetCornerPos[i].y += (targetY - this.targetCornerPos[i].y) * lerpSpeed;

                this.cornerPositions[i].x += (this.targetCornerPos[i].x - this.cornerPositions[i].x) * 0.15;
                this.cornerPositions[i].y += (this.targetCornerPos[i].y - this.cornerPositions[i].y) * 0.15;

                corner.style.transform = `translate(${this.cornerPositions[i].x}px, ${this.cornerPositions[i].y}px)`;
            });
        } else {
            // Lerp back to default
            this.corners.forEach((corner, i) => {
                this.cornerPositions[i].x += (this.targetCornerPos[i].x - this.cornerPositions[i].x) * 0.15;
                this.cornerPositions[i].y += (this.targetCornerPos[i].y - this.cornerPositions[i].y) * 0.15;

                corner.style.transform = `translate(${this.cornerPositions[i].x}px, ${this.cornerPositions[i].y}px)`;
            });
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.spinAnimationId) {
            cancelAnimationFrame(this.spinAnimationId);
        }

        window.removeEventListener('mousemove', this.mouseMoveHandler);
        window.removeEventListener('mouseover', this.mouseOverHandler);
        window.removeEventListener('scroll', this.scrollHandler);
        window.removeEventListener('mousedown', this.mouseDownHandler);
        window.removeEventListener('mouseup', this.mouseUpHandler);

        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        }

        document.body.style.cursor = '';
    }
}
