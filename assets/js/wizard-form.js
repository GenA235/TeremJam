/*
	Wizard Form Controller
	Manages multi-step ticket purchase form
*/

(function() {
	'use strict';

	// Form state
	const formState = {
		currentStep: 1,
		totalSteps: 4,
		ticketType: null,
		ticketPrice: 0,
		adults: 1,
		children: 0,
		services: [],
		discount: 0,
		formData: {}
	};

	// Ticket type descriptions
	const ticketDescriptions = {
		standard: {
			price: 5000,
			info: 'Полный доступ ко всем мероприятиям фестиваля на 3 дня'
		},
		family: {
			price: 4000,
			info: 'Льготы для детей + детская программа'
		},
		oneday: {
			price: 2000,
			info: 'Билет на один день без ночёвки'
		},
		group: {
			price: 4500,
			info: 'Скидка 10% при покупке от 3 билетов'
		}
	};

	// Initialize form
	function init() {
		const form = document.getElementById('ticketForm');
		if (!form) return;

		// Initialize form state
		formState.adults = parseInt(document.getElementById('adults')?.value) || 1;
		formState.children = parseInt(document.getElementById('children')?.value) || 0;

		// Step 1: Ticket type selection
		const ticketTypeSelect = document.getElementById('ticketType');
		if (ticketTypeSelect) {
			ticketTypeSelect.addEventListener('change', handleTicketTypeChange);
			// Инициализируем выбранный по умолчанию билет
			if (ticketTypeSelect.value === 'standard') {
				formState.ticketType = 'standard';
				formState.ticketPrice = 5000;
				// Показываем описание сразу
				handleTicketTypeChange({ target: ticketTypeSelect });
			}
		}

		// Step 2: Counter controls
		setupCounters();
		
		// Step 2: Form validation
		setupValidation();

		// Step 3: Services
		setupServices();

		// Navigation buttons
		setupNavigation();

		// Form submission
		form.addEventListener('submit', handleFormSubmit);

		// Initial display
		updateStepDisplay();
		updateProgressBar();
		
		// Включаем кнопку "Далее" если билет уже выбран
		if (ticketTypeSelect && ticketTypeSelect.value === 'standard') {
			const nextBtn = document.querySelector('.wizard-step[data-step="1"] .wizard-next');
			if (nextBtn) {
				nextBtn.disabled = false;
			}
		}
		
		updateTotals();
	}

	// Handle ticket type selection
	function handleTicketTypeChange(e) {
		const selectedOption = e.target.options[e.target.selectedIndex];
		const value = e.target.value;
		
		if (!value) {
			document.getElementById('ticketDescription').style.display = 'none';
			document.querySelector('.wizard-next').disabled = true;
			return;
		}

		const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
		const priceFrom = selectedOption.getAttribute('data-price-from') === 'true';
		const description = ticketDescriptions[value];

		formState.ticketType = value;
		formState.ticketPrice = price;

		// Show description
		const descEl = document.getElementById('ticketDescription');
		const priceEl = document.getElementById('ticketPrice');
		const infoEl = document.getElementById('ticketInfo');

		if (descEl && priceEl && infoEl) {
			priceEl.textContent = priceFrom ? `от ${price} ₽` : `${price} ₽`;
			infoEl.textContent = description ? description.info : '';
			descEl.style.display = 'block';
		}

		// Enable next button
		const nextBtn = document.querySelector('.wizard-next');
		if (nextBtn) {
			nextBtn.disabled = false;
		}

		updateTotals();
	}

	// Setup counter controls
	function setupCounters() {
		document.querySelectorAll('.counter-btn').forEach(btn => {
			btn.addEventListener('click', function() {
				const target = this.getAttribute('data-target');
				const input = document.getElementById(target);
				if (!input) return;

				const isPlus = this.classList.contains('plus');
				const currentValue = parseInt(input.value) || 0;
				const min = parseInt(input.getAttribute('min')) || 0;
				const max = parseInt(input.getAttribute('max')) || 999;

				let newValue = isPlus ? currentValue + 1 : currentValue - 1;
				newValue = Math.max(min, Math.min(max, newValue));

				input.value = newValue;

				if (target === 'adults') {
					formState.adults = newValue;
				} else if (target === 'children') {
					formState.children = newValue;
				}

				// Check for group discount
				checkGroupDiscount();
				updateTotals();
			});
		});
	}

	// Check group discount
	function checkGroupDiscount() {
		const totalTickets = formState.adults + formState.children;
		const discountEl = document.getElementById('groupDiscount');
		
		if (formState.ticketType === 'group' && totalTickets >= 3) {
			formState.discount = 0.1; // 10%
			if (discountEl) {
				discountEl.style.display = 'block';
			}
		} else {
			formState.discount = 0;
			if (discountEl) {
				discountEl.style.display = 'none';
			}
		}
	}

	// Setup form validation
	function setupValidation() {
		const inputs = document.querySelectorAll('#ticketForm input[required], #ticketForm select[required]');
		
		inputs.forEach(input => {
			// Real-time validation
			input.addEventListener('blur', function() {
				validateField(this);
			});

			input.addEventListener('input', function() {
				if (this.classList.contains('error')) {
					validateField(this);
				}
			});
		});

		// Email validation
		const emailInput = document.getElementById('email');
		if (emailInput) {
			emailInput.addEventListener('input', function() {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (this.value && !emailRegex.test(this.value)) {
					showError(this, 'Введите корректный email');
				} else {
					clearError(this);
				}
			});
		}

		// Phone validation
		const phoneInput = document.getElementById('phone');
		if (phoneInput) {
			phoneInput.addEventListener('input', function() {
				const phoneRegex = /^[\d\s\-\+\(\)]+$/;
				if (this.value && !phoneRegex.test(this.value)) {
					showError(this, 'Введите корректный телефон');
				} else {
					clearError(this);
				}
			});
		}
	}

	// Validate field
	function validateField(field) {
		const errorEl = field.parentElement.querySelector('.error-message');
		
		if (!field.value.trim()) {
			showError(field, 'Это поле обязательно для заполнения');
			return false;
		}

		if (field.type === 'email') {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(field.value)) {
				showError(field, 'Введите корректный email');
				return false;
			}
		}

		if (field.type === 'tel') {
			const phoneRegex = /^[\d\s\-\+\(\)]+$/;
			if (!phoneRegex.test(field.value)) {
				showError(field, 'Введите корректный телефон');
				return false;
			}
		}

		clearError(field);
		return true;
	}

	// Show error
	function showError(field, message) {
		field.classList.add('error');
		const errorEl = field.parentElement.querySelector('.error-message');
		if (errorEl) {
			errorEl.textContent = message;
		}
	}

	// Clear error
	function clearError(field) {
		field.classList.remove('error');
		const errorEl = field.parentElement.querySelector('.error-message');
		if (errorEl) {
			errorEl.textContent = '';
		}
	}

	// Setup services
	function setupServices() {
		const serviceCheckboxes = document.querySelectorAll('input[name="services[]"]');
		
		serviceCheckboxes.forEach(checkbox => {
			checkbox.addEventListener('change', function() {
				const serviceId = this.value;
				const price = parseFloat(this.getAttribute('data-price')) || 0;

				if (this.checked) {
					if (!formState.services.find(s => s.id === serviceId)) {
						formState.services.push({ id: serviceId, price: price });
					}
				} else {
					formState.services = formState.services.filter(s => s.id !== serviceId);
				}

				updateTotals();
			});
		});
	}

	// Update totals
	function updateTotals() {
		const totalTickets = formState.adults + formState.children;
		const basePrice = formState.ticketPrice || 0;
		const baseTicketsTotal = basePrice * totalTickets;

		// Discount amount
		const discountAmount = formState.discount > 0 ? (baseTicketsTotal * formState.discount) : 0;
		
		// Apply discount
		let ticketsTotal = baseTicketsTotal - discountAmount;

		// Services total
		const servicesTotal = formState.services.reduce((sum, service) => sum + service.price, 0);

		// Final total
		const finalTotal = ticketsTotal + servicesTotal;

		// Update UI
		updateElement('totalTickets', formatPrice(baseTicketsTotal));
		updateElement('totalServices', formatPrice(servicesTotal));
		
		if (discountAmount > 0) {
			updateElement('totalDiscount', formatPrice(-discountAmount));
			const discountLine = document.getElementById('discountLine');
			if (discountLine) {
				discountLine.style.display = 'flex';
			}
		} else {
			const discountLine = document.getElementById('discountLine');
			if (discountLine) {
				discountLine.style.display = 'none';
			}
		}

		updateElement('totalFinal', formatPrice(finalTotal));
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

	// Setup navigation
	function setupNavigation() {
		// Next buttons
		document.querySelectorAll('.wizard-next').forEach(btn => {
			btn.addEventListener('click', function() {
				if (validateCurrentStep()) {
					nextStep();
				}
			});
		});

		// Previous buttons
		document.querySelectorAll('.wizard-prev').forEach(btn => {
			btn.addEventListener('click', function() {
				prevStep();
			});
		});
	}

	// Validate current step
	function validateCurrentStep() {
		const currentStepEl = document.querySelector(`.wizard-step[data-step="${formState.currentStep}"]`);
		if (!currentStepEl) return true;

		const requiredFields = currentStepEl.querySelectorAll('input[required], select[required]');
		let isValid = true;

		requiredFields.forEach(field => {
			if (field.type === 'checkbox') {
				if (!field.checked) {
					showError(field, 'Необходимо согласие');
					isValid = false;
				} else {
					clearError(field);
				}
			} else {
				if (!validateField(field)) {
					isValid = false;
				}
			}
		});

		return isValid;
	}

	// Next step
	function nextStep() {
		if (formState.currentStep < formState.totalSteps) {
			// Save form data
			saveStepData();

			formState.currentStep++;
			updateStepDisplay();
			updateProgressBar();
		}
	}

	// Previous step
	function prevStep() {
		if (formState.currentStep > 1) {
			formState.currentStep--;
			updateStepDisplay();
			updateProgressBar();
		}
	}

	// Update step display
	function updateStepDisplay() {
		// Hide all steps
		document.querySelectorAll('.wizard-step').forEach(step => {
			step.classList.remove('active');
		});

		// Show current step
		const currentStepEl = document.querySelector(`.wizard-step[data-step="${formState.currentStep}"]`);
		if (currentStepEl) {
			currentStepEl.classList.add('active');
		}

		// Update progress steps
		document.querySelectorAll('.progress-step').forEach((step, index) => {
			const stepNum = index + 1;
			step.classList.remove('active', 'completed');
			
			if (stepNum < formState.currentStep) {
				step.classList.add('completed');
			} else if (stepNum === formState.currentStep) {
				step.classList.add('active');
			}
		});

		// Update step 4 summary
		if (formState.currentStep === 4) {
			updateSummary();
		}
	}

	// Update progress bar
	function updateProgressBar() {
		const progress = (formState.currentStep / formState.totalSteps) * 100;
		const progressFill = document.querySelector('.progress-fill');
		if (progressFill) {
			progressFill.style.width = progress + '%';
		}
	}

	// Save step data
	function saveStepData() {
		const form = document.getElementById('ticketForm');
		if (!form) return;

		const formData = new FormData(form);
		formState.formData = {
			...formState.formData,
			...Object.fromEntries(formData)
		};
	}

	// Update summary
	function updateSummary() {
		const ticketTypeNames = {
			standard: 'Стандартный',
			family: 'Семейный',
			oneday: 'Один день',
			group: 'С друзьями'
		};

		const totalTickets = formState.adults + formState.children;
		const servicesList = formState.services.map(s => {
			const serviceNames = {
				tent: 'Палатка',
				sleeping: 'Спальник',
				'transfer-msk': 'Трансфер из Москвы',
				'transfer-galich': 'Трансфер от Галича',
				banya: 'Баня',
				pogorelovo: 'Экскурсия в Погорелово'
			};
			return serviceNames[s.id] || s.id;
		}).join(', ') || 'Нет';

		const name = document.getElementById('name')?.value || '';
		const email = document.getElementById('email')?.value || '';
		const phone = document.getElementById('phone')?.value || '';

		updateElement('summaryTicketType', ticketTypeNames[formState.ticketType] || 'Не выбран');
		updateElement('summaryQuantity', `${formState.adults} взр.${formState.children > 0 ? ', ' + formState.children + ' дет.' : ''}`);
		updateElement('summaryContact', `${name}, ${email}, ${phone}`);
		updateElement('summaryServices', servicesList);
		
		const finalTotal = calculateFinalTotal();
		updateElement('summaryTotal', formatPrice(finalTotal));
	}

	// Calculate final total
	function calculateFinalTotal() {
		const totalTickets = formState.adults + formState.children;
		const basePrice = formState.ticketPrice || 0;
		const baseTicketsTotal = basePrice * totalTickets;
		const discountAmount = formState.discount > 0 ? (baseTicketsTotal * formState.discount) : 0;
		const ticketsTotal = baseTicketsTotal - discountAmount;
		const servicesTotal = formState.services.reduce((sum, service) => sum + service.price, 0);
		return ticketsTotal + servicesTotal;
	}

	// Handle form submission
	function handleFormSubmit(e) {
		e.preventDefault();

		if (!validateCurrentStep()) {
			return;
		}

		// Save all data
		saveStepData();

		// Here you would typically send data to server
		// For now, we'll just redirect to payment page
		alert('Форма отправлена! В реальном приложении здесь будет редирект на страницу оплаты.');
		
		// Example redirect (uncomment when ready):
		// window.location.href = 'https://payment.example.com/checkout';
	}

	// Initialize on DOM ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();
