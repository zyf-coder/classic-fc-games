/**
 * 虚拟摇杆和触摸控制
 * 参考王者荣耀的操作方式
 */
class VirtualJoystick {
    constructor(element, options = {}) {
        this.element = element;
        this.base = element.querySelector('.joystick-base');
        this.stick = element.querySelector('.joystick-stick');
        this.maxDistance = options.maxDistance || 40;
        this.onMove = options.onMove || function() {};
        this.onEnd = options.onEnd || function() {};
        this.active = false;
        this.centerX = 0;
        this.centerY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.direction = { up: false, down: false, left: false, right: false };
        
        this.init();
    }
    
    init() {
        this.base.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        document.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.base.getBoundingClientRect();
        this.centerX = rect.left + rect.width / 2;
        this.centerY = rect.top + rect.height / 2;
        this.active = true;
        this.element.classList.add('is-active');
        this.updateStick(touch.clientX, touch.clientY);
    }
    
    handleTouchMove(e) {
        if (!this.active) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.updateStick(touch.clientX, touch.clientY);
    }
    
    handleTouchEnd(e) {
        if (!this.active) return;
        this.active = false;
        this.element.classList.remove('is-active');
        this.element.classList.remove('direction-up', 'direction-down', 'direction-left', 'direction-right');
        this.stick.style.transform = 'translate(-50%, -50%)';
        this.resetDirection();
        this.onEnd();
    }
    
    updateStick(touchX, touchY) {
        let deltaX = touchX - this.centerX;
        let deltaY = touchY - this.centerY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > this.maxDistance) {
            deltaX = (deltaX / distance) * this.maxDistance;
            deltaY = (deltaY / distance) * this.maxDistance;
        }
        
        this.stick.style.transform = `calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)`;
        this.stick.style.left = '50%';
        this.stick.style.top = '50%';
        this.stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        
        const threshold = 0.3;
        const newDirection = {
            up: deltaY < -this.maxDistance * threshold,
            down: deltaY > this.maxDistance * threshold,
            left: deltaX < -this.maxDistance * threshold,
            right: deltaX > this.maxDistance * threshold
        };
        
        if (this.direction.up !== newDirection.up || 
            this.direction.down !== newDirection.down || 
            this.direction.left !== newDirection.left || 
            this.direction.right !== newDirection.right) {
            this.direction = newDirection;
            this.element.classList.toggle('direction-up', newDirection.up);
            this.element.classList.toggle('direction-down', newDirection.down);
            this.element.classList.toggle('direction-left', newDirection.left);
            this.element.classList.toggle('direction-right', newDirection.right);
            this.onMove(this.direction);
        }
    }
    
    resetDirection() {
        this.direction = { up: false, down: false, left: false, right: false };
    }
}

class TouchController {
    constructor(nes) {
        this.nes = nes;
        this.joystick = null;
        this.currentDirection = { up: false, down: false, left: false, right: false };
        this.init();
    }
    
    init() {
        this.initJoystick();
        this.initButtons();
    }
    
    initJoystick() {
        const joystickArea = document.getElementById('joystickArea');
        if (!joystickArea) return;
        
        this.joystick = new VirtualJoystick(joystickArea, {
            maxDistance: 40,
            onMove: this.handleDirection.bind(this),
            onEnd: this.handleDirectionEnd.bind(this)
        });
    }
    
    handleDirection(direction) {
        const keys = this.nes.keyboard.keys;
        
        if (this.currentDirection.up !== direction.up) {
            this.nes.keyboard.state1[keys.KEY_UP] = direction.up ? 0x41 : 0x40;
        }
        if (this.currentDirection.down !== direction.down) {
            this.nes.keyboard.state1[keys.KEY_DOWN] = direction.down ? 0x41 : 0x40;
        }
        if (this.currentDirection.left !== direction.left) {
            this.nes.keyboard.state1[keys.KEY_LEFT] = direction.left ? 0x41 : 0x40;
        }
        if (this.currentDirection.right !== direction.right) {
            this.nes.keyboard.state1[keys.KEY_RIGHT] = direction.right ? 0x41 : 0x40;
        }
        
        this.currentDirection = { ...direction };
    }
    
    handleDirectionEnd() {
        const keys = this.nes.keyboard.keys;
        this.nes.keyboard.state1[keys.KEY_UP] = 0x40;
        this.nes.keyboard.state1[keys.KEY_DOWN] = 0x40;
        this.nes.keyboard.state1[keys.KEY_LEFT] = 0x40;
        this.nes.keyboard.state1[keys.KEY_RIGHT] = 0x40;
        this.currentDirection = { up: false, down: false, left: false, right: false };
    }
    
    initButtons() {
        const btnA = document.getElementById('btnA');
        const btnB = document.getElementById('btnB');
        const btnSelect = document.getElementById('btnSelect');
        const btnStart = document.getElementById('btnStart');
        
        if (btnA) this.setupButton(btnA, 'KEY_A');
        if (btnB) this.setupButton(btnB, 'KEY_B');
        if (btnSelect) this.setupButton(btnSelect, 'KEY_SELECT');
        if (btnStart) this.setupButton(btnStart, 'KEY_START');
    }
    
    setupButton(element, keyName) {
        const keys = this.nes.keyboard.keys;
        
        const press = (e) => {
            e.preventDefault();
            this.nes.keyboard.state1[keys[keyName]] = 0x41;
            element.style.transform = 'scale(0.9)';
            element.style.opacity = '0.9';
        };
        
        const release = (e) => {
            e.preventDefault();
            this.nes.keyboard.state1[keys[keyName]] = 0x40;
            element.style.transform = '';
            element.style.opacity = '';
        };
        
        element.addEventListener('touchstart', press, { passive: false });
        element.addEventListener('touchend', release, { passive: false });
        element.addEventListener('touchcancel', release, { passive: false });
        element.addEventListener('mousedown', press);
        element.addEventListener('mouseup', release);
        element.addEventListener('mouseleave', release);
    }
}

window.TouchController = TouchController;
