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

		let touchStartTime = 0;
		let touchStartX = 0;
		let touchStartY = 0;
		let isDragging = false;

		// Отслеживаем прокрутку для синхронизации индекса (только при медленном драге)
		let scrollTimeout;
		carousel.addEventListener('scroll', function() {
			if (!isDragging) {
				clearTimeout(scrollTimeout);
				scrollTimeout = setTimeout(function() {
					updateCurrentIndexFromScroll(carouselId, carousel, cards);
				}, 150);
			}
		}, { passive: true });

		// Touch события для swipe
		carousel.addEventListener('touchstart', function(e) {
			touchStartTime = Date.now();
			touchStartX = e.changedTouches[0].screenX;
			touchStartY = e.changedTouches[0].screenY;
			isDragging = true;
			data.isUserInteracting = true;
		}, { passive: true });

		carousel.addEventListener('touchmove', function(e) {
			// Обновляем позицию при движении для определения скорости
			if (isDragging) {
				const currentX = e.changedTouches[0].screenX;
				const currentY = e.changedTouches[0].screenY;
				// Проверяем, что это горизонтальный свайп, а не вертикальный
				const deltaX = Math.abs(currentX - touchStartX);
				const deltaY = Math.abs(currentY - touchStartY);
				if (deltaY > deltaX) {
					// Вертикальный свайп - не обрабатываем
					isDragging = false;
				}
			}
		}, { passive: true });

		carousel.addEventListener('touchend', function(e) {
			if (!isDragging) {
				data.isUserInteracting = false;
				return;
			}

			const touchEndTime = Date.now();
			const touchEndX = e.changedTouches[0].screenX;
			const touchEndY = e.changedTouches[0].screenY;
			const duration = touchEndTime - touchStartTime;
			const deltaX = touchEndX - touchStartX;
			const deltaY = Math.abs(touchEndY - touchStartY);
			const distance = Math.abs(deltaX);

			// Проверяем, что это горизонтальный свайп
			if (deltaY > distance) {
				isDragging = false;
				data.isUserInteracting = false;
				return;
			}

			// Минимальное расстояние для свайпа
			const minSwipeDistance = 30;
			if (distance < minSwipeDistance) {
				// Слишком маленький свайп - используем scroll-snap
				isDragging = false;
				data.isUserInteracting = false;
				setTimeout(function() {
					updateCurrentIndexFromScroll(carouselId, carousel, cards);
				}, 200);
				return;
			}

			// Определяем скорость (пикселей в миллисекунду)
			const speed = distance / duration;
			const fastSwipeThreshold = 0.3; // пикселей/мс (быстрый свайп)

			if (speed > fastSwipeThreshold) {
				// Резкий свайп - переключаем на следующий/предыдущий
				if (deltaX < 0) {
					// Свайп влево (touchStartX > touchEndX) - следующий слайд
					const nextIndex = (data.currentIndex + 1) % cards.length;
					scrollToCard(carouselId, carousel, cards, nextIndex);
				} else {
					// Свайп вправо (touchStartX < touchEndX) - предыдущий слайд
					const prevIndex = (data.currentIndex - 1 + cards.length) % cards.length;
					scrollToCard(carouselId, carousel, cards, prevIndex);
				}
			} else {
				// Медленный драг - используем scroll-snap (остановится на ближайшей)
				setTimeout(function() {
					updateCurrentIndexFromScroll(carouselId, carousel, cards);
				}, 200);
			}

			isDragging = false;
			data.isUserInteracting = false;
		}, { passive: true });

		// Mouse события для десктопа (если нужно)
		let mouseStartX = 0;
		let mouseStartTime = 0;
		let isMouseDown = false;

		carousel.addEventListener('mousedown', function(e) {
			if (window.innerWidth <= 736) {
				mouseStartX = e.clientX;
				mouseStartTime = Date.now();
				isMouseDown = true;
				isDragging = true;
				data.isUserInteracting = true;
			}
		});

		carousel.addEventListener('mouseup', function(e) {
			if (isMouseDown && window.innerWidth <= 736) {
				const mouseEndX = e.clientX;
				const mouseEndTime = Date.now();
				const deltaX = mouseEndX - mouseStartX;
				const distance = Math.abs(deltaX);
				const duration = mouseEndTime - mouseStartTime;
				const minSwipeDistance = 30;

				if (distance >= minSwipeDistance) {
					const speed = distance / duration;
					const fastSwipeThreshold = 0.3;

					if (speed > fastSwipeThreshold) {
						// Резкий свайп
						if (deltaX < 0) {
							// Свайп влево - следующий слайд
							const nextIndex = (data.currentIndex + 1) % cards.length;
							scrollToCard(carouselId, carousel, cards, nextIndex);
						} else {
							// Свайп вправо - предыдущий слайд
							const prevIndex = (data.currentIndex - 1 + cards.length) % cards.length;
							scrollToCard(carouselId, carousel, cards, prevIndex);
						}
					} else {
						// Медленный драг
						setTimeout(function() {
							updateCurrentIndexFromScroll(carouselId, carousel, cards);
						}, 200);
					}
				} else {
					// Слишком маленький свайп
					setTimeout(function() {
						updateCurrentIndexFromScroll(carouselId, carousel, cards);
					}, 200);
				}

				isMouseDown = false;
				isDragging = false;
				data.isUserInteracting = false;
			}
		});

		carousel.addEventListener('mouseleave', function() {
			if (isMouseDown) {
				isMouseDown = false;
				isDragging = false;
				data.isUserInteracting = false;
				setTimeout(function() {
					updateCurrentIndexFromScroll(carouselId, carousel, cards);
				}, 200);
			}
		});
	}

	// Обновляем текущий индекс на основе позиции прокрутки (для медленного драга)
	function updateCurrentIndexFromScroll(carouselId, carousel, cards) {
		const data = carouselData[carouselId];
		if (!data) return;

		const scrollLeft = carousel.scrollLeft;
		const cardWidth = cards[0] ? cards[0].offsetWidth : 0;
		const gap = 16; // 1rem = 16px
		const cardWithGap = cardWidth + gap;

		// Находим ближайшую карточку к центру видимой области
		const centerX = scrollLeft + carousel.offsetWidth / 2;
		let closestIndex = 0;
		let minDistance = Infinity;

		cards.forEach((card, index) => {
			const cardLeft = index * cardWithGap;
			const cardCenter = cardLeft + cardWidth / 2;
			const distance = Math.abs(centerX - cardCenter);
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
		// Эта функция больше не используется, логика перенесена в setupSwipe
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
