/* Wooden Work Studio - JavaScript Controller */
/* Author: Archinsights */

// State
let currentTab = 'wardrobe';
let selectedMaterial = 'oak';
let animType = 'swing';
let animEasing = 'ease-in-out';
let animSpeed = 1;
let softClose = false;
let damped = false;
let selectedHardware = 'hinge';

// Tab switching
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const tabEl = document.getElementById('tab-' + tab);
    if (tabEl) tabEl.classList.add('active');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(tab)) {
            item.classList.add('active');
        }
    });
    currentTab = tab;
}

// Material selection
function selectMaterial(mat) {
    selectedMaterial = mat;
    document.querySelectorAll('.material-card').forEach(el => el.classList.remove('selected'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
}

// Animation type
function selectAnimType(type, btn) {
    animType = type;
    btn.parentElement.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// Easing
function selectEasing(easing, btn) {
    animEasing = easing;
    btn.parentElement.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// Speed
function setSpeed(speed, btn) {
    animSpeed = speed;
    btn.parentElement.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// Toggle switches
function toggleSoftClose(el) {
    softClose = !softClose;
    el.classList.toggle('active');
}

function toggleDamped(el) {
    damped = !damped;
    el.classList.toggle('active');
}

// Hardware selection
function selectHardware(hw, card) {
    selectedHardware = hw;
    document.querySelectorAll('.hardware-card').forEach(el => el.classList.remove('selected'));
    card.classList.add('selected');
}

// Slider value display
document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', function() {
        const display = this.nextElementSibling;
        if (display) display.textContent = this.value + '%';
    });
});

// Helper to safely call SketchUp
function callSketchup(funcName, params) {
    if (typeof sketchup !== 'undefined' && sketchup[funcName]) {
        sketchup[funcName](params);
    } else {
        console.log('Call:', funcName, params);
        alert('Function: ' + funcName);
    }
}

// Parameter collectors
function getWardrobeParams() {
    return {
        width: parseInt(document.getElementById('wardrobe-width').value) || 1200,
        height: parseInt(document.getElementById('wardrobe-height').value) || 2400,
        depth: parseInt(document.getElementById('wardrobe-depth').value) || 600,
        shelves: parseInt(document.getElementById('wardrobe-shelves').value) || 3,
        rods: parseInt(document.getElementById('wardrobe-rods').value) || 1,
        drawers: parseInt(document.getElementById('wardrobe-drawers').value) || 0,
        doors: document.getElementById('wardrobe-doors').value || 'hinged',
        material: document.getElementById('wardrobe-material').value || 'oak'
    };
}

function getDrawerParams() {
    return {
        width: parseInt(document.getElementById('drawer-width').value) || 600,
        height: parseInt(document.getElementById('drawer-height').value) || 800,
        depth: parseInt(document.getElementById('drawer-depth').value) || 500,
        count: parseInt(document.getElementById('drawer-count').value) || 3,
        eachHeight: parseInt(document.getElementById('drawer-each-height').value) || 200,
        handle: document.getElementById('drawer-handle').value || 'bar',
        slide: document.getElementById('drawer-slide').value || 'full',
        material: document.getElementById('drawer-material').value || 'oak'
    };
}

function getShelfParams() {
    return {
        width: parseInt(document.getElementById('shelf-width').value) || 800,
        depth: parseInt(document.getElementById('shelf-depth').value) || 300,
        thickness: parseInt(document.getElementById('shelf-thickness').value) || 18,
        count: parseInt(document.getElementById('shelf-count').value) || 4,
        spacing: parseInt(document.getElementById('shelf-spacing').value) || 300,
        style: document.getElementById('shelf-style').value || 'floating',
        material: document.getElementById('shelf-material').value || 'oak'
    };
}

function getDoorParams() {
    return {
        width: parseInt(document.getElementById('door-width').value) || 400,
        height: parseInt(document.getElementById('door-height').value) || 700,
        thickness: parseInt(document.getElementById('door-thickness').value) || 18,
        type: document.getElementById('door-type').value || 'hinged',
        panel: document.getElementById('door-panel').value || 'flat',
        handle: document.getElementById('door-handle').value || 'bar',
        material: document.getElementById('door-material').value || 'oak'
    };
}

function getMaterialParams() {
    return {
        type: selectedMaterial,
        finish: document.getElementById('material-finish').value || 'matte',
        grain: document.getElementById('material-grain').value || 'vertical',
        scale: parseInt(document.getElementById('material-scale').value) || 100,
        opacity: parseInt(document.getElementById('material-opacity').value) || 100
    };
}

function getAnimParams() {
    return {
        type: animType,
        duration: parseInt(document.getElementById('anim-duration').value) || 1000,
        max: parseInt(document.getElementById('anim-max').value) || 90,
        direction: document.getElementById('anim-direction').value || 'open',
        easing: animEasing,
        speed: animSpeed,
        softClose: softClose,
        damped: damped
    };
}

function getHardwareParams() {
    return {
        type: selectedHardware,
        size: document.getElementById('hw-size').value || 'medium',
        finish: document.getElementById('hw-finish').value || 'chrome',
        qty: parseInt(document.getElementById('hw-qty').value) || 2
    };
}
