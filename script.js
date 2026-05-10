const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const btn = document.getElementById('actionBtn');

let particles = [];
let isAssembling = false;
let isStartingToFall = false;
let startTime = 0;
let fallIndex = 0;
let groundHeight = [];

const duration = 10000; 
const textStr = "ง้อน้า แอดมิน มูมู่";

class Particle {
    constructor(tx, ty) {
        this.tx = tx;
        this.ty = ty;
        this.reset();
    }

    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = window.innerHeight - (Math.random() * 10);
        this.vx = 0;
        this.vy = 0;
        this.size = Math.random() * 2 + 0.5;
        this.color = `rgb(${210 + Math.random()*45}, ${165 + Math.random()*40}, ${110 + Math.random()*40})`;
        this.delay = Math.random();
        this.isDropped = false;
        this.isSettled = false;
    }

    update(globalProgress) {
        if (isAssembling && !this.isDropped) {
            let myProgress = Math.max(0, (globalProgress - (this.delay * 0.6))) / 0.4;
            myProgress = Math.min(myProgress, 1);

            if (myProgress > 0) {
                if (myProgress > 0.98) {
                    this.x = this.tx;
                    this.y = this.ty;
                } else {
                    let force = Math.pow(myProgress, 5) * 0.5;
                    this.x += (this.tx - this.x) * force;
                    this.y += (this.ty - this.y) * force;
                }
            }
        }

        if (this.isDropped && !this.isSettled) {
            this.vy += 0.25; 
            this.y += this.vy;
            this.x += Math.sin(Date.now() * 0.01 + this.delay) * 0.5;

            let gx = Math.floor(this.x);
            if (gx >= 0 && gx < groundHeight.length) {
                if (this.y >= groundHeight[gx]) {
                    this.y = groundHeight[gx];
                    this.isSettled = true;
                    for(let i = -2; i <= 2; i++) {
                        if (gx + i >= 0 && gx + i < groundHeight.length) {
                            groundHeight[gx + i] -= (0.5 / (Math.abs(i) + 1));
                        }
                    }
                }
            }
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

function init() {
    // ตั้งค่าความละเอียดสำหรับมือถือ
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);

    groundHeight = new Array(Math.ceil(window.innerWidth)).fill(window.innerHeight);
    particles = [];
    fallIndex = 0;

    const isPortrait = window.innerHeight > window.innerWidth;
    const fontSize = isPortrait ? window.innerWidth * 0.12 : Math.min(window.innerWidth * 0.09, 85);
    
    ctx.font = `bold ${fontSize}px Tahoma`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // วาดข้อความลง Buffer ก่อนสแกนพิกเซล
    if (isPortrait) {
        ctx.fillText("ง้อน้าแอดมิน", window.innerWidth / 2, window.innerHeight / 2.8);
        ctx.fillText("มูมู่", window.innerWidth / 2, window.innerHeight / 2.8 + fontSize);
    } else {
        ctx.fillText(textStr, window.innerWidth / 2, window.innerHeight / 2.5);
    }

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // ปรับความละเอียดการสแกนตามประเภทอุปกรณ์ (มือถือสแกนห่างขึ้นเล็กน้อยเพื่อความลื่น)
    const step = isPortrait ? 3 : 2;
    for (let y = 0; y < canvas.height; y += step * dpr) {
        for (let x = 0; x < canvas.width; x += step * dpr) {
            const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
            if (data[index + 3] > 128) {
                particles.push(new Particle(x / dpr, y / dpr));
            }
        }
    }
    particles.sort(() => Math.random() - 0.5);
}

function animate() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    let globalProgress = 0;
    if (isAssembling) {
        let elapsed = Date.now() - startTime;
        globalProgress = Math.min(elapsed / duration, 1);
        if (globalProgress >= 1) isStartingToFall = true;
    }

    if (isStartingToFall && fallIndex < particles.length) {
        // ปรับจำนวนเม็ดที่ร่วงต่อเฟรมให้ลื่นไหล (มือถือร่วงทีละ 5 เม็ด)
        const dropsPerFrame = window.innerHeight > window.innerWidth ? 5 : 3;
        for(let i = 0; i < dropsPerFrame; i++) {
            if(fallIndex < particles.length) {
                particles[fallIndex].isDropped = true;
                fallIndex++;
            }
        }
    }

    if (isStartingToFall && fallIndex >= particles.length) {
        if (particles.every(p => p.isSettled)) {
            btn.classList.remove('hidden');
            btn.innerText = "กดสิมูมู่";
            isAssembling = false;
            isStartingToFall = false;
        }
    }

    particles.forEach(p => {
        p.update(globalProgress);
        p.draw();
    });

    requestAnimationFrame(animate);
}

// รองรับทั้ง Click และ Touch
btn.addEventListener('click', startEffect);
btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startEffect();
}, {passive: false});

function startEffect() {
    if (!isAssembling) {
        isAssembling = true;
        isStartingToFall = false;
        fallIndex = 0;
        startTime = Date.now();
        particles.forEach(p => {
            p.isDropped = false;
            p.isSettled = false;
            p.vx = 0;
            p.vy = 0;
        });
        btn.classList.add('hidden');
    }
}

window.addEventListener('resize', init);
// ป้องกันการเลื่อนหน้าจอ (Scrolling) บนมือถือขณะเล่น
window.addEventListener('touchmove', (e) => {
    if (isAssembling) e.preventDefault();
}, { passive: false });

init();
animate();