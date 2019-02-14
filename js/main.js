var version = 1110;

var categories = ["Mammals", "Reptiles", "Birds", "Fish", "Insect"]
var start_items = ["Donkey", "Crocodile", "Eagle", "Salmon", "Grasshopper", "Mouse", "Snake", "Sparrow"]
var items = [];

var wedgesCount = categories.length;
var chipsCount = start_items.length;

var colors = ['OrangeRed', 'Gold', 'YellowGreen', 'Brown', 'MediumPurple'];
var bg = '#00CCCC';

var wheel, wheelPosition, mouseRelative, pmouseRelative;
var wheelRotation, wheelRotationNew = 0;
var wheelAngularMomentum;
var mouseV, pmouseV, mouseMovement;
var chips;
var heldChip;

var chipRadius = 60;

var usingTouch = false;

var springV, pspringV;

function setup() {
    createCanvas(Math.min(windowWidth, 800), Math.min(windowWidth*450/800, 450));
    colorMode(RGB, 255);
    textSize(16);
    textAlign(CENTER);

    ellipseMode(RADIUS);

    // Randomise items
    for (var i = 0, il = start_items.length; i < il; i++) {
        n = floor(random(start_items.length));
        item = start_items.splice(n,1);
        items.push(item);
    }

    chips = new Chipstack(items);

    mouseV = createVector(0, 0);
    pmouseV = createVector(0, 0);
    wheel = new Wheel(width/2, height * 0.9);
    
    wheelSpring = new Spring();
    wheelSpring.moveRestPosition(TAU);
}

function draw() {
    // === UPDATE =======

    mouseV.set(mouseX, mouseY);
    pmouseV.set(pmouseX, pmouseY);
    
    mouseRelative = p5.Vector.sub(mouseV, wheel.positionVector);
    pmouseRelative = p5.Vector.sub(pmouseV, wheel.positionVector); 
    mouseMovement = p5.Vector.sub(mouseV, pmouseV);
    
    if (wheelSpring.held) {
        // Get mouse movement perpendicular to relative mouse vector
        mv = mouseMovement.copy().rotate(-mouseRelative.heading()).y;
        
        // Adjust to taste; how much wheel 'sticks' to mouse when dragging.
        if (usingTouch) {
            mv *= 0.1;
        } else {
            mv *= 0.01;
        }

        mv = Math.min(0.5, mv);
        
        wheelSpring.moveRestPosition(mv);
    }
    
    chips.update();
    if (heldChip) {
        // heldChip.momentum.set(mouseMovement.x, mouseMovement.y);
        heldChip.moveTarget(mouseMovement.x, mouseMovement.y);
        heldChip.updateSpring();
        heldChip.update();
    }
    
    wheelSpring.update();
    wheel.update();
    
    // === DRAW ========

    push();
        background(bg);
        translate(wheel.positionVector.x, wheel.positionVector.y);
        wheel.draw();

        // Submit button
        if (chips.inactiveChips.length <= 0) {
            push()
                fill('Crimson');
                ellipse(0, 0, chipRadius, chipRadius); 
                fill('White');
                textSize(24);
                text('SUBMIT', 0, 0);
            pop();
        }     

        // Chips
        chips.drawInactive();
        chips.drawActive();
        if (heldChip) {
            heldChip.draw();
        }

    pop();

    textSize(12);
    text(version, 20, 15);
}

function Wheel(x,y) {
    this.positionVector = createVector(x, y);
    this.radius = width * 0.45;
    this.innerRadius = 100;
    this.rotation = 0;
    this.rotationDelta = 0;
}

Wheel.prototype.draw = function() {
    push();
        rotate(this.rotation);
        textSize(20);
        wedgeArc = TAU / wedgesCount;
        for (var i = 0, il = wedgesCount; i < il; i++) {
            push();
                fill(colors[i%colors.length]);
                arc(0, 0, this.radius, this.radius, i * wedgeArc, (i+1) * wedgeArc, PIE);
                fill(0);

                // Canvas angles are offset from arc angles by 90 degrees for some reason...
                rotate(TAU/4 + (i+0.5) * wedgeArc);
                
                text(categories[i], 0, -width * 0.40);
            pop();
        }

        // Center hole
        fill(bg);
        ellipse(0, 0, chipRadius + 10, chipRadius + 10);

    pop();
}

Wheel.prototype.update = function () {
    this.rotationDelta = wheelSpring.pos - this.rotation;
    this.rotation = wheelSpring.pos;
}

Wheel.prototype.addAngularMomentum = function (m) {
    this.angularMomentum += m;
}

function Chip(t,x,y,r) {
    this.text = t;
    this.radius = r || chipRadius;
    this.positionV = createVector(x, y);
    this.fill = 255;

    this.spring = {
        x: new Spring(mass=3,springConstant=0.3,damping=0.8),
        y: new Spring(mass=3,springConstant=0.3,damping=0.8)
    }

    this.resetSpring();
    
    this.momentum = new p5.Vector(0, 0);
}

