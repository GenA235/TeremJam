/*
	Payment Page Controller
	Handles payment form and displays order summary
*/

(function() {
	'use strict';

	// Initialize payment page
	function init() {
		loadOrderData();
		setupPaymentForm();
		setupCardInputs();
	}

	// Load order data from localStorage
	function loadOrderData() {
		const orderData = localStorage.getItem('teremjam_order');
		
		if (!orderData) {
			// Если данных нет, показываем сообщение и предлагаем вернуться
			showError('Данные заказа не найдены. Пожалуйста, заполните форму заново.');
			return;
		}

		try {
			const data = JSON.parse(orderData);
			displayOrderSummary(data);
		} catch (e) {
			console.error('Error parsing order data:', e);
			showError('Ошибка загрузки данных заказа.');
		}
	}

	// Display order summary
	function displayOrderSummary(data) {
		const ticketTypeNames = {
			standard: 'Стандартный',
			family: 'Семейный',
			oneday: 'Один день',
			group: 'С друзьями'
		};

		const serviceNames = {
			tent: 'Палатка',
			sleeping: 'Спальник',
			'transfer-msk': 'Трансфер из Москвы',
			'transfer-galich': 'Трансфер от Галича',
			banya: 'Баня',
			pogorelovo: 'Экскурсия в Погорелово'
		};

		// Update summary fields
		updateElement('summaryTicketType', ticketTypeNames[data.ticketType] || 'Не выбран');
		updateElement('summaryQuantity', `${data.adults} взр.${data.children > 0 ? ', ' + data.children + ' дет.' : ''}`);
		updateElement('summaryContact', `${data.name || ''}, ${data.email || ''}, ${data.phone || ''}`);
		
		const servicesList = (data.services || []).map(s => {
			return serviceNames[s.id] || s.id;
		}).join(', ') || 'Нет';
		updateElement('summaryServices', servicesList);
		
		updateElement('summaryTotal', formatPrice(data.total || 0));
	}

	// Format price
	function formatPrice(price) {
		return new Intl.NumberFormat('ru-RU', {
			style: 'currency',
			currency: 'RUB',
			minimumFractionDigits: 0
		}).format(price);
	}

	// Update element text
	function updateElement(id, text) {
		const el = document.getElementById(id);
		if (el) {
			el.textContent = text;
		}
	}

	// Setup payment form
	function setupPaymentForm() {
		const form = document.getElementById('paymentForm');
		if (!form) return;

		form.addEventListener('submit', handlePaymentSubmit);

		// Setup validation
		const inputs = form.querySelectorAll('input[required]');
		inputs.forEach(input => {
			input.addEventListener('blur', function() {
				validateField(this);
			});

			input.addEventListener('input', function() {
				if (this.classList.contains('error')) {
					validateField(this);
				}
			});
		});
	}

	// Setup card input formatting
	function setupCardInputs() {
		const cardNumber = document.getElementById('cardNumber');
		const cardExpiry = document.getElementById('cardExpiry');
		const cardCVC = document.getElementById('cardCVC');

		// Format card number
		if (cardNumber) {
			cardNumber.addEventListener('input', function() {
				let value = this.value.replace(/\s/g, '');
				if (value.length > 16) {
					value = value.substring(0, 16);
				}
				// Add spaces every 4 digits
				value = value.replace(/(.{4})/g, '$1 ').trim();
				this.value = value;
			});
		}

		// Format expiry date
		if (cardExpiry) {
			cardExpiry.addEventListener('input', function() {
				let value = this.value.replace(/\D/g, '');
				if (value.length >= 2) {
					value = value.substring(0, 2) + '/' + value.substring(2, 4);
				}
				this.value = value;
			});
		}

		// Format CVC (only numbers)
		if (cardCVC) {
			cardCVC.addEventListener('input', function() {
				this.value = this.value.replace(/\D/g, '').substring(0, 3);
			});
		}
	}

	// Validate field
	function validateField(field) {
		const errorEl = field.parentElement.querySelector('.error-message');
		
		if (!field.value.trim()) {
			showFieldError(field, 'Это поле обязательно для заполнения');
			return false;
		}

		// Card number validation
		if (field.id === 'cardNumber') {
			const cardNumber = field.value.replace(/\s/g, '');
			if (cardNumber.length < 13 || cardNumber.length > 19) {
				showFieldError(field, 'Некорректный номер карты');
				return false;
			}
			if (!/^\d+$/.test(cardNumber)) {
				showFieldError(field, 'Номер карты должен содержать только цифры');
				return false;
			}
		}

		// Expiry date validation
		if (field.id === 'cardExpiry') {
			const expiry = field.value.split('/');
			if (expiry.length !== 2 || expiry[0].length !== 2 || expiry[1].length !== 2) {
				showFieldError(field, 'Формат: MM/YY');
				return false;
			}
			const month = parseInt(expiry[0]);
			const year = parseInt(expiry[1]);
			if (month < 1 || month > 12) {
				showFieldError(field, 'Месяц должен быть от 01 до 12');
				return false;
			}
		}

		// CVC validation
		if (field.id === 'cardCVC') {
			if (field.value.length !== 3 || !/^\d+$/.test(field.value)) {
				showFieldError(field, 'CVC должен содержать 3 цифры');
				return false;
			}
		}

		clearFieldError(field);
		return true;
	}

	// Show field error
	function showFieldError(field, message) {
		field.classList.add('error');
		const errorEl = field.parentElement.querySelector('.error-message');
		if (errorEl) {
			errorEl.textContent = message;
		}
	}

	// Clear field error
	function clearFieldError(field) {
		field.classList.remove('error');
		const errorEl = field.parentElement.querySelector('.error-message');
		if (errorEl) {
			errorEl.textContent = '';
		}
	}

	// Show general error
	function showError(message) {
		const form = document.getElementById('paymentForm');
		if (!form) return;

		let errorDiv = document.getElementById('paymentError');
		if (!errorDiv) {
			errorDiv = document.createElement('div');
			errorDiv.id = 'paymentError';
			errorDiv.style.cssText = 'padding: 1rem; background-color: rgba(255, 107, 53, 0.2); border: 2px solid #ff6b35; border-radius: 4px; color: #ff6b35; margin-bottom: 1rem;';
			form.insertBefore(errorDiv, form.firstChild);
		}
		errorDiv.textContent = message;
	}

	// Handle payment submission
	function handlePaymentSubmit(e) {
		e.preventDefault();

		const form = document.getElementById('paymentForm');
		if (!form) return;

		// Validate all fields
		const requiredFields = form.querySelectorAll('input[required]');
		let isValid = true;

		requiredFields.forEach(field => {
			if (!validateField(field)) {
				isValid = false;
			}
		});

		if (!isValid) {
			return;
		}

		// Get form data
		const formData = new FormData(form);
		const paymentData = {
			cardNumber: formData.get('cardNumber'),
			cardExpiry: formData.get('cardExpiry'),
			cardCVC: formData.get('cardCVC'),
			cardName: formData.get('cardName')
		};

		// Get order data
		const orderData = localStorage.getItem('teremjam_order');
		if (!orderData) {
			showError('Данные заказа не найдены. Пожалуйста, заполните форму заново.');
			return;
		}

		// ============================================
		// ОТПРАВКА ДАННЫХ ОПЛАТЫ НА СЕРВЕР
		// ============================================
		// Здесь должна быть отправка данных на сервер
		// для обработки платежа
		
		// For now, we'll just show a success message
		alert('Оплата успешно обработана! Здесь будет редирект на страницу подтверждения.');
		
		// Clear order data from localStorage
		localStorage.removeItem('teremjam_order');
		
		// Example redirect (uncomment when ready):
		// window.location.href = 'success.html';
	}

	// Initialize on DOM ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();
