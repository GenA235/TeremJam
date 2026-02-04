/*
	Program Carousel Controller
	Простая карусель с scroll-snap
*/

(function() {
	'use strict';

	const carousels = [
		{ id: 'programCarousel', dotsId: 'programCarouselDots' },
		{ id: 'aboutCarousel', dotsId: 'aboutCarouselDots' },
		{ id: 'lineupCarousel', dotsId: 'lineupCarouselDots' },
		{ id: 'joinCarousel', dotsId: 'joinCarouselDots' },
		{ id: 'festivalProgramCarousel', dotsId: 'festivalProgramCarouselDots' },
		{ id: 'timetableCarousel', dotsId: 'timetableCarouselDots' }
	];

	function init() {
		carousels.forEach(function(config) {
			initCarousel(config.id, config.dotsId);
		});

		// Переинициализация при изменении размера окна
		let resizeTimer;
		window.addEventListener('resize', function() {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function() {
				carousels.forEach(function(config) {
					reinitCarousel(config.id, config.dotsId);
				});
			}, 250);
		});
	}

	function initCarousel(carouselId, dotsId) {
		const carousel = document.getElementById(carouselId);
		const dotsContainer = document.getElementById(dotsId);
		
		if (!carousel || !dotsContainer) return;

		const cards = carousel.querySelectorAll('.tz-program-card');
		if (cards.length === 0) return;

		// Создаем индикаторы только для мобильных
		if (window.innerWidth <= 736) {
			createDots(cards.length, dotsContainer);
			setupScrollSync(carouselId, carousel, cards, dotsContainer);
			setupDotsNavigation(carouselId, carousel, cards);
		}
	}

	function reinitCarousel(carouselId, dotsId) {
		const carousel = document.getElementById(carouselId);
		const dotsContainer = document.getElementById(dotsId);
		
		if (!carousel || !dotsContainer) return;

		const cards = carousel.querySelectorAll('.tz-program-card');
		if (cards.length === 0) return;

		// Очищаем старые индикаторы
		dotsContainer.innerHTML = '';

		// Переинициализируем для нового размера
		if (window.innerWidth <= 736) {
			createDots(cards.length, dotsContainer);
			setupScrollSync(carouselId, carousel, cards, dotsContainer);
			setupDotsNavigation(carouselId, carousel, cards);
		}
	}

	function createDots(count, container) {
		container.innerHTML = '';
		for (let i = 0; i < count; i++) {
			const dot = document.createElement('button');
			dot.className = 'tz-program-carousel-dot';
			if (i === 0) {
				dot.classList.add('active');
			}
			dot.setAttribute('aria-label', `Перейти к слайду ${i + 1}`);
			dot.setAttribute('data-index', i);
			container.appendChild(dot);
		}
	}

	// Простая синхронизация индикаторов с позицией прокрутки
	function setupScrollSync(carouselId, carousel, cards, dotsContainer) {
		let scrollTimeout;
		
		carousel.addEventListener('scroll', function() {
			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(function() {
				updateDotsFromScroll(carousel, cards, dotsContainer);
			}, 100);
		}, { passive: true });
	}

	function updateDotsFromScroll(carousel, cards, dotsContainer) {
		const scrollLeft = carousel.scrollLeft;
		const cardWidth = cards[0] ? cards[0].offsetWidth : 0;
		const gap = 16; // 1rem = 16px
		const cardWithGap = cardWidth + gap;

		// Находим ближайшую карточку
		let closestIndex = 0;
		let minDistance = Infinity;

		cards.forEach((card, index) => {
			const cardLeft = index * cardWithGap;
			const distance = Math.abs(scrollLeft - cardLeft);
			if (distance < minDistance) {
				minDistance = distance;
				closestIndex = index;
			}
		});

		// Обновляем индикаторы
		const dots = dotsContainer.querySelectorAll('.tz-program-carousel-dot');
		dots.forEach((dot, i) => {
			if (i === closestIndex) {
				dot.classList.add('active');
			} else {
				dot.classList.remove('active');
			}
		});
	}

	function setupDotsNavigation(carouselId, carousel, cards) {
		// Находим соответствующий контейнер точек
		let dotsContainerId = '';
		carousels.forEach(function(config) {
			if (config.id === carouselId) {
				dotsContainerId = config.dotsId;
			}
		});

		if (!dotsContainerId) return;

		const dotsContainer = document.getElementById(dotsContainerId);
		if (!dotsContainer) return;

		const dots = dotsContainer.querySelectorAll('.tz-program-carousel-dot');
		dots.forEach((dot, index) => {
			dot.addEventListener('click', function() {
				const card = cards[index];
				if (!card) return;

				const cardWidth = card.offsetWidth;
				const gap = 16; // 1rem = 16px
				const cardWithGap = cardWidth + gap;
				const scrollPosition = index * cardWithGap;

				carousel.scrollTo({
					left: scrollPosition,
					behavior: 'smooth'
				});
			});
		});
	}

	// Инициализация при загрузке DOM
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();
