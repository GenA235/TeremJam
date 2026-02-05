/*
	Video Loader
	Управление загрузкой фонового видео с показом fallback изображения
*/

(function() {
	'use strict';

	function init() {
		const video = document.querySelector('#intro.tz-hero .tz-hero-media video');
		if (!video) return;

		// Показываем видео, когда оно готово к воспроизведению
		video.addEventListener('loadeddata', function() {
			video.classList.add('ready');
		}, { once: true });

		// Если видео не загрузилось за 3 секунды, показываем fallback
		setTimeout(function() {
			if (!video.classList.contains('ready')) {
				video.classList.add('ready');
			}
		}, 3000);

		// Обработка ошибок загрузки видео
		video.addEventListener('error', function() {
			video.classList.add('ready');
		}, { once: true });
	}

	// Инициализация при загрузке DOM
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();
