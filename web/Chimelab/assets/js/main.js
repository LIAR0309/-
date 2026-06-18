// ==============================
// Chimelab - メインスクリプト
// 既存機能 + 動的デザイン強化 10項目
// ==============================

// ハンバーガーメニュー
const menuToggle = document.getElementById("menu-toggle");
const nav = document.getElementById("nav");

menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    nav.classList.toggle("active");
});

document.querySelectorAll('.nav a').forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove("active");
        nav.classList.remove("active");
    });
});

// スムーズスクロール
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        const target = document.querySelector(href);
        if (target) {
            const headerHeight = 60;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
    });
});

// === ライバーポップアップ ===
const popupArea = document.getElementById('liver-popup-area');
const popupCloseBtn = document.getElementById('liver-popup-close');
const popupPrevBtn = document.getElementById('liver-popup-prev');
const popupNextBtn = document.getElementById('liver-popup-next');
const allPopupCards = document.querySelectorAll('.liver-popup-card');
const liverCards = document.querySelectorAll('.liver-grid .liver-card');
const liverIdList = Array.from(allPopupCards).map(card => card.id);
let currentLiverIndex = -1;

function showLiverPopup(liverId) {
    currentLiverIndex = liverIdList.indexOf(liverId);
    if (currentLiverIndex === -1) return;
    allPopupCards.forEach(card => {
        card.style.display = 'none';
        card.classList.remove('liver-popup-animate', 'liver-popup-closing');
    });
    const targetCard = document.getElementById(liverId);
    if (targetCard) {
        popupArea.style.display = 'block';
        targetCard.style.display = 'flex';
        requestAnimationFrame(() => targetCard.classList.add('liver-popup-animate'));
        setTimeout(() => {
            const pos = popupArea.getBoundingClientRect().top + window.pageYOffset - 60;
            window.scrollTo({ top: pos, behavior: 'smooth' });
        }, 50);
    }
    liverCards.forEach(card => card.classList.remove('liver-card-active'));
    const clickedCard = document.querySelector(`.liver-card[href="#${liverId}"]`);
    if (clickedCard) clickedCard.classList.add('liver-card-active');
}

function navigateLiver(direction) {
    if (currentLiverIndex === -1) return;
    let newIndex = currentLiverIndex + direction;
    if (newIndex < 0) newIndex = liverIdList.length - 1;
    if (newIndex >= liverIdList.length) newIndex = 0;
    showLiverPopup(liverIdList[newIndex]);
}

function closeLiverPopup() {
    const visibleCard = document.querySelector('.liver-popup-card.liver-popup-animate');
    if (visibleCard) {
        visibleCard.classList.remove('liver-popup-animate');
        visibleCard.classList.add('liver-popup-closing');
        setTimeout(() => {
            visibleCard.classList.remove('liver-popup-closing');
            visibleCard.style.display = 'none';
            popupArea.style.display = 'none';
        }, 350);
    } else {
        popupArea.style.display = 'none';
    }
    currentLiverIndex = -1;
    liverCards.forEach(card => card.classList.remove('liver-card-active'));
}

liverCards.forEach(card => {
    card.addEventListener('click', function (e) {
        e.preventDefault();
        showLiverPopup(this.getAttribute('href').substring(1));
    });
});
popupCloseBtn.addEventListener('click', closeLiverPopup);
popupPrevBtn.addEventListener('click', () => navigateLiver(-1));
popupNextBtn.addEventListener('click', () => navigateLiver(1));

// スワイプ
let touchStartX = 0, touchEndX = 0, touchStartY = 0, touchEndY = 0;
popupArea.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });
popupArea.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        diffX > 0 ? navigateLiver(-1) : navigateLiver(1);
    }
}, { passive: true });

// ヘッダー変化
window.addEventListener('scroll', () => {
    document.querySelector('.header').classList.toggle('scrolled', window.scrollY > 50);
});

// 衣装プリロード & 切り替え
document.querySelectorAll('img[data-outfit-new]').forEach(img => {
    const preload = new Image();
    preload.src = img.dataset.outfitNew;
});
document.querySelectorAll('.outfit-toggle').forEach(toggle => {
    toggle.querySelectorAll('.outfit-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const wrapper = this.closest('.outfit-image-wrapper');
            const img = wrapper.querySelector('img');
            const newSrc = this.dataset.outfit === 'new' ? img.dataset.outfitNew : img.dataset.outfitOld;
            if (img.src.endsWith(newSrc)) return;
            toggle.querySelectorAll('.outfit-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            img.classList.add('outfit-switching');
            setTimeout(() => {
                img.src = newSrc;
                img.onload = () => img.classList.remove('outfit-switching');
            }, 300);
        });
    });
});

// オープニング演出
window.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem('introPlayed')) {
        document.body.classList.remove("is-intro");
        document.body.classList.add("skip-intro");
    } else {
        sessionStorage.setItem('introPlayed', 'true');
        setTimeout(() => document.body.classList.remove("is-intro"), 4500);
    }
});

