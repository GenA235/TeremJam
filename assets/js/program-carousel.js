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
			autoScrollInterval: null,
			touchStartX: 0,
			touchEndX: 0,
			isUserInteracting: false,
			cards: cards
		};

		// Создаем индикаторы только для мобильных
		if (window.innerWidth <= 736) {
			createDots(cards.length, dotsContainer);
			setupAutoScroll(carouselId, carousel, cards);
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

		// Очищаем старые индикаторы и интервалы
		dotsContainer.innerHTML = '';
		if (carouselData[carouselId] && carouselData[carouselId].autoScrollInterval) {
			clearInterval(carouselData[carouselId].autoScrollInterval);
			carouselData[carouselId].autoScrollInterval = null;
		}

		// Переинициализируем для нового размера
		if (window.innerWidth <= 736) {
			createDots(cards.length, dotsContainer);
			setupAutoScroll(carouselId, carousel, cards);
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

	function setupAutoScroll(carouselId, carousel, cards) {
		const data = carouselData[carouselId];
		if (!data) return;

		// Автопрокрутка каждые 2 секунды
		data.autoScrollInterval = setInterval(function() {
			if (!data.isUserInteracting && window.innerWidth <= 736) {
				data.currentIndex = (data.currentIndex + 1) % cards.length;
				scrollToCard(carouselId, carousel, cards, data.currentIndex);
				updateDots(carouselId, data.currentIndex);
			}
		}, 2000);
	}

	function setupSwipe(carouselId, carousel, cards) {
		const data = carouselData[carouselId];
		if (!data) return;

		// Touch события для swipe
		carousel.addEventListener('touchstart', function(e) {
			data.touchStartX = e.changedTouches[0].screenX;
			data.isUserInteracting = true;
			
			// Пауза автопрокрутки при взаимодействии
			if (data.autoScrollInterval) {
				clearInterval(data.autoScrollInterval);
				data.autoScrollInterval = null;
			}
		}, { passive: true });

		carousel.addEventListener('touchend', function(e) {
			data.touchEndX = e.changedTouches[0].screenX;
			handleSwipe(carouselId, carousel, cards);
			
			// Возобновляем автопрокрутку через небольшую задержку
			setTimeout(function() {
				data.isUserInteracting = false;
				if (window.innerWidth <= 736) {
					setupAutoScroll(carouselId, carousel, cards);
				}
			}, 3000);
		}, { passive: true });

		// Mouse события для десктопа (если нужно)
		let mouseStartX = 0;
		let isMouseDown = false;

		carousel.addEventListener('mousedown', function(e) {
			if (window.innerWidth <= 736) {
				mouseStartX = e.clientX;
				isMouseDown = true;
				data.isUserInteracting = true;
				
				if (data.autoScrollInterval) {
					clearInterval(data.autoScrollInterval);
					data.autoScrollInterval = null;
				}
			}
		});

		carousel.addEventListener('mouseup', function(e) {
			if (isMouseDown && window.innerWidth <= 736) {
				const mouseEndX = e.clientX;
				const diff = mouseStartX - mouseEndX;
				
				if (Math.abs(diff) > 50) {
					if (diff > 0) {
						// Swipe влево - следующий слайд
						data.currentIndex = (data.currentIndex + 1) % cards.length;
					} else {
						// Swipe вправо - предыдущий слайд
						data.currentIndex = (data.currentIndex - 1 + cards.length) % cards.length;
					}
					scrollToCard(carouselId, carousel, cards, data.currentIndex);
					updateDots(carouselId, data.currentIndex);
				}
				
				isMouseDown = false;
				setTimeout(function() {
					data.isUserInteracting = false;
					setupAutoScroll(carouselId, carousel, cards);
				}, 3000);
			}
		});

		carousel.addEventListener('mouseleave', function() {
			isMouseDown = false;
		});
	}

	function handleSwipe(carouselId, carousel, cards) {
		const data = carouselData[carouselId];
		if (!data) return;

		const swipeThreshold = 50;
		const diff = data.touchStartX - data.touchEndX;

		if (Math.abs(diff) > swipeThreshold) {
			if (diff > 0) {
				// Swipe влево - следующий слайд
				data.currentIndex = (data.currentIndex + 1) % cards.length;
			} else {
				// Swipe вправо - предыдущий слайд
				data.currentIndex = (data.currentIndex - 1 + cards.length) % cards.length;
			}
			scrollToCard(carouselId, carousel, cards, data.currentIndex);
			updateDots(carouselId, data.currentIndex);
		}
	}

	function scrollToCard(carouselId, carousel, cards, index) {
		if (!cards[index]) return;
		
		const card = cards[index];
		const cardWidth = card.offsetWidth;
		const gap = 16; // 1rem = 16px
		const scrollPosition = index * (cardWidth + gap) - (carousel.offsetWidth - cardWidth) / 2;
		
		carousel.scrollTo({
			left: scrollPosition,
			behavior: 'smooth'
		});
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
				
				// Пауза автопрокрутки при клике
				data.isUserInteracting = true;
				if (data.autoScrollInterval) {
					clearInterval(data.autoScrollInterval);
					data.autoScrollInterval = null;
				}
				
				setTimeout(function() {
					data.isUserInteracting = false;
					setupAutoScroll(carouselId, carousel, cards);
				}, 3000);
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
