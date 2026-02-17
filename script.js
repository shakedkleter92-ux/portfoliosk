// --- CONFIGURATION ---
const SECTIONS = ['hero', 'about', 'projects', 'contact'];
let currentSectionIndex = 0;
let isAnimating = false;
let isBooted = false;

// --- 1. BOOT SEQUENCE ---
const bootLog = [
    "LOADING PORTFOLIO...",
    "INITIALIZING INTERFACE...",
    "WELCOME."
];

const logContainer = document.getElementById('boot-log');
const enterBtn = document.querySelector('.boot-actions');
const bootScreen = document.getElementById('boot-screen');
const mainInterface = document.getElementById('main-interface');

let logIndex = 0;

function typeLog() {
    if (logIndex < bootLog.length) {
        const p = document.createElement('p');
        p.textContent = `> ${bootLog[logIndex]}`;
        logContainer.appendChild(p);
        logIndex++;
        setTimeout(typeLog, Math.random() * 300 + 100);
    } else {
        setTimeout(() => {
            enterBtn.classList.remove('hidden');
        }, 500);
    }
}

window.addEventListener('load', () => {
    // Initialize glitch background effect
    const glitchCanvas = document.getElementById('glitch-canvas');
    if (glitchCanvas && typeof LetterGlitch !== 'undefined') {
        const glitchEffect = new LetterGlitch(glitchCanvas, {
            glitchColors: ['#39FF14', '#00FF00', '#0F0', '#32CD32'],
            glitchSpeed: 40,
            smooth: true,
            characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>[]{}()!@#$%^&*-_=+/\\|'
        });
    }

    // Initialize custom cursor - DISABLED FOR NOW
    /*
    if (typeof TargetCursor !== 'undefined') {
        window.customCursor = new TargetCursor({
            targetSelector: '.cursor-target',
            spinDuration: 2,
            hideDefaultCursor: true,
            hoverDuration: 0.2,
            parallaxOn: true
        });
    }
    */


    setTimeout(typeLog, 500);
    initSections(); // Force layout state
});

function initSections() {
    // Ensure only the first section is active
    SECTIONS.forEach((id, index) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (index === 0) {
            el.classList.add('active-section');
            el.classList.remove('hidden-section');
        } else {
            el.classList.add('hidden-section');
            el.classList.remove('active-section');
        }
    });
    // Ensure overlay is hidden
    document.getElementById('project-detail-overlay').classList.add('hidden-section');
}

document.getElementById('btn-enter').addEventListener('click', () => {
    // 1. Play Sound
    const audio = new Audio('woosh.mp3');
    audio.volume = 0.6;
    audio.play().catch(e => console.log("Audio play failed interaction required", e));

    // 2. Trigger Sphere Build
    targetPos = layouts.sphere;
    material.color.setHex(0x39FF14); // Ensure it's green

    // 3. UI Transition
    bootScreen.style.transition = 'opacity 1s ease';
    bootScreen.style.opacity = '0';

    setTimeout(() => {
        bootScreen.classList.add('hidden');
        mainInterface.classList.remove('hidden');
        isBooted = true;

        // Initialize 3D Carousel only after boot ensures DOM is ready
        initCarousel();
    }, 1000);
});



// --- 2. SECTION MANAGER (SCROLL LOGIC - TUNED) ---
document.addEventListener('wheel', handleScroll, { passive: false });

let scrollAccumulator = 0;
const SCROLL_THRESHOLD = 150; // Higher = Slower/Heavier feel

function handleScroll(e) {
    if (!isBooted || isAnimating) return;

    // Accumulate scroll delta
    scrollAccumulator += e.deltaY;

    // Check if threshold reached
    if (Math.abs(scrollAccumulator) < SCROLL_THRESHOLD) return;

    // Determine direction based on accumulator sign
    const direction = scrollAccumulator > 0 ? 1 : -1;

    // Reset accumulator
    scrollAccumulator = 0;

    // SPECIAL CASE: PROJECTS CAROUSEL
    if (SECTIONS[currentSectionIndex] === 'projects') {
        const carouselMoved = rotateCarousel(direction);
        if (carouselMoved) {
            return;
        }
    }

    // Normal Section Switching
    const nextIndex = currentSectionIndex + direction;

    if (nextIndex >= 0 && nextIndex < SECTIONS.length) {
        switchSection(nextIndex);
    }
}

// --- TOUCH SWIPE NAVIGATION FOR MOBILE ---
let touchStartY = 0;
let touchEndY = 0;
const SWIPE_THRESHOLD = 50; // Minimum swipe distance in pixels

document.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (!isBooted || isAnimating) return;

    touchEndY = e.changedTouches[0].screenY;
    const swipeDistance = touchStartY - touchEndY;

    // Check if swipe is significant enough
    if (Math.abs(swipeDistance) < SWIPE_THRESHOLD) return;

    // Determine direction (swipe up = next, swipe down = previous)
    const direction = swipeDistance > 0 ? 1 : -1;

    // SPECIAL CASE: PROJECTS CAROUSEL
    if (SECTIONS[currentSectionIndex] === 'projects') {
        const carouselMoved = rotateCarousel(direction);
        if (carouselMoved) {
            return;
        }
    }

    // Normal Section Switching
    const nextIndex = currentSectionIndex + direction;

    if (nextIndex >= 0 && nextIndex < SECTIONS.length) {
        switchSection(nextIndex);
    }
}, { passive: true });