// イースターエッグ
const easterEggTrigger = document.getElementById('easter-egg-trigger');
if (easterEggTrigger) {
    let clickCount = 0, clickTimeout;
    easterEggTrigger.addEventListener('click', () => {
        clickCount++;
        if (clickCount >= 3) window.location.href = 'game/index.html';
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => { clickCount = 0; }, 1000);
    });
}

// 画像保護
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if (isLocalhost) { document.documentElement.classList.add('is-dev'); }
if (!isLocalhost) {
    document.addEventListener('contextmenu', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });
    document.addEventListener('dragstart', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12') { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && ['s','S','u','U'].includes(e.key)) { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && ['i','I','j','J','c','C'].includes(e.key)) { e.preventDefault(); return false; }
    });
}

// ==============================
// 新機能: 動的デザイン強化 10項目
// ==============================

// === ② Scroll Progress Bar ===
const progressBar = document.getElementById('scroll-progress');
if (progressBar) {
    window.addEventListener('scroll', () => {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.width = (docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0) + '%';
    }, { passive: true });
}

// === ⑩ Scroll Indicator (hide on scroll) ===
const scrollIndicator = document.getElementById('scroll-indicator');
if (scrollIndicator) {
    window.addEventListener('scroll', () => {
        scrollIndicator.classList.toggle('hidden', window.scrollY > 200);
    }, { passive: true });
}

// === ① Scroll Reveal Animations ===
function setupRevealAnimations() {
    // セクション見出し・説明文
    document.querySelectorAll('.section h2, .section-desc, .more-link').forEach(el => el.classList.add('reveal'));

    // 大きなブロック
    document.querySelectorAll('.about-box, .apply-box, .flow-section, #stats-row').forEach(el => el.classList.add('reveal'));

    // ガイドラインカード
    document.querySelectorAll('.guidelines-section .feature-card').forEach(el => el.classList.add('reveal'));

    // カード系要素にスタガーリビール
    ['.features-grid .feature-card', '.support-cards .support-card', '.news-list .news-item', '.info-grid .info-item'].forEach(sel => {
        document.querySelectorAll(sel).forEach((el, i) => {
            el.classList.add('reveal');
            if (i < 5) el.classList.add('reveal-d' + (i + 1));
        });
    });

    // ライバーカード（交互スライド）
    document.querySelectorAll('.liver-grid .liver-card').forEach((el, i) => {
        el.classList.add(i % 2 === 0 ? 'reveal-left' : 'reveal-right');
        if (i < 5) el.classList.add('reveal-d' + (i + 1));
    });

    // Intersection Observer
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => obs.observe(el));
}

// === ④ Floating Particles ===
function createParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    const colors = ['purple', 'pink', 'cyan'];
    const count = window.innerWidth < 768 ? 10 : 20;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 8 + 4;
        p.className = 'particle particle--' + color;
        p.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (Math.random()*100) + '%;bottom:-20px;animation:particleRise ' + (Math.random()*6+6) + 's ' + (Math.random()*8) + 's linear infinite;';
        container.appendChild(p);
    }
}

// === ⑤ Section Wave Dividers ===
function createWaveDividers() {
    const transitions = [
        { after: '.hero', fill: '#faf9ff' },
        { after: '#news', fill: '#ffffff' },
        { after: '#livers', fill: '#ffffff' },
        { after: '#about', fill: '#faf9ff' },
        { after: '#features', fill: '#ffffff' },
        { after: '#support', fill: '#faf9ff' },
        { after: '#guidelines', fill: '#ffffff' }
    ];
    transitions.forEach(function(t) {
        const section = document.querySelector(t.after);
        if (!section) return;
        const wave = document.createElement('div');
        wave.className = 'wave-divider';
        wave.innerHTML = '<svg viewBox="0 0 1440 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0,25 C120,40 240,10 360,20 C480,30 600,8 720,22 C840,36 960,12 1080,24 C1200,36 1320,16 1440,28 L1440,40 L0,40 Z" fill="' + t.fill + '"/></svg>';
        section.parentNode.insertBefore(wave, section.nextSibling);
    });
}

// === ⑥ Liver Card Tilt Effect ===
function setupTiltEffect() {
    if (window.innerWidth < 768) return;
    document.querySelectorAll('.liver-grid .liver-card').forEach(function(card) {
        card.addEventListener('mousemove', function(e) {
            const rect = card.getBoundingClientRect();
            const rX = ((e.clientY - rect.top) - rect.height / 2) / (rect.height / 2) * -8;
            const rY = ((e.clientX - rect.left) - rect.width / 2) / (rect.width / 2) * 8;
            card.style.transform = 'perspective(600px) rotateX(' + rX + 'deg) rotateY(' + rY + 'deg) translateY(-6px)';
        });
        card.addEventListener('mouseleave', function() {
            card.style.transform = '';
        });
    });
}

