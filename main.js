/* ============================================
   Danny Ahn Portfolio — Shared Interactions
   Particles · Kinetic type · Counters · Magnetic buttons · Custom cursor
   ============================================ */

// ============================================
// THREE.JS PARTICLE BACKGROUND (hero only)
// ============================================
(function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    // Particle count based on device capability
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 150 : 400;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const colorPalette = [
        new THREE.Color(0x3b82f6), // blue
        new THREE.Color(0x06b6d4), // cyan
        new THREE.Color(0x8b5cf6)  // purple
    ];

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i * 3]     = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = Math.random() * 0.05 + 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const vertexShader = `
        attribute float size;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (200.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const fragmentShader = `
        varying vec3 vColor;
        void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            gl_FragColor = vec4(vColor, alpha * 0.6);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Connection lines between nearby particles
    const linePositions = [];
    const maxDist = 2.5;
    for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
            const dx = positions[i * 3] - positions[j * 3];
            const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
            const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
            if (Math.sqrt(dx*dx + dy*dy + dz*dz) < maxDist) {
                linePositions.push(
                    positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
                    positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
                );
            }
        }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
    }));
    scene.add(lines);

    camera.position.z = 5;

    // Mouse parallax
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    let animationId;
    function animate() {
        animationId = requestAnimationFrame(animate);
        particles.rotation.y += 0.001;
        lines.rotation.y += 0.001;
        camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }

    animate();

    // Pause when tab hidden (battery saving)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(animationId);
        else animate();
    });
})();

// ============================================
// GSAP KINETIC TYPOGRAPHY (hero only, per 2026 research: use sparingly)
// ============================================
(function initKineticType() {
    const nameEl = document.getElementById('nameText');
    if (!nameEl || typeof gsap === 'undefined') return;

    // Split into individual characters
    const text = nameEl.textContent;
    nameEl.innerHTML = '';
    [...text].forEach((char, i) => {
        const span = document.createElement('span');
        span.className = 'letter';
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.transform = 'translateY(40px) rotateX(-90deg)';
        // Each letter gets its own slice of the gradient so the fill
        // stays visible even when background-clip is applied per-letter.
        const n = text.length;
        span.style.backgroundImage = getComputedStyle(document.documentElement).getPropertyValue('--accent-gradient');
        span.style.backgroundSize = `${n * 100}% 100%`;
        span.style.backgroundPositionX = `${(i / n) * 100}%`;
        span.style.webkitBackgroundClip = 'text';
        span.style.backgroundClip = 'text';
        span.style.webkitTextFillColor = 'transparent';
        // Solid fallback if the browser can't clip: letter stays white
        if (!CSS.supports('-webkit-background-clip', 'text') && !CSS.supports('background-clip', 'text')) {
            span.style.color = '#f0f0f5';
            span.style.webkitTextFillColor = '';
        }
        span.textContent = char === ' ' ? '\u00A0' : char;
        nameEl.appendChild(span);
    });

    const letters = nameEl.querySelectorAll('.letter');

    // Fallback: if GSAP never runs, make sure the name is still visible
    setTimeout(() => {
        if (typeof gsap === 'undefined') {
            letters.forEach(l => { l.style.opacity = '1'; l.style.transform = 'none'; });
        }
    }, 2500);

    gsap.to(letters, {
        opacity: 1, y: 0, rotateX: 0,
        duration: 0.8, stagger: 0.05,
        ease: 'back.out(1.7)', delay: 0.3
    });

    // Eyebrow line types in
    const eyebrow = document.getElementById('eyebrowText');
    if (eyebrow) {
        gsap.from(eyebrow, { opacity: 0, y: -12, duration: 0.6, delay: 0.15, ease: 'power3.out' });
    }

    // Subtitle fade in
    const subtitle = document.getElementById('subtitleText');
    if (subtitle) {
        gsap.from(subtitle, { opacity: 0, y: 20, duration: 1, delay: 1.2, ease: 'power3.out' });
    }

    // CTA buttons stagger
    const ctas = document.getElementById('ctaRow');
    if (ctas) {
        gsap.from(ctas.children, { opacity: 0, y: 20, duration: 0.8, stagger: 0.15, delay: 1.5, ease: 'power3.out' });
    }
})();