// Side HUD Click Listeners
document.querySelectorAll('.hud-item').forEach(item => {
    item.addEventListener('click', () => {
        if (!isBooted || isAnimating) return;
        const index = parseInt(item.getAttribute('data-index'));
        switchSection(index);
    });
});

function switchSection(index) {
    if (index === currentSectionIndex) return;
    isAnimating = true;

    // Get Elements
    const currentId = SECTIONS[currentSectionIndex];
    const nextId = SECTIONS[index];
    const currentEl = document.getElementById(currentId);
    const nextEl = document.getElementById(nextId);

    // Update HUD
    document.querySelectorAll('.hud-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.hud-item[data-index="${index}"]`)?.classList.add('active');

    // Animate Out
    currentEl.classList.remove('active-section');
    currentEl.classList.add('hidden-section');

    // Update Index
    currentSectionIndex = index;

    // Animate In (with brief delay for effect)
    setTimeout(() => {
        nextEl.classList.remove('hidden-section');
        nextEl.classList.add('active-section');
        isAnimating = false;

        // Trigger Background Update
        updateBackgroundState(nextId);
    }, 800);
}


// --- 3. 3D CAROUSEL LOGIC (HELIX/SPIRAL VERSION) ---
let carouselRotation = 0;
let carouselIndex = 0;
const carouselEl = document.getElementById('carousel-3d');
const verticalSpacing = 150; // Vertical distance between cards in the helix

// Auto-rotation state
let isCarouselRotating = true;
let isHoveringCarousel = false;
const rotationSpeed = 0.1; // Degrees per frame

function initCarousel() {
    const container = document.getElementById('folders-container');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    // Custom project order (left to right as specified) - chronological
    const projectOrder = [8, 5, 6, 4, 2, 3, 7, 1]; // water drop seq (2026), interactive album (2025), looney gov, re-frame, monsters, spacetech, freetype, clickbait (2024)
    const sortedProjects = projectOrder.map(id => String(id));

    // Create folders for each project
    sortedProjects.forEach((key) => {
        const data = projectsData[key];

        if (typeof Folder !== 'undefined') {
            const folder = new Folder({
                color: '#39FF14', // Green theme
                size: 0.75, // Balanced size for 4+3 grid
                label: data.title,
                projectId: key,
                onClick: (id) => {
                    if (typeof openProject === 'function') {
                        openProject(id);
                    }
                }
            });

            container.appendChild(folder.element);
        }
    });
}

function updateCarouselPosition(totalCards) {
    const angleStep = 90;
    carouselRotation = -1 * carouselIndex * angleStep;
    const verticalShift = -1 * carouselIndex * verticalSpacing;

    if (carouselEl) {
        carouselEl.style.transition = 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)';
        carouselEl.style.transform = `translateY(${verticalShift}px) rotateY(${carouselRotation}deg)`;
    }

    // Update card opacities after position change
    updateCardOpacity();
}

function updateCardOpacity() {
    const cards = document.querySelectorAll('.project-card-3d');

    cards.forEach((card, i) => {
        const distance = Math.abs(i - carouselIndex);

        // Calculate opacity based on distance from active card
        let opacity = 1;
        let scale = 1;

        if (distance === 0) {
            // Active card - full opacity and scale
            opacity = 1;
            scale = 1;

            // Update the year display based on active project
            const projectId = card.getAttribute('data-id');
            if (projectId && projectsData[projectId]) {
                const yearElement = document.getElementById('current-project-year');
                if (yearElement) {
                    yearElement.textContent = projectsData[projectId].year;
                }
            }
        } else if (distance === 1) {
            // Adjacent cards - slightly faded
            opacity = 0.5;
            scale = 0.95;
        } else {
            // Far cards - heavily faded
            opacity = 0.2;
            scale = 0.9;
        }

        // Apply smooth transition
        card.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)';
        card.style.opacity = opacity;

        // Update transform while preserving the helix position
        const angle = 90 * i;
        const yOffset = i * verticalSpacing;
        card.style.transform = `rotateY(${angle}deg) translateZ(${280}px) translateY(${yOffset}px) scale(${scale})`;
    });
}

function rotateCarousel(direction) {
    // direction: 1 (scroll down -> next card), -1 (scroll up -> prev card)

    const totalCards = Object.keys(projectsData).length;

    // Check boundaries - this is a HELIX, not a loop!
    if (direction > 0 && carouselIndex >= totalCards - 1) return false; // Last card, exit to next section
    if (direction < 0 && carouselIndex <= 0) return false; // First card, exit to previous section

    // Update Index
    carouselIndex += direction;

    // Update position with smooth animation
    updateCarouselPosition(totalCards);

    return true; // We handled the scroll
}

