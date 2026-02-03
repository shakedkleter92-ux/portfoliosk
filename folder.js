// Folder Component (Vanilla JS)
class Folder {
    constructor(options = {}) {
        this.color = options.color || '#39FF14';
        this.size = options.size || 1.5;
        this.label = options.label || '';
        this.projectId = options.projectId || '';
        this.onClick = options.onClick || (() => { });

        this.open = false;
        this.paperOffsets = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 }
        ];

        this.element = this.create();
    }

    darkenColor(hex, percent) {
        let color = hex.startsWith('#') ? hex.slice(1) : hex;
        if (color.length === 3) {
            color = color.split('').map(c => c + c).join('');
        }
        const num = parseInt(color, 16);
        let r = (num >> 16) & 0xff;
        let g = (num >> 8) & 0xff;
        let b = num & 0xff;
        r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
        g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
        b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    create() {
        const wrapper = document.createElement('div');
        wrapper.className = 'folder-wrapper cursor-target';
        wrapper.style.transform = `scale(${this.size})`;

        const folderBackColor = this.darkenColor(this.color, 0.08);

        const folder = document.createElement('div');
        folder.className = 'folder';
        folder.style.setProperty('--folder-color', this.color);
        folder.style.setProperty('--folder-back-color', folderBackColor);

        const back = document.createElement('div');
        back.className = 'folder__back';

        // Create 3 papers
        for (let i = 0; i < 3; i++) {
            const paper = document.createElement('div');
            paper.className = `paper paper-${i + 1}`;
            paper.dataset.index = i;
            back.appendChild(paper);
        }

        // Create front pieces
        const front = document.createElement('div');
        front.className = 'folder__front';
        back.appendChild(front);

        folder.appendChild(back);

        // Add label
        const label = document.createElement('div');
        label.className = 'folder-label';
        label.textContent = this.label;

        wrapper.appendChild(folder);
        wrapper.appendChild(label);

        // Add click handler
        folder.addEventListener('click', () => this.handleClick());

        this.folderElement = folder;
        this.backElement = back;

        return wrapper;
    }

    handleClick() {
        // Open project directly without folder animation
        if (this.onClick && this.projectId) {
            this.onClick(this.projectId);
        }
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
