/*
	Program Carousel Controller
	Автопрокрутка и swipe-жесты для мобильной карусели
	Поддерживает несколько каруселей на странице
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

	const carouselData = {};

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

		// Инициализируем данные карусели
		carouselData[carouselId] = {
			currentIndex: 0,
			touchStartX: 0,
			touchEndX: 0,
			isUserInteracting: false,
			cards: cards
		};

		// Создаем индикаторы только для мобильных
		if (window.innerWidth <= 736) {
			createDots(cards.length, dotsContainer);
			setupSwipe(carouselId, carousel, cards);
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
			setupSwipe(carouselId, carousel, cards);
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

	function setupSwipe(carouselId, carousel, cards) {
		const data = carouselData[carouselId];
		if (!data) return;

		// Отслеживаем прокрутку для синхронизации индекса
		let scrollTimeout;
		carousel.addEventListener('scroll', function() {
			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(function() {
				updateCurrentIndexFromScroll(carouselId, carousel, cards);
			}, 100);
		}, { passive: true });

		// Touch события для swipe
		carousel.addEventListener('touchstart', function(e) {
			data.touchStartX = e.changedTouches[0].screenX;
			data.isUserInteracting = true;
		}, { passive: true });

		carousel.addEventListener('touchend', function(e) {
			data.touchEndX = e.changedTouches[0].screenX;
			handleSwipe(carouselId, carousel, cards);
			data.isUserInteracting = false;
		}, { passive: true });

		// Mouse события для десктопа (если нужно)
		let mouseStartX = 0;
		let isMouseDown = false;

		carousel.addEventListener('mousedown', function(e) {
			if (window.innerWidth <= 736) {
				mouseStartX = e.clientX;
				isMouseDown = true;
				data.isUserInteracting = true;
			}
		});

		carousel.addEventListener('mouseup', function(e) {
			if (isMouseDown && window.innerWidth <= 736) {
				const mouseEndX = e.clientX;
				const diff = mouseStartX - mouseEndX;
				
				if (Math.abs(diff) > 50) {
					if (diff > 0) {
						// Swipe влево - следующий слайд
						const nextIndex = Math.min(data.currentIndex + 1, cards.length - 1);
						scrollToCard(carouselId, carousel, cards, nextIndex);
					} else {
						// Swipe вправо - предыдущий слайд
						const prevIndex = Math.max(data.currentIndex - 1, 0);
						scrollToCard(carouselId, carousel, cards, prevIndex);
					}
				}
				
				isMouseDown = false;
				data.isUserInteracting = false;
			}
		});

		carousel.addEventListener('mouseleave', function() {
			isMouseDown = false;
		});
	}

	// Обновляем текущий индекс на основе позиции прокрутки
	function updateCurrentIndexFromScroll(carouselId, carousel, cards) {
		const data = carouselData[carouselId];
		if (!data) return;

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

		if (data.currentIndex !== closestIndex) {
			data.currentIndex = closestIndex;
			updateDots(carouselId, closestIndex);
		}
	}

	function handleSwipe(carouselId, carousel, cards) {
		const data = carouselData[carouselId];
		if (!data) return;

		const swipeThreshold = 50;
		const diff = data.touchStartX - data.touchEndX;

		if (Math.abs(diff) > swipeThreshold) {
			if (diff > 0) {
				// Swipe влево (палец двигался влево) - следующий слайд
				const nextIndex = Math.min(data.currentIndex + 1, cards.length - 1);
				scrollToCard(carouselId, carousel, cards, nextIndex);
			} else {
				// Swipe вправо (палец двигался вправо) - предыдущий слайд
				const prevIndex = Math.max(data.currentIndex - 1, 0);
				scrollToCard(carouselId, carousel, cards, prevIndex);
			}
		}
	}

	function scrollToCard(carouselId, carousel, cards, index) {
		if (!cards[index]) return;
		
		const card = cards[index];
		const cardWidth = card.offsetWidth;
		const gap = 16; // 1rem = 16px
		const cardWithGap = cardWidth + gap;
		
		// Прокручиваем так, чтобы карточка была по центру (или слева на мобильных)
		const scrollPosition = index * cardWithGap;
		
		carousel.scrollTo({
			left: scrollPosition,
			behavior: 'smooth'
		});

		// Обновляем индекс сразу
		const data = carouselData[carouselId];
		if (data) {
			data.currentIndex = index;
			updateDots(carouselId, index);
		}
	}

	function updateDots(carouselId, index) {
		// Находим соответствующий контейнер точек по ID карусели
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
		dots.forEach((dot, i) => {
			if (i === index) {
				dot.classList.add('active');
			} else {
				dot.classList.remove('active');
			}
		});
	}

	function setupDotsNavigation(carouselId, carousel, cards) {
		const data = carouselData[carouselId];
		if (!data) return;

		// Находим соответствующий контейнер точек по ID карусели
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
				data.currentIndex = index;
				scrollToCard(carouselId, carousel, cards, data.currentIndex);
				updateDots(carouselId, data.currentIndex);
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
