var categories = ["Mammals", "Reptiles", "Birds", "Fish", "Insect"]
var start_items = ["Donkey", "Crocodile", "Eagle", "Salmon", "Grasshopper", "Mouse", "Snake", "Sparrow"]
var items = [];

var wedgesCount = categories.length;
var chipsCount = start_items.length;

var colors = ['OrangeRed', 'Gold', 'YellowGreen', 'Brown', 'MediumPurple'];
var bg = '#00CCCC';

var wheel, wheelPosition, mouseRelative;
var wheelRotation, wheelRotationNew = 0;
var wheelAngularMomentum;
var mouseV, pmouseV, mouseMovement;
var chips;
var heldChip;

var testSpring;

function setup() {
    createCanvas(Math.min(windowWidth, 800), Math.min(windowWidth*450/800, 450));
    colorMode(RGB, 255);
    textSize(16);
    textAlign(CENTER);

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
    background(bg);
    mouseV.set(mouseX, mouseY);
    pmouseV.set(pmouseX, pmouseY);
    
    mouseRelative = p5.Vector.sub(mouseV, wheel.positionVector);
    pmouseRelative = p5.Vector.sub(createVector(pmouseX, pmouseY), wheel.positionVector); 
    mouseMovement = p5.Vector.sub(mouseV, pmouseV);
    
    if (wheelSpring.held) {
        // Get mouse movement perpendicular to relative mouse vector
        mv = mouseMovement.copy().rotate(-mouseRelative.heading()).y;
        
        // Adjust to taste
        mv *= 0.01;
        mv = Math.min(0.5, mv);
        
        wheelSpring.moveRestPosition(mv);
    }

    if (heldChip) {
        heldChip.moveTarget(mouseMovement.x, mouseMovement.y);
    }
    
    wheelSpring.update();
    wheel.update();
    wheel.draw();
}

function Wheel(x,y) {
    this.positionVector = createVector(x, y);
    this.diameter = width * 0.9;
    this.innerDiameter = 200;
    this.rotation = 0;
}

Wheel.prototype.draw = function() {
    push();
        translate(wheel.positionVector.x, wheel.positionVector.y);

        push();
            rotate(this.rotation);
            textSize(20);
            wedgeArc = TAU / wedgesCount;
            for (var i = 0, il = wedgesCount; i < il; i++) {
                push();
                    fill(colors[i%colors.length]);
                    arc(0, 0, this.diameter, this.diameter, i * wedgeArc, (i+1) * wedgeArc, PIE);
                    fill(0);

                    // Canvas angles are offset from arc angles by 90 degrees for some reason...
                    rotate(TAU/4 + (i+0.5) * wedgeArc);
                    
                    text(categories[i], 0, -width * 0.40);
                pop();
            }
        pop();

        // Center hole
        fill(bg);
        ellipse(0, 0, this.innerDiameter, this.innerDiameter);

        // Chips
        chips.update();
        chips.drawInactive();
        chips.drawActive();
        if (heldChip) {
            heldChip.update();
            heldChip.draw(heldChip.positionV);
        }

        // Submit button
        if (chips.inactiveChips.length <= 0) {
            push()
                fill('Crimson');
                ellipse(0, 0, 155, 155); 
                fill('White');
                textSize(38);
                text('SUBMIT', 0, 0);
            pop();
        }
    pop();
}

Wheel.prototype.update = function () {
    this.rotation = wheelSpring.pos;
}

Wheel.prototype.addAngularMomentum = function (m) {
    this.angularMomentum += m;
}

function Chip(t,x,y,d=125) {
    this.text = t;
    this.diameter = d;
    this.positionV = createVector(x, y);
    this.fill = 255;
    this.angularPosition = 0;
    this.rotatedPosition = function() {
        return this.positionV.copy().rotate(wheel.rotation - this.angularPosition);
    }

    this.spring = {
        x: new Spring(mass=3,springConstant=0.3,damping=0.8),
        y: new Spring(mass=3,springConstant=0.3,damping=0.8)
    }

    this.spring.x.pos = this.positionV.x;
    this.spring.y.pos = this.positionV.y;

}

Chip.prototype.update = function() {
    this.spring.x.update();
    this.spring.y.update();
    
    this.positionV.set(this.spring.x.pos, this.spring.y.pos);
}

Chip.prototype.draw = function(v) {
    push();
        fill(this.fill);
        ellipse(v.x, v.y, this.diameter, this.diameter);
        fill('Black');
        text(this.text, v.x, v.y);
    pop();
}

Chip.prototype.isTouching = function(v) {
    return (this.positionV.dist(v) < this.diameter /2);
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
        c.draw(c.rotatedPosition());
    }
}

Chipstack.prototype.update = function() {
    for (var i = 0, il = this.activeChips.length; i < il; i++) {
        this.activeChips[i].update();
    }
}

Chipstack.prototype.drawInactive = function() {
    for (var i = 0, il = this.inactiveChips.length; i < il; i++) {
        var c = this.inactiveChips[i]
        c.draw(c.positionV);
    }
}

function mousePressed() {
    heldChip = null;
    
    // Check if we have clicked on active chip
    for (var i = chips.activeChips.length -1; i >= 0; i--) {
        chip = chips.activeChips[i];
        if ( (chip.rotatedPosition().dist(mouseRelative) < chip.diameter /2) ) {
            heldChip = chips.activeChips.splice(i,1)[0];
            return false;
        }
    }
    
    // If not picking up active chip, check top inactive chip
    if ( chips.inactiveChips.length > 0 ) {
        var topChip = chips.inactiveChips[chips.inactiveChips.length-1];
        if ( (topChip.positionV.dist(mouseRelative) < topChip.diameter /2) ) {
            heldChip = chips.inactiveChips.pop();  
            return false;
        }
    }
    
    // If still found no chip, check for wheel
    var m = mouseRelative.mag();
    if ( m < wheel.diameter /2 && m > wheel.innerDiameter /2 ) {
        wheelSpring.held = true;
    }

    return false;
}

function mouseReleased() {
    if (heldChip) {
        heldChip.angularPosition = wheel.rotation;
        chips.activeChips.push(heldChip);
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
        D = damping         || 0.9, // Damping
        R = rest            || 0;   // Rest position

    // Spring simulation variables
    this.pos = R; // Position
    var vs = 0.0, // Velocity
        as = 0,   // Acceleration
        f = 0;    // Force
    
    this.held = false;
    
    this.update = function() {
        // Update the spring position
        //if ( !this.held ) {
            f = -K * ( this.pos - R ); // f=-ky
            as = f / M;          // Set the acceleration, f=ma == a=f/m
            vs = D * (vs + as);  // Set the velocity
            this.pos += vs;        // Updated position
        //}

        if (abs(vs) < 0.0001) {
            vs = 0.0;
        }
    }
    
    this.moveRestPosition = function(f) {
        R += f;
    }
}