// --- 5. PROJECT DETAILS SYSTEM ---
const PROJECT_DATA = {
    "1": {
        title: "CLICKBAIT",
        role: "INTERACTIVE_DEV",
        year: "2024",
        desc: "An interactive exploration of how music acts as a catalyst for presence. This project investigates the digital-physical boundary, using generative audio and visual feedback to create a heightened state of awareness.",
        tech: ["P5.JS", "WEB_AUDIO_API", "GENERATIVE"]
    },
    "2": {
        title: "MONSTERS AS CONFLICT",
        role: "3D_DESIGNER",
        year: "2023",
        desc: "A collaborative archival project with the University of Haifa. We digitized ancient folktale monsters, re-imagining them as 3D artifacts that represent internal human conflicts and cultural memory.",
        tech: ["BLENDER", "THREE.JS", "WEBGL"]
    },
    "3": {
        title: "SPACETECH: SURVIVOR",
        role: "GAME_DEV",
        year: "2023",
        desc: "A retro-futuristic pixel art game concept. Inspired by Game Boy aesthetics, this project focuses on limited-palette visual design and tight gameplay loops centered on survival in a hostile digital vacuum.",
        tech: ["ASEPRITE", "UNITY", "PIXEL_ART"]
    },
    "4": {
        title: "RE-FRAME",
        role: "UX_RESEARCH",
        year: "2022",
        desc: "An interactive editorial interface that challenges the user's perception of truth. By dynamically altering the layout and emphasis of news stories, Re-Frame demonstrates how design dictates narrative.",
        tech: ["REACT", "FRAMER_MOTION", "UX"]
    }
};

// Duplicate initCarousel removed. Logic merged into primary initCarousel above.

const detailOverlay = document.getElementById('project-detail-overlay');
const projectsSection = document.getElementById('projects');

document.getElementById('btn-close-project').addEventListener('click', closeProject);

function openProject(id) {
    if (!PROJECT_DATA[id]) return;
    const data = PROJECT_DATA[id];

    // Populate Data
    document.getElementById('detail-id').textContent = `00${id}`;
    document.getElementById('detail-title').textContent = data.title;
    document.getElementById('detail-role').textContent = data.role;
    document.getElementById('detail-year').textContent = data.year;
    document.getElementById('detail-desc').textContent = data.desc;

    // Tech Stack
    const techContainer = document.getElementById('detail-tech');
    techContainer.innerHTML = '';
    data.tech.forEach(t => {
        const span = document.createElement('span');
        span.className = 'tech-token';
        span.textContent = `[${t}]`;
        techContainer.appendChild(span);
    });

    // Show Overlay as modal popup (don't hide interface)
    detailOverlay.classList.remove('hidden');
    setTimeout(() => {
        detailOverlay.classList.add('active');
    }, 10);
}

function closeProject() {
    // Hide modal overlay
    detailOverlay.classList.remove('active');
    setTimeout(() => {
        detailOverlay.classList.add('hidden');
    }, 400); // Match transition duration
}