// === ⑦ Flow Steps Sequential Animation ===
function setupFlowAnimation() {
    const items = document.querySelectorAll('.flow-step, .flow-arrow');
    if (!items.length) return;
    const obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                items.forEach(function(item, i) {
                    setTimeout(function() { item.classList.add('step-visible'); }, i * 180);
                });
                obs.disconnect();
            }
        });
    }, { threshold: 0.2 });
    obs.observe(items[0]);
}

// === ③ Count-Up Animation ===
function setupCountUp() {
    const statsRow = document.getElementById('stats-row');
    if (!statsRow) return;
    let counted = false;
    const obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting && !counted) {
                counted = true;
                statsRow.querySelectorAll('.stat-number').forEach(function(counter) {
                    const target = parseInt(counter.getAttribute('data-count'));
                    const duration = 1500;
                    const startTime = performance.now();
                    function tick(now) {
                        const progress = Math.min((now - startTime) / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        counter.textContent = Math.floor(eased * target);
                        if (progress < 1) requestAnimationFrame(tick);
                        else counter.textContent = target;
                    }
                    requestAnimationFrame(tick);
                });
            }
        });
    }, { threshold: 0.5 });
    obs.observe(statsRow);
}

// === ニューススライダー（index.html） ===
function setupNewsSlider() {
    const track = document.getElementById('news-slider-track');
    const prevBtn = document.getElementById('news-slider-prev');
    const nextBtn = document.getElementById('news-slider-next');
    const dotsContainer = document.getElementById('news-slider-dots');
    const slides = document.querySelectorAll('.news-slider-slide');
    
    if (!track || slides.length === 0) return;
    
    let currentIndex = 0;
    const slideCount = slides.length;
    let autoPlayInterval;
    
    // ドットの生成
    dotsContainer.innerHTML = '';
    for (let i = 0; i < slideCount; i++) {
        const dot = document.createElement('button');
        dot.className = 'news-slider-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `スライド ${i + 1}`);
        dot.addEventListener('click', () => {
            goToSlide(i);
            resetAutoPlay();
        });
        dotsContainer.appendChild(dot);
    }
    
    const dots = dotsContainer.querySelectorAll('.news-slider-dot');
    
    function updateSlider() {
        // トラックを動かす
        track.style.transform = `translateX(-${currentIndex * (100 / slideCount)}%)`;
        
        // ドットの更新
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }
    
    function goToSlide(index) {
        currentIndex = index;
        if (currentIndex < 0) currentIndex = slideCount - 1;
        if (currentIndex >= slideCount) currentIndex = 0;
        updateSlider();
    }
    
    function nextSlide() {
        goToSlide(currentIndex + 1);
    }
    
    function prevSlide() {
        goToSlide(currentIndex - 1);
    }
    
    // 矢印ボタンのイベント
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoPlay();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoPlay();
        });
    }
    
    // 自動再生 (5.5秒ごとにローテーション)
    let isHovered = false;

    function startAutoPlay() {
        clearInterval(autoPlayInterval);
        if (!isHovered) {
            autoPlayInterval = setInterval(nextSlide, 5500);
        }
    }

    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }

    // マウスホバーで自動再生完全停止（ホバー中はスライド禁止）
    const sliderContainer = document.querySelector('.news-slider-container');
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', () => {
            isHovered = true;
            clearInterval(autoPlayInterval);
        });
        sliderContainer.addEventListener('mouseleave', () => {
            isHovered = false;
            startAutoPlay();
        });
    }

    // スマホ版のみ、スワイプ操作で左右のスライド切り替えを有効化
    let sliderTouchStartX = 0;
    let sliderTouchEndX = 0;

    track.addEventListener('touchstart', (e) => {
        if (window.innerWidth > 768) return; // スマホ版のみ
        sliderTouchStartX = e.changedTouches[0].screenX;
        isHovered = true; // スワイプ操作中は自動再生を一時停止
        clearInterval(autoPlayInterval);
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        if (window.innerWidth > 768) return;
        sliderTouchEndX = e.changedTouches[0].screenX;
        const diffX = sliderTouchStartX - sliderTouchEndX;
        
        // 50px以上スワイプされたら切り替える
        if (Math.abs(diffX) > 50) {
            if (diffX > 0) {
                nextSlide(); // 左へスワイプ -> 次のスライドへ
            } else {
                prevSlide(); // 右へスワイプ -> 前のスライドへ
            }
        }
        
        isHovered = false;
        resetAutoPlay();
    }, { passive: true });

    startAutoPlay();
}
// === 全機能初期化 ===
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    createWaveDividers();
    setupRevealAnimations();
    setupTiltEffect();
    setupFlowAnimation();
    setupCountUp();
    setupNewsSlider();
});
