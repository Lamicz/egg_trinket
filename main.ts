let pixelCurrentMode: uint8 = 0 // [0 - no flash, 1 - flash, 2 - only flash, 3 - RGB]
let stripCurrentModeTimerSet: uint8 = 30
let pixelSpeedTrigger: boolean = false
let pixelRGBColorChange: boolean = false
let pixelsCntActive: uint8 = 0
let stripFlash: uint8 = 0
let stripFlashTotal: uint8 = 0
let stripFlashTimerSet: uint8 = 15
let stripFreePositions: number[] = []
let pixelSpeedIndex: uint8 = 0
let pixelSpeedTimer: uint32 = 0
let pixelSpeedDelay: uint16 = 0
let pixelDifferentBrightness: uint8 = 0
let b = 0
let z = 0

const stripLength: uint16 = 256
const stripTopStart: uint8 = 251
const stripTopColumnStart: uint8 = 174
const pixelRGBColor: Buffer = Buffer.fromArray([189, 120, 34])
const pixelSpeeds = [[45, 35], [20, 10], [35, 25]] // koef rychlosti rozsviceni a zhasnuti
const pixelSpeedDelayInit: uint16 = 2000 // timeout po touch eventu [ms]
const pixelSpeedDelayStep: uint16 = 10000 // timeout mezi kroky [ms]
const pixelsMinMax: Buffer = Buffer.fromArray([25, 35]) // pocet pixelu najednou (min a max interval)
const stripCurrentModeTimer: Buffer = Buffer.fromArray([30, 300]) // [s] interval pro random mode timer
const stripPixelsFlash: Buffer = Buffer.fromArray([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) // pocet pixelu na zablesk
const flashTimesMinMax: Buffer = Buffer.fromArray([1, 5]) // kolikrat se ma bliknout
const stripPixelsFlashStartIndex: uint8 = 10 // index alespon 1x zablesk
const stripPixelsFlashLength = stripPixelsFlash.length - 1
const stripFlashTimer: Buffer = Buffer.fromArray([15, 60]) // [s] interval pro random flash timer
const pixelWaitCycles: uint8 = 5 // prodleva pixelu na mbr pro mode 1 a 2 [pocet cyklu]
const strip = light.createNeoPixelStrip(pins.D1, stripLength)

let pixelsCntCurrent: uint8 = Math.randomRange(pixelsMinMax.getUint8(0), pixelsMinMax.getUint8(1));
let pixelDifferentBrightnesses: uint8 = Math.round(pixelsCntCurrent / 5)
let pixelCurrentSpeed: Buffer = Buffer.fromArray(pixelSpeeds[pixelSpeedIndex])
let stripLengthCurrent: uint16 = stripTopStart

class EggPixel {

    status: uint8 = 0;
    timer: uint8 = 0;
    position: uint8 = 0;
    maxBrightness: uint16 = 0;
    maxBrightnessHigh: boolean = false;
    currentBrightness: int16 = 0;
    stepChangeBrightness: uint8 = 0;
    flashTimes: uint8 = 0;
    rgb: Buffer = Buffer.create(3);

    constructor(mode: number){

        if(mode == 3){
            
            this.rgb.setUint8(0, Math.randomRange(0, 255));
            this.rgb.setUint8(1, Math.randomRange(0, 255));
            this.rgb.setUint8(2, Math.randomRange(0, 255));

        } else {

            this.rgb.setUint8(0, pixelRGBColor.getUint8(0));
            this.rgb.setUint8(1, pixelRGBColor.getUint8(1));
            this.rgb.setUint8(2, pixelRGBColor.getUint8(2));
        }
    }
}

let pixels: EggPixel[] = [];

input.buttonD0.onEvent(ButtonEvent.LongClick, function () {

    if(pixelCurrentMode == 3){
        pixelCurrentMode = 0
    }else{
        pixelCurrentMode = pixelCurrentMode + 1
    }
    
    switch(pixelCurrentMode){
        case 0:
            pixel.setColor(PixelColors.Red)
            break
        case 1:
            pixel.setColor(PixelColors.Green)
            break
        case 2:
            pixel.setColor(PixelColors.Black)
            break
        case 3:
            pixel.setColor(PixelColors.Blue)
            break
    }
    
    stripReset()
})

input.buttonD0.onEvent(ButtonEvent.Click, function () {

    stripLengthCurrent = (stripLengthCurrent == stripLength) ? stripTopStart : stripLength

    stripReset()
})

input.touchD3.onEvent(ButtonEvent.Click, function () {

    if (pixelSpeedIndex == 0) {
        
        pins.LED.digitalWrite(true)

        pixelSpeedTimer = control.millis()
        pixelSpeedTrigger = true
        pixelSpeedDelay = pixelSpeedDelayInit

        control.timer1.reset()
    }
})

pins.LED.digitalWrite(false)

pixel.setBrightness(85)
pixel.setColor(PixelColors.Red)

strip.setBuffered(true)
strip.setBrightness(255)

stripReset()

forever(function () {

    if(pixelSpeedIndex == 0 && (control.timer2.seconds() > stripCurrentModeTimerSet)){

        control.timer2.reset()

        pixelsCntCurrent = Math.randomRange(pixelsMinMax.getUint8(0), pixelsMinMax.getUint8(1));
        pixelDifferentBrightnesses = Math.round(pixelsCntCurrent / 5)

        stripCurrentModeTimerSet = Math.randomRange(stripCurrentModeTimer.getUint8(0), stripCurrentModeTimer.getUint8(1));
    }

    if (stripFlash == 0 && (control.timer1.seconds() > stripFlashTimerSet)) {

        control.timer1.reset()

        if(pixelCurrentMode > 0){

            stripFlashTotal = stripPixelsFlash[Math.randomRange(0, stripPixelsFlashLength)]
            stripFlashTimerSet = Math.randomRange(stripFlashTimer.getUint8(0), stripFlashTimer.getUint8(1));
        }
    }

    if(control.timer3.seconds() > 15){

        control.timer3.reset()

        if(pixelCurrentMode == 3 && !pixelRGBColorChange){
            pixelRGBColorChange = true
        }
    }

    if ((pixelSpeedTrigger || (pixelSpeedIndex > 0)) && ((control.millis() - pixelSpeedTimer) > pixelSpeedDelay)) {

        if (pixelSpeedTrigger) {

            pixelSpeedTrigger = false
            pixelSpeedDelay = pixelSpeedDelayStep

            if(stripFlash == 0){

                stripFlashTotal = stripPixelsFlash[Math.randomRange(stripPixelsFlashStartIndex, stripPixelsFlashLength)]
            }
        }

        if (pixelSpeedIndex == 0) {

            pixelSpeedIndex = 1

        } else if (pixelSpeedIndex == 1) {

            pixelSpeedIndex = 2

        } else {

            pixelSpeedIndex = 0

            pins.LED.digitalWrite(false)
            control.timer1.reset()
        }

        pixelCurrentSpeed = Buffer.fromArray(pixelSpeeds[pixelSpeedIndex])
        pixelSpeedTimer = control.millis()
    }

    pixels.forEach(function (eggPixel: EggPixel, pos: number) {

        if(eggPixel.status > 0){
            
            pixelProcess(eggPixel, pos)
            
        }else{
            
            pixelCreate(eggPixel, pos)            
        }
    })
    strip.show()
})

function pixelProcess(eggPixel: EggPixel, pos: number) {

    if (eggPixel.timer > 0) {
        
        if (eggPixel.timer > pixelWaitCycles) {
            eggPixel.status = 2
            eggPixel.timer = 0
        } else {
            eggPixel.timer++
        }
    }
        
    if (eggPixel.status == 1) {
        eggPixel.currentBrightness += eggPixel.stepChangeBrightness
        if (eggPixel.currentBrightness > eggPixel.maxBrightness) {
            eggPixel.currentBrightness = eggPixel.maxBrightness
        }
        if (eggPixel.currentBrightness == eggPixel.maxBrightness) {
            eggPixel.timer = 1
            eggPixel.status = 3
        }
    } else {
        eggPixel.currentBrightness -= eggPixel.stepChangeBrightness
        if (eggPixel.currentBrightness < 0) {
            eggPixel.currentBrightness = 0
        }
    }

    if (eggPixel.flashTimes > 0) {

        if((eggPixel.currentBrightness == eggPixel.maxBrightness) || (eggPixel.status == 2)){

            if(pixelCurrentMode == 3){
                strip.setPixelColor(eggPixel.position, pixel.rgb(eggPixel.rgb.getUint8(0), eggPixel.rgb.getUint8(1), eggPixel.rgb.getUint8(2)));
            }else{
                strip.setPixelColor(eggPixel.position, pixel.rgb(255, 162, 46))

                console.log('flashed')

            }
            strip.show()

            eggPixel.flashTimes--
        }
    }

    strip.setPixelColor(
        eggPixel.position,
        pixel.rgb(eggPixel.rgb[0] * eggPixel.currentBrightness / 255, eggPixel.rgb[1] * eggPixel.currentBrightness / 255, eggPixel.rgb[2] * eggPixel.currentBrightness / 255)
    )

    if ((eggPixel.currentBrightness == 0) && (eggPixel.status == 2)) {

        pixelsCntActive--
        
        if(eggPixel.maxBrightnessHigh){
            pixelDifferentBrightness--
        }

        eggPixel.flashTimes = 0
        eggPixel.status = 0

        stripFreePositions.push(eggPixel.position);
    }
}

function pixelCreate(eggPixel: EggPixel, pos: number) {

    if(pixelsCntActive < pixelsCntCurrent){

        pixelsCntActive++

        eggPixel.position = stripFreePositions[Math.randomRange(0, stripFreePositions.length - 1)];            
        stripFreePositions.removeElement(eggPixel.position);

        eggPixel.maxBrightness = Math.randomRange(51, 86);
        eggPixel.maxBrightnessHigh = false        

        if(pixelDifferentBrightness < pixelDifferentBrightnesses){

            eggPixel.maxBrightness = Math.randomRange(170, 255)
            eggPixel.maxBrightnessHigh = true

            pixelDifferentBrightness++
        }

        if((pixelCurrentMode > 0) && (stripFlash < stripFlashTotal)){
            
            eggPixel.flashTimes = Math.randomRange(flashTimesMinMax[0], flashTimesMinMax[1])

            stripFlash++

            if(stripFlash == stripFlashTotal){
                stripFlashTotal = 0
                stripFlash = 0
            }
        }

        if ((eggPixel.position >= stripTopColumnStart) && (eggPixel.maxBrightness > 65)) {
            eggPixel.maxBrightness = 65
        }        
        if ((eggPixel.position >= stripTopStart) && (eggPixel.maxBrightness > 40)) {
            eggPixel.maxBrightness = 40
        }
        if (pixelSpeedIndex > 0) {
            eggPixel.maxBrightness += 40
        }

        if((pixelCurrentMode == 2) && (pixelSpeedIndex == 0)){

            eggPixel.stepChangeBrightness = 0
            eggPixel.maxBrightness = 0

        }else{
            
            z = Math.randomRange(Math.round(eggPixel.maxBrightness / pixelCurrentSpeed.getUint8(0)), Math.round(eggPixel.maxBrightness / pixelCurrentSpeed.getUint8(1)));
            if (z < 1) {
                z = 1
            }
            eggPixel.stepChangeBrightness = z
        }

        if (pixelRGBColorChange) {

            eggPixel.rgb.setUint8(0, Math.randomRange(0, 255));
            eggPixel.rgb.setUint8(1, Math.randomRange(0, 255));
            eggPixel.rgb.setUint8(2, Math.randomRange(0, 255));

            pixelRGBColorChange = false
        }

        if(eggPixel.maxBrightness > 255){
            eggPixel.maxBrightness = 255;
        }

        eggPixel.currentBrightness = 0        
        eggPixel.timer = 0
        eggPixel.status = 1
    }
}

function stripReset() {

    control.timer1.reset()
    control.timer2.reset()
    control.timer3.reset()

    strip.clear()

    stripFreePositions = []
    pixels = []

    pixelDifferentBrightness = 0
    stripFlashTotal = 0
    stripFlash = 0
    pixelsCntActive = 0

    b = 0
    while (b < pixelsMinMax.getUint8(1)) {
        pixels[b] = new EggPixel(pixelCurrentMode);
        b++
    }

    b = 0
    while(b < stripLengthCurrent){
        stripFreePositions.push(b);
        b++;
    }
}