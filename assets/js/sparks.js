/*
	Модуль анимации искорок (sparks)
	Управление созданием и движением искорок с реакцией на курсор
*/

(function() {
	'use strict';

	// Конфигурация из CSS переменных
	const config = {
		get density() {
			return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-density').trim()) || 0.5;
		},
		get size() {
			return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-size').trim()) || 3;
		},
		get colors() {
			const colorValue = getComputedStyle(document.documentElement).getPropertyValue('--spark-color').trim() || '#ff6b35';
			// Поддержка нескольких цветов через запятую
			return colorValue.split(',').map(c => c.trim()).filter(c => c);
		},
		get maxSparks() {
			const baseMax = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--spark-max-count').trim()) || 50;
			// На мобильных устройствах уменьшаем в 3 раза
			if (window.innerWidth <= 736) {
				return Math.floor(baseMax / 3);
			}
			return baseMax;
		},
		get cursorInfluence() {
			return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-cursor-influence').trim()) || 0.3;
		},
		get speed() {
			return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-speed').trim()) || 1.0;
		},
		get cursorTurbulence() {
			return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-cursor-turbulence').trim()) || 0.4;
		},
		get glowAmplitude() {
			return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-glow-amplitude').trim()) || 1.5;
		},
		get vortexDistance() {
			return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-vortex-distance').trim()) || 150;
		},
		get vortexStrength() {
			return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-vortex-strength').trim()) || 2.5;
		},
		get vortexSpeed() {
			// Скорость в оборотах в секунду, конвертируем в радианы за кадр
			const rotationsPerSecond = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-vortex-speed').trim()) || 1.0;
			// Конвертируем: обороты/сек -> радианы/сек -> радианы/кадр (при ~60fps)
			return (rotationsPerSecond * Math.PI * 2) / 60; // радиан за кадр
		},
		get vortexRadius() {
			// Радиус вихря в пикселях
			return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-vortex-radius').trim()) || 50;
		},
		get vortexAcceleration() {
			// Ускорение центра вихря в пикселях/сек²
			return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-vortex-acceleration').trim()) || 500;
		}
	};

	// Получение случайного цвета из списка
	function getRandomColor() {
		const colors = config.colors;
		return colors[Math.floor(Math.random() * colors.length)];
	}

	let container = null;
	let sparks = [];
	let mouseX = window.innerWidth / 2;
	let mouseY = window.innerHeight / 2;
	let prevMouseX = window.innerWidth / 2;
	let prevMouseY = window.innerHeight / 2;
	let mouseVelocityX = 0;
	let mouseVelocityY = 0;
	let animationFrameId = null;
	let lastSpawnTime = 0;
	// Траектория курсора для закручивания искорок
	let mouseTrail = []; // Массив последних позиций курсора
	const maxTrailLength = 10; // Максимум точек в траектории

	// Инициализация
	function init() {
		// Создаем контейнер для искорок
		container = document.createElement('div');
		container.id = 'sparks-container';
		document.body.appendChild(container);

		// Отслеживаем движение мыши
		document.addEventListener('mousemove', handleMouseMove, { passive: true });
		// Отслеживаем touch события для свайпа
		document.addEventListener('touchmove', handleTouchMove, { passive: true });
		window.addEventListener('resize', handleResize, { passive: true });

		// Запускаем анимацию
		startAnimation();
	}

	// Обработка движения мыши с расчетом скорости
	function handleMouseMove(e) {
		prevMouseX = mouseX;
		prevMouseY = mouseY;
		mouseX = e.clientX;
		mouseY = e.clientY;
		
		// Вычисляем скорость движения мыши для завихрения
		mouseVelocityX = mouseX - prevMouseX;
		mouseVelocityY = mouseY - prevMouseY;
		
		// Добавляем текущую позицию в траекторию
		mouseTrail.push({ x: mouseX, y: mouseY, time: Date.now() });
		
		// Удаляем старые точки (старше 500мс)
		const now = Date.now();
		mouseTrail = mouseTrail.filter(point => now - point.time < 500);
		
		// Ограничиваем длину траектории
		if (mouseTrail.length > maxTrailLength) {
			mouseTrail.shift();
		}
	}

	// Обработка touch событий для свайпа (та же логика, что и для мыши)
	function handleTouchMove(e) {
		if (e.touches.length > 0) {
			const touch = e.touches[0];
			prevMouseX = mouseX;
			prevMouseY = mouseY;
			mouseX = touch.clientX;
			mouseY = touch.clientY;
			
			// Вычисляем скорость движения для завихрения
			mouseVelocityX = mouseX - prevMouseX;
			mouseVelocityY = mouseY - prevMouseY;
			
			// Добавляем текущую позицию в траекторию
			mouseTrail.push({ x: mouseX, y: mouseY, time: Date.now() });
			
			// Удаляем старые точки (старше 500мс)
			const now = Date.now();
			mouseTrail = mouseTrail.filter(point => now - point.time < 500);
			
			// Ограничиваем длину траектории
			if (mouseTrail.length > maxTrailLength) {
				mouseTrail.shift();
			}
		}
	}

	// Обработка изменения размера окна
	function handleResize() {
		// Обновляем позиции искорок при изменении размера окна
		sparks.forEach(spark => {
			if (spark.element && spark.element.parentNode) {
				const rect = spark.element.getBoundingClientRect();
				spark.x = rect.left;
				spark.y = rect.top;
			}
		});
	}

	// Создание новой искорки
	function createSpark() {
		// Проверяем, что контейнер существует
		if (!container || !container.parentNode) {
			return;
		}
		
		// Ограничиваем количество искорок
		if (sparks.length >= config.maxSparks) {
			return;
		}

		const spark = document.createElement('div');
		spark.className = 'spark';

		// Случайный цвет искорки
		const sparkColor = getRandomColor();
		spark.style.backgroundColor = sparkColor;
		spark.style.setProperty('--spark-color', sparkColor);
		spark.style.boxShadow = `0 0 var(--spark-glow-size, 6px) ${sparkColor}`;

		// Появление по краям экрана и немного в середине
		// 40% - левый край, 40% - правый край, 20% - центр
		const spawnZone = Math.random();
		let startX, startY;
		
		if (spawnZone < 0.4) {
			// Левый край
			startX = Math.random() * window.innerWidth * 0.2;
			startY = window.innerHeight * 0.3 + Math.random() * window.innerHeight * 0.7;
		} else if (spawnZone < 0.8) {
			// Правый край
			startX = window.innerWidth * 0.8 + Math.random() * window.innerWidth * 0.2;
			startY = window.innerHeight * 0.3 + Math.random() * window.innerHeight * 0.7;
		} else {
			// Центр (нижняя часть)
			startX = window.innerWidth * 0.3 + Math.random() * window.innerWidth * 0.4;
			startY = window.innerHeight * 0.6 + Math.random() * window.innerHeight * 0.4;
		}

		// Начальная скорость и направление (более случайное)
		const angle = Math.random() * Math.PI * 2; // Любое направление
		const speed = (30 + Math.random() * 70) * config.speed;
		
		// Вектор скорости
		let vx = Math.cos(angle) * speed;
		let vy = Math.sin(angle) * speed;
		
		// Небольшое предпочтение движению вверх
		vy -= 20 + Math.random() * 30;

		// Сохраняем данные искорки с физикой
		const sparkData = {
			element: spark,
			x: startX,
			y: startY,
			vx: vx, // Скорость по X
			vy: vy, // Скорость по Y
			life: 0,
			maxLife: 3000 + Math.random() * 2000, // Время жизни 3-5 секунд
			size: config.size,
			color: sparkColor,
			turbulence: Math.random() * 0.5 + 0.5, // Турбулентность для извилистого движения
			turbulencePhase: Math.random() * Math.PI * 2,
			// Состояние вихря
			vortexActive: false, // Активен ли вихрь
			vortexTargetX: 0, // Текущая точка на траектории курсора, вокруг которой крутимся
			vortexTargetY: 0,
			vortexRadius: 0, // Радиус вихря (расстояние от искорки до траектории)
			vortexAngle: 0, // Текущий угол в вихре (0-2π)
			vortexTotalCircles: 0, // Сколько кругов нужно сделать
			vortexCompletedCircles: 0, // Сколько кругов уже сделано
			vortexAngularSpeed: 0, // Угловая скорость вращения (радиан/кадр)
			originalVx: vx, // Сохраняем оригинальную скорость для возврата
			originalVy: vy,
			vortexStartTime: 0, // Время начала вихря
			vortexDriftVx: 0, // Скорость смещения центра вихря по X (пикселей/сек)
			vortexDriftVy: 0, // Скорость смещения центра вихря по Y (пикселей/сек)
			vortexAccelerationX: 0, // Ускорение центра вихря по X (пикселей/сек²)
			vortexAccelerationY: 0 // Ускорение центра вихря по Y (пикселей/сек²)
		};

		spark.style.left = startX + 'px';
		spark.style.top = startY + 'px';
		spark.style.opacity = '0';
		spark.style.transform = 'translate(0, 0) scale(0)';
		
		container.appendChild(spark);
		sparks.push(sparkData);

		// Плавное появление
		requestAnimationFrame(() => {
			spark.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
			spark.style.opacity = '1';
			spark.style.transform = 'translate(0, 0) scale(1)';
		});
	}

	// Удаление искорки
	function removeSpark(sparkData) {
		const index = sparks.indexOf(sparkData);
		if (index > -1) {
			sparks.splice(index, 1);
		}
		if (sparkData.element && sparkData.element.parentNode) {
			sparkData.element.parentNode.removeChild(sparkData.element);
		}
	}

	// Обновление позиций искорок с физикой и завихрением от курсора
	function updateSparks() {
		const currentTime = Date.now();
		
		sparks.forEach(spark => {
			if (!spark.element || !spark.element.parentNode) return;

			// Проверяем расстояние до курсора для эффекта разгорания и закручивания
			const dx = mouseX - spark.x;
			const dy = mouseY - spark.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			const vortexDistance = config.vortexDistance; // Радиус влияния для закручивания
			const isNearCursor = distance < vortexDistance && distance > 0;
			
			// Обновляем последнее расстояние
			spark.lastMouseDistance = distance;
			
			// Обновляем время жизни (продлеваем если курсор рядом)
			if (!isNearCursor) {
				spark.life += 16; // ~60fps - только если курсор не рядом
			} else {
				// Продлеваем жизнь, но не полностью останавливаем
				spark.life += 2; // Очень медленное старение когда курсор рядом
			}
			
			const lifeProgress = spark.life / spark.maxLife;

			if (lifeProgress >= 1) {
				// Искорка умирает
				removeSpark(spark);
				return;
			}

			// Базовая физика - гравитация и сопротивление воздуха (только если не в вихре)
			if (!spark.vortexActive) {
				spark.vy += 0.2; // Гравитация (легкая)
				spark.vx *= 0.998; // Сопротивление воздуха
				spark.vy *= 0.998;

				// Турбулентность для извилистого движения
				spark.turbulencePhase += 0.1;
				const turbulenceX = Math.sin(spark.turbulencePhase) * spark.turbulence * 0.5;
				const turbulenceY = Math.cos(spark.turbulencePhase * 1.3) * spark.turbulence * 0.5;
				
				spark.vx += turbulenceX;
				spark.vy += turbulenceY;
			}

			// Круговое закручивание вокруг точки, где курсор пролетел мимо
			if (isNearCursor && !spark.vortexActive) {
				// Начинаем вихрь - курсор только что пролетел мимо
				// Вычисляем скорость курсора один раз
				const mouseSpeed = Math.sqrt(mouseVelocityX * mouseVelocityX + mouseVelocityY * mouseVelocityY);
				
				// Количество кругов зависит от скорости курсора (3-5 кругов)
				const normalizedSpeed = Math.min(1, mouseSpeed / 30); // Нормализуем скорость
				spark.vortexTotalCircles = 3 + normalizedSpeed * 2; // От 3 до 5 кругов
				
				// ФИКСИРУЕМ точку вихря - где был курсор в момент пролета
				spark.vortexTargetX = mouseX;
				spark.vortexTargetY = mouseY;
				
				// Радиус вихря - используем значение из конфига (в пикселях)
				spark.vortexRadius = config.vortexRadius;
				
				// Начальный угол от центра вихря до искорки
				spark.vortexAngle = Math.atan2(spark.y - spark.vortexTargetY, spark.x - spark.vortexTargetX);
				
				// Угловая скорость вращения (из конфига, уже конвертирована в радианы за кадр)
				spark.vortexAngularSpeed = config.vortexSpeed;
				
				// Задаем ускорение центра вихря в направлении движения курсора
				if (mouseSpeed > 0) {
					// Нормализуем направление и умножаем на ускорение из конфига
					const directionX = mouseVelocityX / mouseSpeed;
					const directionY = mouseVelocityY / mouseSpeed;
					spark.vortexAccelerationX = directionX * config.vortexAcceleration;
					spark.vortexAccelerationY = directionY * config.vortexAcceleration;
				} else {
					spark.vortexAccelerationX = 0;
					spark.vortexAccelerationY = 0;
				}
				
				// Начальная скорость смещения центра вихря (ноль)
				spark.vortexDriftVx = 0;
				spark.vortexDriftVy = 0;
				
				// Сохраняем оригинальную скорость для возврата после вихря
				spark.originalVx = spark.vx;
				spark.originalVy = spark.vy;
				
				spark.vortexActive = true;
				spark.vortexCompletedCircles = 0;
				spark.vortexStartTime = Date.now();
			}
			
			// Если вихрь активен, выполняем плавное круговое движение вокруг смещающегося центра
			if (spark.vortexActive) {
				// Применяем ускорение к скорости смещения центра вихря
				// Ускорение в пикселях/сек², конвертируем в пиксели/кадр²
				const frameTime = 0.016; // ~16ms за кадр при 60fps
				spark.vortexDriftVx += spark.vortexAccelerationX * frameTime;
				spark.vortexDriftVy += spark.vortexAccelerationY * frameTime;
				
				// Применяем замедление (сопротивление) для плавной остановки
				spark.vortexDriftVx *= 0.98;
				spark.vortexDriftVy *= 0.98;
				
				// Обновляем позицию центра вихря (центр движется в направлении курсора)
				spark.vortexTargetX += spark.vortexDriftVx * frameTime;
				spark.vortexTargetY += spark.vortexDriftVy * frameTime;
				
				// Обновляем угол вращения (равномерное вращение)
				spark.vortexAngle += spark.vortexAngularSpeed;
				
				// Вычисляем целевую позицию на окружности вокруг ДВИЖУЩЕГОСЯ центра
				const targetX = spark.vortexTargetX + Math.cos(spark.vortexAngle) * spark.vortexRadius;
				const targetY = spark.vortexTargetY + Math.sin(spark.vortexAngle) * spark.vortexRadius;
				
				// Вычисляем скорость, необходимую для следования за движущимся центром
				// Нужно учесть и круговое движение, и движение центра
				const dx = targetX - spark.x;
				const dy = targetY - spark.y;
				
				// Тангенциальная скорость для кругового движения вокруг центра
				const tangentialSpeed = spark.vortexAngularSpeed * spark.vortexRadius;
				const tangentX = -Math.sin(spark.vortexAngle);
				const tangentY = Math.cos(spark.vortexAngle);
				
				// Скорость движения центра вихря (которую должна наследовать искорка)
				const centerVelocityX = spark.vortexDriftVx;
				const centerVelocityY = spark.vortexDriftVy;
				
				// Итоговая скорость = тангенциальная скорость + скорость центра
				spark.vx = tangentX * tangentialSpeed + centerVelocityX;
				spark.vy = tangentY * tangentialSpeed + centerVelocityY;
				
				// Отслеживаем количество завершенных кругов
				const currentCircle = Math.abs(spark.vortexAngle) / (Math.PI * 2);
				if (currentCircle > spark.vortexCompletedCircles + 1) {
					spark.vortexCompletedCircles = Math.floor(currentCircle);
				}
				
				// Если сделали все круги - завершаем вихрь
				if (spark.vortexCompletedCircles >= spark.vortexTotalCircles) {
					spark.vortexActive = false;
					// Выходим из вихря с тангенциальной скоростью + скорость центра + часть оригинальной
					const exitAngle = spark.vortexAngle;
					const tangentialSpeed = spark.vortexAngularSpeed * spark.vortexRadius;
					const exitTangentX = Math.cos(exitAngle);
					const exitTangentY = Math.sin(exitAngle);
					spark.vx = exitTangentX * tangentialSpeed * 0.6 + centerVelocityX * 0.5 + spark.originalVx * 0.3;
					spark.vy = exitTangentY * tangentialSpeed * 0.6 + centerVelocityY * 0.5 + spark.originalVy * 0.3;
				}
			}

			// Обновляем позицию
			spark.x += spark.vx * 0.016; // Умножаем на время кадра (~16ms)
			spark.y += spark.vy * 0.016;

			// Обновляем визуальное положение
			spark.element.style.left = spark.x + 'px';
			spark.element.style.top = spark.y + 'px';

			// Эффект разгорания при приближении курсора
			let glowMultiplier = 1.0;
			let sizeMultiplier = 1.0;
			
			if (isNearCursor) {
				// Используем экспоненциальную функцию для разгорания
				const normalizedDistance = distance / vortexDistance;
				const exponentialGlow = Math.exp(-normalizedDistance * 2);
				const glowIntensity = exponentialGlow * (config.glowAmplitude - 1.0);
				glowMultiplier = 1.0 + glowIntensity;
				sizeMultiplier = 1.0 + glowIntensity * 0.5; // Размер увеличивается меньше чем свечение
			}

			// Плавное затухание с учетом разгорания
			const baseOpacity = 1 - lifeProgress;
			const opacity = Math.min(1, baseOpacity * glowMultiplier);
			const baseScale = 0.3 + (1 - lifeProgress) * 0.7;
			const scale = baseScale * sizeMultiplier;
			
			spark.element.style.opacity = opacity;
			spark.element.style.transform = `translate(0, 0) scale(${scale})`;
			
			// Увеличиваем свечение при разгорании
			const glowSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spark-glow-size').trim()) || 6;
			spark.element.style.boxShadow = `0 0 ${glowSize * glowMultiplier}px ${spark.color}`;
		});
	}

	// Главный цикл анимации
	function animate() {
		const now = Date.now();
		const spawnInterval = 1000 / (config.density * 10); // Интервал создания искорок

		// Создаем новые искорки
		if (now - lastSpawnTime > spawnInterval && sparks.length < config.maxSparks) {
			createSpark();
			lastSpawnTime = now;
		}

		// Обновляем позиции существующих искорок
		updateSparks();

		// Затухание скорости мыши (для плавности)
		mouseVelocityX *= 0.9;
		mouseVelocityY *= 0.9;

		animationFrameId = requestAnimationFrame(animate);
	}

	// Запуск анимации
	function startAnimation() {
		if (!animationFrameId) {
			animate();
		}
	}

	// Остановка анимации
	function stopAnimation() {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	// Очистка при размонтировании
	function destroy() {
		stopAnimation();
		document.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('resize', handleResize);
		if (container && container.parentNode) {
			container.parentNode.removeChild(container);
		}
		sparks.forEach(spark => removeSpark(spark));
		sparks = [];
	}

	// Инициализация при загрузке DOM
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

	// Экспорт для возможного управления извне
	window.Sparks = {
		init: init,
		destroy: destroy,
		start: startAnimation,
		stop: stopAnimation
	};

})();