// ============================================
// NUMBER COUNTER ANIMATION (bento stat tiles)
// ============================================
(function initCounters() {
    function animateCounter(elementId, target, suffix = '') {
        const el = document.getElementById(elementId);
        if (!el) return;

        let current = 0;
        const duration = 2000;
        const steps = 60;
        const increment = target / steps;
        const stepDuration = duration / steps;

        function update() {
            current += increment;
            if (current >= target) {
                el.textContent = target + suffix;
                return;
            }
            el.textContent = Math.floor(current) + suffix;
            setTimeout(update, stepDuration);
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    update();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(el);
    }

    animateCounter('counter1', 20, '+');
    animateCounter('counter2', 50, '+');
})();

// ============================================
// MAGNETIC BUTTONS (attract cursor when near)
// ============================================
(function initMagnetic() {
    if (window.matchMedia('(pointer: coarse)').matches) return; // touch devices skip

    document.querySelectorAll('.magnetic').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
            btn.style.transform = 'translate(0, 0)';
            setTimeout(() => { btn.style.transition = ''; }, 400);
        });
    });

    // Softer magnetic pull on bento tiles (content shifts slightly toward cursor)
    document.querySelectorAll('.magnetic-hover').forEach(tile => {
        tile.addEventListener('mousemove', (e) => {
            const rect = tile.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            // Subtle 3D tilt toward cursor
            const rx = ((y / rect.height) - 0.5) * -4;
            const ry = ((x / rect.width) - 0.5) * 4;
            tile.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        });

        tile.addEventListener('mouseleave', () => {
            tile.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
            tile.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
            setTimeout(() => { tile.style.transition = ''; }, 500);
        });
    });
})();

// ============================================
// CUSTOM CURSOR (dot + ring, desktop only)
// ============================================
(function initCursor() {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;
    if (window.matchMedia('(pointer: coarse)').matches) return; // touch devices skip

    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', (e) => {
        mx = e.clientX;
        my = e.clientY;
        dot.style.left = mx + 'px';
        dot.style.top = my + 'px';
    });

    // Ring follows with delay
    function followRing() {
        rx += (mx - rx) * 0.15;
        ry += (my - ry) * 0.15;
        ring.style.left = rx + 'px';
        ring.style.top = ry + 'px';
        requestAnimationFrame(followRing);
    }
    followRing();

    // Grow ring over interactive elements
    document.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('mouseenter', () => {
            dot.classList.add('is-active');
            ring.classList.add('is-active');
        });
        el.addEventListener('mouseleave', () => {
            dot.classList.remove('is-active');
            ring.classList.remove('is-active');
        });
    });
})();

// ============================================
// MOBILE MENU TOGGLE (all pages)
// ============================================
(function initMobileMenu() {
    const mobileToggle = document.getElementById('mobileToggle');
    const mobileNav = document.getElementById('mobileNav');

    if (!mobileToggle || !mobileNav) return;

    mobileToggle.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
        mobileToggle.classList.toggle('active');
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            mobileToggle.classList.remove('active');
        });
    });
})();

// ============================================
// REVEAL ON SCROLL (bento tiles, sections)
// ============================================
(function initReveal() {
    const targets = document.querySelectorAll('.reveal-on-scroll');
    if (!targets.length) return;

    // CSS scroll-driven animation handles the visual reveal where supported.
    // For browsers without it, add .in-view via IntersectionObserver so
    // skill bars and any JS-driven reveals still fire.
    if (CSS.supports && CSS.supports('animation-timeline', 'view()')) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => observer.observe(el));
})();

// ============================================
// SMOOTH SCROLL for in-page anchors (all pages)
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
