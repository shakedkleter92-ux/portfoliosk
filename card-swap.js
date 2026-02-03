// Card Swap Carousel (Vanilla JS)
class CardSwap {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            width: options.width || 500,
            height: options.height || 400,
            cardDistance: options.cardDistance || 60,
            verticalDistance: options.verticalDistance || 70,
            delay: options.delay || 5000,
            pauseOnHover: options.pauseOnHover !== undefined ? options.pauseOnHover : false,
            skewAmount: options.skewAmount !== undefined ? options.skewAmount : 0,
            easing: options.easing || 'elastic'
        };

        // Easing configurations
        this.config = this.options.easing === 'elastic' ? {
            durDrop: 1200,    // Faster: was 2000ms
            durMove: 1200,    // Faster: was 2000ms
            durReturn: 1200,  // Faster: was 2000ms
            promoteOverlap: 0.9,
            returnDelay: 0.05
        } : {
            durDrop: 800,
            durMove: 800,
            durReturn: 800,
            promoteOverlap: 0.45,
            returnDelay: 0.2
        };

        this.cards = [];
        this.order = [];
        this.intervalId = null;
        this.animating = false;

        this.init();
    }

    init() {
        // Get all card elements
        this.cards = Array.from(this.container.querySelectorAll('.swap-card'));
        this.order = this.cards.map((_, i) => i);

        // Set container styles
        this.container.style.width = `${this.options.width}px`;
        this.container.style.height = `${this.options.height}px`;

        // Position all cards initially
        this.cards.forEach((card, i) => {
            this.placeCard(card, i, true);
        });

        // Start auto-swap
        this.startAutoSwap();

        // Pause on hover if enabled
        if (this.options.pauseOnHover) {
            this.container.addEventListener('mouseenter', () => this.pause());
            this.container.addEventListener('mouseleave', () => this.resume());
        }
    }

    makeSlot(index) {
        const total = this.cards.length;
        return {
            x: index * this.options.cardDistance,
            y: -index * this.options.verticalDistance,
            z: -index * this.options.cardDistance * 1.5,
            zIndex: total - index
        };
    }

    placeCard(card, index, immediate = false) {
        const slot = this.makeSlot(index);

        if (immediate) {
            card.style.transform = `translate(-50%, -50%) 
                                    translate3d(${slot.x}px, ${slot.y}px, ${slot.z}px) 
                                    skewY(${this.options.skewAmount}deg)`;
            card.style.zIndex = slot.zIndex;
        }

        return slot;
    }

    // Easing functions
    elasticOut(t) {
        const p = 0.6;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }

    easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    animate(element, props, duration, easing = 'elastic') {
        return new Promise(resolve => {
            const start = performance.now();
            const startValues = {};

            // Parse current values
            Object.keys(props).forEach(key => {
                if (key === 'zIndex') return;
                const current = parseFloat(element.style[key]) || 0;
                startValues[key] = current;
            });

            const update = (currentTime) => {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easing === 'elastic' ? this.elasticOut(progress) : this.easeInOut(progress);

                Object.keys(props).forEach(key => {
                    if (key === 'zIndex') {
                        element.style.zIndex = props[key];
                    } else if (key === 'transform') {
                        element.style.transform = props[key];
                    } else {
                        const start = startValues[key] || 0;
                        const target = props[key];
                        const current = start + (target - start) * eased;
                        element.style[key] = current;
                    }
                });

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(update);
        });
    }

    async swap() {
        console.log('CardSwap.swap() called - animating:', this.animating, 'order length:', this.order.length);
        if (this.animating || this.order.length < 2) return;

        console.log('Starting card swap animation...');
        this.animating = true;
        const [frontIdx, ...restIdx] = this.order;
        const frontCard = this.cards[frontIdx];

        // Drop front card
        const currentTransform = frontCard.style.transform;
        const dropTransform = currentTransform.replace(
            /translate3d\([^)]+\)/,
            (match) => {
                const parts = match.match(/-?\d+\.?\d*/g);
                return `translate3d(${parts[0]}px, ${parseFloat(parts[1]) + 500}px, ${parts[2]}px)`;
            }
        );

        // Start dropping
        this.animate(frontCard, { transform: dropTransform }, this.config.durDrop, this.options.easing);

        // Wait for overlap then promote others
        await new Promise(r => setTimeout(r, this.config.durDrop * this.config.promoteOverlap));

        // Promote other cards
        const promotePromises = restIdx.map(async (idx, i) => {
            await new Promise(r => setTimeout(r, i * 150)); // Stagger
            const card = this.cards[idx];
            const slot = this.makeSlot(i);
            card.style.zIndex = slot.zIndex;

            const newTransform = `translate(-50%, -50%) 
                                  translate3d(${slot.x}px, ${slot.y}px, ${slot.z}px) 
                                  skewY(${this.options.skewAmount}deg)`;

            return this.animate(card, { transform: newTransform }, this.config.durMove, this.options.easing);
        });

        await Promise.all(promotePromises);

        // Return front card to back
        await new Promise(r => setTimeout(r, this.config.durMove * this.config.returnDelay));

        const backSlot = this.makeSlot(this.cards.length - 1);
        frontCard.style.zIndex = backSlot.zIndex;

        const returnTransform = `translate(-50%, -50%) 
                                 translate3d(${backSlot.x}px, ${backSlot.y}px, ${backSlot.z}px) 
                                 skewY(${this.options.skewAmount}deg)`;

        await this.animate(frontCard, { transform: returnTransform }, this.config.durReturn, this.options.easing);

        // Update order
        this.order = [...restIdx, frontIdx];
        console.log('Card swap complete - new order:', this.order);
        this.animating = false;
    }

    startAutoSwap() {
        this.swap(); // Do first swap immediately
        this.intervalId = setInterval(() => this.swap(), this.options.delay);
    }

    pause() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    resume() {
        if (!this.intervalId) {
            this.startAutoSwap();
        }
    }

    destroy() {
        this.pause();
    }
}