// --- 4. THREE.JS BACKGROUND (ADVANCED PARTICLE SYSTEM) ---
// Mobile detection
function isMobileDevice() {
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    return hasTouchScreen && isSmallScreen;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// CONFIG - Reduce particles on mobile
const PARTICLE_COUNT = isMobileDevice() ? 5000 : 20000; // 5k on mobile, 20k on desktop
const MOVEMENT_SPEED = 0.02; // Slower morphing for visible build effect
const MOUSE_Radius = 2.0;
const MOUSE_FORCE = 0.5;

// GEOMETRY DATA
const layouts = {
    sphere: new Float32Array(PARTICLE_COUNT * 3),
    explosion: new Float32Array(PARTICLE_COUNT * 3)
};

// 1. SPHERE LAYOUT (Idle State)
for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const r = 6;
    layouts.sphere[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    layouts.sphere[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    layouts.sphere[i * 3 + 2] = r * Math.cos(phi);
}

// 2. EXPLOSION LAYOUT (Transition State)
for (let i = 0; i < PARTICLE_COUNT; i++) {
    layouts.explosion[i * 3] = (Math.random() - 0.5) * 60; // Wide scatter
    layouts.explosion[i * 3 + 1] = (Math.random() - 0.5) * 60;
    layouts.explosion[i * 3 + 2] = (Math.random() - 0.5) * 60;
}

// CURRENT STATE
let currentPos = new Float32Array(layouts.explosion); // Start SCATTERED
let targetPos = layouts.explosion; // Stay SCATTERED until enter

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(currentPos, 3));

const material = new THREE.PointsMaterial({
    size: 0.08, // Increased size for much better visibility (3.2x larger)
    color: 0x39FF14,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true
});

const particlesMesh = new THREE.Points(geometry, material);
scene.add(particlesMesh);
camera.position.z = 14;

// MOUSE INTERACTION
let mouseX = 0;
let mouseY = 0;
const mouseVector = new THREE.Vector3();

document.addEventListener('mousemove', (e) => {
    // Normalised Device Coordinates
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// SECTION LISTENER TO TRIGGER EXPLODE -> REBUILD
function updateBackgroundState(sectionId) {
    // 1. Trigger Explosion
    targetPos = layouts.explosion;

    // 2. Change Color based on section (only green/white)
    if (sectionId === 'hero') material.color.setHex(0x39FF14);      // Green
    else if (sectionId === 'about') material.color.setHex(0xFFFFFF);  // White
    else if (sectionId === 'projects') material.color.setHex(0x39FF14); // Green
    else if (sectionId === 'contact') material.color.setHex(0xFFFFFF);  // White

    // 3. Rebuild Sphere after a short delay
    setTimeout(() => {
        targetPos = layouts.sphere;
    }, 800);
}

// ANIMATION LOOP
function animate() {
    requestAnimationFrame(animate);

    // Update Mouse In World Space
    mouseVector.set(mouseX, mouseY, 0.5);
    mouseVector.unproject(camera);
    const dir = mouseVector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const mouseWorld = camera.position.clone().add(dir.multiplyScalar(distance));


    const positions = particlesMesh.geometry.attributes.position.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        // 1. MORPHING
        const tx = targetPos[ix];
        const ty = targetPos[iy];
        const tz = targetPos[iz];

        positions[ix] += (tx - positions[ix]) * MOVEMENT_SPEED;
        positions[iy] += (ty - positions[iy]) * MOVEMENT_SPEED;
        positions[iz] += (tz - positions[iz]) * MOVEMENT_SPEED;

        // 2. MOUSE REPULSION
        const dx = positions[ix] - mouseWorld.x;
        const dy = positions[iy] - mouseWorld.y;

        const distSq = dx * dx + dy * dy;

        if (distSq < MOUSE_Radius * MOUSE_Radius) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.1) {
                const force = (MOUSE_Radius - dist) / MOUSE_Radius;
                const repulsionX = (dx / dist) * force * MOUSE_FORCE;
                const repulsionY = (dy / dist) * force * MOUSE_FORCE;

                positions[ix] += repulsionX;
                positions[iy] += repulsionY;
            }
        }
    }

    particlesMesh.geometry.attributes.position.needsUpdate = true;

    // Slow Rotation of the whole system
    particlesMesh.rotation.y += 0.002;
    particlesMesh.rotation.x += (mouseY * 0.2 - particlesMesh.rotation.x) * 0.05;

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- CLOCK ---
function updateClock() {
    const now = new Date();
    const timeString = now.toISOString().split('T')[1].split('.')[0];
    document.getElementById('clock').innerText = timeString + " UTC";
}
setInterval(updateClock, 1000);
updateClock();

// --- BACKGROUND MUSIC CONTROL ---
const bgMusic = document.getElementById('background-music');
const muteBtn = document.getElementById('mute-toggle');
let isMuted = true; // Start muted

if (muteBtn && bgMusic) {
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        bgMusic.muted = isMuted;

        if (isMuted) {
            muteBtn.textContent = 'UNMUTE';
            muteBtn.classList.add('muted');
            bgMusic.pause();
        } else {
            muteBtn.textContent = 'MUTE';
            muteBtn.classList.remove('muted');
            bgMusic.play().catch(e => console.log('Audio play failed:', e));
        }
    });
}