var floorFriction = 0.95;
var wallBounce = 0.70;

Chip.prototype.resetSpring = function() {
    this.spring.x.pos = this.positionV.x;
    this.spring.y.pos = this.positionV.y;
    
    this.springV  = this.positionV.copy();
    this.pspringV = this.positionV.copy();
}

Chip.prototype.update = function() {
    if (this.positionV.mag() + this.radius > wheel.radius) {
        this.positionV.setMag(wheel.radius - this.radius);
        this.momentum.mult(-wallBounce);
    }
    this.positionV.add(this.momentum);
    this.momentum.mult(floorFriction);
}

Chip.prototype.updateSpring = function() {
    this.spring.x.update();
    this.spring.y.update();
    
    this.pspringV = this.springV.copy();
    this.springV.set(this.spring.x.pos, this.spring.y.pos);
    
    var springDelta = p5.Vector.sub(this.springV, this.pspringV);

    this.momentum.set(springDelta);
}

Chip.prototype.draw = function() {
    push();
        fill(this.fill);
        ellipse(this.positionV.x, this.positionV.y, this.radius, this.radius);
        fill('Black');
        textSize(16);
        text(this.text, this.positionV.x, this.positionV.y);
    pop();
}

Chip.prototype.isTouching = function(v) {
    return (this.positionV.dist(v) < this.radius);
}

Chip.prototype.rotateAroundWheel = function() {
    this.positionV.rotate(wheel.rotationDelta);
}

Chip.prototype.moveTarget = function(_x, _y) {
    this.spring.x.moveRestPosition(_x);
    this.spring.y.moveRestPosition(_y);
}

function Chipstack(arr) {
    this.inactiveChips = []
    this.activeChips = [];
    for (var i = 0, il = arr.length; i < il; i++) {
        this.inactiveChips.push(new Chip(arr[i], i * -3, i * -3)); 
    }
}

Chipstack.prototype.drawActive = function() {
    for (var i = 0, il = this.activeChips.length; i < il; i++) {
        var c = this.activeChips[i]
        c.draw();
    }
}

Chipstack.prototype.update = function() {
    for (var i = 0, il = this.activeChips.length; i < il; i++) {
        this.activeChips[i].update();
        this.activeChips[i].rotateAroundWheel();
    }
}

Chipstack.prototype.drawInactive = function() {
    for (var i = 0, il = this.inactiveChips.length; i < il; i++) {
        var c = this.inactiveChips[i]
        c.draw();
    }
}

function mousePressed() {
    usingTouch = false;
    processInput();
}

function touchStarted() {
    usingTouch = true;
    processInput();
}

function processInput() {
    heldChip = null;
    
    // Check if we have clicked on active chip
    for (var i = chips.activeChips.length -1; i >= 0; i--) {
        chip = chips.activeChips[i];
        if ( (chip.positionV.dist(mouseRelative) < chip.radius) ) {
            heldChip = chips.activeChips.splice(i,1)[0];
            // heldChip.resetSpring();
            return false;
        }
    }
    
    // If not picking up active chip, check top inactive chip
    if ( chips.inactiveChips.length > 0 ) {
        var topChip = chips.inactiveChips[chips.inactiveChips.length-1];
        if ( (topChip.positionV.dist(mouseRelative) < topChip.radius) ) {
            heldChip = chips.inactiveChips.pop();
            // heldChip.resetSpring();
            return false;
        }
    }
    
    // If still found no chip, check for wheel
    var m = mouseRelative.mag();
    if ( m < wheel.radius && m > wheel.innerRadius ) {
        wheelSpring.held = true;
    }

    return false;
}

function mouseReleased() {
    if (heldChip) {
        // heldChip.positionV.rotateAroundWheel(wheel.rotation);
        chips.activeChips.push(heldChip);
        //
        heldChip.fill = 'White';
        //
        heldChip = null;
    }
    
    wheelSpring.held = false;

    return false;
}

// ================================================
// One-dimensional spring formula taken from
// https://p5js.org/examples/simulate-spring.html
// ================================================

function Spring(mass, springConstant, damping, rest) {
    // Spring simulation constants
    var M = mass            || 9.9, // Mass
        K = springConstant  || 0.1, // Spring constant
        D = damping         || 0.7, // Damping
        R = rest            || 0;   // Rest position

    // Spring simulation variables
    this.pos = R; // Position
    var vs = 0.0, // Velocity
        as = 0,   // Acceleration
        f = 0;    // Force
    
    this.held = false;
    
    this.update = function() {
        // Update the spring position
        f = -K * ( this.pos - R );  // f=-ky
        as = f / M;                 // Set the acceleration, f=ma == a=f/m
        vs = D * (vs + as);         // Set the velocity
        this.pos += vs;             // Updated position

        if (abs(vs) < 0.0001) {
            vs = 0.0;
        }
    }
    
    this.moveRestPosition = function(f) {
        R += f;
    }
}