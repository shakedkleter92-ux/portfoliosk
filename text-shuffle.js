// Text Shuffle Effect (Vanilla JS)
class TextShuffle {
    constructor(element, options = {}) {
        this.element = element;
        this.originalText = element.textContent;

        // Options
        this.duration = (options.duration || 0.35) * 1000; // Convert to ms
        this.shuffleTimes = options.shuffleTimes || 1;
        this.stagger = (options.stagger || 0.03) * 1000; // Convert to ms
        this.triggerOnHover = options.triggerOnHover || false;
        this.triggerOnce = options.triggerOnce !== undefined ? options.triggerOnce : true;
        this.loop = options.loop || false;
        this.loopDelay = (options.loopDelay || 0) * 1000;

        // Characters to use for shuffling
        this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/';

        // State
        this.hasAnimated = false;
        this.isAnimating = false;

        this.init();
    }

    init() {
        // Wrap each character in a span for individual animation
        this.wrapCharacters();

        if (this.triggerOnHover) {
            this.element.addEventListener('mouseenter', () => {
                if (!this.triggerOnce || !this.hasAnimated) {
                    this.shuffle();
                }
            });
        } else {
            // Use Intersection Observer for scroll trigger
            this.setupObserver();
        }
    }

    wrapCharacters() {
        const chars = this.originalText.split('');
        this.element.innerHTML = '';

        this.charElements = chars.map((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.display = 'inline-block';
            span.dataset.char = char;
            span.dataset.index = index;
            this.element.appendChild(span);
            return span;
        });
    }

    setupObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && (!this.triggerOnce || !this.hasAnimated)) {
                    this.shuffle();
                    if (this.triggerOnce) {
                        observer.unobserve(this.element);
                    }
                }
            });
        }, { threshold: 0.1 });

        observer.observe(this.element);
    }

    getRandomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }

    shuffle() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const promises = this.charElements.map((charEl, index) => {
            return new Promise(resolve => {
                const delay = index * this.stagger;
                const originalChar = charEl.dataset.char;

                setTimeout(() => {
                    this.animateCharacter(charEl, originalChar, resolve);
                }, delay);
            });
        });

        Promise.all(promises).then(() => {
            this.isAnimating = false;
            this.hasAnimated = true;

            if (this.loop) {
                setTimeout(() => {
                    this.hasAnimated = false;
                    this.shuffle();
                }, this.loopDelay);
            }
        });
    }

    animateCharacter(charEl, finalChar, callback) {
        let iterations = 0;
        const maxIterations = Math.ceil(this.duration / 50); // Update every 50ms

        const interval = setInterval(() => {
            if (iterations >= maxIterations) {
                charEl.textContent = finalChar;
                clearInterval(interval);
                callback();
            } else {
                // Show random character
                if (finalChar !== ' ') {
                    charEl.textContent = this.getRandomChar();
                }
                iterations++;
            }
        }, 50);
    }

    destroy() {
        this.element.textContent = this.originalText;
    }
}

// Auto-initialize on elements with data-shuffle attribute
document.addEventListener('DOMContentLoaded', () => {
    const shuffleElements = document.querySelectorAll('[data-shuffle]');
    shuffleElements.forEach(el => {
        new TextShuffle(el, {
            duration: parseFloat(el.dataset.shuffleDuration) || 0.35,
            shuffleTimes: parseInt(el.dataset.shuffleTimes) || 1,
            stagger: parseFloat(el.dataset.shuffleStagger) || 0.03,
            triggerOnHover: el.dataset.shuffleHover === 'true',
            triggerOnce: el.dataset.shuffleOnce !== 'false',
            loop: el.dataset.shuffleLoop === 'true',
            loopDelay: parseFloat(el.dataset.shuffleLoopDelay) || 0
        });
    });
});