// --- PROJECT DATA ---
const projectsData = {
    1: {
        title: "CLICKBAIT",
        role: "UX/UI",
        year: "2024",
        collab: "OMER SHOSHAN",
        company: "WIX",
        instructor: "RONIT RAZIEL",
        desc: "Created in collaboration with Wix, Clickbait is a fictional electro-pop artist with a fully branded digital identity. The project features a responsive website, custom 3D visuals, and themed merchandise, exploring the intersection of branding, web design, and storytelling.",
        process: "Creating Clickbait allowed us to invent an entire world—from the artist's sound and image to every touchpoint of their digital presence. The project became a playground for experimentation: chrome textures, glitchy typography, surreal compositions, and bold UI interactions.",
        heroImg: "web_media/Screenshot 2025-06-13 at 10.07_edited.jpg",
        heroVideo: { type: 'vimeo', embedCode: '<div style="padding:50.26% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163952724?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="clickbait_hero_compressed"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
        gallery: [
            "web_media/Screenshot 2025-06-13 at 10.07_edited.jpg",
            "web_media/Screenshot 2025-06-13 at 10.07_edited.png",
            "web_media/Screenshot 2025-06-13 at 10.07.43.png",
            "web_media/Screenshot 2025-06-13 at 10.16.38.png",
            "web_media/Screenshot 2025-06-13 at 10.16.52.png",
            "web_media/Screenshot 2025-06-13 at 10.16_edited.jpg",
            "web_media/Screenshot 2025-06-13 at 10.17.10.png"
        ]
    },
    2: {
        title: "MONSTERS",
        role: "3D ARTIST",
        year: "2025",
        desc: "A digital archive of procedurally generated creatures. This project explores organic forms and synthetic textures using Blender and Three.js.",
        heroImg: "monsters_media/Screenshot 2025-09-14 at 12.24.17.png",
        heroVideo: { type: 'vimeo', embedCode: '<div style="padding:177.78% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163952952?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="asmodeus_monster"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
        gallery: [
            { type: 'vimeo', embedCode: '<div style="padding:177.78% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163953011?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="two_sisters_tale"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
            { type: 'vimeo', embedCode: '<div style="padding:177.78% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163953039?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="porsche"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
            { type: 'vimeo', embedCode: '<div style="padding:177.78% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163952979?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="father_commandment"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
            "monsters_media/1.png",
            "monsters_media/Screenshot 2025-09-14 at 12.24.17.png",
            "monsters_media/Screenshot 2025-09-14 at 12.24.26.png",
            "monsters_media/Screenshot 2025-09-14 at 12.25.18 2.png"
        ]
    },
    3: {
        title: "SPACETECH",
        role: "GAME DEV",
        year: "2025",
        desc: "A retro-futuristic pixel art game interface. Designed to simulate the control panel of a deep-space mining vessel.",
        heroImg: "spsacetech_media/Screenshot 2025-06-24 at 15.36.10.png",
        heroVideo: { type: 'vimeo', embedCode: '<div style="padding:66.67% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163953071?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="c3109aad-cd0b-46e5-a5f8-05a5da43cbc0"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
        gallery: [
            "spsacetech_media/Screenshot 2025-06-24 at 15.36.10.png",
            "spsacetech_media/Screenshot 2025-06-24 at 15.36.18.png",
            "spsacetech_media/Screenshot 2025-06-24 at 15.36.28.png",
            "spsacetech_media/Screenshot 2025-06-24 at 15.37.18.png",
            "spsacetech_media/Screenshot 2025-06-24 at 15.37.29.png",
            "spsacetech_media/Screenshot 2025-06-24 at 15.37.43.png",
            "spsacetech_media/Screenshot 2025-06-24 at 15.37.52.png",
            "spsacetech_media/Screenshot 2025-06-24 at 15.38.01.png",
            "spsacetech_media/Screenshot 2025-06-24 at 15.38.14.png",
            "spsacetech_media/backgrond_clean.jpeg",
            "spsacetech_media/logo.png"
        ]
    },
    4: {
        title: "RE-FRAME",
        role: "VISUAL DESIGN",
        year: "2025",
        desc: "An experimental interface challenging the concept of 'truth' in digital media. Interactive layers of distortion reveal hidden messages.",
        heroImg: "reframe_media/Screenshot 2025-08-10 at 15.54.43.png",
        heroVideo: { type: 'vimeo', embedCode: '<div style="padding:56.3% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163953145?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="01 - IMG_2255"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
        gallery: [
            { type: 'vimeo', embedCode: '<div style="padding:71.09% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163953098?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="reframe_recording_compressed"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
            "reframe_media/IMG_2257.jpg",
            "reframe_media/IMG_2258.JPG",
            "reframe_media/IMG_5807.jpeg"
        ]
    },
    5: {
        title: "VICIOUS DELICIOUS",
        role: "INTERACTIVE DESIGN · UX/UI",
        year: "2026",
        desc: "An interactive tribute to Vicious Delicious (2007) by Infected Mushroom, where users control music playback and visuals through real-time hand gestures, turning the album into a performative experience.",
        heroVideo: { type: 'vimeo', embedCode: '<div style="padding:70.08% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163953273?badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="squer_interface_compressed720"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
        gallery: [
            { type: 'vimeo', embedCode: '<div style="padding:100% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163953230?badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="simulation_square_compressed720"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
            "interactive_album/Screenshot 2026-02-02 at 16.39.53.png"
        ]
    },
    6: {
        title: "LOONEY GOV",
        role: "INTERACTIVE DESIGN · UX/UI",
        year: "2026",
        desc: "A humorous and critical interactive remix that blends Looney Tunes characters with the Israeli government, using playfulness to comment on politics, power, and media culture.",
        heroVideo: { type: 'vimeo', embedCode: '<div style="padding:72.6% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163952661?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="interface_compressed"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
        gallery: [
            "looney_gov/Screenshot 2026-02-02 at 15.23.58.png",
            "looney_gov/Screenshot 2026-02-02 at 15.30.40.png",
            "looney_gov/Screenshot 2026-02-02 at 16.08.57.png",
            "looney_gov/Screenshot 2026-02-02 at 16.09.22.png"
        ]
    },
    7: {
        title: "FREE TYPE",
        role: "TYPOGRAPHY DESIGN",
        year: "2025",
        desc: "An experimental typography project combining ready-made letterforms from aerial agricultural imagery and a custom grid-based type system, resulting in the creation of the \"Atomic Font.\"",
        heroVideo: { type: 'vimeo', embedCode: '<div style="padding:100% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163952898?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="Comp 1"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
        gallery: [
            { type: 'vimeo', embedCode: '<div style="padding:100% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163952917?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="Comp 1_1"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
            "free type/final_explosion_font_22.jpg",
            "free type/alphabet.png",
            "free type/poster.png"
        ]
    },
    8: {
        title: "WATER DROP SEQ",
        role: "SENSORY RESEARCH · UX/UI",
        year: "2026",
        desc: "This project was developed as part of a sensory research lab focusing on the sense of direction. Rather than navigation, the project explores spatial awareness and orientation through visual and physical experimentation.",
        tryItUrl: "https://shakedkleter92-ux.github.io/waterdropsequencer/",
        labUrl: "https://www.interlab26.com/home-1-1-1-1",
        heroVideo: {
            type: 'vimeo',
            embedCode: '<div style="padding:177.78% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163956318?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="presentation Weater Drop Seq"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>'
        },
        gallery: [
            { type: 'vimeo', embedCode: '<div style="padding:177.78% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163953761?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="presentation Weater Drop Seq_project"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
            { type: 'vimeo', embedCode: '<div style="padding:100.17% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1163956280?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="12"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>' },
            "waterdrop_seq/1.JPG",
            "waterdrop_seq/2.JPEG",
            "waterdrop_seq/3.JPG",
            "waterdrop_seq/5.JPEG",
            "waterdrop_seq/6.JPG",
            "waterdrop_seq/7.JPEG",
            "waterdrop_seq/8.JPEG",
            "waterdrop_seq/9.JPEG",
            "waterdrop_seq/10.JPEG",
            "waterdrop_seq/11.JPG"
        ]
    }
};

function initProjectInteractions() {
    const cards = document.querySelectorAll('.project-card-3d');
    const overlay = document.getElementById('project-detail-overlay');
    const closeBtn = document.getElementById('btn-close-project');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            if (projectsData[id]) {
                openProject(id);
            }
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeProject);
    }
    initLightbox();
    initGalleryArrows();
}

// Gallery Arrow Navigation
function initGalleryArrows() {
    const leftArrow = document.getElementById('gallery-arrow-left');
    const rightArrow = document.getElementById('gallery-arrow-right');
    const gallery = document.getElementById('project-gallery-grid');

    if (!leftArrow || !rightArrow || !gallery) return;

    const scrollAmount = 300; // pixels to scroll

    leftArrow.addEventListener('click', () => {
        gallery.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', () => {
        gallery.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
}

// Lightbox Logic
function initLightbox() {
    const lightbox = document.getElementById('project-lightbox');
    const closeBtn = document.getElementById('lightbox-close');

    // Close on button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLightbox);
    }
    // Close on background click
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
                closeLightbox();
            }
        });
    }
}

function openLightbox(src, type) {
    const lightbox = document.getElementById('project-lightbox');
    const img = document.getElementById('lightbox-img');
    const video = document.getElementById('lightbox-video');
    const vimeoDiv = document.getElementById('lightbox-vimeo');

    if (!lightbox) return;

    if (type === 'vimeo') {
        // Hide other media types
        img.classList.add('hidden');
        video.classList.add('hidden');
        video.pause();

        // Show and populate Vimeo embed
        vimeoDiv.classList.remove('hidden');
        vimeoDiv.innerHTML = src;
    } else if (type === 'video') {
        img.classList.add('hidden');
        vimeoDiv.classList.add('hidden');
        vimeoDiv.innerHTML = '';

        video.classList.remove('hidden');
        video.src = src;
        video.muted = true; // Ensure video plays without sound
        video.play();
    } else {
        video.classList.add('hidden');
        video.pause();
        vimeoDiv.classList.add('hidden');
        vimeoDiv.innerHTML = '';

        img.classList.remove('hidden');
        img.src = src;
    }

    lightbox.classList.remove('hidden');
    // Force reflow
    void lightbox.offsetWidth;
    lightbox.classList.add('active');
}

function closeLightbox() {
    const lightbox = document.getElementById('project-lightbox');
    const video = document.getElementById('lightbox-video');
    const vimeoDiv = document.getElementById('lightbox-vimeo');

    if (lightbox) {
        lightbox.classList.remove('active');
        setTimeout(() => {
            lightbox.classList.add('hidden');
            if (video) {
                video.pause();
                video.src = "";
            }
            if (vimeoDiv) {
                vimeoDiv.innerHTML = '';
            }
        }, 300);
    }
}

// Helper function to create Vimeo thumbnail
function createVimeoThumbnail(embedCode, index, mediaList) {
    const container = document.createElement('div');
    container.classList.add('media-thumbnail', 'vimeo-thumbnail');

    // Extract video ID from embed code to get thumbnail
    const vimeoIdMatch = embedCode.match(/vimeo\.com\/video\/(\d+)/);
    const vimeoId = vimeoIdMatch ? vimeoIdMatch[1] : null;

    if (vimeoId) {
        // Create a small preview iframe (will be replaced with thumbnail image if possible)
        const preview = document.createElement('div');
        preview.style.cssText = 'width:100%;height:100%;position:relative;background:#000;display:flex;align-items:center;justify-content:center;';

        // Add play icon overlay
        const playIcon = document.createElement('div');
        playIcon.innerHTML = '▶';
        playIcon.style.cssText = 'color:#39FF14;font-size:3rem;pointer-events:none;';
        preview.appendChild(playIcon);

        container.appendChild(preview);

        // Try to fetch Vimeo thumbnail
        fetch(`https://vimeo.com/api/v2/video/${vimeoId}.json`)
            .then(res => res.json())
            .then(data => {
                if (data && data[0] && data[0].thumbnail_large) {
                    preview.style.backgroundImage = `url(${data[0].thumbnail_large})`;
                    preview.style.backgroundSize = 'cover';
                    preview.style.backgroundPosition = 'center';
                }
            })
            .catch(e => console.log('Could not load Vimeo thumbnail:', e));
    } else {
        // Fallback: just show play icon
        container.innerHTML = '<div style="width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;"><span style="color:#39FF14;font-size:3rem;">▶</span></div>';
    }

    // Click handler
    container.addEventListener('click', () => openLightboxWithIndex(embedCode, 'vimeo', mediaList, index));

    return container;
}


function openProject(id) {
    const data = projectsData[id];
    if (!data) return;

    // Save current project ID for navigation
    currentProjectId = id;

    const overlay = document.getElementById('project-detail-overlay');

    // Populate Header Info
    document.getElementById('detail-title').innerText = data.title;
    document.getElementById('detail-year').innerText = data.year;
    document.getElementById('detail-role').innerText = data.role;

    // Populate Description (Shortened? User said "2 lines". We just put the text)
    // Truncating blindly is hard without context, but we can just use the short desc if available, 
    // or just the full desc and let CSS line-clamp if needed. 
    // For now, full desc as per structure, assuming user edits or data is short.
    document.getElementById('detail-desc').innerText = data.desc;

    // Handle "Try It Yourself" button - use data from projectsData
    const tryItBtn = document.getElementById('try-it-btn');
    if (data.tryItUrl) {
        tryItBtn.href = data.tryItUrl;
        tryItBtn.classList.remove('hidden');
    } else if (id === '5') { // Fallback for Infected Mushroom project
        tryItBtn.href = 'https://shakedkleter92-ux.github.io/InteractiveAlbum_InfectedMushroom/';
        tryItBtn.classList.remove('hidden');
    } else if (id === '6') { // Fallback for Looney Gov project
        tryItBtn.href = 'https://shakedkleter92-ux.github.io/LooneyGov/';
        tryItBtn.classList.remove('hidden');
    } else {
        tryItBtn.classList.add('hidden');
    }

    // Handle "Lab Website" button - use data from projectsData
    const labBtn = document.getElementById('lab-website-btn');
    if (data.labUrl) {
        labBtn.href = data.labUrl;
        labBtn.classList.remove('hidden');
    } else {
        labBtn.classList.add('hidden');
    }


    // Build media list for lightbox navigation
    const mediaList = [];

    // Add Hero Video first if exists
    if (data.heroVideo) {
        if (typeof data.heroVideo === 'object' && data.heroVideo.type === 'vimeo') {
            mediaList.push({ src: data.heroVideo.embedCode, type: 'vimeo' });
        } else {
            mediaList.push({ src: data.heroVideo, type: 'video' });
        }
    }

    // Add Gallery Media
    if (data.gallery) {
        data.gallery.forEach(item => {
            if (typeof item === 'object' && item.type === 'vimeo') {
                mediaList.push({ src: item.embedCode, type: 'vimeo' });
            } else if (typeof item === 'string') {
                const ext = item.split('.').pop().toLowerCase();
                if (['mov', 'mp4', 'webm'].includes(ext)) {
                    mediaList.push({ src: item, type: 'video' });
                } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                    mediaList.push({ src: item, type: 'image' });
                }
            }
        });
    }

    // Populate Thumbnail Grid
    const grid = document.getElementById('project-gallery-grid');
    grid.innerHTML = '';

    // Add Hero Video as Thumbnail if exists
    if (data.heroVideo) {
        if (typeof data.heroVideo === 'object' && data.heroVideo.type === 'vimeo') {
            // Create Vimeo thumbnail
            const vimeoThumb = createVimeoThumbnail(data.heroVideo.embedCode, 0, mediaList);
            grid.appendChild(vimeoThumb);
        } else {
            // Local video thumbnail
            const vidThumb = document.createElement('video');
            vidThumb.src = data.heroVideo;
            vidThumb.muted = true;
            vidThumb.classList.add('media-thumbnail');

            // On hover play?
            vidThumb.addEventListener('mouseenter', () => vidThumb.play());
            vidThumb.addEventListener('mouseleave', () => {
                vidThumb.pause();
                vidThumb.currentTime = 0;
            });

            // On click open lightbox with navigation
            vidThumb.addEventListener('click', () => openLightboxWithIndex(data.heroVideo, 'video', mediaList, 0));
            grid.appendChild(vidThumb);
        }
    }

    // Add Gallery Media (videos and images)
    let mediaIndex = data.heroVideo ? 1 : 0; // Start after hero video if exists

    if (data.gallery) {
        data.gallery.forEach(item => {
            const currentIndex = mediaIndex;

            if (typeof item === 'object' && item.type === 'vimeo') {
                // Vimeo embed
                const vimeoThumb = createVimeoThumbnail(item.embedCode, currentIndex, mediaList);
                grid.appendChild(vimeoThumb);
                mediaIndex++;
            } else if (typeof item === 'string') {
                const ext = item.split('.').pop().toLowerCase();

                if (['mov', 'mp4', 'webm'].includes(ext)) {
                    const vidThumb = document.createElement('video');
                    vidThumb.src = item;
                    vidThumb.muted = true;
                    vidThumb.preload = 'metadata'; // Load video metadata
                    vidThumb.playsInline = true; // Required for iOS
                    vidThumb.setAttribute('playsinline', ''); // Also set as attribute
                    vidThumb.classList.add('media-thumbnail');

                    // Add error handling
                    vidThumb.addEventListener('error', (e) => {
                        console.error('Video failed to load:', item, e);
                    });

                    vidThumb.addEventListener('mouseenter', () => vidThumb.play().catch(e => console.log('Play failed:', e)));
                    vidThumb.addEventListener('mouseleave', () => {
                        vidThumb.pause();
                        vidThumb.currentTime = 0;
                    });
                    vidThumb.addEventListener('click', () => openLightboxWithIndex(item, 'video', mediaList, currentIndex));
                    grid.appendChild(vidThumb);
                    mediaIndex++;
                }
                else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                    const img = document.createElement('img');
                    img.src = item;
                    img.classList.add('media-thumbnail');
                    img.addEventListener('click', () => openLightboxWithIndex(item, 'image', mediaList, currentIndex));
                    grid.appendChild(img);
                    mediaIndex++;
                }
            }
        });
    }

    overlay.classList.remove('hidden');

    // ENTER FOCUS MODE (Hide HUD)
    const termFrame = document.querySelector('.terminal-frame');
    if (termFrame) termFrame.classList.add('focus-mode');

    setTimeout(() => {
        // overlay.classList.add('active'); // No active class needed for terminal view if simple display block? 
        // We might want an animation for the terminal frame appearing. 
        // Adding 'active' to overlay can drive the opacity.
        overlay.classList.add('active');
    }, 10);
}

function closeProject() {
    const overlay = document.getElementById('project-detail-overlay');
    overlay.classList.remove('active');

    // EXIT FOCUS MODE (Show HUD)
    const termFrame = document.querySelector('.terminal-frame');
    if (termFrame) termFrame.classList.remove('focus-mode');

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 400); // Faster close
}

// --- PROJECT NAVIGATION ---
let currentProjectId = null;
const projectOrder = [8, 5, 6, 4, 2, 3, 7, 1]; // Same order as in folder display - chronological

function getProjectIds() {
    return projectOrder.map(id => String(id));
}

function navigateProject(direction) {
    const ids = getProjectIds();
    const currentIndex = ids.indexOf(String(currentProjectId));
    if (currentIndex === -1) return;

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = ids.length - 1; // Loop to end
    if (newIndex >= ids.length) newIndex = 0; // Loop to start

    const newId = ids[newIndex];
    openProject(newId);
}

function initProjectNavigation() {
    const prevBtn = document.getElementById('btn-prev-project');
    const nextBtn = document.getElementById('btn-next-project');

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateProject(-1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateProject(1);
        });
    }
}

// --- LIGHTBOX MEDIA NAVIGATION ---
let currentMediaList = [];
let currentMediaIndex = 0;

function navigateLightboxMedia(direction) {
    if (currentMediaList.length === 0) return;

    currentMediaIndex += direction;
    if (currentMediaIndex < 0) currentMediaIndex = currentMediaList.length - 1;
    if (currentMediaIndex >= currentMediaList.length) currentMediaIndex = 0;

    const media = currentMediaList[currentMediaIndex];
    showLightboxMedia(media.src, media.type);
}

function showLightboxMedia(src, type) {
    const img = document.getElementById('lightbox-img');
    const video = document.getElementById('lightbox-video');
    const vimeoDiv = document.getElementById('lightbox-vimeo');

    if (type === 'vimeo') {
        // Hide other media types
        img.classList.add('hidden');
        video.classList.add('hidden');
        video.pause();

        // Show and populate Vimeo embed
        vimeoDiv.classList.remove('hidden');
        vimeoDiv.innerHTML = src;
    } else if (type === 'video') {
        img.classList.add('hidden');
        vimeoDiv.classList.add('hidden');
        vimeoDiv.innerHTML = '';

        video.classList.remove('hidden');
        video.src = src;
        video.muted = true;
        video.play();
    } else {
        video.classList.add('hidden');
        video.pause();
        vimeoDiv.classList.add('hidden');
        vimeoDiv.innerHTML = '';

        img.classList.remove('hidden');
        img.src = src;
    }
}

function openLightboxWithIndex(src, type, mediaList, index) {
    currentMediaList = mediaList;
    currentMediaIndex = index;

    const lightbox = document.getElementById('project-lightbox');
    if (!lightbox) return;

    showLightboxMedia(src, type);

    lightbox.classList.remove('hidden');
    void lightbox.offsetWidth;
    lightbox.classList.add('active');
}

function initLightboxNavigation() {
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateLightboxMedia(-1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateLightboxMedia(1);
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('project-lightbox');
        const overlay = document.getElementById('project-detail-overlay');

        if (lightbox && !lightbox.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') {
                navigateLightboxMedia(-1);
            } else if (e.key === 'ArrowRight') {
                navigateLightboxMedia(1);
            } else if (e.key === 'Escape') {
                closeLightbox();
            }
        } else if (overlay && !overlay.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') {
                navigateProject(-1);
            } else if (e.key === 'ArrowRight') {
                navigateProject(1);
            } else if (e.key === 'Escape') {
                closeProject();
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initProjectInteractions();
    initProjectNavigation();
    initLightboxNavigation();
});
